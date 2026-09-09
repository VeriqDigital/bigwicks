import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/config/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  // Only substantive public canonical pages belong here, never private catalog data.
  return ["/", "/contact"].map((path) => ({ url: new URL(path, siteUrl).href }));
}
