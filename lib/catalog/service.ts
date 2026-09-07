import "server-only";
import { requireCustomer } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db";
import { validTier } from "@/lib/pricing/tiers";
import { readPublishedCatalogContent } from "./content";
import { normalizeCatalogContent, type CatalogContent } from "./normalize";
import { priceText } from "./money";

export type CustomerCatalogProduct = Omit<CatalogContent, "available"> & { price: string };
export type CustomerCatalogResult =
  | { status: "ready"; products: CustomerCatalogProduct[] }
  | { status: "unavailable"; products: []; message: string };

export async function getAvailableCatalogForCustomer(): Promise<CustomerCatalogResult> {
  // Intentionally no arguments. Auth redirects/role denial must escape the safe
  // content-error handler. Every invocation resolves current PostgreSQL state.
  const { customer } = await requireCustomer();
  try {
    const db = getDb();
    const tier = await db.pricingTier.findUnique({ where: { id: customer.pricingTierId }, select: { name: true, rank: true } });
    if (!tier || !validTier(tier)) throw new Error("Invalid tier.");
    const { products } = normalizeCatalogContent(await readPublishedCatalogContent());
    const available = products.filter((product) => product.available);
    const prices = await db.productPrice.findMany({
      where: { pricingTierId: customer.pricingTierId, catalogKey: { in: available.map((product) => product.catalogKey) } },
      select: { catalogKey: true, price: true },
    });
    const amounts = new Map(prices.map((row) => [row.catalogKey, priceText(row.price)]));
    const result: CustomerCatalogProduct[] = [];
    for (const product of available) {
      const price = amounts.get(product.catalogKey);
      if (price === undefined || price === null) continue;
      result.push({ catalogKey: product.catalogKey, sku: product.sku, name: product.name, category: product.category,
        description: product.description, brand: product.brand, packing: product.packing, image: product.image, price });
    }
    result.sort((a, b) => a.name.localeCompare(b.name) || a.catalogKey.localeCompare(b.catalogKey));
    return { status: "ready", products: result };
  } catch {
    // No CMS responses, SQL errors, credentials, other-tier prices or stale fallback.
    return { status: "unavailable", products: [], message: "The catalog is temporarily unavailable. Please try again later." };
  }
}
