import "server-only";
import { cache } from "react";
import { readPublishedCatalogContent } from "./content";
import { normalizeCatalogContent } from "./normalize";
import { publicCatalogProducts, type PublicProduct } from "./public-products";
export type { PublicProduct } from "./public-products";

// React cache deduplicates only within a render request; no shared content/price cache.
// This module has no authentication, Prisma or pricing dependency.
export const getPublicCatalog = cache(async (): Promise<{
  status: "ready" | "unavailable"; products: PublicProduct[];
}> => {
  try {
    return { status: "ready", products: publicCatalogProducts(normalizeCatalogContent(await readPublishedCatalogContent())) };
  } catch {
    return { status: "unavailable", products: [] };
  }
});

export function publicCategories(products: PublicProduct[]) {
  return [...new Map(products.flatMap((product) => product.category ? [[product.category.id, product.category] as const] : [])).values()]
    .sort((a, b) => a.name.localeCompare(b.name, "en-US") || a.id.localeCompare(b.id));
}
