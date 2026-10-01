import "server-only";
import type { CatalogContent, normalizeCatalogContent } from "./normalize";

export type PublicProduct = Omit<CatalogContent, "available" | "publiclyVisible" | "packing" | "slug"> & { slug: string };

// Shared public eligibility/canonical URL resolution. No auth, SQL or reads here.
export function publicCatalogProducts({ products, knownKeys }: ReturnType<typeof normalizeCatalogContent>): PublicProduct[] {
  const counts = new Map<string, number>();
  for (const product of products) {
    const slug = product.slug === undefined ? product.catalogKey : product.slug;
    if (slug) counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  return products.flatMap((product) => {
    const slug = product.slug === undefined ? product.catalogKey : product.slug;
    // Hidden and wholesale-unavailable products reserve their slugs too.
    if (!product.publiclyVisible || !slug || counts.get(slug) !== 1 || (slug !== product.catalogKey && knownKeys.has(slug))) return [];
    return [{ catalogKey: product.catalogKey, slug, sku: product.sku, name: product.name,
      category: product.category, description: product.description, brand: product.brand,
      image: product.image, video: product.video ?? null }];
  }).sort((a, b) => a.name.localeCompare(b.name, "en-US") || a.catalogKey.localeCompare(b.catalogKey));
}
