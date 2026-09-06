import { afterAll, beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ auth: vi.fn(), content: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mock.auth }));
vi.mock("@/lib/catalog/content", () => ({ readPublishedCatalogContent: mock.content }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); }, notFound: () => { throw new Error("notFound"); } }));
import { getDb } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { getAvailableCatalogForCustomer } from "@/lib/catalog/service";
import { auditCatalog } from "@/lib/catalog/audit";
import { catalogKeys, fictionalProduct } from "../fixtures/catalog";

const db = getDb();
let tier1: string; let tier2: string;
let user1: { id: string; sessionVersion: number }; let user2: { id: string; sessionVersion: number };
async function cleanup() {
  await db.productPrice.deleteMany({ where: { catalogKey: { in: Object.values(catalogKeys) } } });
  await db.customer.deleteMany({ where: { user: { email: { startsWith: "test-catalog-" } } } });
  await db.user.deleteMany({ where: { email: { startsWith: "test-catalog-" } } });
}
beforeEach(async () => {
  await cleanup();
  tier1 = (await db.pricingTier.findUniqueOrThrow({ where: { name: "Tier 1" } })).id;
  tier2 = (await db.pricingTier.findUniqueOrThrow({ where: { name: "Tier 2" } })).id;
  user1 = await db.user.create({ data: { email: "test-catalog-one@example.test", active: true, role: "CUSTOMER", customer: { create: { companyName: "Fictional catalog customer one", active: true, pricingTierId: tier1 } } } });
  user2 = await db.user.create({ data: { email: "test-catalog-two@example.test", active: true, role: "CUSTOMER", customer: { create: { companyName: "Fictional catalog customer two", active: true, pricingTierId: tier2 } } } });
  await db.productPrice.createMany({ data: [
    { catalogKey: catalogKeys.one, pricingTierId: tier1, price: new Prisma.Decimal("19.95") },
    { catalogKey: catalogKeys.one, pricingTierId: tier2, price: new Prisma.Decimal("17.13") },
    { catalogKey: catalogKeys.hidden, pricingTierId: tier1, price: new Prisma.Decimal("7.00") },
  ] });
  mock.auth.mockResolvedValue({ user: user1 });
  mock.content.mockReset().mockResolvedValue([fictionalProduct(), fictionalProduct({ _id: "hidden", catalogKey: catalogKeys.hidden, available: false })]);
});
afterAll(async () => { await cleanup(); await db.$disconnect(); });

