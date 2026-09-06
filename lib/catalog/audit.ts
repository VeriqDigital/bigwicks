import "server-only";
import { getDb } from "@/lib/db";
import { supportedTierNames } from "@/lib/admin/customer-validation";
import { readPublishedCatalogContent } from "./content";
import { normalizeCatalogContent, type CatalogIssue } from "./normalize";
import { priceText } from "./money";
import { isCatalogKey } from "@/sanity/catalog-key";

export function analyzeCatalog(raw: unknown, prices: { catalogKey: string; pricingTierId: string; price: unknown }[], tiers: { id: string; name: string }[]) {
  const content = normalizeCatalogContent(raw);
  const issues: CatalogIssue[] = [...content.issues];
  const supported = tiers.filter((tier) => supportedTierNames.some((name) => name === tier.name));
  for (const name of supportedTierNames) if (!supported.some((tier) => tier.name === name)) issues.push({ code: name === "Tier 1" ? "missing_tier_1" : "missing_tier_2" });
  for (const tier of tiers) if (!supported.some((entry) => entry.id === tier.id)) issues.push({ code: "unsupported_pricing_tier", pricingTierId: tier.id });
  for (const row of prices) {
    const detail = { catalogKey: row.catalogKey, pricingTierId: row.pricingTierId };
    if (!isCatalogKey(row.catalogKey)) issues.push({ code: "invalid_price_catalog_key", ...detail });
    if (!content.knownKeys.has(row.catalogKey)) issues.push({ code: "orphaned_price", ...detail });
    if (!supported.some((tier) => tier.id === row.pricingTierId)) issues.push({ code: "unsupported_price_tier", ...detail });
    if (priceText(row.price) === null) issues.push({ code: "invalid_price", ...detail });
  }
  for (const product of content.products.filter((entry) => entry.available)) {
    for (const tier of supported) {
      if (!prices.some((row) => row.catalogKey === product.catalogKey && row.pricingTierId === tier.id && priceText(row.price) !== null)) {
        issues.push({ code: "available_product_missing_valid_price", catalogKey: product.catalogKey, pricingTierId: tier.id });
      }
    }
  }
  return { documentCount: content.documentCount, priceCount: prices.length, issues };
}

// Operational read-only utility, not a public action or route. Invoked only with
// the operator's server environment; reports identifiers/issues, never amounts.
export async function auditCatalog() {
  // Stop before opening the database if content cannot be read. Never interpret
  // an upstream/configuration failure as an empty catalog of orphaned prices.
  const content = await readPublishedCatalogContent();
  const db = getDb();
  const [prices, tiers] = await Promise.all([
    db.productPrice.findMany({ select: { catalogKey: true, pricingTierId: true, price: true } }),
    db.pricingTier.findMany({ select: { id: true, name: true } }),
  ]);
  return analyzeCatalog(content, prices, tiers);
}
