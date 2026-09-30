import { expect, it } from "vitest";
import ExcelJS from "exceljs";
import { unzipSync, strFromU8 } from "fflate";
import { inspectWorkbook, generateWorkbook } from "../../lib/order-sheets/runtime/workbook.mjs";
import { fictionalSheet, sparseSheet, sheetOrder, sheetKey, compositeKey } from "../fixtures/order-sheets";
import { generateOrderSheet } from "@/lib/order-sheets/worker";

async function read(bytes: Buffer) {
  const w = new ExcelJS.Workbook();
  await w.xlsx.load(new Uint8Array(bytes).buffer);
  return w;
}
async function template(input?: Buffer) {
  const bytes = input ?? await fictionalSheet();
  const inspection = await inspectWorkbook(bytes);
  return { bytes: bytes.toString("base64"), configuration: { ...inspection, priceColumn: 7, mapping: { [sheetKey]: 5, [compositeKey]: 631 } } };
}
function expectBlankFormulaCache(bytes: string) {
  const xml = strFromU8(unzipSync(Buffer.from(bytes, "base64"))["xl/worksheets/sheet1.xml"]);
  // ExcelJS drops the empty string when reading it back; inspect the actual OOXML cache.
  expect(xml.match(/<c\b[^>]*\br="H7"[^>]*>[\s\S]*?<\/c>/)?.[0]).toMatch(/t="str"[\s\S]*<v><\/v>/);
}

it("keeps controlled formulas on unselected rows and references editable quantity/price cells", async () => {
  const result = await generateWorkbook(sheetOrder, await template());
  const w = await read(Buffer.from(result.bytes, "base64")), s = w.getWorksheet("Wholesale")!;
  const formula = (row: number) => `IF(A${row}="","",IF(AND(ISNUMBER(A${row}),A${row}>=0,ISNUMBER(G${row}),G${row}>=0),ROUND(A${row}*G${row},2),NA()))`;
  expect(s.getCell("H7").formula).toBe(formula(7));
  expectBlankFormulaCache(result.bytes);
  expect(s.getCell("G7").value).toBe(2.34);
  expect(s.getCell("H5").formula).toBe(formula(5));
  expect(s.getCell("H5").result).toBe(59.97);
  expect(s.getCell("H635").formula).toContain("H7");
  s.getCell("A7").value = 2;
  s.getCell("A5").value = 4;
  const edited = await read(Buffer.from(await w.xlsx.writeBuffer()));
  expect(edited.getWorksheet("Wholesale")!.getCell("H7").formula).toBe(formula(7));
  expect(edited.getWorksheet("Wholesale")!.getCell("H5").formula).toBe(formula(5));
  expect(edited.getWorksheet("Submitted order")!.lastRow!.getCell(7).value).toBe(60.07);
  // ExcelJS does not calculate these edits. These assertions check the serialized
  // formula dependencies and original caches, not an Excel recalculation engine.
  expect(s.getCell("H635").result).toBe(60.07);
});
it.each([null, { formula: "1+1", result: 2 }])("marks an unselected missing/formula price for staff input (%j)", async (price) => {
  const source = await read(await fictionalSheet());
  source.getWorksheet("Wholesale")!.getCell("G7").value = price;
  const result = await generateWorkbook(sheetOrder, await template(Buffer.from(await source.xlsx.writeBuffer())));
  const s = (await read(Buffer.from(result.bytes, "base64"))).getWorksheet("Wholesale")!;
  expect(s.getCell("G7").value).toBe("Enter case price");
  expect(s.getCell("G7").alignment.wrapText).toBe(true);
  expect(s.getRow(7).height).toBeGreaterThanOrEqual(45);
  expect(s.getCell("H7").formula).toContain("ISNUMBER(G7)");
  expect(s.getCell("H7").formula).toContain("NA()");
  expectBlankFormulaCache(result.bytes);
  expect(s.getCell("H635").result).toBe(60.07);
});
it.each(["Submitted order", "submitted order", "SUBMITTED ORDER", "SuBmItTeD OrDeR"])("rejects reserved name %s before activation", async (worksheetName) => {
  const w = new ExcelJS.Workbook();
  w.addWorksheet(worksheetName);
  expect(() => w.addWorksheet("Submitted order")).toThrow();
  await expect(inspectWorkbook(await fictionalSheet({ worksheetName }))).rejects.toThrow(/reserved|Submitted order/i);
});
it.each([1000, 2000])("preflights sparse %i-row summary formula with real XLSX bytes", async (count) => {
  const bytes = await sparseSheet(count), inspected = await inspectWorkbook(bytes);
  expect(bytes.length).toBeLessThan(2 * 1024 * 1024);
  expect(inspected.products).toHaveLength(count);
  const t = { bytes: bytes.toString("base64"), configuration: { ...inspected, priceColumn: 5, mapping: { [sheetKey]: 5 } } };
  const order = { ...sheetOrder, items: [sheetOrder.items[0]], total: "59.97" };
  if (count === 2000) {
    expect(inspected.errors.join()).toMatch(/fragmented|formula.*limit/i);
    await expect(generateWorkbook(order, t)).rejects.toThrow("OUTPUT_FORMULA_LIMIT");
  } else {
    expect(inspected.errors).toEqual([]);
    const result = await generateWorkbook(order, t);
    const s = (await read(Buffer.from(result.bytes, "base64"))).worksheets[0];
    expect(s.getCell(inspected.footer.subtotal).formula.length).toBeLessThanOrEqual(8192);
    expect(s.getCell(inspected.footer.subtotal).result).toBe(59.97);
  }
});

it("carries allowlisted configuration and formula-limit failures through the actual subprocess", async () => {
  const t = await template();
  t.configuration.version = "unsupported";
  await expect(generateOrderSheet(sheetOrder, t, "NO_TEMPLATE")).rejects.toMatchObject({ code: "PINNED_CONFIG_INVALID" });
  const bytes = await sparseSheet(), inspection = await inspectWorkbook(bytes);
  await expect(generateOrderSheet({ ...sheetOrder, items: [sheetOrder.items[0]], total: "59.97" }, {
    bytes: bytes.toString("base64"), configuration: { ...inspection, priceColumn: 5, mapping: { [sheetKey]: 5 } },
  }, "NO_TEMPLATE")).rejects.toMatchObject({ code: "OUTPUT_LIMIT" });
});

it("preserves exact-text working amounts and labels offline calculation as unavailable at the money limit", async () => {
  const order = { ...sheetOrder, total: "19979999999980.02", items: sheetOrder.items.map((i) => ({ ...i, unitPrice: "9999999999.99", quantity: 999, lineTotal: "9989999999990.01" })) };
  const result = await generateWorkbook(order, await template());
  const w = await read(Buffer.from(result.bytes, "base64")), s = w.getWorksheet("Wholesale")!;
  expect(s.getCell("H635").value).toBe(order.total);
  expect(s.getCell("H5").value).toBe("9989999999990.01");
  expect(s.getCell("H7").formula).toBeUndefined();
  expect(JSON.stringify(s.model)).toContain("Offline monetary calculations are disabled");
  expect(w.getWorksheet("Submitted order")!.lastRow!.getCell(7).value).toBe(order.total);
});
