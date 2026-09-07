import "server-only";
import { z } from "zod";
import { isCatalogKey } from "@/sanity/catalog-key";

export type CatalogIssue = { code: string; documentId?: string; catalogKey?: string; pricingTierId?: string };
export type CatalogContent = {
  catalogKey: string; sku: string; name: string; available: boolean;
  category: { id: string; name: string } | null;
  description: string | null; brand: string | null; packing: string | null; image: { url: string; alt: string } | null;
};
const documentsSchema = z.array(z.object({ _id: z.string().min(1) }).catchall(z.unknown())).max(10000);
function text(value: unknown, max: number): string | null {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max ? value.trim() : null;
}
function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function safeImage(value: unknown, name: string): CatalogContent["image"] {
  const image = record(value);
  if (typeof image.url !== "string") return null;
  try {
    const url = new URL(image.url);
    if (url.protocol !== "https:" || url.hostname !== "cdn.sanity.io" || !url.pathname.startsWith("/images/") || url.username || url.password) return null;
    return { url: url.href, alt: text(image.alt, 300) ?? name };
  } catch { return null; }
}

export function normalizeCatalogContent(raw: unknown) {
  const rows = documentsSchema.parse(raw).filter((row) => typeof row._id === "string" && !row._id.startsWith("drafts.") && !row._id.startsWith("versions."));
  const issues: CatalogIssue[] = [];
  const keyCounts = new Map<string, number>();
  for (const row of rows) {
    // UUID comparison in PostgreSQL is case-insensitive. Even a malformed upper-
    // case duplicate must prevent a valid lower-case key receiving its price.
    const key = typeof row.catalogKey === "string" ? row.catalogKey.toLowerCase() : null;
    if (isCatalogKey(key)) keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
  }
  const products: CatalogContent[] = [];
  for (const row of rows) {
    const documentId = row._id as string;
    if (!isCatalogKey(row.catalogKey)) { issues.push({ code: "missing_or_invalid_catalog_key", documentId }); continue; }
    const catalogKey = row.catalogKey;
    if (keyCounts.get(catalogKey)! > 1) { issues.push({ code: "duplicate_catalog_key", documentId, catalogKey }); continue; }
    const name = text(row.name, 200); const sku = text(row.sku, 100);
    if (!name || !sku || typeof row.available !== "boolean") { issues.push({ code: "invalid_required_content", documentId, catalogKey }); continue; }
    const category = record(row.category); const categoryName = text(category.name, 100); const categoryId = text(category._id, 200);
    const description = text(row.description, 10000); const image = safeImage(row.image, name);
    if (!categoryId || !categoryName) issues.push({ code: "missing_category", documentId, catalogKey });
    if (!description) issues.push({ code: "missing_description", documentId, catalogKey });
    if (!image) issues.push({ code: "missing_image", documentId, catalogKey });
    const optionalText = (value: unknown) => typeof value === "string" && !/[\u0000-\u001f\u007f-\u009f]/u.test(value) ? text(value, 100) : null;
    products.push({ catalogKey, sku, name, available: row.available, category: categoryId && categoryName ? { id: categoryId, name: categoryName } : null,
      description, image, brand: optionalText(row.brand), packing: optionalText(row.packing) });
  }
  return { products, issues, knownKeys: new Set(keyCounts.keys()), documentCount: rows.length };
}
