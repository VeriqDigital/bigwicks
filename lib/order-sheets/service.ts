import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/auth/authorization";
import { lockAdminActor } from "@/lib/auth/admin-transaction";
import { consumeBucket } from "@/lib/auth/rate-limit";
import { getDb } from "@/lib/db";
import { readPublishedCatalogContent } from "@/lib/catalog/content";
import { normalizeCatalogContent } from "@/lib/catalog/normalize";
import { LIMITS, VERSION } from "./runtime/limits.mjs";
import { checksum, safeFilename } from "./storage";
import { inspectOrderSheet, OrderSheetError, sheetMessage } from "./worker";
import { mapSheet } from "./mapping";
import type { Configuration, Inspection, SheetState } from "./types";

const ttl = 10 * 60 * 1000;
const invalid = (error: unknown): SheetState => ({
  status: "invalid",
  message: sheetMessage(error),
});
function id(value: unknown): string {
  if (typeof value !== "string" || !/^c[a-z0-9]{24,31}$/.test(value))
    throw new OrderSheetError("Invalid selection. Refresh this page.");
  return value;
}
async function state(
  tx: Prisma.TransactionClient,
  tierId: string,
  raw: unknown,
) {
  const tier = await tx.pricingTier.findUnique({
    where: { id: tierId },
    select: { id: true, name: true, rank: true },
  });
  if (!tier)
    throw new OrderSheetError(
      "This pricing tier no longer exists. Refresh the page.",
    );
  const content = normalizeCatalogContent(raw);
  if (
    content.issues.some((i) =>
      [
        "missing_or_invalid_catalog_key",
        "duplicate_catalog_key",
        "invalid_required_content",
      ].includes(i.code),
    )
  )
    throw new OrderSheetError(
      "Resolve invalid or duplicate catalog identities before reviewing an order sheet.",
    );
  const prices = await tx.productPrice.findMany({
    where: { pricingTierId: tierId },
    select: { catalogKey: true, price: true },
    orderBy: { catalogKey: "asc" },
  });
  const projection = content.products
    .map((p) => ({
      catalogKey: p.catalogKey,
      sku: p.sku,
      name: p.name,
      available: p.available,
    }))
    .sort((a, b) => a.catalogKey.localeCompare(b.catalogKey));
  return {
    tier,
    prices,
    hash: checksum(
      JSON.stringify({
        tier,
        products: projection,
        prices: prices.map((p) => [p.catalogKey, p.price.toFixed(2)]),
      }),
    ),
  };
}
function sign(payload: object) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw new OrderSheetError("Order sheet confirmation is not configured.");
  return createHmac("sha256", secret)
    .update("big-wicks/order-sheet-confirm/v1\0")
    .update(JSON.stringify(payload))
    .digest("base64url");
}
const bind = (
  draft: {
    id: string;
    checksum: string;
    stateHash: string;
    tierId: string;
    expectedRevision: number;
    uploadedById: string;
    sessionVersion: number;
    expiresAt: Date;
  },
  configuration: Configuration,
) => ({
  draftId: draft.id,
  checksum: draft.checksum,
  stateHash: draft.stateHash,
  tierId: draft.tierId,
  revision: draft.expectedRevision,
  adminId: draft.uploadedById,
  sessionVersion: draft.sessionVersion,
  expiry: draft.expiresAt.toISOString(),
  configurationHash: checksum(JSON.stringify(configuration)),
});
function configuration(
  inspection: Inspection,
  priceColumn: unknown,
  mapping: Record<string, number>,
): Configuration {
  const column =
    typeof priceColumn === "string" && /^\d{1,2}$/.test(priceColumn)
      ? Number(priceColumn)
      : priceColumn;
  if (
    typeof column !== "number" ||
    !inspection.priceColumns.some((p) => p.column === column)
  )
    throw new OrderSheetError(
      "Explicitly select the effective case-price column detected in this workbook.",
    );
  return { ...inspection, priceColumn: column, mapping };
}
export async function listOrderSheets() {
  await requireAdmin();
  return getDb().pricingTier.findMany({
    orderBy: { rank: "asc" },
    select: {
      id: true,
      name: true,
      rank: true,
      orderSheetActive: {
        select: { versionId: true, revision: true, updatedAt: true },
      },
      orderSheetVersions: {
        orderBy: { activatedAt: "desc" },
        take: 20,
        select: {
          id: true,
          filename: true,
          checksum: true,
          uploadedAt: true,
          activatedAt: true,
          parserVersion: true,
          uploadedBy: { select: { email: true } },
        },
      },
    },
  });
}
export async function uploadOrderSheet(
  file: unknown,
  selectedTier: unknown,
): Promise<SheetState> {
  const admin = await requireAdmin();
  try {
    const tierId = id(selectedTier);
    if (
      !(file instanceof File) ||
      !file.size ||
      file.size > LIMITS.upload ||
      !file.name.toLowerCase().endsWith(".xlsx")
    )
      throw new OrderSheetError(
        "Choose a nonempty .xlsx file no larger than 2 MiB.",
      );
    if (!(await consumeBucket(`order-sheet-upload:${admin.id}`, 5, 600)))
      throw new OrderSheetError(
        "Upload limit reached. Wait ten minutes before trying another file.",
      );
    const bytes = new Uint8Array(await file.arrayBuffer()),
      inspection = await inspectOrderSheet(bytes);
    if (inspection.errors.length)
      return {
        status: "invalid",
        message:
          "Activation blocked. Correct these source locations and upload again. The active version is unchanged.",
        inspection,
      };
    const raw = await readPublishedCatalogContent();
    const result = await getDb().$transaction(
      async (tx) => {
        await lockAdminActor(tx, admin);
        const current = await state(tx, tierId, raw);
        const active = await tx.orderSheetActive.findUnique({
          where: { tierId },
          select: { revision: true },
        });
        await tx.orderSheetDraft.deleteMany({
          where: { expiresAt: { lt: new Date() } },
        });
        const draft = await tx.orderSheetDraft.create({
          data: {
            tierId,
            original: bytes,
            checksum: checksum(bytes),
            filename: safeFilename(file.name),
            inspection: inspection as unknown as Prisma.InputJsonValue,
            stateHash: current.hash,
            expectedRevision: active?.revision ?? 0,
            uploadedById: admin.id,
            sessionVersion: admin.sessionVersion,
            expiresAt: new Date(Date.now() + ttl),
          },
          select: { id: true },
        });
        return { draftId: draft.id, tierName: current.tier.name };
      },
      { isolationLevel: "Serializable" },
    );
    return {
      status: "uploaded",
      ...result,
      inspection,
      message:
        "Select and review the effective case-price column. Uploading changes Excel exports only.",
    };
  } catch (error) {
    return invalid(error);
  }
}
async function reviewed(
  draftId: unknown,
  priceColumn: unknown,
  admin: { id: string; sessionVersion: number },
  tx: Prisma.TransactionClient,
  raw: unknown,
) {
  const draft = await tx.orderSheetDraft.findUnique({
    where: { id: id(draftId) },
    select: {
      id: true,
      tierId: true,
      checksum: true,
      inspection: true,
      stateHash: true,
      expectedRevision: true,
      uploadedById: true,
      sessionVersion: true,
      expiresAt: true,
    },
  });
  if (
    !draft ||
    draft.uploadedById !== admin.id ||
    draft.sessionVersion !== admin.sessionVersion ||
    draft.expiresAt.getTime() <= Date.now()
  )
    throw new OrderSheetError(
      "Preview expired or belongs to another session. Upload the workbook again.",
    );
  const current = await state(tx, draft.tierId, raw);
  const active = await tx.orderSheetActive.findUnique({
    where: { tierId: draft.tierId },
    select: { revision: true },
  });
  if (
    current.hash !== draft.stateHash ||
    (active?.revision ?? 0) !== draft.expectedRevision
  )
    throw new OrderSheetError(
      "Catalog, prices, tier or active template changed. Upload again for a fresh preview.",
    );
  const inspection = draft.inspection as unknown as Inspection;
  if (inspection.version !== VERSION || inspection.errors.length)
    throw new OrderSheetError("Unsupported preview. Upload again.");
  const cfg = configuration(inspection, priceColumn, {});
  const preview = mapSheet(inspection, raw, current.prices, cfg.priceColumn);
  cfg.mapping = preview.mapping;
  return { draft, current, inspection, cfg, preview };
}
export async function previewOrderSheet(
  draftId: unknown,
  priceColumn: unknown,
): Promise<SheetState> {
  const admin = await requireAdmin();
  try {
    const raw = await readPublishedCatalogContent();
    const r = await getDb().$transaction(
      (tx) => reviewed(draftId, priceColumn, admin, tx, raw),
      { isolationLevel: "RepeatableRead" },
    );
    return {
      status: "preview",
      draftId: r.draft.id,
      inspection: r.inspection,
      preview: r.preview,
      priceColumn: r.cfg.priceColumn,
      token: sign(bind(r.draft, r.cfg)),
      tierName: r.current.tier.name,
    };
  } catch (error) {
    return invalid(error);
  }
}
export async function activateOrderSheet(
  draftId: unknown,
  priceColumn: unknown,
  token: unknown,
  acknowledged: boolean,
): Promise<SheetState> {
  const admin = await requireAdmin();
  try {
    if (acknowledged !== true)
      throw new OrderSheetError(
        "Acknowledge the mapping warnings, fallback behavior and selected case-price column before activation.",
      );
    const raw = await readPublishedCatalogContent();
    await getDb().$transaction(
      async (tx) => {
        await lockAdminActor(tx, admin);
        const r = await reviewed(draftId, priceColumn, admin, tx, raw);
        const expected = sign(bind(r.draft, r.cfg));
        if (
          typeof token !== "string" ||
          token.length !== expected.length ||
          !timingSafeEqual(Buffer.from(token), Buffer.from(expected))
        )
          throw new OrderSheetError(
            "Confirmation does not match this reviewed file and configuration. Preview again.",
          );
        const file = await tx.orderSheetDraft.findUniqueOrThrow({
          where: { id: r.draft.id },
          select: { original: true, filename: true, uploadedAt: true },
        });
        if (checksum(file.original) !== r.draft.checksum)
          throw new OrderSheetError(
            "Stored file verification failed. Upload again.",
          );
        const version = await tx.orderSheetVersion.create({
          data: {
            tierId: r.draft.tierId,
            original: file.original,
            checksum: r.draft.checksum,
            filename: file.filename,
            parserVersion: VERSION,
            configuration: r.cfg as unknown as Prisma.InputJsonValue,
            uploadedById: admin.id,
            uploadedAt: file.uploadedAt,
          },
          select: { id: true },
        });
        // SERIALIZABLE + revision comparison prevents simultaneous replacements and ABA changes.
        await tx.orderSheetActive.upsert({
          where: { tierId: r.draft.tierId },
          create: {
            tierId: r.draft.tierId,
            versionId: version.id,
            revision: 1,
          },
          update: { versionId: version.id, revision: { increment: 1 } },
        });
        await tx.orderSheetDraft.delete({ where: { id: r.draft.id } });
      },
      { isolationLevel: "Serializable", timeout: 15000 },
    );
    return {
      status: "success",
      message:
        "Order sheet activated for future orders. Existing order exports keep their pinned version.",
    };
  } catch (error) {
    return invalid(error);
  }
}
export async function deactivateOrderSheet(
  tier: unknown,
  version: unknown,
): Promise<SheetState> {
  const admin = await requireAdmin();
  try {
    await getDb().$transaction(
      async (tx) => {
        await lockAdminActor(tx, admin);
        const result = await tx.orderSheetActive.updateMany({
          where: { tierId: id(tier), versionId: id(version) },
          data: { versionId: null, revision: { increment: 1 } },
        });
        if (result.count !== 1)
          throw new OrderSheetError(
            "The active version changed. Refresh before deactivating.",
          );
      },
      { isolationLevel: "Serializable" },
    );
    return {
      status: "success",
      message:
        "Template deactivated. Future orders use a complete snapshot fallback until a template is activated.",
    };
  } catch (error) {
    return invalid(error);
  }
}
