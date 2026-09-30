import ExcelJS from "exceljs";
import type { SavedSheetOrder } from "../../lib/order-sheets/types";
export const sheetKey = "d9000000-0000-4000-8000-000000000001";
export const compositeKey = "d9000000-0000-4000-8000-000000000002";
export const sheetOrder: SavedSheetOrder = {
  reference: "BW-1234567890ABCDEF1234",
  createdAt: "2026-09-29T12:00:00.000Z",
  companyName: "Fictional Worksheet Buyer",
  customerNumber: "FICTION-001",
  email: "buyer@example.test",
  tierName: "Fictional tier",
  total: "60.07",
  items: [
    {
      catalogKey: sheetKey,
      sku: "=LITERAL-SKU",
      name: "+Literal product",
      brand: null,
      packing: null,
      unitPrice: "19.99",
      quantity: 3,
      lineTotal: "59.97",
    },
    {
      catalogKey: compositeKey,
      sku: "DEMO-A,B,C",
      name: "Fictional composite",
      brand: "Demo",
      packing: "4/1",
      unitPrice: "0.10",
      quantity: 1,
      lineTotal: "0.10",
    },
  ],
};
export async function fictionalSheet(
  options: {
    duplicate?: boolean;
    reordered?: boolean;
    formulaPrice?: boolean;
    unsafe?: boolean;
    worksheetName?: string;
  } = {},
) {
  const w = new ExcelJS.Workbook(),
    s = w.addWorksheet(options.worksheetName ?? "Wholesale");
  const headers = options.reordered
    ? [
        "PRODUCT NAME",
        "PACKING",
        "TOTAL",
        "TIER BLUE",
        "QTY",
        "PRODUCT ID",
        "UNIT G.W",
        "TIER GOLD",
      ]
    : [
        "QTY",
        "PRODUCT ID",
        "PRODUCT NAME",
        "UNIT G.W",
        "PACKING",
        "TIER GOLD",
        "TIER BLUE",
        "TOTAL",
      ];
  const col = (h: string) => headers.indexOf(h) + 1;
  s.getCell("A1").value = "Fictional staff order sheet";
  s.getRow(2).values = headers;
  s.getRow(2).font = { bold: true };
  for (const [row, sku, name] of [
    [5, "DEMO-ONE", "Fictional first"],
    [7, "DEMO-UNMATCHED", "Fictional unmatched"],
    [631, "DEMO-A,B,C", "Fictional last"],
  ] as const) {
    s.getCell(row, col("PRODUCT ID")).value = sku;
    s.getCell(row, col("PRODUCT NAME")).value = name;
    s.getCell(row, col("QTY")).value = 99;
    s.getCell(row, col("PACKING")).value =
      row === 5 ? new Date("2026-04-01T00:00:00Z") : "4/1";
    s.getCell(row, col("TIER GOLD")).value = 3.21;
    s.getCell(row, col("TIER BLUE")).value = 2.34;
    s.getCell(row, col("TOTAL")).value = {
      formula: `${s.getCell(row, col("QTY")).address}*${s.getCell(row, col("TIER BLUE")).address}`,
      result: 231.66,
    };
  }
  s.getCell(6, col("PRODUCT NAME")).value = "Inserted category";
  if (!options.reordered) {
    s.getCell("H5").value = Object.assign(
      { formula: "A5*G5", result: 231.66 },
      { shareType: "shared", ref: "H5:H7" },
    );
    s.getCell("H7").value = { sharedFormula: "H5", result: 231.66 };
  }
  if (options.duplicate) {
    s.getCell(540, col("PRODUCT ID")).value = " demo-one ";
    s.getCell(540, col("PRODUCT NAME")).value = "Different fictional product";
  }
  if (options.formulaPrice)
    s.getCell(5, col("TIER BLUE")).value = { formula: "1+1", result: 2 };
  const amountColumn = col("TOTAL"),
    labelColumn = amountColumn === 1 ? 2 : amountColumn - 1;
  for (const [r, label] of [
    [635, "SUBTOTAL:"],
    [636, "SHIPPING:"],
    [637, "TAX"],
    [638, "CC FEE 3.5%"],
    [639, "TOTAL:"],
  ] as const) {
    s.getCell(r, labelColumn).value = label;
    s.getCell(r, amountColumn).value = {
      formula:
        r === 635
          ? `SUM(${s.getCell(5, amountColumn).address}:${s.getCell(630, amountColumn).address})`
          : `${s.getCell(635, amountColumn).address}*0.12`,
      result: 999,
    };
  }
  // Weight summary deliberately separate from product/summary columns.
  s.getCell("J634").value = "TOTAL WEIGHT (LBS)";
  s.getCell("K634").value = {
    formula: "SUMPRODUCT(A5:A7,D5:D7)*2.2",
    result: 99,
  };
  s.getCell("A1539").style = {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAEAEA" } },
  };
  s.getColumn(col("PRODUCT NAME")).width = 40;
  s.getColumn(col("TOTAL")).numFmt = "0.00";
  s.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
  };
  if (options.unsafe)
    s.getCell(5, col("TOTAL")).value = {
      formula: 'WEBSERVICE("https://example.test/private")',
      result: 1,
    };
  return Buffer.from(await w.xlsx.writeBuffer());
}

// A real XLSX within the upload/archive/cell bounds, with deliberately fragmented rows.
export async function sparseSheet(count = 2000) {
  const w = new ExcelJS.Workbook(), s = w.addWorksheet("Sparse fictional products");
  s.getRow(2).values = ["QTY", "PRODUCT ID", "PRODUCT NAME", "PACKING", "TIER BLUE", "", "", "TOTAL"];
  for (let i = 0; i < count; i++) {
    s.getRow(5 + 2 * i).values = [null, `SPARSE-${i}`, `Fictional product ${i}`, "1/1", 2.34];
  }
  s.getCell(7 + 2 * count, 7).value = "SUBTOTAL";
  return Buffer.from(await w.xlsx.writeBuffer());
}
