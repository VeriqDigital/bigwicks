import "server-only";
import { createClient } from "@sanity/client";
import { sanityApiVersion, sanityEnvironment } from "@/sanity/environment";

// All published products, including unavailable ones, are needed to detect a
// duplicate key before joining prices. Never spread arbitrary CMS document fields.
export const catalogContentQuery = `*[_type == "product" && !(_id in path("drafts.**")) && !(_id in path("versions.**"))] {
  _id, catalogKey, sku, name, available, description,
  "category": category->{_id, name},
  "image": image {alt, "url": asset->url}
}`;

export async function readPublishedCatalogContent(): Promise<unknown> {
  const environment = sanityEnvironment();
  if (!environment) throw new Error("Catalog content is not configured.");
  const client = createClient({
    ...environment, apiVersion: sanityApiVersion, perspective: "published",
    useCdn: false, stega: false, maxRetries: 0, timeout: 10000,
  });
  // Public content dataset, no token. No CDN, Next Data Cache or shared price cache.
  return client.fetch<unknown>(catalogContentQuery, {}, { cache: "no-store" });
}
