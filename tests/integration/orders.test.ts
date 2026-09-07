import { afterAll, beforeEach, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
const mock = vi.hoisted(() => ({ auth: vi.fn(), content: vi.fn(), email: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mock.auth }));
vi.mock("@/lib/catalog/content", () => ({ readPublishedCatalogContent: mock.content }));
vi.mock("@/lib/orders/email", () => ({ sendOrderEmail: mock.email }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); }, notFound: () => { throw new Error("notFound"); } }));
import { getDb } from "@/lib/db";
import { reviewOrder, submitOrder } from "@/lib/orders/service";
import { getAdminOrder, getAdminOrders, getCustomerConfirmation } from "@/lib/orders/reads";
import { openOrderReview, sealOrderReview } from "@/lib/orders/review-token";
import { fictionalProduct } from "../fixtures/catalog";

const db = getDb();
const key = "f6000000-0000-4000-8000-000000000001"; const second = key.replace(/1$/, "2");
let customer: { id: string; sessionVersion: number; customer: { id: string } | null };
let other: typeof customer; let admin: { id: string; sessionVersion: number }; let tier1: string; let tier2: string;
const items = [{ catalogKey: key, quantity: 3 }];
const products = () => [fictionalProduct({ _id: "order-one", catalogKey: key, name: "Fictional order product", sku: "ORDER-TEST" })];
async function cleanup() {
  await db.orderItem.deleteMany({ where: { order: { submittedByUser: { email: { startsWith: "test-order-" } } } } });
  await db.order.deleteMany({ where: { submittedByUser: { email: { startsWith: "test-order-" } } } });
  await db.productPrice.deleteMany({ where: { catalogKey: { in: [key, second] } } });
  await db.customer.deleteMany({ where: { user: { email: { startsWith: "test-order-" } } } });
  await db.user.deleteMany({ where: { email: { startsWith: "test-order-" } } });
}
beforeEach(async () => {
  await cleanup(); await db.loginRateLimit.deleteMany();
  tier1 = (await db.pricingTier.findUniqueOrThrow({ where: { name: "Tier 1" } })).id;
  tier2 = (await db.pricingTier.findUniqueOrThrow({ where: { name: "Tier 2" } })).id;
  customer = await db.user.create({ data: { email: "test-order-customer@example.test", role: "CUSTOMER", active: true, customer: { create: { companyName: "Fictional order business", customerNumber: "ORDER-FIXTURE", pricingTierId: tier1, active: true } } }, include: { customer: true } });
  other = await db.user.create({ data: { email: "test-order-other@example.test", role: "CUSTOMER", active: true, customer: { create: { companyName: "Other fictional business", pricingTierId: tier2, active: true } } }, include: { customer: true } });
  admin = await db.user.create({ data: { email: "test-order-admin@example.test", role: "ADMIN", active: true } });
  await db.productPrice.createMany({ data: [{ catalogKey: key, pricingTierId: tier1, price: "19.99" }, { catalogKey: key, pricingTierId: tier2, price: "7.13" }] });
  mock.auth.mockResolvedValue({ user: customer }); mock.content.mockResolvedValue(products()); mock.email.mockReset(); mock.email.mockResolvedValue(undefined);
});
afterAll(async () => { await cleanup(); await db.$disconnect(); });
async function stage(input: unknown = items) {
  const result = await reviewOrder(input); expect(result.status).toBe("review");
  if (result.status !== "review") throw new Error("No fixture review"); return result.review;
}
async function submit(token?: string) {
  const result = await submitOrder(token ?? (await stage()).token); expect(result.status).toBe("submitted");
  if (result.status !== "submitted") throw new Error("No fixture submission"); return result.reference;
}
const saved = () => db.order.findMany({ where: { customerId: customer.customer!.id }, include: { items: true } });

