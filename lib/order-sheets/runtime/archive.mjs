import { inflateRawSync, crc32 } from "node:zlib";
import { SaxesParser } from "saxes";
import { LIMITS, SheetError } from "./limits.mjs";

const fail = () => {
  throw new SheetError(
    "Unsupported or unsafe XLSX archive. Save a standard .xlsx with no external links, macros, embedded objects or active content.",
  );
};
const allowed =
  /^(?:\[Content_Types\]\.xml|_rels\/\.rels|docProps\/(?:core|app)\.xml|xl\/(?:workbook\.xml|_rels\/workbook\.xml\.rels|styles\.xml|sharedStrings\.xml|calcChain\.xml|theme\/theme\d+\.xml|worksheets\/sheet\d+\.xml|worksheets\/_rels\/sheet\d+\.xml\.rels|printerSettings\/printerSettings\d+\.bin|persons\/person\.xml))$/;
function column(text) {
  return [...text].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0);
}
export function validateXml(bytes, name) {
  const xml = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) fail();
  const parser = new SaxesParser({ xmlns: true });
  let depth = 0,
    cells = 0,
    populated = 0,
    stringSize = 0,
    formula = null,
    definedName = null,
    inString = false,
    fullStringSize = 0;
  const cellAddresses = new Set();
  let columnDefinitions = 0;
  parser.on("doctype", fail);
  parser.on("error", fail);
  parser.on("opentag", (tag) => {
    stringSize = 0;
    if (++depth > 32 || Object.keys(tag.attributes).length > 64) fail();
    const attrs = Object.fromEntries(
      Object.values(tag.attributes).map((a) => [a.local, a.value]),
    );
    if (Object.values(attrs).some((v) => v.length > LIMITS.string)) fail();
    if (tag.local === "Relationship") {
      if (
        attrs.TargetMode === "External" ||
        /(?:^\/|\\|:|%)/.test(attrs.Target ?? "") ||
        /external|oleObject|vbaProject|hyperlink|connections|attachedTemplate/i.test(
          attrs.Type ?? "",
        )
      )
        fail();
    }
    if (
      /macroEnabled|vbaProject|oleObject|externalLink|activeX/i.test(
        attrs.ContentType ?? "",
      )
    )
      fail();
    if (name.startsWith("xl/worksheets/") && !name.endsWith(".rels")) {
      const supportedSections = [
        "sheetPr",
        "dimension",
        "sheetViews",
        "sheetFormatPr",
        "cols",
        "sheetData",
        "sheetProtection",
        "mergeCells",
        "phoneticPr",
        "printOptions",
        "pageMargins",
        "pageSetup",
        "headerFooter",
      ];
      if (depth === 2 && !supportedSections.includes(tag.local))
        throw new SheetError(
          `Unsupported worksheet section: ${tag.local}. Remove it from the source before uploading.`,
        );
      if (
        [
          "drawing",
          "legacyDrawing",
          "oleObjects",
          "controls",
          "extLst",
          "dataValidations",
          "conditionalFormatting",
          "tableParts",
          "hyperlinks",
        ].includes(tag.local)
      )
        throw new SheetError(
          "Unsupported worksheet feature: remove drawings, tables, validation, conditional formatting, hyperlinks or extensions before uploading.",
        );
      if (tag.local === "c") {
        if (++cells > LIMITS.formattedCells) fail();
        const m = /^([A-Z]+)([1-9]\d*)$/.exec(attrs.r ?? "");
        if (!m || column(m[1]) > LIMITS.columns || +m[2] > LIMITS.rows)
          throw new SheetError(
            "Worksheet exceeds 5,000 rows or 64 columns. Remove excess formatting outside those bounds.",
          );
        if (cellAddresses.has(attrs.r))
          throw new SheetError(
            "Duplicate worksheet cell coordinates. Save a fresh standard XLSX copy.",
          );
        cellAddresses.add(attrs.r);
      }
      if (
        tag.local === "row" &&
        (!/^\d+$/.test(attrs.r ?? "") || +attrs.r < 1 || +attrs.r > LIMITS.rows)
      )
        fail();
      // Excel writes a final formatting-only span through XFD even when used cells end at Q.
      // Bound definitions/Excel coordinates separately; actual cell/range coordinates stay <=64.
      if (
        tag.local === "col" &&
        (++columnDefinitions > 64 ||
          !/^\d+$/.test(attrs.min ?? "") ||
          !/^\d+$/.test(attrs.max ?? "") ||
          +attrs.min < 1 ||
          +attrs.max > 16384 ||
          +attrs.min > +attrs.max)
      )
        fail();
      if (["v", "f", "is"].includes(tag.local) && ++populated > LIMITS.cells)
        throw new SheetError(
          "Too many populated worksheet cells (maximum 40,000).",
        );
      for (const key of ["ref", "sqref"])
        if (attrs[key])
          for (const m of attrs[key].matchAll(/([A-Z]+)(\d+)/g))
            if (column(m[1]) > LIMITS.columns || +m[2] > LIMITS.rows) fail();
    }
    if (tag.local === "si" || tag.local === "is") {
      inString = true;
      fullStringSize = 0;
    }
    if (tag.local === "f") {
      if (attrs.t && !["shared", "normal"].includes(attrs.t)) fail();
      formula = "";
    }
    if (
      tag.local === "definedName" &&
      ![
        "_xlnm.Print_Area",
        "_xlnm.Print_Titles",
        "_xlnm._FilterDatabase",
      ].includes(attrs.name)
    )
      throw new SheetError(
        "Custom defined names are unsupported. Remove them from the workbook.",
      );
    if (tag.local === "definedName") definedName = "";
  });
  parser.on("text", (value) => {
    stringSize += value.length;
    if (inString) fullStringSize += value.length;
    if (stringSize > LIMITS.string || fullStringSize > LIMITS.string) fail();
    if (formula !== null) formula += value;
    if (definedName !== null) definedName += value;
  });
  parser.on("closetag", (tag) => {
    depth--;
    if (tag.local === "si" || tag.local === "is") {
      inString = false;
      fullStringSize = 0;
    }
    if (tag.local === "definedName") {
      if (
        !/^(?:'[^'\[\]]+'|[\w -]+)!\$?[A-Z]*\$?\d*(?::\$?[A-Z]*\$?\d*)?(?:,(?:'[^'\[\]]+'|[\w -]+)!\$?[A-Z]*\$?\d*(?::\$?[A-Z]*\$?\d*)?)*$/.test(
          definedName,
        )
      )
        fail();
      definedName = null;
    }
    if (tag.local === "f") {
      // Only arithmetic and SUM/SUMPRODUCT over local cell references. Never evaluate source formulas.
      const residual = formula
        .toUpperCase()
        .replace(/\bSUMPRODUCT\b|\bSUM\b/g, "")
        .replace(/\$?[A-Z]{1,2}\$?[1-9]\d{0,3}/g, "");
      if (formula.length > 4096 || !/^[\d\s+\-*/().,:%]*$/.test(residual))
        throw new SheetError(
          "Unsupported formula. Only local arithmetic, SUM and SUMPRODUCT are accepted. Remove external, named, dynamic or active formulas.",
        );
      formula = null;
    }
  });
  // Bounded increments also keep SAX text accumulation bounded.
  for (let offset = 0; offset < xml.length; offset += 4096)
    parser.write(xml.slice(offset, offset + 4096));
  parser.close();
}

