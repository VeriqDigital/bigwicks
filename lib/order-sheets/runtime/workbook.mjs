import ExcelJS from "exceljs";
import { inspectArchive } from "./archive.mjs";
import {
  LIMITS,
  VERSION,
  GENERATOR_VERSION,
  SheetError,
  normalizeHeader,
  normalizeId,
} from "./limits.mjs";

const aliases = {
  quantity: ["QTY", "QUANTITY", "CASES", "CASE COUNT"],
  id: ["PRODUCT ID", "SKU", "ITEM NUMBER"],
  name: ["PRODUCT NAME", "ITEM NAME"],
  packing: ["PACKING", "CASE PACK"],
  total: ["TOTAL", "LINE TOTAL"],
  weight: ["UNIT G W", "UNIT WEIGHT"],
};
const literal = (cell) =>
  typeof cell.value === "string"
    ? cell.value
    : typeof cell.value === "number"
      ? String(cell.value)
      : cell.value?.richText
        ? cell.value.richText.map((t) => t.text).join("")
        : "";
const decimal = (cell) => {
  const v = cell.value;
  if (typeof v !== "number" && typeof v !== "string") return null;
  const t = String(v);
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(t)) return null;
  const [a, b = ""] = t.split(".");
  return `${a}.${b.padEnd(2, "0")}`;
};
async function load(bytes) {
  inspectArchive(bytes);
  const w = new ExcelJS.Workbook();
  await w.xlsx.load(Buffer.from(bytes));
  return w;
}
export async function inspectWorkbook(bytes) {
  const workbook = await load(bytes),
    s = workbook.worksheets[0];
  if (
    workbook.worksheets.length !== 1 ||
    s.state !== "visible" ||
    s.name.toLowerCase() === "submitted order"
  )
    throw new SheetError(
      "Use one visible product worksheet. Submitted order is a reserved worksheet name (case-insensitive); rename it in the source and upload again.",
    );
  const candidates = [];
  for (let r = 1; r <= Math.min(s.rowCount, 30); r++) {
    const columns = {};
    const duplicate = [];
    s.getRow(r).eachCell((cell, col) => {
      const h = normalizeHeader(literal(cell));
      for (const [key, values] of Object.entries(aliases))
        if (values.includes(h)) {
          if (columns[key]) duplicate.push(key);
          columns[key] = col;
        }
    });
    if (["quantity", "id", "name", "packing", "total"].every((k) => columns[k]))
      candidates.push({ row: r, columns, duplicate });
  }
  if (candidates.length !== 1 || candidates[0].duplicate.length)
    throw new SheetError(
      "Cannot identify one unique header row in the first 30 rows. Required: QTY, PRODUCT ID, PRODUCT NAME, PACKING, TOTAL (documented aliases accepted).",
    );
  const { row: headerRow, columns } = candidates[0];
  const priceColumns = [];
  s.getRow(headerRow).eachCell((cell, column) => {
    const label = literal(cell).trim();
    if (label && !Object.values(columns).includes(column))
      priceColumns.push({ column, label });
  });
  if (!priceColumns.length || priceColumns.length > 16)
    throw new SheetError(
      "Provide 1–16 clearly labeled case-price columns in the product header row.",
    );
  const products = [],
    errors = [],
    warnings = [],
    ids = new Map();
  let lastProduct = headerRow;
  for (let r = headerRow + 1; r <= s.rowCount; r++) {
    const row = s.getRow(r),
      id = literal(row.getCell(columns.id)).trim(),
      name = literal(row.getCell(columns.name)).trim();
    if (!id) continue;
    // A merged category spanning identity/name cells is a heading, never a product.
    if (
      row.getCell(columns.id).isMerged &&
      row.getCell(columns.id).master.address ===
        row.getCell(columns.name).master.address
    )
      continue;
    if (!name) {
      errors.push(
        `${s.name}, row ${r}: PRODUCT ID requires a PRODUCT NAME. Clear the ID for category headings.`,
      );
      continue;
    }
    if (id.length > 100 || name.length > 200) {
      errors.push(
        `${s.name}, row ${r}: product ID/name exceeds the supported length.`,
      );
      continue;
    }
    const normalized = normalizeId(id);
    ids.set(normalized, [...(ids.get(normalized) ?? []), r]);
    const prices = {};
    for (const p of priceColumns)
      prices[p.column] = decimal(row.getCell(p.column));
    products.push({ row: r, id, prices });
    lastProduct = r;
    if (
      [...Object.values(columns), ...priceColumns.map((p) => p.column)].some(
        (col) => row.getCell(col).isMerged,
      )
    )
      errors.push(`${s.name}, row ${r}: product data cells must be unmerged.`);
    if (
      row.getCell(columns.packing).value !== null &&
      typeof row.getCell(columns.packing).value !== "string"
    )
      warnings.push(
        `${s.name}, row ${r}: packing is numeric, date-formatted or calculated; no packing conversion is inferred.`,
      );
    if (row.hidden)
      errors.push(
        `${s.name}, row ${r}: hidden product rows are unsupported. Unhide them before upload.`,
      );
  }
  for (const rows of ids.values())
    if (rows.length > 1)
      errors.push(
        `${s.name}, rows ${rows.join(", ")}: duplicate normalized PRODUCT ID. Correct the source; neither row will be selected automatically.`,
      );
  if (!products.length || products.length > LIMITS.products)
    errors.push("Provide between 1 and 2,000 product rows.");
  const footer = {
    subtotal: "",
    total: null,
    adjustments: [],
    weights: [],
    caseCounts: [],
    inputs: [],
  };
  const productRows = new Set(products.map((p) => p.row));
  const allowedFormulaCells = new Set();
  for (const p of products)
    for (const col of [columns.total, ...priceColumns.map((p) => p.column)])
      allowedFormulaCells.add(s.getCell(p.row, col).address);
  for (let r = 1; r <= s.rowCount; r++) {
    if (r === headerRow || productRows.has(r)) continue;
    s.getRow(r).eachCell((cell) => {
      if (cell.isMerged && cell.master.address !== cell.address) return;
      const h = normalizeHeader(literal(cell));
      if (!h) return;
      const next = s.getCell(r, cell.col + 1);
      if (r > lastProduct && ["SUBTOTAL", "MERCHANDISE SUBTOTAL"].includes(h)) {
        if (footer.subtotal)
          errors.push(
            "More than one subtotal label. Use one merchandise subtotal.",
          );
        footer.subtotal = next.address;
        allowedFormulaCells.add(next.address);
      } else if (r > lastProduct && ["TOTAL", "GRAND TOTAL"].includes(h)) {
        if (footer.total)
          errors.push("More than one total label. Use one working total.");
        footer.total = next.address;
        allowedFormulaCells.add(next.address);
      } else if (
        r > lastProduct &&
        /^(SHIPPING|TAX|CC FEE|CARD FEE)(\b| )/.test(h)
      ) {
        footer.adjustments.push(next.address);
        allowedFormulaCells.add(next.address);
      } else if (r > lastProduct && /^TOTAL WEIGHT/.test(h)) {
        footer.weights.push(next.address);
        allowedFormulaCells.add(next.address);
      } else if (
        r > lastProduct &&
        ["TOTAL CASE COUNT", "TOTAL CASES"].includes(h)
      ) {
        const below = s.getCell(r + 1, cell.col);
        footer.caseCounts.push(below.address);
        allowedFormulaCells.add(below.address);
      } else if (
        [
          "CUSTOMER",
          "CUSTOMER NAME",
          "COMPANY",
          "COMPANY NAME",
          "EMAIL",
          "CUSTOMER NUMBER",
          "ORDER DATE",
          "ORDER NUMBER",
          "REFERENCE",
          "PO NUMBER",
        ].includes(h)
      ) {
        if (next.isMerged)
          errors.push(`Order input ${next.address} must be an unmerged cell.`);
        footer.inputs.push(next.address);
      }
    });
  }
  if (!footer.subtotal)
    errors.push(
      "Add a SUBTOTAL label after the final product, with its amount in the adjacent cell to the right.",
    );
  const outputCells = [
    footer.subtotal,
    footer.total,
    ...footer.adjustments,
    ...footer.weights,
    ...footer.caseCounts,
    ...footer.inputs,
  ].filter(Boolean);
  if (new Set(outputCells).size !== outputCells.length)
    errors.push("Summary and order-input cells overlap. Give each label its own result cell.");
  for (const address of new Set(outputCells)) {
    const cell = s.getCell(address);
    if (cell.isMerged || cell.row > LIMITS.rows || cell.col > LIMITS.columns)
      errors.push(`${s.name}, ${address}: summary and order-input results must be unmerged cells within the supported worksheet bounds.`);
  }
  s.eachRow((row) =>
    row.eachCell((cell) => {
      if (
        cell.type === ExcelJS.ValueType.Formula &&
        !allowedFormulaCells.has(cell.address)
      )
        errors.push(
          `${s.name}, ${cell.address}: formula outside supported price, line-total or labeled summary cells. Remove or relocate it.`,
        );
    }),
  );
  if (Object.values(columns).some((c) => s.getColumn(c).hidden))
    errors.push("Required product columns must be visible.");
  if (products.length) {
    try {
      sumFormula(s, products, columns.total);
      if (footer.caseCounts.length) sumFormula(s, products, columns.quantity);
    } catch {
      errors.push("Product rows are too fragmented for Excel's summary formula limit. Group products into fewer contiguous blocks and upload again.");
    }
  }
  warnings.push(
    "Source prices are diagnostic only. Formula-derived prices are reported as unreadable, never evaluated.",
    "Generated copies replace line totals/subtotal, clear fees and labeled order inputs, and mark shipment weight as not calculated.",
    "Standard cell formatting, merges, widths and page setup are supported. Printer-driver binary settings, calculation chains, author metadata and worksheet protection are not retained in generated copies.",
  );
  return {
    version: VERSION,
    worksheet: s.name,
    headerRow,
    columns,
    priceColumns,
    products,
    footer,
    errors,
    warnings,
  };
}

