export function isProductSlug(value: unknown): value is string {
  return typeof value === "string" && value.length <= 160 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export const productHref = (slug: string) => `/products/${encodeURIComponent(slug)}`;
export const categoryHref = (id: string) => `/products?${new URLSearchParams({ category: id })}`;
