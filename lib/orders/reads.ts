import "server-only";
import { requireAdmin, requireCustomer } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db";
import { notFound } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import type { OrderReceipt } from "./types";

const referencePattern = /^BW-[A-F0-9]{20}$/;
const withItems = { items: { orderBy: { catalogKey: "asc" as const } } };
type StoredOrder = Prisma.OrderGetPayload<{ include: typeof withItems }>;
function receipt(order: StoredOrder): OrderReceipt {
  return { reference: order.reference, createdAt: order.createdAt.toISOString(), companyName: order.companyNameSnapshot, total: order.total.toFixed(2),
    items: order.items.map((item) => ({ catalogKey: item.catalogKey, sku: item.skuSnapshot, name: item.productNameSnapshot,
      unitPrice: item.unitPriceSnapshot.toFixed(2), lineTotal: item.lineTotalSnapshot.toFixed(2), quantity: item.quantity })) };
}
export async function getCustomerConfirmation(reference: unknown) {
  const user = await requireCustomer();
  if (typeof reference !== "string" || !referencePattern.test(reference)) notFound();
  const order = await getDb().order.findFirst({ where: { reference, customerId: user.customer.id }, include: withItems });
  if (!order) notFound();
  // Explicit customer DTO: no notification status, tier ID, internal IDs or email.
  return receipt(order);
}
export async function getAdminOrder(reference: unknown) {
  await requireAdmin();
  if (typeof reference !== "string" || !referencePattern.test(reference)) notFound();
  const order = await getDb().order.findUnique({ where: { reference }, include: withItems });
  if (!order) notFound();
  return { ...receipt(order), email: order.emailSnapshot, customerNumber: order.customerNumberSnapshot, tierName: order.pricingTierNameSnapshot,
    notificationStatus: order.notificationStatus, notificationAcceptedAt: order.notificationAcceptedAt?.toISOString() ?? null };
}
export async function getAdminOrders(cursor: unknown) {
  await requireAdmin();
  if (cursor !== undefined && (typeof cursor !== "string" || !/^c[a-z0-9]{24,31}$/.test(cursor))) notFound();
  const orders = await getDb().order.findMany({
    take: 51, ...(typeof cursor === "string" ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true, reference: true, companyNameSnapshot: true, createdAt: true, total: true, notificationStatus: true },
  });
  return { nextCursor: orders.length > 50 ? orders[49].id : null, orders: orders.slice(0, 50).map((order) => ({ reference: order.reference,
    companyName: order.companyNameSnapshot, createdAt: order.createdAt.toISOString(), total: order.total.toFixed(2), notificationStatus: order.notificationStatus })) };
}
