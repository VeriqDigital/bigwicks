const configuredTiers = [{ id: "t1", name: "Tier 1", rank: 1 }, { id: "t2", name: "Tier 2", rank: 2 }];
import { afterAll, beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ auth: vi.fn(), content: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mock.auth }));
vi.mock("@/lib/catalog/content", () => ({ readPublishedCatalogContent: mock.content }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); }, notFound: () => { throw new Error("notFound"); } }));
import { getDb } from "@/lib/db";
import { getAdminPricing, getAdminPricingExport, previewPricingImport, confirmPricingImport } from "@/lib/pricing/service";
import { csvHeaders, parsePricingCsv } from "@/lib/pricing/csv";
import { getAvailableCatalogForCustomer } from "@/lib/catalog/service";
import { GET as exportRoute } from "@/app/(portal)/admin/pricing/export/route";
import { fictionalProduct } from "../fixtures/catalog";

const db = getDb();
const one = "d4000000-0000-4000-8000-000000000001"; const two = "d4000000-0000-4000-8000-000000000002"; const orphan = "d4000000-0000-4000-8000-000000000003";
const keys = [one, two, orphan];
let admin: { id: string; sessionVersion: number }; let customer: { id: string; sessionVersion: number }; let tier1: string; let tier2: string;
const products = () => [fictionalProduct({ _id: "pricing-one", catalogKey: one }), fictionalProduct({ _id: "pricing-two", catalogKey: two, name: "Hidden fixture", available: false })];
const file = (price = "21.23", second = "7.89") => new File([`${[...csvHeaders, "price:1:Tier 1", "price:2:Tier 2"].join(",")}\n${one},TEST-ONLY-001,Fictional test product one,,true,${price},${second}\n${two},TEST-ONLY-001,Hidden fixture,,false,,\n`], "fixture.csv");
async function staged(upload = file()) {
  const result = await previewPricingImport(upload); expect(result.status).toBe("preview");
  if (result.status !== "preview") throw new Error("No test preview"); return result;
}
const prices = () => db.productPrice.findMany({ where: { catalogKey: { in: keys } }, orderBy: [{ catalogKey: "asc" }, { pricingTierId: "asc" }] });
async function cleanup() {
  await db.productPrice.deleteMany({ where: { catalogKey: { in: keys } } });
  await db.customer.deleteMany({ where: { user: { email: { startsWith: "test-pricing-" } } } });
  await db.user.deleteMany({ where: { email: { startsWith: "test-pricing-" } } });
}
beforeEach(async () => {
  await cleanup();
  tier1 = (await db.pricingTier.findUniqueOrThrow({ where: { name: "Tier 1" } })).id;
  tier2 = (await db.pricingTier.findUniqueOrThrow({ where: { name: "Tier 2" } })).id;
  admin = await db.user.create({ data: { email: "test-pricing-admin@example.test", role: "ADMIN", active: true } });
  customer = await db.user.create({ data: { email: "test-pricing-customer@example.test", role: "CUSTOMER", active: true, customer: { create: { companyName: "Fictional pricing customer", pricingTierId: tier1, active: true } } } });
  mock.auth.mockResolvedValue({ user: admin }); mock.content.mockResolvedValue(products());
  await db.productPrice.createMany({ data: [{ catalogKey: one, pricingTierId: tier1, price: "19.95" }, { catalogKey: one, pricingTierId: tier2, price: "17.13" }, { catalogKey: two, pricingTierId: tier2, price: "8.01" }] });
});
afterAll(async () => { await cleanup(); await db.$disconnect(); });
it("exports current keys, exact prices and hidden products with private/no-store headers", async () => {
  const response = await exportRoute(); expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toContain("private, no-store");
  expect(response.headers.get("content-disposition")).toContain("attachment");
  const csv = await response.text(); const parsed = parsePricingCsv(new TextEncoder().encode(csv), configuredTiers);
  expect(parsed.rows).toHaveLength(2); expect(parsed.rows[0]).toMatchObject({ catalogKey: one, prices: { "price:1:Tier 1": "19.95", "price:2:Tier 2": "17.13" } });
  expect(csv).toContain('"false"');
});
it.each(["anonymous", "customer", "disabled", "revoked"])("rejects %s for dashboard/export/upload/confirm", async (kind) => {
  const preview = await staged();
  if (kind === "anonymous") mock.auth.mockResolvedValue(null);
  if (kind === "customer") mock.auth.mockResolvedValue({ user: customer });
  if (kind === "disabled") await db.user.update({ where: { id: admin.id }, data: { active: false } });
  if (kind === "revoked") await db.user.update({ where: { id: admin.id }, data: { sessionVersion: { increment: 1 } } });
  for (const read of [getAdminPricing, getAdminPricingExport, exportRoute, () => previewPricingImport(file()), () => confirmPricingImport(preview.token, true)]) {
    await expect(read()).rejects.toThrow(kind === "customer" ? "notFound" : "redirect:/login");
  }
});
it("preview writes nothing and confirmation explicitly removes blanks while updating both independent tiers", async () => {
  const before = await prices(); const stage = await staged(); expect(await prices()).toEqual(before);
  expect(stage.preview.summary).toMatchObject([{ update: 1, unchanged: 1 }, { update: 1, remove: 1 }]);
  expect((await confirmPricingImport(stage.token, false)).status).toBe("invalid"); expect(await prices()).toEqual(before);
  expect((await confirmPricingImport(stage.token, true)).status).toBe("success");
  expect((await prices()).map((row) => row.price.toFixed(2)).sort()).toEqual(["21.23", "7.89"]);
  expect((await confirmPricingImport(stage.token, true)).status).toBe("invalid");
  mock.auth.mockResolvedValue({ user: customer });
  expect((await getAvailableCatalogForCustomer()).products[0].price).toBe("21.23");
});
it("creates absent prices, preserves omitted products and recognizes unchanged amounts", async () => {
  await db.productPrice.deleteMany({ where: { catalogKey: one } });
  const stage = await staged(new File([`${[...csvHeaders, "price:1:Tier 1", "price:2:Tier 2"].join(",")}\n${one},,,,,0.00,9999999999.99`], "fixture.csv"));
  expect(stage.preview.summary[0].create).toBe(1); expect(stage.preview.summary[1].create).toBe(1);
  expect((await confirmPricingImport(stage.token, false)).status).toBe("success");
  expect((await prices()).find((row) => row.catalogKey === two)?.price.toFixed(2)).toBe("8.01");
  const again = await staged(new File([`${[...csvHeaders, "price:1:Tier 1", "price:2:Tier 2"].join(",")}\n${one},,,,,0,9999999999.99`], "fixture.csv"));
  expect(again.preview.summary[0].unchanged).toBe(1); expect(again.preview.summary[1].unchanged).toBe(1);
});
it.each(["-1", "1.001", "NaN", "1e2"])("invalid price %s cannot generate a confirmable preview or write", async (amount) => {
  const before = await prices(); const result = await previewPricingImport(file(amount));
  expect(result.status).toBe("invalid"); expect(result).not.toHaveProperty("token"); expect(await prices()).toEqual(before);
});
it("unknown keys and duplicate upload rows cannot produce a preview", async () => {
  const text = await file().text();
  for (const invalid of [text.replace(one, orphan), text + text.split("\n")[1]]) {
    const result = await previewPricingImport(new File([invalid], "test.csv")); expect(result.status).toBe("invalid"); expect(result).not.toHaveProperty("token");
  }
});
it("rejects tampering and binding a preview to another admin", async () => {
  const stage = await staged(); const before = await prices();
  expect((await confirmPricingImport(stage.token.slice(0, -8) + "AAAAAAAA", true)).status).toBe("invalid");
  const other = await db.user.create({ data: { email: "test-pricing-other@example.test", role: "ADMIN", active: true } });
  mock.auth.mockResolvedValue({ user: other }); expect((await confirmPricingImport(stage.token, true)).status).toBe("invalid");
  expect(await prices()).toEqual(before);
});
it.each(["price", "delete", "insert", "identity", "product removal", "duplicate", "SKU"])("rejects stale %s changes", async (kind) => {
  const stage = await staged();
  if (kind === "price") await db.productPrice.updateMany({ where: { catalogKey: one }, data: { price: "20.00" } });
  if (kind === "delete") await db.productPrice.deleteMany({ where: { catalogKey: one, pricingTierId: tier1 } });
  if (kind === "insert") await db.productPrice.create({ data: { catalogKey: two, pricingTierId: tier1, price: "5.00" } });
  if (kind === "identity") mock.content.mockResolvedValue(products().map((row) => ({ ...row, _id: row._id + "-recreated" })));
  if (kind === "product removal") mock.content.mockResolvedValue([]);
  if (kind === "duplicate") mock.content.mockResolvedValue([...products(), { ...products()[0], _id: "duplicate" }]);
  if (kind === "SKU") mock.content.mockResolvedValue(products().map((row) => ({ ...row, sku: "Changed SKU" })));
  const before = await prices(); expect((await confirmPricingImport(stage.token, true)).status).toBe("invalid"); expect(await prices()).toEqual(before);
});
it("rejects stale previews after tier renaming while allowing the renamed configured tier", async () => {
  const stage = await staged();
  try {
    await db.pricingTier.update({ where: { id: tier2 }, data: { name: "Unsupported fixture tier" } });
    expect((await confirmPricingImport(stage.token, true)).status).toBe("invalid");
    const dashboard = await getAdminPricing(); expect(dashboard).toMatchObject({ status: "ready", blocked: false });
  } finally { await db.pricingTier.update({ where: { id: tier2 }, data: { name: "Tier 2", rank: 2 } }); }
});
it("rolls back an earlier deletion when the bulk upsert fails", async () => {
  const stage = await staged(file("12345.67")); const before = await prices();
  await db.$executeRawUnsafe(`CREATE FUNCTION pricing_test_reject() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."price" = 12345.67 THEN RAISE EXCEPTION 'Fictional test rejection'; END IF; RETURN NEW; END $$`);
  await db.$executeRawUnsafe(`CREATE TRIGGER pricing_test_reject BEFORE INSERT OR UPDATE ON "ProductPrice" FOR EACH ROW EXECUTE FUNCTION pricing_test_reject()`);
  try { expect((await confirmPricingImport(stage.token, true)).status).toBe("invalid"); expect(await prices()).toEqual(before); }
  finally { await db.$executeRawUnsafe(`DROP TRIGGER pricing_test_reject ON "ProductPrice"`); await db.$executeRawUnsafe(`DROP FUNCTION pricing_test_reject()`); }
});
it("concurrent confirmations do not overwrite a newer successful import", async () => {
  const first = await staged(file("31.11")); const second = await staged(file("41.22"));
  const results = await Promise.all([confirmPricingImport(first.token, true), confirmPricingImport(second.token, true)]);
  expect(results.filter((result) => result.status === "success")).toHaveLength(1);
});
it("surfaces orphan prices and missing-price counts without exporting orphan identities", async () => {
  await db.productPrice.create({ data: { catalogKey: orphan, pricingTierId: tier1, price: "9.87" } });
  const dashboard = await getAdminPricing();
  expect(dashboard).toMatchObject({ status: "ready", counts: { total: 2, available: 1, fullyPriced: 1, missing: [{ count: 0 }, { count: 0 }] }, issues: expect.arrayContaining([expect.objectContaining({ code: "orphaned_price", catalogKey: orphan })]) });
  expect(await getAdminPricingExport()).not.toContain(orphan);
});
it("Sanity failure is safe for dashboard/export/preview/confirm and never writes", async () => {
  const stage = await staged(); const before = await prices(); mock.content.mockRejectedValue(new Error("FICTIONAL_PROVIDER_SECRET"));
  expect(await getAdminPricing()).toEqual({ status: "unavailable", message: "Pricing data is temporarily unavailable. Please try again later." });
  const response = await exportRoute(); expect(response.status).toBe(503); expect(await response.text()).not.toContain("FICTIONAL_PROVIDER_SECRET");
  expect((await previewPricingImport(file())).status).toBe("invalid"); expect((await confirmPricingImport(stage.token, true)).status).toBe("invalid"); expect(await prices()).toEqual(before);
});
