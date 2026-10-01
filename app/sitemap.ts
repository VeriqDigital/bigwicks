import type { MetadataRoute } from "next";
import { getSiteUrl, publicRoutes } from "@/config/seo";
import { getPublicCatalog } from "@/lib/catalog/public";
import { productHref } from "@/lib/catalog/urls";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const catalog = await getPublicCatalog();
  return [...publicRoutes, ...catalog.products.map((product) => productHref(product.slug))]
    .map((path) => ({ url: new URL(path, siteUrl).href }));
}
