import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/config/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/portal", "/account", "/api/auth/", "/setup-account", "/reset-password", "/forgot-password", "/studio"] },
    sitemap: new URL("/sitemap.xml", getSiteUrl()).href,
  };
}
