import type { Metadata } from "next";
import { siteConfig } from "./site";

// Shared by page metadata and the public crawler routes. Configure an origin,
// without a path, query or fragment; production origin approval is a launch gate.
export function getSiteUrl(): URL {
  return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
}

export const publicRoutes = ["/", "/contact", "/fireworks-near-new-buffalo-mi", "/wholesale"] as const;
export const storefrontImage = "/images/store/big-wicks-storefront-front.jpg";

export function publicMetadata(path: typeof publicRoutes[number], title: string, description: string): Metadata {
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: {
      title, description, url: path, type: "website",
      siteName: siteConfig.shortName, locale: siteConfig.locale,
      images: [{ url: storefrontImage, alt: "Big Wicks Fireworks storefront on IN-39 in La Porte, Indiana" }],
    },
    twitter: { card: "summary_large_image", title, description, images: [storefrontImage] },
  };
}
