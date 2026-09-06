// Public content identity, not an authentication secret or business SKU.
export const catalogKeyPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export function isCatalogKey(value: unknown): value is string {
  return typeof value === "string" && catalogKeyPattern.test(value);
}
