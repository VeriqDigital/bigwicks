// Shared application/worker limits. Node-only workbook processing runs in a killed subprocess.
export const LIMITS = Object.freeze({
  upload: 2 * 1024 * 1024,
  output: 4 * 1024 * 1024,
  entries: 128,
  expanded: 16 * 1024 * 1024,
  entry: 8 * 1024 * 1024,
  rows: 5000,
  columns: 64,
  cells: 40000,
  formattedCells: 150000,
  string: 4096,
  products: 2000,
  milliseconds: 20000,
  heapMb: 192,
  concurrentWorkers: 2,
});
export const VERSION = "order-sheets-v1";
export const GENERATOR_VERSION = "order-sheets-v2";
export class SheetError extends Error {
  constructor(message, code = ["SAVED_TOTAL_INVALID", "NUMERIC_ROUNDTRIP"].includes(message) ? "SAVED_TOTAL_INVALID" : "PINNED_CONFIG_INVALID") {
    super(message);
    this.code = code;
  }
}
export const normalizeId = (value) =>
  value.normalize("NFKC").trim().toUpperCase();
export const normalizeHeader = (value) =>
  value
    .normalize("NFKC")
    .trim()
    .toUpperCase()
    .replace(/[._:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
