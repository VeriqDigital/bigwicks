import "server-only";
import { randomUUID } from "node:crypto";
import { parse } from "csv-parse/sync";
import { priceText } from "../../lib/catalog/money";
import { exportPricingCsv, MAX_CSV_BYTES as MAX_PRICING_BYTES, parsePricingCsv, spreadsheetText } from "../../lib/pricing/csv";
import { isCatalogKey } from "../../sanity/catalog-key";
import { priceColumn, tierColumns, type TierColumn } from "../../lib/pricing/tiers";
import type { Prices } from "../../lib/pricing/csv";

export const headers = ["catalogKey", "sku", "name", "category", "brand", "packing", "description", "available"] as const;
export const MAX_BYTES = 2 * 1024 * 1024;
export const MAX_ROWS = 500;
export const MAX_RECORD = 12000;
export class OnboardingError extends Error {}
export type Row = { catalogKey: string; sku: string; name: string; category: string; brand: string; packing: string; description: string; available: boolean; prices: Prices };
export const rowTiers = (row: Row) => tierColumns(Object.keys(row.prices));
export const categoryIdentity = (name: string) => name.normalize("NFKC").trim().replace(/\s+/gu, " ").toLowerCase();
export const skuIdentity = (sku: string) => sku.normalize("NFKC").toLowerCase();
const controls = /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u;
// Canonical human-text cells use the same spreadsheet escaping as pricing exports.
// Doubling a literal leading apostrophe makes this convention round-trip safely.
function unescapeText(value: string) {
  return value.startsWith("'") && spreadsheetText(value.slice(1)) === value ? value.slice(1) : value;
}
export function readCanonical(bytes: Uint8Array, resolved = false) {
  if (!bytes.length || bytes.length > MAX_BYTES) throw new OnboardingError("CSV must be nonempty and at most 2 MiB.");
  let text: string;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { throw new OnboardingError("CSV must be valid UTF-8."); }
  let records: string[][]; let count = 0;
  try {
    records = parse(text, { bom: true, cast: false, skip_empty_lines: true, max_record_size: MAX_RECORD,
      on_record: (row: string[]) => { if (++count > MAX_ROWS + 1) throw new Error(); return row; },
    });
  } catch { throw new OnboardingError("Invalid CSV: check quoting, column counts, 500-row and 12,000-character record limits."); }
  const columns = records.shift();
  let tiers: TierColumn[];
  try { tiers = tierColumns(columns ?? []); } catch { throw new OnboardingError("Include unique price:rank:name columns for the intended configured tiers."); }
  const expected = [...headers, ...tiers.map(priceColumn)];
  if (!columns || columns.length !== expected.length || new Set(columns).size !== expected.length || expected.some((h) => !columns.includes(h))) {
    throw new OnboardingError(`Use these content headers plus unique pricing tier columns: ${headers.join(",")}.`);
  }
  if (!records.length) throw new OnboardingError("CSV must contain product rows.");
  const errors: string[] = []; const keys = new Set<string>(); const skus = new Set<string>();
  const rows: Row[] = records.map((record, index) => {
    const row = index + 2;
    const issue = (field: string, problem: string) => errors.push(`Row ${row}: ${field}: ${problem}.`);
    const get = (field: string) => record[columns.indexOf(field)];
    const human = (field: "sku" | "name" | "category" | "description" | "brand" | "packing", max: number, required = true) => {
      const raw = unescapeText(get(field));
      const multiline = field === "description";
      if (controls.test(multiline ? raw.replace(/[\r\n\t]/g, "") : raw)) issue(field, "control characters are not allowed");
      const value = raw.normalize("NFC").trim().replace(/\r\n?/g, "\n");
      if ((required && !value) || value.length > max) issue(field, `must be ${required ? "1" : "0"}–${max} characters`);
      return field === "category" ? value.replace(/\s+/gu, " ") : value;
    };
    const catalogKey = get("catalogKey").trim();
    if ((!catalogKey && resolved) || (catalogKey && !isCatalogKey(catalogKey))) issue("catalogKey", "a canonical lowercase UUIDv4 is required");
    if (catalogKey && keys.has(catalogKey)) issue("catalogKey", "duplicate identity");
    keys.add(catalogKey);
    const sku = human("sku", 100); const normalizedSku = skuIdentity(sku);
    if (skus.has(normalizedSku)) issue("sku", "duplicate SKU (case/Unicode-normalized)");
    skus.add(normalizedSku);
    const boolean = get("available").trim().toLowerCase();
    if (boolean !== "true" && boolean !== "false") issue("available", "use explicit true or false");
    const amount = (field: string) => {
      const value = get(field).trim(); const result = value ? priceText(value) : null;
      if (value && result === null) issue(field, "invalid exact price; use 0–9999999999.99 with at most two decimals");
      return result;
    };
    return { catalogKey, sku, name: human("name", 200), category: human("category", 100), brand: human("brand", 100, false), packing: human("packing", 100, false),
      description: human("description", 10000, false), available: boolean === "true", prices: Object.fromEntries(tiers.map((tier) => [priceColumn(tier), amount(priceColumn(tier))])) };
  });
  if (errors.length) throw new OnboardingError(`${errors.length} validation error(s):\n${errors.slice(0, 25).join("\n")}${errors.length > 25 ? "\nFurther errors omitted; fix these and validate again." : ""}`);
  return rows;
}
export function canonicalCsv(rows: Row[]) {
  if (!rows.length) throw new OnboardingError("Canonical output requires product rows.");
  const columns = rowTiers(rows[0]).map(priceColumn);
  if (rows.some((row) => Object.keys(row.prices).length !== columns.length || columns.some((column) => !Object.hasOwn(row.prices, column)))) throw new OnboardingError("Every row must contain the same configured pricing columns.");
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
  return "\uFEFF" + [[...headers, ...columns].map(quote).join(","), ...rows.map((r) => [r.catalogKey, ...[r.sku, r.name, r.category, r.brand, r.packing, r.description].map(spreadsheetText), String(r.available), ...columns.map((column) => r.prices[column] ?? "")].map(quote).join(","))].join("\r\n") + "\r\n";
}
export function prepare(bytes: Uint8Array) {
  const rows = readCanonical(bytes); let generated = 0; const keys = new Set(rows.map((r) => r.catalogKey));
  for (const row of rows) if (!row.catalogKey) {
    do { row.catalogKey = randomUUID(); } while (keys.has(row.catalogKey));
    keys.add(row.catalogKey); generated++;
  }
  const resolvedCsv = canonicalCsv(rows);
  // Both outputs must fit their consumers before any artifact is written.
  readCanonical(Buffer.from(resolvedCsv), true);
  const tiers = rowTiers(rows[0]);
  const pricingCsv = exportPricingCsv(rows, tiers);
  if (Buffer.byteLength(pricingCsv) > MAX_PRICING_BYTES || parsePricingCsv(Buffer.from(pricingCsv), tiers).errors.length) throw new OnboardingError("Generated pricing CSV exceeds the existing pricing importer limits; split the source file.");
  return { rows, resolvedCsv, pricingCsv, summary: { rows: rows.length, generatedCatalogKeys: generated, categories: new Set(rows.map((r) => categoryIdentity(r.category))).size,
    pricedByTier: tiers.map((tier) => ({ ...tier, count: rows.filter((r) => r.prices[priceColumn(tier)] !== null).length })),
    warnings: rows.filter((r) => r.available && Object.values(r.prices).some((price) => price === null)).length, errors: 0 } };
}
