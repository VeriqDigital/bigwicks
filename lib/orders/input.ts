// Shared, deterministic validation and integer-cent presentation arithmetic.
// Authoritative callers validate prices with the existing server money helper.
export const MAX_QUANTITY = 999;
export const MAX_ORDER_LINES = 250;
export class OrderError extends Error {}
export type RequestedItem = { catalogKey: string; quantity: number };
export function quantityValue(value: unknown): number | null {
  if (value === "") return 0;
  if (typeof value === "string" && /^(0|[1-9]\d{0,2})$/.test(value)) return Number(value);
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= MAX_QUANTITY ? value : null;
}
export function requestedItems(value: unknown): RequestedItem[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_ORDER_LINES) throw new OrderError("Select between 1 and 250 products.");
  const seen = new Set<string>();
  const rows = value.map((item: unknown) => {
    if (typeof item !== "object" || item === null) throw new OrderError("Invalid order items.");
    const { catalogKey, quantity } = item as Record<string, unknown>;
    if (typeof catalogKey !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(catalogKey)) throw new OrderError("Invalid product identity. Reload the catalog.");
    if (seen.has(catalogKey)) throw new OrderError("Duplicate products are not allowed.");
    seen.add(catalogKey);
    const parsed = quantityValue(quantity);
    if (parsed === null) throw new OrderError("Quantities must be whole numbers from 0 to 999.");
    return { catalogKey, quantity: parsed };
  }).filter((item) => item.quantity > 0);
  if (!rows.length) throw new OrderError("Select at least one product with a quantity greater than zero.");
  return rows.sort((a, b) => a.catalogKey.localeCompare(b.catalogKey));
}
export function cents(amount: string): bigint {
  if (!/^\d+\.\d{2}$/.test(amount)) throw new Error("Invalid decimal text.");
  return BigInt(amount.replace(".", ""));
}
export function amountText(value: bigint): string {
  if (value < BigInt(0)) throw new Error("Invalid amount.");
  return `${value / BigInt(100)}.${String(value % BigInt(100)).padStart(2, "0")}`;
}
export function lineTotal(price: string, quantity: number): string {
  if (quantityValue(quantity) === null) throw new Error("Invalid quantity.");
  return amountText(cents(price) * BigInt(quantity));
}
export function sumAmounts(values: string[]): string { return amountText(values.reduce((sum, value) => sum + cents(value), BigInt(0))); }
