import { afterAll, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
const mock = vi.hoisted(() => ({ auth: vi.fn(), content: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mock.auth }));
vi.mock("@/lib/catalog/content", () => ({ readPublishedCatalogContent: mock.content }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); }, notFound: () => { throw new Error("notFound"); } }));
import { getDb } from "@/lib/db";
import { listCustomerTiers } from "@/lib/admin/customers";
import { editCustomer } from "@/app/(portal)/admin/customers/actions";
import { getAvailableCatalogForCustomer } from "@/lib/catalog/service";
import { auditCatalog } from "@/lib/catalog/audit";
import { getAdminPricing, getAdminPricingExport, previewPricingImport, confirmPricingImport } from "@/lib/pricing/service";
import { parsePricingCsv, exportPricingCsv } from "@/lib/pricing/csv";
import { fictionalProduct } from "../fixtures/catalog";
const db = getDb();
afterAll(() => db.$disconnect());
it("migrates existing Tier 1/2 ranks and nullable order metadata without replacing identities or snapshots", async () => {
  const migration = readFileSync("prisma/migrations/20260907050000_case_catalog_tier_rank/migration.sql", "utf8");
  await db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('CREATE SCHEMA "fictional_rank_migration"');
    try {
      await tx.$executeRawUnsafe('SET LOCAL search_path TO "fictional_rank_migration"');
      await tx.$executeRawUnsafe('CREATE TABLE "PricingTier" ("id" TEXT PRIMARY KEY, "name" TEXT UNIQUE)');
      await tx.$executeRawUnsafe('CREATE TABLE "OrderItem" ("id" TEXT PRIMARY KEY, "quantity" INTEGER)');
      await tx.$executeRawUnsafe("INSERT INTO \"PricingTier\" VALUES ('existing-2', 'Tier 2'), ('existing-1', 'Tier 1')");
      await tx.$executeRawUnsafe("INSERT INTO \"OrderItem\" VALUES ('historical', 3)");
      for (const sql of migration.split(";").filter((sql) => sql.trim())) await tx.$executeRawUnsafe(sql);
      expect(await tx.$queryRawUnsafe('SELECT * FROM "PricingTier" ORDER BY "rank"')).toEqual([{ id: "existing-1", name: "Tier 1", rank: 1 }, { id: "existing-2", name: "Tier 2", rank: 2 }]);
      expect(await tx.$queryRawUnsafe('SELECT * FROM "OrderItem"')).toEqual([{ id: "historical", quantity: 3, brandSnapshot: null, packingSnapshot: null }]);
    } finally { await tx.$executeRawUnsafe('DROP SCHEMA "fictional_rank_migration" CASCADE'); }
  });
});
it("enforces positive unique ranks", async () => {
  await expect(db.pricingTier.create({ data: { name: "Fictional collision", rank: 1 } })).rejects.toMatchObject({ code: "P2002" });
  await expect(db.pricingTier.create({ data: { name: "Fictional invalid", rank: 0 } })).rejects.toThrow();
});
it("a configured third tier works through customer edit/selector, pricing export/import, audit and isolated customer DTO", async () => {
  const tier = await db.pricingTier.create({ data: { name: "Tier 3", rank: 3 } });
  const key = "a7000000-0000-4000-8000-000000000001";
  const admin = await db.user.findUniqueOrThrow({ where: { email: "admin@example.test" } });
  const first = await db.pricingTier.findUniqueOrThrow({ where: { rank: 1 } });
  const user = await db.user.create({ data: { email: "fictional-m5-tier@example.test", role: "CUSTOMER", active: true, customer: { create: { companyName: "Fictional tier business", active: true, pricingTierId: first.id } } }, include: { customer: true } });
  try {
    mock.auth.mockResolvedValue({ user: admin });
    mock.content.mockResolvedValue([fictionalProduct({ catalogKey: key, brand: "Fictional brand", packing: "3/4/6", unitCost: "847263.51" })]);
    const tiers = await listCustomerTiers(); expect(tiers.map((t) => t.rank)).toEqual([1, 2, 3]);
    const data = new FormData();
    for (const [k, value] of Object.entries({ customerId: user.customer!.id, companyName: "Fictional tier business", email: user.email, customerNumber: "", pricingTierId: tier.id })) data.set(k, value);
    expect((await editCustomer({}, data)).success).toBe(true);
    const dashboard = await getAdminPricing(); expect(dashboard.status).toBe("ready");
    if (dashboard.status !== "ready") throw Error("No fixture dashboard");
    expect(dashboard.tiers.map((t) => t.rank)).toEqual([1, 2, 3]);
    const exported = await getAdminPricingExport(); expect(exported).toContain("price:3:Tier 3");
    expect(parsePricingCsv(Buffer.from(exported), tiers).errors).toEqual([]);
    const csv = exportPricingCsv([{ ...dashboard.rows[0], prices: { "price:1:Tier 1": "10.01", "price:2:Tier 2": "12.03", "price:3:Tier 3": "17.29" } }], tiers);
    for (const altered of [csv.replace("price:3:Tier 3", "price:9:Forged"), csv.replace(",\"price:3:Tier 3\"", ""), csv.replace("price:3:Tier 3", "price:2:Tier 2")]) expect((await previewPricingImport(new File([altered], "fictional.csv"))).status).toBe("invalid");
    const preview = await previewPricingImport(new File([csv], "fictional.csv"));
    if (preview.status !== "preview") throw Error("No fixture preview");
    expect((await confirmPricingImport(preview.token, false)).status).toBe("success");
    expect((await auditCatalog()).issues.filter((i) => i.code === "available_product_missing_valid_price")).toEqual([]);
    mock.auth.mockResolvedValue({ user });
    const catalog = await getAvailableCatalogForCustomer();
    expect(catalog.products[0]).toMatchObject({ price: "17.29", brand: "Fictional brand", packing: "3/4/6" });
    for (const secret of ["10.01", "12.03", "847263.51", tier.id, "unitCost"]) expect(JSON.stringify(catalog)).not.toContain(secret);
    mock.auth.mockResolvedValue({ user: admin });
    for (const update of [{ name: "Renamed fictional group" }, { rank: 4 }]) {
      const stage = await previewPricingImport(new File([await getAdminPricingExport()], "fictional.csv"));
      if (stage.status !== "preview") throw Error("No fixture preview");
      await db.pricingTier.update({ where: { id: tier.id }, data: update });
      expect((await confirmPricingImport(stage.token, false)).status).toBe("invalid");
    }
  } finally {
    await db.productPrice.deleteMany({ where: { catalogKey: key } });
    await db.customer.delete({ where: { userId: user.id } }); await db.user.delete({ where: { id: user.id } });
    await db.pricingTier.delete({ where: { id: tier.id } });
  }
});
