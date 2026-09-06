import { expect, it } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { priceText } from "@/lib/catalog/money";
import { normalizeCatalogContent } from "@/lib/catalog/normalize";
import { analyzeCatalog } from "@/lib/catalog/audit";
import { fictionalProduct, catalogKeys } from "../fixtures/catalog";

it("preserves exact money as decimal text, including zero and decimal arithmetic", () => {
  expect(priceText(new Prisma.Decimal("0.10").plus("0.20"))).toBe("0.30");
  expect(priceText(new Prisma.Decimal("9999999999.99"))).toBe("9999999999.99");
  expect(priceText(new Prisma.Decimal(0))).toBe("0.00");
});
it.each([NaN, 12.34, null, undefined, "-1.00", "garbage", "1e3", "1.001", "10000000000", new Prisma.Decimal("NaN"), new Prisma.Decimal("Infinity"), new Prisma.Decimal("-0.01")])("rejects malformed, negative, excessive or floating-point money", (value) => {
  expect(priceText(value)).toBeNull();
});
it("drops duplicate identities even when unavailable or incorrectly capitalized", () => {
  const result = normalizeCatalogContent([
    fictionalProduct(), fictionalProduct({ _id: "another", catalogKey: catalogKeys.one.toUpperCase(), available: false }),
    fictionalProduct({ _id: "missing", catalogKey: null }),
  ]);
  expect(result.products).toEqual([]);
  expect(result.issues.map((issue) => issue.code)).toContain("duplicate_catalog_key");
  expect(result.issues.filter((issue) => issue.code === "missing_or_invalid_catalog_key")).toHaveLength(2);
});
it("excludes drafts/releases and strips extra CMS fields while degrading optional content safely", () => {
  const { products } = normalizeCatalogContent([
    fictionalProduct({ category: null, image: { url: "https://evil.example/image.png" }, description: undefined, price: "forged", role: "ADMIN" }),
    fictionalProduct({ _id: "drafts.other" }), fictionalProduct({ _id: "versions.release.other" }),
  ]);
  expect(products).toHaveLength(1);
  expect(products[0]).toMatchObject({ category: null, image: null, description: null });
  expect(products[0]).not.toHaveProperty("price"); expect(products[0]).not.toHaveProperty("role");
});
it("keeps catalog identity stable across SKU/name/category edits", () => {
  expect(normalizeCatalogContent([fictionalProduct({ sku: "RENAMED", name: "New test name", category: null })]).products[0].catalogKey).toBe(catalogKeys.one);
});
it("audit reports drift and optional-content warnings without returning private amounts", () => {
  const report = analyzeCatalog([
    fictionalProduct({ image: null, description: null, category: null }),
    fictionalProduct({ _id: "two", catalogKey: catalogKeys.two }),
    fictionalProduct({ _id: "duplicate-two", catalogKey: catalogKeys.two }),
    fictionalProduct({ _id: "missing", catalogKey: undefined }),
  ], [
    { catalogKey: catalogKeys.one, pricingTierId: "tier1", price: "1234567.89" },
    { catalogKey: catalogKeys.one, pricingTierId: "tier2", price: "-1" },
    { catalogKey: catalogKeys.orphan, pricingTierId: "unsupported", price: "25.00" },
  ], [{ id: "tier1", name: "Tier 1" }, { id: "tier2", name: "Tier 2" }, { id: "unsupported", name: "Other tier" }]);
  const codes = report.issues.map((issue) => issue.code);
  for (const code of ["duplicate_catalog_key", "missing_or_invalid_catalog_key", "orphaned_price", "unsupported_pricing_tier", "unsupported_price_tier", "invalid_price", "available_product_missing_valid_price", "missing_category", "missing_image", "missing_description"]) expect(codes).toContain(code);
  expect(JSON.stringify(report)).not.toContain("1234567.89");
  expect(report.issues).toContainEqual({ code: "available_product_missing_valid_price", catalogKey: catalogKeys.one, pricingTierId: "tier2" });
});
it("audit detects missing supported tiers and does not demand prices for unavailable products", () => {
  const report = analyzeCatalog([fictionalProduct({ available: false })], [], []);
  expect(report.issues).toEqual([{ code: "missing_tier_1" }, { code: "missing_tier_2" }]);
});
it("a malformed upstream response fails rather than being reported as a healthy empty catalog", () => {
  expect(() => normalizeCatalogContent({ error: "upstream" })).toThrow();
  expect(() => normalizeCatalogContent([{}])).toThrow();
});
