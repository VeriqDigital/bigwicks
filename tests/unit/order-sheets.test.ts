import { expect, it } from "vitest";
import ExcelJS from "exceljs";
import { unzipSync, zipSync, strToU8 } from "fflate";
import {
  inspectWorkbook,
  generateWorkbook,
} from "../../lib/order-sheets/runtime/workbook.mjs";
import { inspectArchive } from "../../lib/order-sheets/runtime/archive.mjs";
import { mapSheet } from "@/lib/order-sheets/mapping";
import { fictionalProduct } from "../fixtures/catalog";
import {
  fictionalSheet,
  sheetOrder,
  sheetKey,
  compositeKey,
} from "../fixtures/order-sheets";
const read = async (bytes: string) => {
  const w = new ExcelJS.Workbook();
  await w.xlsx.load(new Uint8Array(Buffer.from(bytes, "base64")).buffer);
  return w;
};
async function configured(options: Parameters<typeof fictionalSheet>[0] = {}) {
  const bytes = await fictionalSheet(options),
    inspection = await inspectWorkbook(bytes);
  expect(inspection.errors).toEqual([]);
  const priceColumn = inspection.priceColumns.find(
    (p) => p.label === "TIER BLUE",
  )!.column;
  return {
    bytes: bytes.toString("base64"),
    configuration: {
      ...inspection,
      priceColumn,
      mapping: { [sheetKey]: 5, [compositeKey]: 631 },
    },
  };
}
it.each([false, true])(
  "detects reordered columns=%s, categories, formatting and the final product",
  async (reordered) => {
    const template = await configured({ reordered });
    expect(template.configuration.products).toHaveLength(3);
    const result = await generateWorkbook(sheetOrder, template);
    expect(result.kind).toBe("TEMPLATE");
    const w = await read(result.bytes),
      s = w.getWorksheet("Wholesale")!,
      c = template.configuration.columns;
    expect(s.getCell(5, c.quantity).value).toBe(3);
    expect(s.getCell(7, c.quantity).value).toBeNull();
    expect(s.getCell(631, c.quantity).value).toBe(1);
    expect(s.getCell(5, c.id).value).toBe("=LITERAL-SKU");
    expect(s.getCell(5, c.name).value).toBe("+Literal product");
    expect(s.getCell(5, c.packing).value).toBeNull();
    expect(s.getCell(5, template.configuration.priceColumn).value).toBe(19.99);
    expect(
      s.getCell(template.configuration.footer.subtotal).value,
    ).toMatchObject({ result: 60.07, formula: expect.stringContaining("631") });
    for (const address of template.configuration.footer.adjustments)
      expect(s.getCell(address).value).toBeNull();
    expect(s.getCell("K634").value).toBe("Not calculated by website");
    expect(s.pageSetup.orientation).toBe("landscape");
    expect(s.getColumn(c.name).width).toBe(40);
    expect(w.getWorksheet("Submitted order")!.lastRow!.getCell(7).value).toBe(
      60.07,
    );
    const original = await read(template.bytes);
    expect(
      original.getWorksheet("Wholesale")!.getCell(5, c.quantity).value,
    ).toBe(99);
  },
);
it("blocks duplicate identifiers with row locations, preserves punctuation and reports date packing", async () => {
  const r = await inspectWorkbook(await fictionalSheet({ duplicate: true }));
  expect(r.errors.join()).toContain("5, 540");
  expect(r.products.find((p) => p.row === 631)?.id).toBe("DEMO-A,B,C");
  expect(r.warnings.join()).toContain("date-formatted");
});
it("rejects ambiguous or merged summary destinations instead of overwriting labels", async () => {
  const w = await read((await fictionalSheet()).toString("base64"));
  const s = w.getWorksheet("Wholesale")!;
  s.mergeCells("G635:H635");
  s.getCell("G645").value = "GRAND TOTAL";
  const r = await inspectWorkbook(Buffer.from(await w.xlsx.writeBuffer()));
  expect(r.errors.join()).toContain("H635: summary and order-input results must be unmerged");
  expect(r.errors.join()).toContain("More than one total label");
});
it("matches only unique normalized SKUs, with diagnostic source prices and unreadable formulas", async () => {
  const r = await inspectWorkbook(await fictionalSheet({ formulaPrice: true }));
  const p = mapSheet(
    r,
    [
      fictionalProduct({ catalogKey: sheetKey, sku: " demo-one " }),
      fictionalProduct({ catalogKey: compositeKey, sku: "DEMO-A,B,C" }),
    ],
    [{ catalogKey: sheetKey, price: "19.99" }],
    7,
  );
  expect(p.mapping).toEqual({ [sheetKey]: 5, [compositeKey]: 631 });
  expect(p.discrepancies[0].source).toBeNull();
  expect(p.unmatchedRows).toHaveLength(1);
  const ambiguous = mapSheet(
    r,
    [
      fictionalProduct({ catalogKey: sheetKey, sku: "DEMO-ONE" }),
      fictionalProduct({
        _id: "different",
        catalogKey: compositeKey,
        sku: "demo-one",
      }),
    ],
    [],
    7,
  );
  expect(ambiguous.mapping).toEqual({});
  expect(ambiguous.ambiguousSkus).toEqual(["DEMO-ONE"]);
});
it.each(["NO_TEMPLATE", "LEGACY_ORDER", "MISSING_MAPPING"])(
  "creates complete explicitly labeled fallback: %s",
  async (reason) => {
    const template = reason === "MISSING_MAPPING" ? await configured() : null;
    if (template)
      template.configuration.mapping =
        {} as typeof template.configuration.mapping;
    const result = await generateWorkbook(sheetOrder, template, reason);
    expect(result).toMatchObject({ kind: "SNAPSHOT", diagnostic: reason });
    const w = await read(result.bytes);
    expect(w.worksheets).toHaveLength(1);
    expect(w.worksheets[0].getCell("B2").value).toContain(reason);
    expect(w.worksheets[0].rowCount).toBe(16);
  },
);
it("preserves maximum permitted exact money as labeled text instead of rounding", async () => {
  const order = {
    ...sheetOrder,
    total: "2497499999997502.50",
    items: Array.from({ length: 250 }, (_, i) => ({
      ...sheetOrder.items[0],
      catalogKey: String(i),
      unitPrice: "9999999999.99",
      quantity: 999,
      lineTotal: "9989999999990.01",
    })),
  };
  const result = await generateWorkbook(order, null);
  const s = (await read(result.bytes)).worksheets[0];
  expect(s.lastRow!.getCell(7).value).toBe(order.total);
  expect(s.getCell("E14").value).toBe("9999999999.99");
  expect(s.getCell("A11").value).toContain("Exact amounts are text");
});
it("rejects inconsistent saved totals", async () => {
  await expect(
    generateWorkbook({ ...sheetOrder, total: "60.08" }, null),
  ).rejects.toThrow("SAVED_TOTAL_INVALID");
});
it("rejects unsafe formula content, malformed ZIP, oversized input, embedded content and DTDs", async () => {
  await expect(
    inspectWorkbook(await fictionalSheet({ unsafe: true })),
  ).rejects.toThrow("Unsupported formula");
  for (const b of [Buffer.alloc(10), Buffer.alloc(2097153)])
    expect(() => inspectArchive(b)).toThrow();
  const archive = unzipSync(await fictionalSheet());
  for (const name of [
    "xl/vbaProject.bin",
    "../outside.xml",
    "xl/externalLinks/externalLink1.xml",
    "xl/embeddings/object.bin",
  ]) {
    expect(() =>
      inspectArchive(
        zipSync({ ...archive, [name]: strToU8("private marker") }),
      ),
    ).toThrow();
  }
  for (const signature of ["4d5a", "7f454c46", "d0cf11e0a1b11ae1"])
    expect(() => inspectArchive(zipSync({
      ...archive,
      "xl/printerSettings/printerSettings1.bin": Buffer.from(signature, "hex"),
    }))).toThrow();
  expect(() =>
    inspectArchive(
      zipSync({
        ...archive,
        "docProps/core.xml": strToU8(
          '<!DOCTYPE x [<!ENTITY e "private">]><x/>',
        ),
      }),
    ),
  ).toThrow();
  expect(() =>
    inspectArchive(
      zipSync({
        ...archive,
        "xl/worksheets/sheet1.xml": strToU8(
          '<worksheet><c r="XFD1048576"/></worksheet>',
        ),
      }),
    ),
  ).toThrow();
});
it("bounds actual decompression, rejects duplicate paths, external relationships and malformed coordinates", async () => {
  const archive = unzipSync(await fictionalSheet());
  const bomb = zipSync({
    ...archive,
    "docProps/core.xml": strToU8("x".repeat(9 * 1024 * 1024)),
  });
  expect(() => inspectArchive(bomb)).toThrow();
  // Tamper declared expansion to be small; native maxOutputLength still stops actual expansion.
  const forged = Buffer.from(bomb);
  for (let i = 0; i < forged.length - 46; i++)
    if (
      forged.readUInt32LE(i) === 0x02014b50 &&
      forged
        .subarray(i + 46, i + 46 + forged.readUInt16LE(i + 28))
        .toString() === "docProps/core.xml"
    )
      forged.writeUInt32LE(1, i + 24);
  expect(() => inspectArchive(forged)).toThrow();
  const duplicate = Buffer.from(
    zipSync({ ...archive, "docProps/copy.xml": archive["docProps/core.xml"] }),
  );
  const source = Buffer.from("docProps/copy.xml"),
    target = Buffer.from("docProps/core.xml");
  let at = duplicate.indexOf(source);
  while (at >= 0) {
    target.copy(duplicate, at);
    at = duplicate.indexOf(source, at + source.length);
  }
  expect(() => inspectArchive(duplicate)).toThrow();
  expect(() =>
    inspectArchive(
      zipSync({
        ...archive,
        "xl/_rels/workbook.xml.rels": strToU8(
          '<Relationships><Relationship TargetMode="External" Target="https://example.test"/></Relationships>',
        ),
      }),
    ),
  ).toThrow();
  for (const xml of [
    '<worksheet><cols><col min="1" max="16385"/></cols></worksheet>',
    '<worksheet><sheetData><row r="5001"/></sheetData></worksheet>',
    '<worksheet><sheetData><row r="1"><c r="A1"/><c r="A1"/></row></sheetData></worksheet>',
  ])
    expect(() =>
      inspectArchive(
        zipSync({ ...archive, "xl/worksheets/sheet1.xml": strToU8(xml) }),
      ),
    ).toThrow();
});
