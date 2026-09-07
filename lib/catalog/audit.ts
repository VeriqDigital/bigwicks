import "server-only";
import { getDb } from "@/lib/db";
import { validTiers, orderedTiers, type PricingTier } from "@/lib/pricing/tiers";
import { readPublishedCatalogContent } from "./content";
import { normalizeCatalogContent, type CatalogIssue } from "./normalize";
import { priceText } from "./money";
import { isCatalogKey } from "@/sanity/catalog-key";

export function analyzeCatalog(raw: unknown, prices: { catalogKey: string; pricingTierId: string; price: unknown }[], tiers: PricingTier[]) {
  const content = normalizeCatalogContent(raw);
  const issues: CatalogIssue[] = [...content.issues];
  const supported = validTiers(tiers) ? orderedTiers(tiers) : [];
  if (!supported.length) issues.push({ code: "invalid_or_missing_pricing_tiers" });
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
    db.pricingTier.findMany({ select: { id: true, name: true, rank: true }, orderBy: { rank: "asc" } }),
  ]);
  return analyzeCatalog(content, prices, tiers);
}
