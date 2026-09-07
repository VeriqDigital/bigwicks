import "server-only";
import { createHash } from "node:crypto";
import { normalizeCatalogContent } from "@/lib/catalog/normalize";
import { analyzeCatalog } from "@/lib/catalog/audit";
import { priceText } from "@/lib/catalog/money";
import { supportedTierNames } from "@/lib/admin/customer-validation";
import { type ImportRow, type ImportIssue, PricingError, spreadsheetText } from "./csv";

export type PriceRow = { catalogKey: string; pricingTierId: string; price: unknown; updatedAt: Date };
export type Tier = { id: string; name: string };
export type Change = { before: string | null; after: string | null; kind: "create" | "update" | "remove" | "unchanged" };
export type PricingPreview = ReturnType<typeof planImport>;
export function pricingSnapshot(raw: unknown, prices: PriceRow[], tiers: Tier[]) {
  const content = normalizeCatalogContent(raw);
  const audit = analyzeCatalog(raw, prices, tiers);
  const tier1 = tiers.find((tier) => tier.name === "Tier 1");
  const tier2 = tiers.find((tier) => tier.name === "Tier 2");
  const blocked = content.issues.some((issue) => ["missing_or_invalid_catalog_key", "duplicate_catalog_key", "invalid_required_content"].includes(issue.code)) ||
    !tier1 || !tier2 || tiers.length !== supportedTierNames.length || prices.some((row) => priceText(row.price) === null);
  const rows = content.products.map((product) => ({
    catalogKey: product.catalogKey, sku: product.sku, name: product.name,
    category: product.category?.name ?? "", available: product.available,
    tier1Price: priceText(prices.find((row) => row.catalogKey === product.catalogKey && row.pricingTierId === tier1?.id)?.price),
    tier2Price: priceText(prices.find((row) => row.catalogKey === product.catalogKey && row.pricingTierId === tier2?.id)?.price),
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
  return { rows, audit, tier1, tier2, blocked, fingerprint, counts: {
    total: content.documentCount, available: rows.filter((row) => row.available).length,
    fullyPriced: rows.filter((row) => row.tier1Price !== null && row.tier2Price !== null).length,
    missingTier1: rows.filter((row) => row.tier1Price === null).length,
    missingTier2: rows.filter((row) => row.tier2Price === null).length,
  } };
}
export type PricingSnapshot = ReturnType<typeof pricingSnapshot>;
export function ensureWritable(snapshot: PricingSnapshot) {
  if (snapshot.blocked) throw new PricingError("Resolve invalid or duplicate catalog identities, invalid prices, and unsupported or missing tiers before exporting or importing.");
}
export function planImport(rows: ImportRow[], snapshot: PricingSnapshot) {
  const errors: ImportIssue[] = []; const warnings: ImportIssue[] = [];
  const summary = { tier1: { create: 0, update: 0, remove: 0, unchanged: 0 }, tier2: { create: 0, update: 0, remove: 0, unchanged: 0 } };
  const change = (before: string | null, after: string | null): Change => ({ before, after, kind: before === after ? "unchanged" : after === null ? "remove" : before === null ? "create" : "update" });
  const changes = rows.flatMap((row, index) => {
    const current = snapshot.rows.find((product) => product.catalogKey === row.catalogKey);
    if (!current) { errors.push({ row: index + 2, message: "catalogKey does not match an unambiguous current Sanity product." }); return []; }
    if (![current.sku, spreadsheetText(current.sku)].includes(row.sku)) warnings.push({ row: index + 2, message: "CSV SKU differs from Sanity. The catalogKey determines the product; content will not change." });
    if (![current.name, spreadsheetText(current.name)].includes(row.productName)) warnings.push({ row: index + 2, message: "CSV product name differs from Sanity. Content will not change." });
    if (!current.available && (row.tier1Price !== null || row.tier2Price !== null)) warnings.push({ row: index + 2, message: "This product is hidden from customers and will retain pricing." });
    const tier1 = change(current.tier1Price, row.tier1Price); const tier2 = change(current.tier2Price, row.tier2Price);
    summary.tier1[tier1.kind]++; summary.tier2[tier2.kind]++;
    return [{ catalogKey: row.catalogKey, sku: current.sku, name: current.name, tier1, tier2 }];
  });
  return { rowsRead: rows.length, matched: changes.length, changes, summary, errors, warnings };
}