export function inspectArchive(input) {
  const b = Buffer.from(input);
  if (
    b.length < 22 ||
    b.length > LIMITS.upload ||
    b.readUInt32LE(0) !== 0x04034b50
  )
    fail();
  let end = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--)
    if (
      b.readUInt32LE(i) === 0x06054b50 &&
      i + 22 + b.readUInt16LE(i + 20) === b.length
    ) {
      end = i;
      break;
    }
  if (end < 0 || b.readUInt16LE(end + 4) || b.readUInt16LE(end + 6)) fail();
  const count = b.readUInt16LE(end + 10),
    size = b.readUInt32LE(end + 12),
    start = b.readUInt32LE(end + 16);
  if (
    !count ||
    count > LIMITS.entries ||
    count !== b.readUInt16LE(end + 8) ||
    start + size !== end
  )
    fail();
  const names = new Set(),
    spans = [];
  let offset = start,
    expanded = 0;
  const archive = {};
  for (let i = 0; i < count; i++) {
    if (offset + 46 > end || b.readUInt32LE(offset) !== 0x02014b50) fail();
    const flags = b.readUInt16LE(offset + 8),
      method = b.readUInt16LE(offset + 10),
      crc = b.readUInt32LE(offset + 16);
    const compressed = b.readUInt32LE(offset + 20),
      raw = b.readUInt32LE(offset + 24),
      len = b.readUInt16LE(offset + 28),
      extra = b.readUInt16LE(offset + 30),
      comment = b.readUInt16LE(offset + 32),
      local = b.readUInt32LE(offset + 42);
    const name = new TextDecoder("utf-8", { fatal: true }).decode(
      b.subarray(offset + 46, offset + 46 + len),
    );
    const directory =
      /^(?:_rels\/|docProps\/|xl\/|xl\/(?:_rels|worksheets|theme|printerSettings|persons)\/|xl\/worksheets\/_rels\/)$/.test(
        name,
      ) && raw === 0;
    if (
      offset + 46 + len + extra + comment > end ||
      (!allowed.test(name) && !directory) ||
      names.has(name.toLowerCase()) ||
      flags & ~0x080e ||
      ![0, 8].includes(method) ||
      raw > LIMITS.entry ||
      expanded + raw > LIMITS.expanded
    )
      fail();
    names.add(name.toLowerCase());
    offset += 46 + len + extra + comment;
    if (
      local + 30 > start ||
      b.readUInt32LE(local) !== 0x04034b50 ||
      b.readUInt16LE(local + 6) !== flags ||
      b.readUInt16LE(local + 8) !== method
    )
      fail();
    const localLen = b.readUInt16LE(local + 26),
      localExtra = b.readUInt16LE(local + 28),
      data = local + 30 + localLen + localExtra;
    if (
      b.subarray(local + 30, local + 30 + localLen).toString("utf8") !== name ||
      data + compressed > start ||
      spans.some(([s, e]) => local < e && data + compressed > s)
    )
      fail();
    spans.push([local, data + compressed]);
    // Native inflater enforces ACTUAL bytes during decompression, independent of ZIP claims.
    const value =
      method === 0
        ? b.subarray(data, data + compressed)
        : inflateRawSync(b.subarray(data, data + compressed), {
            maxOutputLength: Math.min(LIMITS.entry, LIMITS.expanded - expanded),
          });
    expanded += value.length;
    if (
      value.length !== raw ||
      crc32(value) !== crc ||
      expanded > LIMITS.expanded
    )
      fail();
    // Printer settings are the only supported binary part. Do not allow an
    // executable or OLE container disguised under that otherwise valid path.
    if (name.endsWith(".bin") && (
      value.subarray(0, 2).toString("ascii") === "MZ" ||
      value.subarray(0, 4).equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46])) ||
      value.subarray(0, 8).equals(Buffer.from("d0cf11e0a1b11ae1", "hex"))
    )) fail();
    if (name.endsWith(".xml") || name.endsWith(".rels"))
      validateXml(value, name);
    archive[name] = value;
  }
  if (
    offset !== end ||
    !archive["[Content_Types].xml"] ||
    !archive["xl/workbook.xml"] ||
    !archive["xl/_rels/workbook.xml.rels"] ||
    Object.keys(archive).filter((n) =>
      /^xl\/worksheets\/sheet\d+\.xml$/.test(n),
    ).length !== 1
  )
    throw new SheetError(
      "Use exactly one product worksheet in a standard Excel .xlsx workbook.",
    );
  return archive;
}