it("enforces unique product/tier, tier relation and decimal-safe storage", async () => {
  await expect(db.productPrice.create({ data: { catalogKey: catalogKeys.one, pricingTierId: tier1, price: "2.00" } })).rejects.toMatchObject({ code: "P2002" });
  await expect(db.productPrice.create({ data: { catalogKey: catalogKeys.two, pricingTierId: "nonexistent", price: "2.00" } })).rejects.toMatchObject({ code: "P2003" });
  await db.productPrice.create({ data: { catalogKey: catalogKeys.two, pricingTierId: tier1, price: new Prisma.Decimal("0.10").plus("0.20") } });
  expect((await db.productPrice.findUniqueOrThrow({ where: { catalogKey_pricingTierId: { catalogKey: catalogKeys.two, pricingTierId: tier1 } } })).price.toFixed(2)).toBe("0.30");
  const columns = await db.$queryRaw<{ data_type: string; numeric_scale: number }[]>`SELECT data_type, numeric_scale FROM information_schema.columns WHERE table_name = 'ProductPrice' AND column_name = 'price'`;
  expect(columns[0]).toMatchObject({ data_type: "numeric", numeric_scale: 2 });
});
it.each(["-0.01", "NaN", "Infinity"])("database rejects unsafe price %s", async (price) => {
  await expect(db.$executeRaw`INSERT INTO "ProductPrice" ("catalogKey", "pricingTierId", "price", "updatedAt") VALUES (${catalogKeys.two}::uuid, ${tier1}, ${price}::numeric, NOW())`).rejects.toThrow();
});
it("each customer receives only their current tier, with no browser-selected context", async () => {
  const spoofedRead = getAvailableCatalogForCustomer as unknown as (input: unknown) => ReturnType<typeof getAvailableCatalogForCustomer>;
  const first = await spoofedRead({ customerId: user2.id, pricingTierId: tier2, price: "0.01", role: "ADMIN" });
  expect(first).toMatchObject({ status: "ready", products: [{ catalogKey: catalogKeys.one, price: "19.95" }] });
  expect(first.products).toHaveLength(1); expect(first.products[0]).not.toHaveProperty("pricingTierId"); expect(first.products[0]).not.toHaveProperty("customerId");
  mock.auth.mockResolvedValue({ user: { ...user2, pricingTierId: tier1, customerId: user1.id } });
  expect((await getAvailableCatalogForCustomer()).products[0].price).toBe("17.13");
});
it("tier and price/availability edits affect the next call without a new login or shared cache", async () => {
  expect((await getAvailableCatalogForCustomer()).products[0].price).toBe("19.95");
  await db.customer.update({ where: { userId: user1.id }, data: { pricingTierId: tier2 } });
  expect((await getAvailableCatalogForCustomer()).products[0].price).toBe("17.13");
  await db.productPrice.update({ where: { catalogKey_pricingTierId: { catalogKey: catalogKeys.one, pricingTierId: tier2 } }, data: { price: "16.02" } });
  expect((await getAvailableCatalogForCustomer()).products[0].price).toBe("16.02");
  mock.content.mockResolvedValue([fictionalProduct({ available: false })]);
  expect((await getAvailableCatalogForCustomer()).products).toEqual([]);
});
it("omits missing prices, unavailable products and all ambiguous-key documents", async () => {
  mock.content.mockResolvedValue([
    fictionalProduct(), fictionalProduct({ _id: "duplicate", available: false }),
    fictionalProduct({ _id: "two", catalogKey: catalogKeys.two }),
    fictionalProduct({ _id: "hidden", catalogKey: catalogKeys.hidden, available: false }),
  ]);
  expect(await getAvailableCatalogForCustomer()).toEqual({ status: "ready", products: [] });
});
it("returns a safe failure without upstream internals or stale prices", async () => {
  expect((await getAvailableCatalogForCustomer()).products).toHaveLength(1);
  mock.content.mockRejectedValue(new Error("SECRET read token and provider error"));
  expect(await getAvailableCatalogForCustomer()).toEqual({ status: "unavailable", products: [], message: "The catalog is temporarily unavailable. Please try again later." });
});
it.each(["anonymous", "admin", "disabled", "disabled-business", "revoked"])("denies %s before contacting Sanity or querying prices", async (mode) => {
  if (mode === "anonymous") mock.auth.mockResolvedValue(null);
  if (mode === "admin") { const admin = await db.user.findUniqueOrThrow({ where: { email: "admin@example.test" } }); mock.auth.mockResolvedValue({ user: { id: admin.id, sessionVersion: admin.sessionVersion } }); }
  if (mode === "disabled") await db.user.update({ where: { id: user1.id }, data: { active: false } });
  if (mode === "disabled-business") await db.customer.update({ where: { userId: user1.id }, data: { active: false } });
  if (mode === "revoked") await db.user.update({ where: { id: user1.id }, data: { sessionVersion: 1 } });
  await expect(getAvailableCatalogForCustomer()).rejects.toThrow(mode === "admin" ? "notFound" : "redirect:/login");
  expect(mock.content).not.toHaveBeenCalled();
});
it("read-only audit identifies missing tier prices and orphaned rows without exposing amounts", async () => {
  await db.productPrice.create({ data: { catalogKey: catalogKeys.orphan, pricingTierId: tier1, price: "9999987.65" } });
  await db.productPrice.delete({ where: { catalogKey_pricingTierId: { catalogKey: catalogKeys.one, pricingTierId: tier2 } } });
  const count = await db.productPrice.count(); const report = await auditCatalog();
  expect(report.issues).toContainEqual({ code: "orphaned_price", catalogKey: catalogKeys.orphan, pricingTierId: tier1 });
  expect(report.issues).toContainEqual({ code: "available_product_missing_valid_price", catalogKey: catalogKeys.one, pricingTierId: tier2 });
  expect(JSON.stringify(report)).not.toContain("9999987.65"); expect(await db.productPrice.count()).toBe(count);
});
