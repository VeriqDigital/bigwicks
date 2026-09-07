import "server-only";
import { parse } from "csv-parse/sync";
import { priceText } from "@/lib/catalog/money";
import { isCatalogKey } from "@/sanity/catalog-key";
import { orderedTiers, priceColumn, validTiers, type TierColumn } from "./tiers";

export const MAX_CSV_BYTES = 256 * 1024;
export const MAX_IMPORT_ROWS = 500;
export const csvHeaders = ["catalogKey", "sku", "productName", "category", "available"] as const;
export type Prices = Record<string, string | null>;
export type ImportRow = { catalogKey: string; sku: string; productName: string; prices: Prices };
export type ImportIssue = { row?: number; message: string };
export class PricingError extends Error {}

export function parsePricingCsv(bytes: Uint8Array, tiers: TierColumn[]): { rows: ImportRow[]; rowsRead: number; errors: ImportIssue[] } {
  if (!validTiers(tiers)) throw new PricingError("Configure valid pricing tiers before importing.");
  const expected = [...csvHeaders, ...orderedTiers(tiers).map(priceColumn)];
  if (!bytes.length || bytes.length > MAX_CSV_BYTES) throw new PricingError("Choose a nonempty CSV file no larger than 256 KiB.");
  let text: string;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { throw new PricingError("Save the file as CSV UTF-8 and try again."); }
  if (text.includes("\0")) throw new PricingError("The CSV contains invalid text.");
  let records: string[][];
  let count = 0;
  try {
    records = parse(text, { bom: true, cast: false, skip_empty_lines: true, max_record_size: 4096,
      on_record: (record: string[]) => {
        if (++count > MAX_IMPORT_ROWS + 1) throw new Error("Too many rows");
        return record;
      },
    }) as string[][];
  } catch { throw new PricingError("Invalid CSV: use comma-separated fields, valid quoting, at most 500 product rows and 4,096 characters per record."); }
  const headers = records.shift();
  if (!headers || headers.length !== expected.length || new Set(headers).size !== headers.length || expected.some((name) => !headers.includes(name))) {
    throw new PricingError("Use every column from a fresh pricing export exactly once. Unknown, missing, renamed or duplicate tier columns are not accepted.");
  }
  if (!records.length) throw new PricingError("The CSV must contain at least one product row.");
  const rows: ImportRow[] = []; const errors: ImportIssue[] = []; const seen = new Set<string>();
  records.forEach((record, index) => {
    const get = (name: string) => record[headers.indexOf(name)];
    const catalogKey = get("catalogKey").trim().toLowerCase();
    const row = index + 2;
    if (!isCatalogKey(catalogKey)) errors.push({ row, message: "catalogKey must be a valid product UUID." });
    if (seen.has(catalogKey)) errors.push({ row, message: "Duplicate catalogKey in the upload." });
    seen.add(catalogKey);
    const amount = (name: string) => {
      const value = get(name).trim();
      if (value === "") return null;
      const result = priceText(value);
      if (result === null) errors.push({ row, message: `${name}: use a nonnegative decimal amount, at most two decimal places and no symbols, commas or exponents (maximum 9999999999.99).` });
      return result;
    };
    rows.push({ catalogKey, sku: get("sku"), productName: get("productName"), prices: Object.fromEntries(orderedTiers(tiers).map((tier) => [priceColumn(tier), amount(priceColumn(tier))])) });
  });
  return { rows, rowsRead: records.length, errors };
}

// Quote every field and neutralize formulas only in human-readable content.
// Prices remain canonical decimal text; catalogKey never comes from SKU/name.
export function spreadsheetText(value: string) {
  return /^[\s]*[=+\-@＝＋－＠]/u.test(value) || /^[\t\r\n']/u.test(value) ? `'${value}` : value;
}
export function exportPricingCsv(rows: { catalogKey: string; sku: string; name: string; category: string; available: boolean; prices: Prices }[], tiers: TierColumn[]) {
  if (!validTiers(tiers)) throw new PricingError("Configure valid pricing tiers before exporting.");
  const columns = orderedTiers(tiers).map(priceColumn);
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
  return "\uFEFF" + [[...csvHeaders, ...columns].map(quote).join(","), ...rows.map((row) => [row.catalogKey, spreadsheetText(row.sku), spreadsheetText(row.name), spreadsheetText(row.category), String(row.available), ...columns.map((column) => row.prices[column] ?? "")].map(quote).join(","))].join("\r\n") + "\r\n";
}
