import type { CustomerCatalogProduct } from "@/lib/catalog/service";

export type CatalogSort = "name-asc" | "name-desc" | "price-asc" | "price-desc";

// Presentation only: the service supplies canonical nonnegative two-decimal text.
// Compare integer length then digits; never convert a money value to Number.
export function comparePrices(a: string, b: string) {
  const [wholeA] = a.split(".");
  const [wholeB] = b.split(".");
  return wholeA.length - wholeB.length || (a < b ? -1 : a > b ? 1 : 0);
}

export function browseCatalog(products: CustomerCatalogProduct[], search: string, category: string, sort: CatalogSort) {
  const query = search.trim().toLocaleLowerCase("en-US");
  const result = products.filter((product) =>
    (!category || product.category?.id === category) &&
    [product.name, product.sku, product.category?.name ?? ""].some((value) => value.toLocaleLowerCase("en-US").includes(query)));
  return result.sort((a, b) => {
    const nameOrder = a.name.localeCompare(b.name, "en-US") || a.catalogKey.localeCompare(b.catalogKey);
    if (sort === "name-desc") return -nameOrder;
    if (sort === "price-asc") return comparePrices(a.price, b.price) || nameOrder;
    if (sort === "price-desc") return comparePrices(b.price, a.price) || nameOrder;
    return nameOrder;
  });
}
