import "server-only";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { parse } from "csv-parse/sync";
import { z } from "zod";
import { priceText } from "../../lib/catalog/money";
import { orderedTiers, priceColumn, validTiers } from "../../lib/pricing/tiers";
import { canonicalCsv, readCanonical, OnboardingError, skuIdentity, MAX_BYTES, type Row } from "./csv";

export const boxHeroHeaders = ["SKU", "Item Name", "Unit Cost", "Selling Price", "Packing", "Type", "Brand", "Item Number", "Quantity", "Qty(Warehouse)"];
const text = z.string().max(200).refine((v) => !/[\u0000-\u001f\u007f-\u009f]/u.test(v));
const configSchema = z.object({
  tiers: z.array(z.object({ rank: z.number().int().positive(), name: text.max(100) }).strict()).min(1),
  categories: z.record(text.max(100), text.max(100)).default({}),
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  rows: z.array(z.object({ row: z.number().int().min(2).max(501), exclude: text.min(1).optional(),
    sku: text.max(100).optional(), name: text.optional(), category: text.max(100).optional(), brand: text.max(100).optional(), packing: text.max(100).optional(),
    sellingPrice: text.optional(), acknowledge: z.array(z.string().max(60)).default([]),
  }).strict()).max(500).default([]),
}).strict();
export const sourceHash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
export async function readBoxHero(bytes: Uint8Array, extension: string): Promise<unknown[][]> {
  if (!bytes.length || bytes.length > MAX_BYTES) throw new OnboardingError("BoxHero input must be nonempty and at most 2 MiB.");
  if (extension === ".csv") {
    try {
      let count = 0;
      return parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes), { bom: true, skip_empty_lines: true, max_record_size: 12000,
        on_record: (row: string[]) => { if (++count > 501) throw Error(); return row; } });
    } catch { throw new OnboardingError("Invalid BoxHero CSV; check UTF-8, quoting, 500-row and 12,000-character limits."); }
  }
  if (extension !== ".xlsx") throw new OnboardingError("Use a BoxHero .xlsx or CSV UTF-8 export.");
  return new Promise((yes, no) => {
    const child = spawn(process.execPath, ["--max-old-space-size=128", resolve("scripts/onboarding/xlsx-worker.mjs")], { windowsHide: true, stdio: ["pipe", "pipe", "pipe"],
      // Parser receives no database, auth, API or operator write credentials.
      env: { SystemRoot: process.env.SystemRoot, PATH: process.env.PATH, NODE_ENV: "test" } });
    const chunks: Buffer[] = []; let size = 0;
    const timer = setTimeout(() => child.kill(), 15000);
    child.stdout.on("data", (data: Buffer) => { size += data.length; if (size > MAX_BYTES) child.kill(); else chunks.push(data); });
    child.stderr.resume(); child.stdin.on("error", () => {});
    child.once("error", () => { clearTimeout(timer); no(new OnboardingError("BoxHero workbook reader could not start.")); });
    child.once("close", (code) => {
      clearTimeout(timer);
      if (code !== 0 || size > MAX_BYTES) return no(new OnboardingError("Unsupported or unsafe BoxHero workbook. Require one BoxHero sheet, no formulas and bounded rows/archive contents."));
      try { yes(JSON.parse(Buffer.concat(chunks).toString("utf8"))); } catch { no(new OnboardingError("Invalid workbook result.")); }
    });
    child.stdin.end(bytes);
  });
}
export function mapBoxHero(source: unknown[][], rawConfig: unknown, hash: string) {
  const parsed = configSchema.safeParse(rawConfig);
  if (!parsed.success || !validTiers(parsed.data.tiers) || !parsed.data.tiers.some((t) => t.rank === 2)) throw new OnboardingError("Mapping configuration must define unique valid tiers including rank 2, categories and optional reviewed row decisions.");
  const config = parsed.data; const tiers = orderedTiers(config.tiers);
  if (config.rows.length && config.sourceHash !== hash) throw new OnboardingError("Row decisions require the exact sourceHash from this workbook's dry-run.");
  if (new Set(config.rows.map((r) => r.row)).size !== config.rows.length) throw new OnboardingError("Duplicate row decisions.");
  if (!Array.isArray(source) || source.length < 2 || source.length > 501 || !Array.isArray(source[0])) throw new OnboardingError("BoxHero export requires 1–500 product rows.");
  const columns = source[0];
  if (columns.length !== boxHeroHeaders.length || new Set(columns).size !== columns.length || boxHeroHeaders.some((h) => !columns.includes(h))) throw new OnboardingError("BoxHero export headers do not match the documented ten-column structure.");
  if (config.rows.some((r) => r.row > source.length)) throw new OnboardingError("A row decision is outside this source.");
  const candidates = source.slice(1).map((cells, index) => {
    const row = index + 2; const decision = config.rows.find((d) => d.row === row);
    const errors: string[] = []; const warnings: string[] = [];
    if (!Array.isArray(cells) || cells.length > columns.length) throw new OnboardingError(`Row ${row}: invalid column count.`);
    // Explicit allowlist: Unit Cost and BoxHero SKU are intentionally never read.
    const get = (name: string) => {
      const value = cells[columns.indexOf(name)];
      if (value === null || value === undefined) return "";
      if (typeof value !== "string" || /[\u0000-\u001f\u007f-\u009f]/u.test(value)) { errors.push("invalid_source_text"); return ""; }
      return value.trim();
    };
    const sourceCategory = get("Type");
    const category = decision?.category ?? (Object.hasOwn(config.categories, sourceCategory) ? config.categories[sourceCategory] : sourceCategory);
    if (sourceCategory && !decision?.category && !Object.hasOwn(config.categories, sourceCategory)) warnings.push("unmapped_category");
    const sku = decision?.sku ?? get("Item Number"); const name = decision?.name ?? get("Item Name");
    const brand = decision?.brand ?? get("Brand"); const packing = decision?.packing ?? get("Packing");
    const price = priceText(decision?.sellingPrice ?? get("Selling Price"));
    if (!sku.trim()) errors.push("missing_item_number");
    if (!name.trim()) errors.push("missing_item_name");
    if (!category.trim()) errors.push("missing_category");
    if (!brand.trim()) warnings.push("missing_brand");
    if (!packing.trim()) warnings.push("missing_packing");
    if (price === null) errors.push("invalid_selling_price"); else if (price === "0.00") warnings.push("zero_selling_price");
    const quantity = get("Quantity"); const warehouse = get("Qty(Warehouse)");
    if (!/^-?\d+$/.test(quantity) || !/^-?\d+$/.test(warehouse)) warnings.push("invalid_inventory_quantity");
    else { if (BigInt(quantity) < 0 || BigInt(warehouse) < 0) warnings.push("negative_inventory_quantity"); if (BigInt(quantity) !== BigInt(warehouse)) warnings.push("warehouse_quantity_mismatch"); }
    if (/\b(?:discontinued|shipping|stock transfer|items for tents)\b/i.test(name)) warnings.push("suspected_non_product");
    // BoxHero zero means unresolved customer pricing, even after acknowledgement.
    const tier2Price = price === "0.00" ? null : price;
    const product: Row = { catalogKey: "", sku, name, category, brand, packing, description: "", available: false,
      prices: Object.fromEntries(tiers.map((tier) => [priceColumn(tier), tier.rank === 2 ? tier2Price : null])) };
    // Reuse canonical content/price validation without generating an identity.
    if (!errors.length) try { readCanonical(Buffer.from(canonicalCsv([product]))); } catch { errors.push("invalid_canonical_content"); }
    return { row, product, errors, warnings, excluded: !!decision?.exclude, acknowledge: decision?.acknowledge ?? [] };
  });
  for (const field of ["sku", "name"] as const) {
    const counts = new Map<string, number>();
    for (const candidate of candidates.filter((c) => !c.excluded)) { const value = skuIdentity(candidate.product[field].trim()); if (value) counts.set(value, (counts.get(value) ?? 0) + 1); }
    for (const candidate of candidates.filter((c) => !c.excluded)) if ((counts.get(skuIdentity(candidate.product[field].trim())) ?? 0) > 1) {
      (field === "sku" ? candidate.errors : candidate.warnings).push(field === "sku" ? "duplicate_item_number" : "duplicate_item_name");
    }
  }
  const included = candidates.filter((c) => !c.excluded);
  const issues = candidates.map((c) => ({ row: c.row, excluded: c.excluded, errors: [...new Set(c.errors)], warnings: [...new Set(c.warnings)],
    unacknowledged: c.warnings.filter((code) => !c.acknowledge.includes(code)) }));
  // Bind the derived plan too: identical source/config can map differently after a code change.
  // Candidates contain only allowlisted content, prices and deterministic review state.
  const planHash = sourceHash(Buffer.from(JSON.stringify({ contract: "big-wicks/boxhero-mapping/v2", hash, config, candidates, issues })));
  return { rows: included.map((c) => c.product), writable: included.length > 0 && issues.every((i) => i.excluded || (!i.errors.length && !i.unacknowledged.length)),
    report: { sourceHash: hash, planHash, rows: candidates.length, validCandidates: included.filter((c) => !c.errors.length).length,
      blockedCandidates: included.filter((c) => c.errors.length).length, excludedCandidates: candidates.filter((c) => c.excluded).length, issues } };
}
