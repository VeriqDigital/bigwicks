import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/portal", "/account", "/api/auth/", "/setup-account", "/reset-password", "/forgot-password", "/studio"] },
  };
}
