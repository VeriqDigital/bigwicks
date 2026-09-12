import { getSiteUrl, storefrontImage } from "./seo";
import { siteConfig } from "./site";

const absolute = (path: string) => new URL(path, getSiteUrl()).href;

export function storeJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Store",
    "@id": absolute("/#store"),
    url: absolute("/"),
    name: siteConfig.name,
    description: siteConfig.description,
    logo: absolute("/Big wicks logo background removed.png"),
    image: absolute(storefrontImage),
    hasMap: siteConfig.contact.mapUrl,
    telephone: siteConfig.contact.phone,
    email: siteConfig.contact.email,
    sameAs: siteConfig.socialLinks.map(({ href }) => href),
    address: {
      "@type": "PostalAddress",
      streetAddress: siteConfig.contact.addressLine1,
      addressLocality: siteConfig.contact.city,
      addressRegion: siteConfig.contact.state,
      postalCode: siteConfig.contact.postalCode,
      addressCountry: "US",
    },
    openingHours: siteConfig.hours.map(({ schema }) => schema),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absolute("/#website"),
    url: absolute("/"),
    name: siteConfig.shortName,
    publisher: { "@id": absolute("/#store") },
  };
}

export function pageJsonLd(path: "/fireworks-near-new-buffalo-mi" | "/wholesale", name: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage", "@id": absolute(`${path}#webpage`),
        url: absolute(path), name, description,
        isPartOf: { "@id": absolute("/#website") },
        about: { "@id": absolute("/#store") },
        breadcrumb: { "@id": absolute(`${path}#breadcrumb`) },
      },
      {
        "@type": "BreadcrumbList", "@id": absolute(`${path}#breadcrumb`),
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: absolute("/") },
          { "@type": "ListItem", position: 2, name, item: absolute(path) },
        ],
      },
    ],
  };
}

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
