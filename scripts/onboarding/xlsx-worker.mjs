// Operator subprocess only: bounded heap/time; no workbook code is executed.
import readExcelFile from "read-excel-file/node";
import { unzipSync } from "fflate";
let size = 0; const chunks = [];
try {
  for await (const chunk of process.stdin) {
    size += chunk.length;
    if (size > 2 * 1024 * 1024) throw Error();
    chunks.push(chunk);
  }
  const bytes = Buffer.concat(chunks);
  let entries = 0; let expanded = 0;
  const archive = unzipSync(bytes, { filter(entry) {
    if (++entries > 64 || entry.originalSize > 4 * 1024 * 1024 || (expanded += entry.originalSize) > 8 * 1024 * 1024) throw Error();
    return true;
  } });
  if (Object.values(archive).reduce((sum, entry) => sum + entry.length, 0) > 8 * 1024 * 1024) throw Error();
  for (const [name, value] of Object.entries(archive)) {
    if (!name.endsWith('.xml')) continue;
    const xml = new TextDecoder('utf-8', { fatal: true }).decode(value);
    if (/<!DOCTYPE|<!ENTITY|<(?:\w+:)?f(?:\s|>)/i.test(xml)) throw Error();
    if (name.startsWith('xl/worksheets/')) {
      if ((xml.match(/<(?:\w+:)?row\b/g) ?? []).length > 501) throw Error();
      for (const match of xml.matchAll(/\br="([A-Z]+)(\d+)"/g)) {
        if (match[1].length > 1 || match[1] > 'J' || Number(match[2]) > 501) throw Error();
      }
    }
  }
  const sheets = await readExcelFile(bytes, { trim: false, parseNumber: (value) => value });
  if (sheets.length !== 1 || sheets[0].sheet !== 'BoxHero' || sheets[0].data.length > 501) throw Error();
  // Cost and BoxHero IDs never leave this parser subprocess.
  const rows = sheets[0].data;
  const cost = rows[0].indexOf('Unit Cost'); const id = rows[0].indexOf('SKU');
  for (const row of rows.slice(1)) {
    if (cost >= 0) row[cost] = null;
    if (id >= 0) row[id] = null;
  }
  process.stdout.write(JSON.stringify(rows));
} catch {
  process.stderr.write('Unsupported or unsafe BoxHero workbook. Use one BoxHero sheet, no formulas, at most 500 rows and bounded XLSX contents.');
  process.exitCode = 1;
}