const cents = (value) => {
  if (!/^\d+\.\d{2}$/.test(value)) throw new SheetError("SAVED_TOTAL_INVALID");
  return BigInt(value.replace(".", ""));
};
// Excel stores only 15 significant decimal digits. Round-trip through that limit as well as JS.
const numeric = (value) => {
  const c = cents(value),
    n = Number(value);
  return c <= BigInt(Number.MAX_SAFE_INTEGER) &&
    n.toFixed(2) === value &&
    Number(n.toPrecision(15)).toFixed(2) === value
    ? n
    : null;
};
function sumFormula(sheet, products, column) {
  const ranges = [];
  let start = products[0].row,
    end = start;
  for (const { row } of products.slice(1)) {
    if (row === end + 1) {
      end = row;
      continue;
    }
    ranges.push(
      start === end
        ? sheet.getCell(start, column).address
        : `${sheet.getCell(start, column).address}:${sheet.getCell(end, column).address}`,
    );
    start = end = row;
  }
  ranges.push(
    start === end
      ? sheet.getCell(start, column).address
      : `${sheet.getCell(start, column).address}:${sheet.getCell(end, column).address}`,
  );
  // Excel permits 255 arguments per function and 8,192 formula characters.
  const parts = [];
  for (let i = 0; i < ranges.length; i += 200)
    parts.push(`SUM(${ranges.slice(i, i + 200).join(",")})`);
  const formula = parts.join("+");
  if (formula.length > 8192) throw new SheetError("OUTPUT_FORMULA_LIMIT", "OUTPUT_LIMIT");
  return formula;
}
function snapshotSheet(w, order, kind, reason, exactText) {
  const s = w.addWorksheet("Submitted order");
  s.columns = [
    { width: 24 },
    { width: 42 },
    { width: 22 },
    { width: 18 },
    { width: 22 },
    { width: 14 },
    { width: 24 },
  ];
  s.addRow(["Submitted order request"]);
  s.addRow([
    "Export",
    kind === "SNAPSHOT"
      ? `Snapshot fallback: ${reason}`
      : "Populated template with submitted snapshot",
  ]);
  for (const [k, v] of [
    ["Reference", order.reference],
    ["Submitted (UTC)", order.createdAt],
    ["Company", order.companyName],
    ["Customer number", order.customerNumber ?? ""],
    ["Email", order.email],
    ["Pricing tier at submission", order.tierName],
  ])
    s.addRow([k, String(v)]);
  s.addRow([
    "Availability and final charges are handled offline. Staff edits do not update the website saved order.",
  ]);
  s.addRow([
    "Merchandise only; unentered shipping, tax and card fees are excluded. Shipment weight is not calculated by the website.",
  ]);
  s.addRow([
    exactText
      ? "Exact amounts are text: this order exceeds Excel numeric precision. No amounts have been rounded."
      : "Case counts multiply saved case prices. Packing is descriptive.",
  ]);
  s.addRow([]);
  const header = s.addRow([
    "SKU",
    "Product",
    "Brand",
    "Packing",
    "Saved case price",
    "Cases",
    "Saved line total",
  ]);
  header.font = { bold: true };
  for (const item of order.items)
    s.addRow([
      String(item.sku),
      String(item.name),
      item.brand ?? "",
      item.packing ?? "",
      exactText ? item.unitPrice : numeric(item.unitPrice),
      item.quantity,
      exactText ? item.lineTotal : numeric(item.lineTotal),
    ]);
  s.addRow([
    "Submitted merchandise total",
    "",
    "",
    "",
    "",
    "",
    exactText ? order.total : numeric(order.total),
  ]).font = { bold: true };
  s.eachRow((row) => {
    row.eachCell((cell) => {
      cell.alignment = { vertical: "top", wrapText: true };
    });
  });
  for (const r of [9, 10, 11]) {
    s.mergeCells(r, 1, r, 7);
    s.getRow(r).height = 32;
  }
  s.getColumn(5).numFmt = "0.00";
  s.getColumn(7).numFmt = "0.00";
  s.views = [{ state: "frozen", ySplit: 13 }];
  s.pageSetup = {
    orientation: "landscape",
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
  };
  return s;
}
export async function generateWorkbook(
  order,
  template,
  absence = "NO_TEMPLATE",
) {
  if (order.items.length > 250) throw new SheetError("SAVED_TOTAL_INVALID");
  let sum = 0n;
  for (const item of order.items) {
    if (
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 999 ||
      cents(item.unitPrice) * BigInt(item.quantity) !== cents(item.lineTotal)
    )
      throw new SheetError("SAVED_TOTAL_INVALID");
    sum += cents(item.lineTotal);
  }
  if (sum !== cents(order.total)) throw new SheetError("SAVED_TOTAL_INVALID");
  const exactText = [
    order.total,
    ...order.items.flatMap((i) => [i.unitPrice, i.lineTotal]),
  ].some((v) => numeric(v) === null);
  let kind = "SNAPSHOT",
    reason = absence,
    w = new ExcelJS.Workbook();
  if (template) {
    const cfg = template.configuration,
      rows = order.items.map((i) => cfg?.mapping?.[i.catalogKey]);
    if (!cfg || cfg.version !== VERSION) throw new SheetError("UNSUPPORTED_VERSION");
    if (!Array.isArray(cfg.products) || !cfg.products.length ||
        typeof cfg.worksheet !== "string" || cfg.worksheet.toLowerCase() === "submitted order" ||
        !cfg.mapping || !cfg.columns || !cfg.footer ||
        !Array.isArray(cfg.priceColumns) || !cfg.priceColumns.some((p) => p?.column === cfg.priceColumn) ||
        !["quantity", "id", "name", "packing", "total"].every((k) => Number.isInteger(cfg.columns[k]) && cfg.columns[k] >= 1 && cfg.columns[k] <= LIMITS.columns) ||
        !cfg.products.every((p) => p && Number.isInteger(p.row) && p.row >= 1 && p.row <= LIMITS.rows) ||
        typeof cfg.footer.subtotal !== "string" || !cfg.footer.subtotal ||
        !["adjustments", "inputs", "weights", "caseCounts"].every((k) => Array.isArray(cfg.footer[k])))
      throw new SheetError("TEMPLATE_INVALID");
    if (
      rows.some((r) => !r || !cfg.products.some((p) => p.row === r)) ||
      new Set(rows).size !== rows.length
    )
      reason = "MISSING_MAPPING";
    else {
      w = await load(Buffer.from(template.bytes, "base64"));
      const s = w.getWorksheet(cfg.worksheet);
      if (!s) throw new SheetError("TEMPLATE_INVALID");
      // Same builder as upload preflight; older pinned templates can fail safely.
      const subtotalFormula = sumFormula(s, cfg.products, cfg.columns.total);
      const caseFormula = cfg.footer.caseCounts.length ? sumFormula(s, cfg.products, cfg.columns.quantity) : null;
      kind = "TEMPLATE";
      reason = null;
      s.unprotect();
      // Remove every old formula first, including shared formula masters/followers.
      const formulaCells = [];
      s.eachRow((row) =>
        row.eachCell((cell) => {
          if (cell.type === ExcelJS.ValueType.Formula) formulaCells.push(cell);
        }),
      );
      for (const cell of formulaCells) cell.value = null;
      const c = cfg.columns,
        byRow = new Map(order.items.map((i) => [cfg.mapping[i.catalogKey], i]));
      for (const p of cfg.products) {
        const row = s.getRow(p.row);
        row.getCell(c.quantity).value = null;
        row.getCell(c.total).value = null;
        row.getCell(c.quantity).numFmt = "0";
        row.getCell(c.total).numFmt = "0.00";
        row.getCell(cfg.priceColumn).numFmt = "0.00";
        const item = byRow.get(p.row);
        const priceCell = row.getCell(cfg.priceColumn);
        if (item) {
          row.getCell(c.quantity).value = item.quantity;
          row.getCell(c.id).value = String(item.sku);
          row.getCell(c.name).value = String(item.name);
          row.getCell(c.packing).value = item.packing === null ? null : String(item.packing);
          priceCell.value = exactText ? item.unitPrice : numeric(item.unitPrice);
        } else {
          // Only a literal price from the confirmed tier column is eligible.
          // Old formulas were cleared above; cached formula values are never used.
          const reference = decimal(priceCell);
          priceCell.value = reference !== null && numeric(reference) !== null
            ? exactText ? reference : numeric(reference)
            : "Enter case price";
          if (priceCell.value === "Enter case price") {
            priceCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE699" } };
            priceCell.alignment = { ...priceCell.alignment, wrapText: true };
            row.height = Math.max(row.height ?? 15, 45);
          }
        }
        const quantity = row.getCell(c.quantity).address, price = priceCell.address;
        row.getCell(c.total).value = exactText
          ? item?.lineTotal ?? null
          : {
              formula: `IF(${quantity}="","",IF(AND(ISNUMBER(${quantity}),${quantity}>=0,ISNUMBER(${price}),${price}>=0),ROUND(${quantity}*${price},2),NA()))`,
              result: item ? numeric(item.lineTotal) : "",
            };
      }
      for (const address of [...cfg.footer.adjustments, ...cfg.footer.inputs])
        s.getCell(address).value = null;
      for (const address of cfg.footer.weights)
        s.getCell(address).value = "Not calculated by website";
      for (const address of cfg.footer.caseCounts)
        s.getCell(address).value = {
          formula: caseFormula,
          result: order.items.reduce((a, i) => a + i.quantity, 0),
        };
      const subtotal = s.getCell(cfg.footer.subtotal);
      subtotal.numFmt = "0.00";
      subtotal.value = exactText
        ? order.total
        : { formula: subtotalFormula, result: numeric(order.total) };
      if (cfg.footer.total)
        s.getCell(cfg.footer.total).value = exactText
          ? order.total
          : { formula: subtotal.address, result: numeric(order.total) };
      const workingTotal = s.getCell(cfg.footer.total ?? cfg.footer.subtotal);
      workingTotal.numFmt = "0.00";
      const workingLabel = s.getCell(workingTotal.row, workingTotal.col - 1);
      workingLabel.value = "Total excl. adjustments";
      workingLabel.alignment = { ...workingLabel.alignment, wrapText: true };
      s.getRow(workingTotal.row).height = Math.max(
        s.getRow(workingTotal.row).height ?? 15,
        45,
      );
      // A visible note immediately below meaningful content, independent of trailing formatting.
      let lastMeaningful = 0;
      s.eachRow((row) =>
        row.eachCell((cell) => {
          if (cell.value !== null)
            lastMeaningful = Math.max(lastMeaningful, row.number);
        }),
      );
      const noteRow = lastMeaningful + 2;
      s.getCell(noteRow, c.name).value =
        exactText
          ? "Exact amounts are text. Offline monetary calculations are disabled for this export; finalize manually. Submitted order is the original snapshot."
          : "Offline working sheet: merchandise only. Enter a numeric case price in yellow cells before adding cases; #N/A means input is needed. Edits do not update the saved website order. See Submitted order.";
      s.getCell(noteRow, c.name).alignment = { wrapText: true };
      s.getRow(noteRow).height = 90;
    }
  }
  snapshotSheet(w, order, kind, reason, exactText);
  w.calcProperties.fullCalcOnLoad = true;
  const bytes = Buffer.from(await w.xlsx.writeBuffer());
  if (bytes.length > LIMITS.output) throw new SheetError("OUTPUT_LIMIT", "OUTPUT_LIMIT");
  // Reopen the generated artifact to verify numeric serialization, not just in-memory values.
  const check = new ExcelJS.Workbook();
  await check.xlsx.load(bytes);
  const total = check.getWorksheet("Submitted order").lastRow.getCell(7).value;
  if ((typeof total === "number" ? total.toFixed(2) : total) !== order.total)
    throw new SheetError("NUMERIC_ROUNDTRIP");
  const saved = check.getWorksheet("Submitted order");
  for (const [index, item] of order.items.entries())
    for (const [column, value] of [
      [5, item.unitPrice],
      [7, item.lineTotal],
    ]) {
      const actual = saved.getCell(14 + index, column).value;
      if ((typeof actual === "number" ? actual.toFixed(2) : actual) !== value)
        throw new SheetError("NUMERIC_ROUNDTRIP");
    }
  return {
    bytes: bytes.toString("base64"),
    kind,
    diagnostic: reason,
    version: GENERATOR_VERSION,
  };
}
