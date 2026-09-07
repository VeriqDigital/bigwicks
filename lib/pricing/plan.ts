import "server-only";
import { createHash } from "node:crypto";
import { normalizeCatalogContent } from "@/lib/catalog/normalize";
import { analyzeCatalog } from "@/lib/catalog/audit";
import { priceText } from "@/lib/catalog/money";
import { validTiers, orderedTiers, priceColumn, type PricingTier } from "./tiers";
import { type ImportRow, type ImportIssue, PricingError, spreadsheetText } from "./csv";

export type PriceRow = { catalogKey: string; pricingTierId: string; price: unknown; updatedAt: Date };
export type Tier = PricingTier;
export type Change = { before: string | null; after: string | null; kind: "create" | "update" | "remove" | "unchanged" };
export type PricingPreview = ReturnType<typeof planImport>;
export function pricingSnapshot(raw: unknown, prices: PriceRow[], tiers: Tier[]) {
  const content = normalizeCatalogContent(raw);
  const audit = analyzeCatalog(raw, prices, tiers);
  tiers = orderedTiers(tiers);
  const blocked = content.issues.some((issue) => ["missing_or_invalid_catalog_key", "duplicate_catalog_key", "invalid_required_content"].includes(issue.code)) ||
    !validTiers(tiers) || prices.some((row) => priceText(row.price) === null);
  const rows = content.products.map((product) => ({
    catalogKey: product.catalogKey, sku: product.sku, name: product.name,
    category: product.category?.name ?? "", available: product.available,
    prices: Object.fromEntries(tiers.map((tier) => [priceColumn(tier), priceText(prices.find((row) => row.catalogKey === product.catalogKey && row.pricingTierId === tier.id)?.price)])),
  })).sort((a, b) => a.catalogKey.localeCompare(b.catalogKey));
  // Conservative snapshot: all price rows/versions and content identity/context.
  // Description/image edits do not invalidate a price preview. Document ID changes do.
  const identities = (raw as { _id: string; catalogKey?: unknown }[])
    .filter((row) => !row._id.startsWith("drafts.") && !row._id.startsWith("versions."))
    .map((row) => [row._id, row.catalogKey]).sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  const fingerprint = createHash("sha256").update(JSON.stringify({ identities, rows,
    tiers: [...tiers].sort((a, b) => a.id.localeCompare(b.id)),
    prices: prices.map((row) => [row.catalogKey, row.pricingTierId, priceText(row.price), row.updatedAt.toISOString()]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  })).digest("hex");
  return { rows, audit, tiers, blocked, fingerprint, counts: {
    total: content.documentCount, available: rows.filter((row) => row.available).length,
    fullyPriced: rows.filter((row) => row.available && tiers.every((tier) => row.prices[priceColumn(tier)] !== null)).length,
    missing: tiers.map((tier) => ({ ...tier, count: rows.filter((row) => row.available && row.prices[priceColumn(tier)] === null).length })),
  } };
}
export type PricingSnapshot = ReturnType<typeof pricingSnapshot>;
export function ensureWritable(snapshot: PricingSnapshot) {
  if (snapshot.blocked) throw new PricingError("Resolve invalid or duplicate catalog identities, invalid prices, and unsupported or missing tiers before exporting or importing.");
}
export function planImport(rows: ImportRow[], snapshot: PricingSnapshot) {
  const errors: ImportIssue[] = []; const warnings: ImportIssue[] = [];
  const summary = snapshot.tiers.map((tier) => ({ ...tier, create: 0, update: 0, remove: 0, unchanged: 0 }));
  const change = (before: string | null, after: string | null): Change => ({ before, after, kind: before === after ? "unchanged" : after === null ? "remove" : before === null ? "create" : "update" });
  const changes = rows.flatMap((row, index) => {
    const current = snapshot.rows.find((product) => product.catalogKey === row.catalogKey);
    if (!current) { errors.push({ row: index + 2, message: "catalogKey does not match an unambiguous current Sanity product." }); return []; }
    if (![current.sku, spreadsheetText(current.sku)].includes(row.sku)) warnings.push({ row: index + 2, message: "CSV SKU differs from Sanity. The catalogKey determines the product; content will not change." });
    if (![current.name, spreadsheetText(current.name)].includes(row.productName)) warnings.push({ row: index + 2, message: "CSV product name differs from Sanity. Content will not change." });
    const columns = snapshot.tiers.map(priceColumn);
    if (Object.keys(row.prices).length !== columns.length || columns.some((column) => !Object.hasOwn(row.prices, column))) {
      errors.push({ row: index + 2, message: "Pricing tier columns changed. Export and upload again." }); return [];
    }
    if (!current.available && Object.values(row.prices).some((price) => price !== null)) warnings.push({ row: index + 2, message: "This product is hidden from customers and will retain pricing." });
    const prices = snapshot.tiers.map((tier, index) => {
      const result = change(current.prices[priceColumn(tier)], row.prices[priceColumn(tier)]);
      summary[index][result.kind]++;
      return { pricingTierId: tier.id, tierName: tier.name, ...result };
    });
    return [{ catalogKey: row.catalogKey, sku: current.sku, name: current.name, prices }];
  });
  return { rowsRead: rows.length, matched: changes.length, changes, summary, errors, warnings };
}
