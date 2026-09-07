import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { requireCustomer } from "@/lib/auth/authorization";
import { consumeBucket } from "@/lib/auth/rate-limit";
import { validTier } from "@/lib/pricing/tiers";
import { readPublishedCatalogContent } from "@/lib/catalog/content";
import { normalizeCatalogContent } from "@/lib/catalog/normalize";
import { priceText } from "@/lib/catalog/money";
import { OrderError, requestedItems, lineTotal, sumAmounts, type RequestedItem } from "./input";
import { sealOrderReview, openOrderReview, type ReviewToken } from "./review-token";
import { sendOrderEmail } from "./email";
import type { OrderState, OrderLine } from "./types";

type CustomerPrincipal = Awaited<ReturnType<typeof requireCustomer>>;
export const orderUnavailable = "Ordering is temporarily unavailable. Please try again. If you already submitted, retry the same submission before starting another order.";
const message = (error: unknown) => error instanceof OrderError ? error.message : orderUnavailable;
const db = () => getDb();

async function currentSnapshot(tx: Prisma.TransactionClient, user: CustomerPrincipal, items: RequestedItem[], raw: unknown) {
  const current = await tx.user.findUnique({ where: { id: user.id }, select: {
    id: true, email: true, active: true, role: true, sessionVersion: true,
    customer: { select: { id: true, active: true, companyName: true, customerNumber: true, pricingTierId: true, pricingTier: { select: { name: true, rank: true } } } },
  } });
  const customer = current?.customer;
  if (!current?.active || current.role !== "CUSTOMER" || current.sessionVersion !== user.sessionVersion || !customer?.active || customer.id !== user.customer.id) throw new OrderError("Your account changed. Sign in again before ordering.");
  if (!validTier(customer.pricingTier)) throw new OrderError("Your pricing is unavailable. Contact Big Wicks.");
  const content = normalizeCatalogContent(raw);
  const prices = await tx.productPrice.findMany({ where: { pricingTierId: customer.pricingTierId, catalogKey: { in: items.map((item) => item.catalogKey) } }, select: { catalogKey: true, price: true } });
  const lines: OrderLine[] = items.map((item) => {
    const product = content.products.find((product) => product.catalogKey === item.catalogKey);
    if (!product?.available) throw new OrderError("A selected product is no longer available. Return to the catalog, reload it and review your case counts.");
    const price = priceText(prices.find((row) => row.catalogKey === item.catalogKey)?.price);
    if (price === null) throw new OrderError("A selected product no longer has a valid price. Reload the catalog and review your case counts.");
    return { catalogKey: product.catalogKey, sku: product.sku, name: product.name, brand: product.brand, packing: product.packing,
      unitPrice: price, quantity: item.quantity, lineTotal: lineTotal(price, item.quantity) };
  });
  const identity = (raw as { _id: string; catalogKey?: string }[])
    .filter((row) => !row._id.startsWith("drafts.") && !row._id.startsWith("versions.") && items.some((item) => item.catalogKey === row.catalogKey))
    .map((row) => [row._id, row.catalogKey]).sort((a, b) => a[0]!.localeCompare(b[0]!));
  const snapshot = { customerId: customer.id, userId: current.id, companyName: customer.companyName, customerNumber: customer.customerNumber,
    email: current.email, tierId: customer.pricingTierId, tierName: customer.pricingTier.name, items: lines, total: sumAmounts(lines.map((line) => line.lineTotal)) };
  return { ...snapshot, hash: createHash("sha256").update(JSON.stringify({ snapshot, identity })).digest("hex") };
}
type Snapshot = Awaited<ReturnType<typeof currentSnapshot>>;
function reviewState(user: CustomerPrincipal, snapshot: Snapshot, items: RequestedItem[], submissionId: string = randomUUID(), changed = false): OrderState {
  const token = sealOrderReview({ userId: user.id, customerId: user.customer.id, sessionVersion: user.sessionVersion, submissionId,
    expiresAt: Date.now() + 15 * 60 * 1000, hash: snapshot.hash, items });
  return { status: "review", review: { items: snapshot.items, total: snapshot.total, token },
    ...(changed ? { message: "Your order changed before submission. Review the refreshed values, then submit again. No order was created." } : {}) };
}
async function attemptLimit(userId: string) {
  if (!await consumeBucket(`order-attempt:${userId}`, 30, 60)) throw new OrderError("Too many ordering attempts. Wait a minute and try again.");
}
export async function reviewOrder(input: unknown): Promise<OrderState> {
  const user = await requireCustomer();
  try {
    await attemptLimit(user.id);
    const items = requestedItems(input);
    const raw = await readPublishedCatalogContent();
    const snapshot = await db().$transaction((tx) => currentSnapshot(tx, user, items, raw), { isolationLevel: "RepeatableRead" });
    return reviewState(user, snapshot, items);
  } catch (error) { return { status: "invalid", message: message(error) }; }
}
async function persistedReview(staged: ReviewToken) {
  const order = await db().order.findUnique({ where: { customerId_submissionId: { customerId: staged.customerId, submissionId: staged.submissionId } }, select: { reference: true, reviewHash: true } });
  if (order && order.reviewHash !== staged.hash) throw new OrderError("This submission was already used for a different review. Reload the catalog.");
  return order ? { status: "submitted" as const, reference: order.reference } : null;
}
export async function submitOrder(token: unknown): Promise<OrderState> {
  const user = await requireCustomer();
  let staged: ReviewToken | undefined;
  try {
    staged = openOrderReview(token, user);
    const existing = await persistedReview(staged);
    if (existing) return existing;
    if (staged.expiresAt <= Date.now()) throw new OrderError("This review expired. Review your order again before submitting.");
    await attemptLimit(user.id);
    const raw = await readPublishedCatalogContent();
    const payload = staged;
    const result = await db().$transaction(async (tx) => {
      // Serialize this customer's submissions with access changes; lock order
      // matches existing admin/account writers (User before Customer).
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${user.id} FOR UPDATE`;
      await tx.$queryRaw`SELECT "id" FROM "Customer" WHERE "id" = ${user.customer.id} FOR SHARE`;
      const snapshot = await currentSnapshot(tx, user, payload.items, raw);
      const prior = await tx.order.findUnique({ where: { customerId_submissionId: { customerId: user.customer.id, submissionId: payload.submissionId } } });
      if (prior) {
        if (prior.reviewHash !== payload.hash) throw new OrderError("This submission was already used. Reload the catalog.");
        return { kind: "existing" as const, reference: prior.reference };
      }
      if (payload.expiresAt <= Date.now()) throw new OrderError("This review expired. Review your order again before submitting.");
      if (snapshot.hash !== payload.hash) return { kind: "changed" as const, snapshot };
      const counts = await tx.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*)::bigint AS count FROM "Order" WHERE "customerId" = ${user.customer.id} AND "createdAt" > NOW() - INTERVAL '1 hour'`;
      if (counts[0].count >= BigInt(10)) throw new OrderError("You have reached the limit of 10 order requests per hour. Please try again later.");
      const order = await tx.order.create({ data: {
        reference: `BW-${randomBytes(10).toString("hex").toUpperCase()}`, submissionId: payload.submissionId, reviewHash: payload.hash,
        customerId: snapshot.customerId, submittedByUserId: snapshot.userId, companyNameSnapshot: snapshot.companyName,
        customerNumberSnapshot: snapshot.customerNumber, emailSnapshot: snapshot.email,
        pricingTierIdSnapshot: snapshot.tierId, pricingTierNameSnapshot: snapshot.tierName, total: snapshot.total,
        items: { createMany: { data: snapshot.items.map((item) => ({ catalogKey: item.catalogKey, skuSnapshot: item.sku, productNameSnapshot: item.name,
          brandSnapshot: item.brand, packingSnapshot: item.packing, unitPriceSnapshot: item.unitPrice, quantity: item.quantity, lineTotalSnapshot: item.lineTotal })) } },
      } });
      return { kind: "created" as const, order, snapshot };
    }, { isolationLevel: "Serializable", maxWait: 5000, timeout: 15000 });
    if (result.kind === "changed") return reviewState(user, result.snapshot, payload.items, payload.submissionId, true);
    if (result.kind === "existing") return { status: "submitted", reference: result.reference };
    // Persistence is complete before notification. Neither provider nor status
    // storage failure can turn an authoritative stored order into a failed order.
    let accepted = false;
    try {
      await sendOrderEmail({ reference: result.order.reference, createdAt: result.order.createdAt.toISOString(), companyName: result.snapshot.companyName,
        customerNumber: result.snapshot.customerNumber, email: result.snapshot.email, items: result.snapshot.items, total: result.snapshot.total });
      accepted = true;
    } catch { /* Safe FAILED/PENDING status is visible to staff; never log payloads. */ }
    try {
      await db().order.update({ where: { id: result.order.id }, data: { notificationStatus: accepted ? "ACCEPTED" : "FAILED", notificationAcceptedAt: accepted ? new Date() : null } });
    } catch { /* PENDING signals an interrupted/uncertain attempt for staff follow-up. */ }
    return { status: "submitted", reference: result.order.reference };
  } catch (error) {
    if (staged && error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) {
      try { const existing = await persistedReview(staged); if (existing) return existing; } catch { /* Return safe retry state. */ }
      return { status: "invalid", message: "Data changed during submission. Retry this submission; no duplicate order will be created." };
    }
    return { status: "invalid", message: message(error) };
  }
}
