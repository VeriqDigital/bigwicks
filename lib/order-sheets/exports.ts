import "server-only";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/auth/authorization";
import { lockAdminActor, type AdminActor } from "@/lib/auth/admin-transaction";
import { getDb } from "@/lib/db";
import { checksum, readExportBytes, readTemplateBytes } from "./storage";
import { generateOrderSheet, OrderSheetError, sheetMessage } from "./worker";
import type { Configuration, SavedSheetOrder } from "./types";
import { exportMetadata, referenceValid, CLAIM_LEASE_MS, exportRecoveryMessage } from "./metadata";
import { failureCode } from "./runtime/diagnostics.mjs";

// Called only after an authorized order creation commits, or an ADMIN recovery claim.
// No catalog, ProductPrice or current customer/tier dependency is permitted here.
export async function generateCommittedExport(
  orderId: string,
  actor?: AdminActor,
) {
  const claimId = randomUUID();
  let claimed = false;
  try {
    claimed = await getDb().$transaction(async (tx) => {
      if (actor) await lockAdminActor(tx, actor);
      // Only legacy orders lack the metadata pinned during creation. Never assign today's template.
      if (
        !(await tx.orderExport.findUnique({
          where: { orderId },
          select: { orderId: true },
        }))
      )
        await tx.orderExport.create({
          data: {
            orderId,
            templateId: null,
            templateAbsence: "LEGACY_ORDER",
            diagnostic: "LEGACY_ORDER",
          },
        });
      const result = await tx.orderExport.updateMany({
        where: {
          orderId,
          OR: [
            { state: { in: ["PENDING", "FAILED"] } },
            {
              state: "GENERATING",
              claimedAt: { lt: new Date(Date.now() - CLAIM_LEASE_MS) },
            },
          ],
        },
        data: { state: "GENERATING", claimId, claimedAt: new Date() },
      });
      return result.count === 1;
    });
    if (!claimed) return await readExportBytes(orderId);
    const order = await getDb().order.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        items: { orderBy: { catalogKey: "asc" } },
        excelExport: { select: { templateId: true, templateAbsence: true } },
      },
    });
    const saved: SavedSheetOrder = {
      reference: order.reference,
      createdAt: order.createdAt.toISOString(),
      companyName: order.companyNameSnapshot,
      customerNumber: order.customerNumberSnapshot,
      email: order.emailSnapshot,
      tierName: order.pricingTierNameSnapshot,
      total: order.total.toFixed(2),
      items: order.items.map((i) => ({
        catalogKey: i.catalogKey,
        sku: i.skuSnapshot,
        name: i.productNameSnapshot,
        brand: i.brandSnapshot,
        packing: i.packingSnapshot,
        unitPrice: i.unitPriceSnapshot.toFixed(2),
        quantity: i.quantity,
        lineTotal: i.lineTotalSnapshot.toFixed(2),
      })),
    };
    const file = order.excelExport?.templateId
      ? await readTemplateBytes(order.excelExport.templateId)
      : null;
    const generated = await generateOrderSheet(
      saved,
      file
        ? {
            bytes: Buffer.from(file.original).toString("base64"),
            configuration: file.configuration as unknown as Configuration,
          }
        : null,
      order.excelExport?.templateAbsence ?? "NO_TEMPLATE",
    );
    const bytes = Buffer.from(generated.bytes, "base64");
    const result = await getDb().orderExport.updateMany({
      where: { orderId, state: "GENERATING", claimId },
      data: {
        state: "READY",
        kind: generated.kind,
        diagnostic: generated.diagnostic,
        bytes,
        checksum: checksum(bytes),
        generatorVersion: generated.version,
        generatedAt: new Date(),
        claimId: null,
      },
    });
    if (result.count !== 1) return null;
    return await readExportBytes(orderId);
  } catch (error) {
    if (claimed)
      try {
        await getDb().orderExport.updateMany({
          where: { orderId, state: "GENERATING", claimId },
          data: {
            state: "FAILED",
            diagnostic: failureCode(error instanceof OrderSheetError ? error.code : null),
            claimId: null,
          },
        });
      } catch {
        /* Interrupted claims are recoverable after the lease expires. */
      }
    return null;
  }
}
export async function retryOrderExport(reference: unknown) {
  const admin = await requireAdmin();
  try {
    if (!referenceValid(reference))
      throw new OrderSheetError("Invalid order reference.");
    const order = await getDb().order.findUnique({
      where: { reference },
      select: { id: true },
    });
    if (!order) throw new OrderSheetError("Order not found.");
    const file = await generateCommittedExport(order.id, admin);
    const record = file ? null : await getDb().orderExport.findUnique({ where: { orderId: order.id }, select: exportMetadata });
    return {
      message: file
        ? `Excel export ready (${file.kind === "TEMPLATE" ? "populated template" : "snapshot fallback"}). Notification email was not resent.`
        : exportRecoveryMessage(record),
    };
  } catch (error) {
    return { message: sheetMessage(error) };
  }
}
