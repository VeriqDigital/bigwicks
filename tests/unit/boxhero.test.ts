import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { zipSync, strToU8 } from "fflate";
import { parse } from "csv-parse/sync";
import { boxHeroHeaders, mapBoxHero, readBoxHero, sourceHash } from "../../scripts/onboarding/boxhero";
import { canonicalCsv, prepare } from "../../scripts/onboarding/csv";
import { plan, snapshot } from "../../scripts/onboarding/plan";
import { parsePricingCsv } from "@/lib/pricing/csv";
import { normalizeCatalogContent } from "@/lib/catalog/normalize";

const tiers = [{ name: "Tier 1", rank: 1 }, { name: "Tier 2", rank: 2 }, { name: "Fictional future group", rank: 3 }];
const config = { tiers, categories: { "Fictional Type": "Fictional category" } };
const cost = "847263.51";
const row = (change: Record<string, string> = {}) => {
  const data: Record<string, string> = { SKU: "BOXHERO-NOT-IDENTITY", "Item Name": "Fictional mapped product", "Unit Cost": cost, "Selling Price": "123.45", Packing: "18/6/6", Type: "Fictional Type", Brand: "Fictional Brand", "Item Number": "FICTIONAL-MAPPED-1", Quantity: "0", "Qty(Warehouse)": "0", ...change };
  return boxHeroHeaders.map((h) => data[h]);
};
const hash = "a".repeat(64);
it("maps item number and independent Tier 2 case price, leaves other tiers blank and availability manual; cost never leaves the source", () => {
  const result = mapBoxHero([boxHeroHeaders, row()], config, hash);
  expect(result.writable).toBe(true);
  expect(result.rows[0]).toMatchObject({ sku: "FICTIONAL-MAPPED-1", catalogKey: "", brand: "Fictional Brand", packing: "18/6/6", available: false,
    prices: { "price:1:Tier 1": null, "price:2:Tier 2": "123.45", "price:3:Fictional future group": null } });
  const prepared = prepare(Buffer.from(canonicalCsv(result.rows)));
  expect(parsePricingCsv(Buffer.from(prepared.pricingCsv), tiers).errors).toEqual([]);
  const mutations = plan(prepared.rows, snapshot([]), { projectId: "testonly", dataset: "test" }).mutations;
  const customerContent = normalizeCatalogContent([{ _id: "fictional", ...prepared.rows[0], available: true, "Unit Cost": cost }]);
  for (const output of [JSON.stringify(result), prepared.resolvedCsv, prepared.pricingCsv, JSON.stringify(mutations), JSON.stringify(customerContent)]) {
    expect(output).not.toContain(cost); expect(output).not.toContain("Unit Cost"); expect(output).not.toContain("BOXHERO-NOT-IDENTITY");
  }
  expect(JSON.stringify(mutations)).not.toContain("123.45");
});
it.each(["0", "0.0", "0.00"])("keeps BoxHero zero %s unpriced before and after acknowledgement", (sellingPrice) => {
  const source = [boxHeroHeaders, row({ "Selling Price": sellingPrice })];
  for (const acknowledged of [false, true]) {
    const result = mapBoxHero(source, { ...config, sourceHash: hash,
      rows: [{ row: 2, acknowledge: acknowledged ? ["zero_selling_price"] : [] }] }, hash);
    expect(result.writable).toBe(acknowledged);
    expect(result.report.issues[0].warnings).toContain("zero_selling_price");
    expect(result.report.issues[0].errors).toEqual([]);
    expect(result.rows[0].prices).toEqual({ "price:1:Tier 1": null, "price:2:Tier 2": null, "price:3:Fictional future group": null });
  }
});
it("resolves a zero selling price only with an explicit positive override without deriving other tiers", () => {
  const result = mapBoxHero([boxHeroHeaders, row({ "Selling Price": "0" })], { ...config, sourceHash: hash,
    rows: [{ row: 2, sellingPrice: "151.27" }] }, hash);
  expect(result.writable).toBe(true);
  expect(result.report.issues[0].warnings).not.toContain("zero_selling_price");
  expect(result.rows[0].prices).toEqual({ "price:1:Tier 1": null, "price:2:Tier 2": "151.27", "price:3:Fictional future group": null });
});
it("exports an acknowledged zero selling price as a blank Tier 2 pricing CSV cell", () => {
  const result = mapBoxHero([boxHeroHeaders, row({ "Selling Price": "0" })], { ...config, sourceHash: hash,
    rows: [{ row: 2, acknowledge: ["zero_selling_price"] }] }, hash);
  expect(result.writable).toBe(true);
  const prepared = prepare(Buffer.from(canonicalCsv(result.rows)));
  const cells = parse(prepared.pricingCsv, { bom: true, columns: true, skip_empty_lines: true }) as Record<string, string>[];
  expect(cells[0]["price:2:Tier 2"]).toBe("");
  const imported = parsePricingCsv(Buffer.from(prepared.pricingCsv), tiers);
  expect(imported.errors).toEqual([]);
  expect(imported.rows[0].prices).toEqual({ "price:1:Tier 1": null, "price:2:Tier 2": null, "price:3:Fictional future group": null });
});
it.each([
  [{ "Item Number": "" }, "missing_item_number", true], [{ Type: "" }, "missing_category", true],
  [{ "Selling Price": "0" }, "zero_selling_price", false], [{ "Selling Price": "1.001" }, "invalid_selling_price", true],
  [{ Quantity: "-1", "Qty(Warehouse)": "-1" }, "negative_inventory_quantity", false],
  [{ "Qty(Warehouse)": "1" }, "warehouse_quantity_mismatch", false],
  [{ "Item Name": "Fictional SHIPPING record" }, "suspected_non_product", false],
  [{ Brand: "", Packing: "" }, "missing_brand", false], [{ Type: "Unmapped fictional type" }, "unmapped_category", false],
] as const)("flags source issues without guessing %#", (change, code, error) => {
  const result = mapBoxHero([boxHeroHeaders, row(change)], config, hash);
  expect(result.report.issues[0][error ? "errors" : "warnings"]).toContain(code);
  expect(result.writable).toBe(false); expect(result.rows[0].available).toBe(false);
});
it("blocks duplicate item numbers, reports duplicate names, and never merges rows", () => {
  const result = mapBoxHero([boxHeroHeaders, row(), row({ "Item Number": "fictional-mapped-1" })], config, hash);
  expect(result.rows).toHaveLength(2);
  for (const issue of result.report.issues) { expect(issue.errors).toContain("duplicate_item_number"); expect(issue.warnings).toContain("duplicate_item_name"); }
});
it("requires source-bound explicit corrections/exclusions and warning acknowledgements", () => {
  const source = [boxHeroHeaders, row({ "Item Number": "", "Selling Price": "0" }), row()];
  const review = { ...config, sourceHash: hash, rows: [{ row: 2, sku: "FIXED-FICTIONAL", acknowledge: ["zero_selling_price"] }, { row: 3, exclude: "Fictional operator decision" }] };
  const result = mapBoxHero(source, review, hash);
  expect(result.writable).toBe(true); expect(result.report.excludedCandidates).toBe(1); expect(result.rows).toHaveLength(1);
  expect(() => mapBoxHero(source, review, "b".repeat(64))).toThrow("sourceHash");
  expect(mapBoxHero(source, { ...review, rows: [{ row: 2, sku: "FIXED-FICTIONAL" }, review.rows[1]] }, hash).writable).toBe(false);
});
it("rejects malformed structure and forged configuration rather than accepting source-defined tiers", () => {
  expect(() => mapBoxHero([boxHeroHeaders, row()], { ...config, costMultiplier: 0.8 }, hash)).toThrow();
  expect(() => mapBoxHero([boxHeroHeaders.slice(1), row()], config, hash)).toThrow("headers");
  expect(() => mapBoxHero([boxHeroHeaders, row()], { tiers: [{ rank: 1, name: "Tier 1" }] }, hash)).toThrow();
});
// Minimal fictional ZIP fixture exercises the actual XLSX reader, not a live file.
function workbook(sheet = "BoxHero", formula = false, numeric: Record<string, string> = {}, text: Record<string, string> = {}) {
  const data = [boxHeroHeaders, row({ ...text, ...numeric })];
  const worksheet = `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${data.map((cells, r) => `<row r="${r + 1}">${cells.map((v, c) => {
    const isNumeric = r > 0 && Object.hasOwn(numeric, boxHeroHeaders[c]);
    return `<c r="${String.fromCharCode(65 + c)}${r + 1}" t="${isNumeric ? 'n' : 'inlineStr'}">${formula ? '<f>1+1</f>' : ''}${isNumeric ? `<v>${v}</v>` : `<is><t>${v}</t></is>`}</c>`;
  }).join("")}</row>`).join("")}</sheetData></worksheet>`;
  return zipSync({
    "xl/workbook.xml": strToU8(`<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${sheet}" sheetId="1" r:id="rId1"/></sheets></workbook>`),
    "xl/_rels/workbook.xml.rels": strToU8('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'),
    "xl/worksheets/sheet1.xml": strToU8(worksheet),
  });
}
it.each([
  ["75.489999999999995", "75.49", "75.49"],
  ["71.569999999999993", "71.57", "71.57"],
  ["153.61000000000001", "153.61", "153.61"],
  ["156.80000000000001", "156.8", "156.80"],
])("normalizes XLSX numeric storage %s before exact-money validation", async (raw, normalized, canonical) => {
  const parsed = await readBoxHero(workbook("BoxHero", false, { "Selling Price": raw, "Unit Cost": cost }), ".xlsx");
  expect(parsed[1][3]).toBe(normalized);
  expect(parsed[1][2]).toBeNull(); expect(JSON.stringify(parsed)).not.toContain(cost);
  const result = mapBoxHero(parsed, config, hash);
  expect(result.writable).toBe(true);
  expect(result.rows[0].prices).toEqual({ "price:1:Tier 1": null, "price:2:Tier 2": canonical, "price:3:Fictional future group": null });
});
it.each(["1.001", "75.491", "-1.25", "NaN", "Infinity", "10000000000"])("rejects XLSX numeric price %s without fixed-scale rounding", async (raw) => {
  const parsed = await readBoxHero(workbook("BoxHero", false, { "Selling Price": raw }), ".xlsx");
  expect(parsed[1][3]).toBe(raw);
  const result = mapBoxHero(parsed, config, hash);
  expect(result.writable).toBe(false);
  expect(result.report.issues[0].errors).toContain("invalid_selling_price");
});
it.each(["0", "0.0", "0.00"])("keeps XLSX numeric zero %s unpriced even when acknowledged", async (raw) => {
  const parsed = await readBoxHero(workbook("BoxHero", false, { "Selling Price": raw }), ".xlsx");
  const result = mapBoxHero(parsed, { ...config, sourceHash: hash, rows: [{ row: 2, acknowledge: ["zero_selling_price"] }] }, hash);
  expect(result.writable).toBe(true);
  expect(result.rows[0].prices["price:2:Tier 2"]).toBeNull();
  expect(result.report.issues[0].warnings).toContain("zero_selling_price");
});
it.each([
  ["12.0", "12", []], ["-1", "-1", ["negative_inventory_quantity"]],
  ["12", "11", ["warehouse_quantity_mismatch"]], ["1.001", "1", ["invalid_inventory_quantity"]],
] as const)("retains XLSX quantity diagnostics and manual availability: %s / %s", async (quantity, warehouse, warnings) => {
  const parsed = await readBoxHero(workbook("BoxHero", false, { Quantity: quantity, "Qty(Warehouse)": warehouse }), ".xlsx");
  const result = mapBoxHero(parsed, config, hash);
  expect(result.report.issues[0].warnings).toEqual(warnings);
  expect(result.rows[0].available).toBe(false);
});
it("preserves textual numeric-looking cells and raw numeric identifiers without creating identity", async () => {
  const parsed = await readBoxHero(workbook("BoxHero", false, { "Item Number": "9007199254740993" },
    { "Selling Price": "75.489999999999995", Brand: "00123", Packing: "18/6/6" }), ".xlsx");
  expect(parsed[1][3]).toBe("75.489999999999995");
  const result = mapBoxHero(parsed, config, hash);
  expect(result.rows[0]).toMatchObject({ sku: "9007199254740993", catalogKey: "", brand: "00123", packing: "18/6/6" });
  expect(result.report.issues[0].errors).toContain("invalid_selling_price");
});
it("reads the fictional CSV and XLSX into the same privacy-safe mapping", async () => {
  const csv = readFileSync("tests/fixtures/boxhero.csv");
  const csvResult = mapBoxHero(await readBoxHero(csv, ".csv"), config, sourceHash(csv));
  const xlsx = workbook(); const parsed = await readBoxHero(xlsx, ".xlsx");
  expect(JSON.stringify(parsed)).not.toContain(cost);
  expect(mapBoxHero(parsed, config, sourceHash(xlsx)).rows).toEqual(csvResult.rows);
});
it("rejects wrong sheets, formulas, oversized archives and malformed UTF-8", async () => {
  for (const input of [workbook("Other"), workbook("BoxHero", true), zipSync({ "huge.xml": new Uint8Array(9 * 1024 * 1024) })]) await expect(readBoxHero(input, ".xlsx")).rejects.toThrow();
  await expect(readBoxHero(Buffer.from([0xff]), ".csv")).rejects.toThrow();
});
