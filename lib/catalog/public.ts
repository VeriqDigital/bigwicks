import "server-only";
import { cache } from "react";
import { readPublishedCatalogContent } from "./content";
import { normalizeCatalogContent, type CatalogContent } from "./normalize";

export type PublicProduct = Omit<CatalogContent, "available" | "slug"> & { slug: string };

// React cache deduplicates only within a render request; no shared content/price cache.
// This module has no authentication, Prisma or pricing dependency.
export const getPublicCatalog = cache(async (): Promise<{
  status: "ready" | "unavailable"; products: PublicProduct[];
}> => {
  try {
    const { products, knownKeys } = normalizeCatalogContent(await readPublishedCatalogContent());
    const counts = new Map<string, number>();
    for (const product of products) {
      const slug = product.slug ?? product.catalogKey;
      counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }
    return { status: "ready", products: products.flatMap((product) => {
      const slug = product.slug ?? product.catalogKey;
      // Hidden products also reserve their slug. Ambiguous routes fail closed.
      if (!product.available || counts.get(slug) !== 1 || (slug !== product.catalogKey && knownKeys.has(slug))) return [];
      return [{ catalogKey: product.catalogKey, slug, sku: product.sku, name: product.name,
        category: product.category, description: product.description, brand: product.brand,
        packing: product.packing, image: product.image, video: product.video ?? null }];
    }).sort((a, b) => a.name.localeCompare(b.name, "en-US") || a.catalogKey.localeCompare(b.catalogKey)) };
  } catch {
    return { status: "unavailable", products: [] };
  }
});

export function publicCategories(products: PublicProduct[]) {
  return [...new Map(products.flatMap((product) => product.category ? [[product.category.id, product.category] as const] : [])).values()]
    .sort((a, b) => a.name.localeCompare(b.name, "en-US") || a.id.localeCompare(b.id));
}