it.each(["anonymous", "admin", "disabled user", "disabled business", "revoked"])("denies %s review and submission", async (kind) => {
  const review = await stage();
  if (kind === "anonymous") mock.auth.mockResolvedValue(null);
  if (kind === "admin") mock.auth.mockResolvedValue({ user: admin });
  if (kind === "disabled user") await db.user.update({ where: { id: customer.id }, data: { active: false } });
  if (kind === "disabled business") await db.customer.update({ where: { id: customer.customer!.id }, data: { active: false } });
  if (kind === "revoked") await db.user.update({ where: { id: customer.id }, data: { sessionVersion: { increment: 1 } } });
  for (const call of [() => reviewOrder(items), () => submitOrder(review.token)]) await expect(call()).rejects.toThrow(kind === "admin" ? "notFound" : "redirect:/login");
  expect(await saved()).toHaveLength(0); expect(mock.email).not.toHaveBeenCalled();
});
it("ignores forged customer/tier/prices/totals, previews without writes and sends only a persisted snapshot", async () => {
  const review = await stage([{ ...items[0], customerId: other.customer!.id, pricingTierId: tier2, unitPrice: "0.01", lineTotal: "0.03", total: "0.03" }]);
  expect(review.total).toBe("59.97"); expect(await saved()).toHaveLength(0); expect(mock.email).not.toHaveBeenCalled();
  mock.email.mockImplementation(async (email) => { expect(await db.order.findUnique({ where: { reference: email.reference } })).not.toBeNull(); });
  const reference = await submit(review.token); const order = (await saved())[0];
  expect(order.customerId).toBe(customer.customer!.id); expect(order.pricingTierIdSnapshot).toBe(tier1);
  expect(order.total.toFixed(2)).toBe("59.97"); expect(order.items[0].unitPriceSnapshot.toFixed(2)).toBe("19.99");
  expect(order.notificationStatus).toBe("ACCEPTED"); expect(mock.email).toHaveBeenCalledTimes(1);
  const receipt = await getCustomerConfirmation(reference); expect(receipt.total).toBe("59.97");
  expect(receipt).not.toHaveProperty("notificationStatus"); expect(receipt).not.toHaveProperty("tierId");
});
it.each(["unavailable", "missing price", "unknown key", "duplicate identity", "malformed identity", "Sanity failure"])("rejects %s without partial orders or mail", async (kind) => {
  const review = await stage();
  if (kind === "unavailable") mock.content.mockResolvedValue([fictionalProduct({ catalogKey: key, available: false })]);
  if (kind === "missing price") await db.productPrice.deleteMany({ where: { catalogKey: key, pricingTierId: tier1 } });
  if (kind === "unknown key") mock.content.mockResolvedValue([]);
  if (kind === "duplicate identity") mock.content.mockResolvedValue([...products(), { ...products()[0], _id: "duplicate" }]);
  if (kind === "malformed identity") mock.content.mockResolvedValue([fictionalProduct({ catalogKey: "bad" })]);
  if (kind === "Sanity failure") mock.content.mockRejectedValue(new Error("FICTIONAL_PROVIDER_SECRET"));
  expect((await reviewOrder(items)).status).toBe("invalid"); const result = await submitOrder(review.token);
  expect(result.status).toBe("invalid"); expect(JSON.stringify(result)).not.toContain("FICTIONAL_PROVIDER_SECRET");
  expect(await saved()).toHaveLength(0); expect(mock.email).not.toHaveBeenCalled();
});
it.each([-1, 1.1, "NaN", "Infinity", 1000, "1e2"])("server rejects quantity %s", async (quantity) => {
  expect((await reviewOrder([{ catalogKey: key, quantity }])).status).toBe("invalid"); expect(await saved()).toHaveLength(0);
});
it("server rejects malformed, duplicate, empty and excessive product lists", async () => {
  for (const input of [[], [{ catalogKey: "bad", quantity: 1 }], [...items, ...items], Array(251).fill(items[0])]) expect((await reviewOrder(input)).status).toBe("invalid");
  expect(await saved()).toHaveLength(0);
});
it.each(["price", "tier", "SKU/name", "document identity", "company"])("requires renewed review after %s changes and snapshots the new values", async (kind) => {
  const review = await stage();
  if (kind === "price") await db.productPrice.updateMany({ where: { catalogKey: key, pricingTierId: tier1 }, data: { price: "20.99" } });
  if (kind === "tier") await db.customer.update({ where: { id: customer.customer!.id }, data: { pricingTierId: tier2 } });
  if (kind === "SKU/name") mock.content.mockResolvedValue(products().map((row) => ({ ...row, sku: "CHANGED", name: "Changed fictional product" })));
  if (kind === "document identity") mock.content.mockResolvedValue(products().map((row) => ({ ...row, _id: "changed-document" })));
  if (kind === "company") await db.customer.update({ where: { id: customer.customer!.id }, data: { companyName: "Changed fictional business" } });
  const result = await submitOrder(review.token); expect(result.status).toBe("review"); expect(await saved()).toHaveLength(0);
  if (result.status !== "review") throw new Error();
  expect(result.message).toContain("changed before submission"); await submit(result.review.token);
  expect((await saved())[0].total.toFixed(2)).toBe(kind === "price" ? "62.97" : kind === "tier" ? "21.39" : "59.97");
});
it("concurrent/replayed final submissions create one order and one notification, even after price removal", async () => {
  const review = await stage(); const results = await Promise.all([submitOrder(review.token), submitOrder(review.token)]);
  expect(results.every((result) => result.status === "submitted")).toBe(true);
  expect(await saved()).toHaveLength(1); expect(mock.email).toHaveBeenCalledTimes(1);
  await db.productPrice.deleteMany({ where: { catalogKey: key } }); mock.content.mockRejectedValue(new Error("offline"));
  await submit(review.token); expect(await saved()).toHaveLength(1); expect(mock.email).toHaveBeenCalledTimes(1);
});
it("rejects expired or tampered reviews and cross-customer token reuse", async () => {
  const review = await stage(); const payload = openOrderReview(review.token, { ...customer, customer: customer.customer! });
  expect((await submitOrder(sealOrderReview({ ...payload, expiresAt: Date.now() - 1 }))).status).toBe("invalid");
  expect((await submitOrder(review.token.slice(0, -10) + "AAAAAAAAAA")).status).toBe("invalid");
  mock.auth.mockResolvedValue({ user: other }); expect((await submitOrder(review.token)).status).toBe("invalid");
  expect(await saved()).toHaveLength(0);
});
it("keeps historical snapshots after all source data changes and requires ownership for receipts", async () => {
  const reference = await submit(); const before = await getCustomerConfirmation(reference);
  await db.customer.update({ where: { id: customer.customer!.id }, data: { companyName: "Changed", customerNumber: "CHANGED", pricingTierId: tier2 } });
  await db.productPrice.deleteMany({ where: { catalogKey: key } }); mock.content.mockRejectedValue(new Error("Sanity unavailable"));
  expect(await getCustomerConfirmation(reference)).toEqual(before);
  mock.auth.mockResolvedValue({ user: other }); await expect(getCustomerConfirmation(reference)).rejects.toThrow("notFound");
  await expect(getAdminOrders(undefined)).rejects.toThrow("notFound"); await expect(getAdminOrder(reference)).rejects.toThrow("notFound");
  mock.auth.mockResolvedValue(null); await expect(getCustomerConfirmation(reference)).rejects.toThrow("redirect:/login"); await expect(getAdminOrders(undefined)).rejects.toThrow("redirect:/login");
  mock.auth.mockResolvedValue({ user: admin });
  expect(await getAdminOrder(reference)).toMatchObject({ companyName: "Fictional order business", customerNumber: "ORDER-FIXTURE", tierName: "Tier 1", total: "59.97" });
  expect((await getAdminOrders(undefined)).orders).toHaveLength(1);
});
it("retains orders on email failure and never retries mail on idempotent submission", async () => {
  mock.email.mockRejectedValue(new Error("FICTIONAL_RESEND_SECRET")); const review = await stage();
  const reference = await submit(review.token); expect((await saved())[0].notificationStatus).toBe("FAILED");
  expect(JSON.stringify(await getCustomerConfirmation(reference))).not.toContain("FAILED");
  await submit(review.token); expect(mock.email).toHaveBeenCalledTimes(1);
});
it("rolls back the parent order and all items on a failed item insert and sends no mail", async () => {
  const review = await stage();
  await db.$executeRawUnsafe(`CREATE FUNCTION order_test_reject() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Fictional order failure'; END $$`);
  await db.$executeRawUnsafe(`CREATE TRIGGER order_test_reject BEFORE INSERT ON "OrderItem" FOR EACH ROW EXECUTE FUNCTION order_test_reject()`);
  try { expect((await submitOrder(review.token)).status).toBe("invalid"); expect(await saved()).toHaveLength(0); expect(mock.email).not.toHaveBeenCalled(); }
  finally { await db.$executeRawUnsafe(`DROP TRIGGER order_test_reject ON "OrderItem"`); await db.$executeRawUnsafe(`DROP FUNCTION order_test_reject()`); }
});
it("enforces 10 persisted orders/hour with a database count and permits identical retries", async () => {
  let review = await stage();
  for (let index = 0; index < 10; index++) { if (index) review = await stage(); await submit(review.token); }
  expect((await submitOrder((await stage()).token)).status).toBe("invalid"); expect(await saved()).toHaveLength(10);
  await submit(review.token); expect(await saved()).toHaveLength(10);
});
it("limits repeated review work server-side", async () => {
  for (let index = 0; index < 30; index++) await stage();
  expect(await reviewOrder(items)).toMatchObject({ status: "invalid", message: expect.stringContaining("Wait a minute") });
});
it("bounds admin queries to 50 orders and paginates without duplicates", async () => {
  const reference = await submit(); const base = (await saved())[0];
  await db.order.createMany({ data: Array.from({ length: 50 }, (_, index) => ({ reference: `BW-${String(index).padStart(20, "0")}`, submissionId: randomUUID(), reviewHash: base.reviewHash,
    customerId: base.customerId, submittedByUserId: base.submittedByUserId, companyNameSnapshot: base.companyNameSnapshot, emailSnapshot: base.emailSnapshot,
    pricingTierIdSnapshot: base.pricingTierIdSnapshot, pricingTierNameSnapshot: base.pricingTierNameSnapshot, total: "0.00" })) });
  mock.auth.mockResolvedValue({ user: admin }); const first = await getAdminOrders(undefined); expect(first.orders).toHaveLength(50); expect(first.nextCursor).not.toBeNull();
  const next = await getAdminOrders(first.nextCursor!); expect(next.orders).toHaveLength(1); expect(next.orders[0].reference).toBe(reference);
});
it("persists the maximum 250-line order with exact maximum amounts in one transaction", async () => {
  const many = Array.from({ length: 250 }, (_, index) => `f6000000-0000-4000-8000-${String(index + 100).padStart(12, "0")}`);
  mock.content.mockResolvedValue(many.map((catalogKey, index) => fictionalProduct({ _id: `large-order-${index}`, catalogKey })));
  await db.productPrice.createMany({ data: many.map((catalogKey) => ({ catalogKey, pricingTierId: tier1, price: "9999999999.99" })) });
  try {
    const review = await stage(many.map((catalogKey) => ({ catalogKey, quantity: 999 })));
    expect(review.total).toBe("2497499999997502.50"); await submit(review.token);
    const order = (await saved())[0]; expect(order.items).toHaveLength(250); expect(order.total.toFixed(2)).toBe(review.total);
  } finally { await db.productPrice.deleteMany({ where: { catalogKey: { in: many } } }); }
});
