import type { MetadataRoute } from "next";
import { getSiteUrl, publicRoutes } from "@/config/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  // Only substantive public canonical pages belong here, never private catalog data.
  return publicRoutes.map((path) => ({ url: new URL(path, siteUrl).href }));
}
