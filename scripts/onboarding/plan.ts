import "server-only";
import { createHash } from "node:crypto";
import type { Mutation } from "@sanity/client";
import { isCatalogKey } from "../../sanity/catalog-key";
import { categoryIdentity, OnboardingError, readCanonical, skuIdentity, type Row } from "./csv";

export const MAX_DOCUMENTS = 1500;
const MAX_MUTATION_BYTES = 3 * 1024 * 1024;
export type Document = { _id: string; _rev: string; _type: "product" | "category"; catalogKey?: string; name?: string; sku?: string; brand?: string; packing?: string; description?: string; available?: boolean; category?: { _type?: string; _ref?: string } };
export type Target = { projectId: string; dataset: string };
export type Boundary = { read(): Promise<unknown>; commit(mutations: Mutation[]): Promise<unknown> };
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const sorted = <T>(values: T[], key: (v: T) => string) => [...values].sort((a, b) => key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0);

export function snapshot(value: unknown): Document[] {
  if (!Array.isArray(value) || value.length > MAX_DOCUMENTS) throw new OnboardingError("Remote snapshot is invalid or exceeds 1,500 documents; no writes.");
  const ids = new Set<string>(); const keys = new Set<string>(); const categories = new Set<string>();
  return sorted(value.map((item): Document => {
    if (!item || typeof item !== "object" || typeof item._id !== "string" || !/^[a-zA-Z0-9_-][a-zA-Z0-9_.-]{0,127}$/.test(item._id) || typeof item._rev !== "string" || !item._rev || item._rev.length > 256 || !["product", "category"].includes(item._type)) throw new OnboardingError("Malformed remote document identity/revision; no writes.");
    if (item._id.startsWith("drafts.") || item._id.startsWith("versions.")) throw new OnboardingError("Resolve catalog drafts/releases before importing; no writes.");
    if (ids.has(item._id)) throw new OnboardingError("Duplicate remote document ID; no writes.");
    ids.add(item._id);
    if (item._type === "product") {
      if (!isCatalogKey(item.catalogKey)) throw new OnboardingError("Malformed remote catalogKey; repair identities before importing.");
      if (keys.has(item.catalogKey)) throw new OnboardingError("Ambiguous remote catalogKey; no writes.");
      keys.add(item.catalogKey);
    } else {
      if (typeof item.name !== "string" || !item.name.trim() || item.name.length > 100 || /[\u0000-\u001f\u007f-\u009f]/u.test(item.name)) throw new OnboardingError("Malformed remote category name; no writes.");
      const key = categoryIdentity(item.name);
      if (categories.has(key)) throw new OnboardingError("Ambiguous normalized category names; no writes.");
      categories.add(key);
    }
    // Explicit projection also prevents accidental propagation of unexpected data.
    return { _id: item._id, _rev: item._rev, _type: item._type, catalogKey: item.catalogKey, name: item.name, sku: item.sku,
      brand: item.brand ?? "", packing: item.packing ?? "", description: item.description, available: item.available, category: item.category ? { _type: item.category._type, _ref: item.category._ref } : undefined };
  }), (d) => d._id);
}
const publicRow = (r: Row) => ({ catalogKey: r.catalogKey, sku: r.sku, name: r.name, category: categoryIdentity(r.category), brand: r.brand, packing: r.packing, description: r.description, available: r.available });
const fields = (r: Row, categoryId: string) => ({ catalogKey: r.catalogKey, sku: r.sku, name: r.name, brand: r.brand, packing: r.packing, description: r.description, available: r.available, category: { _type: "reference", _ref: categoryId } });
export function plan(rows: Row[], documents: Document[], target: Target) {
  const products = new Map(documents.filter((d) => d._type === "product").map((d) => [d.catalogKey!, d]));
  const categories = new Map(documents.filter((d) => d._type === "category").map((d) => [categoryIdentity(d.name!), d]));
  const incoming = new Map(rows.map((r) => [r.catalogKey, r]));
  const finalSkus = new Set<string>();
  for (const p of [...documents.filter((d) => d._type === "product" && !incoming.has(d.catalogKey!)), ...rows]) {
    if (typeof p.sku !== "string" || !p.sku.trim()) throw new OnboardingError("An omitted remote product has an invalid SKU; repair it before importing.");
    const sku = skuIdentity(p.sku.trim());
    if (finalSkus.has(sku)) throw new OnboardingError("Import would leave duplicate normalized SKUs on different catalogKeys; no writes.");
    finalSkus.add(sku);
  }
  const names = new Map<string, string>();
  for (const r of sorted(rows, (r) => r.category)) names.set(categoryIdentity(r.category), names.get(categoryIdentity(r.category)) ?? r.category);
  const newCategories = sorted([...names].filter(([key]) => !categories.has(key)).map(([key, name]) => ({ key, name })), (c) => c.key);
  const mutations: Mutation[] = []; let created = 0; let updated = 0; let unchanged = 0;
  for (const r of sorted(rows, (r) => r.catalogKey)) {
    const existing = products.get(r.catalogKey);
    const categoryId = categories.get(categoryIdentity(r.category))?._id;
    // A placeholder is for byte-size validation only; never submit this plan
    // until missing categories have actual IDs returned by Sanity and re-read.
    const content = fields(r, categoryId ?? "pending-category-id".padEnd(128, "x"));
    if (!existing) { mutations.push({ create: { _type: "product", ...content } }); created++; }
    else if (categoryId && Object.entries(content).every(([key, value]) => JSON.stringify(existing[key as keyof Document]) === JSON.stringify(value))) unchanged++;
    else { mutations.push({ patch: { id: existing._id, ifRevisionID: existing._rev, set: content } }); updated++; }
  }
  // Guard referenced category revisions without overwriting their display names.
  if (mutations.length) for (const [key] of sorted([...names], ([key]) => key)) {
    const category = categories.get(key);
    if (category) mutations.push({ patch: { id: category._id, ifRevisionID: category._rev, setIfMissing: { name: category.name! } } });
  }
  const categoryMutations: Mutation[] = newCategories.map((c) => ({ create: { _type: "category", name: c.name } }));
  if (documents.length + newCategories.length + created > MAX_DOCUMENTS) throw new OnboardingError("Import would exceed the 1,500-document onboarding limit; no writes.");
  if (Buffer.byteLength(JSON.stringify([...mutations, ...categoryMutations])) + newCategories.length * 1024 > MAX_MUTATION_BYTES) throw new OnboardingError("Planned mutations exceed 3 MiB; split the source before applying.");
  const hash = digest({ target, rows: sorted(rows, (r) => r.catalogKey).map(publicRow), newCategories, documents });
  return { hash, mutations, categoryMutations, newCategories,
    summary: { productsInFile: rows.length, newProducts: created, existingProductsToUpdate: updated, unchangedProducts: unchanged,
      newCategories: newCategories.length, existingCategoriesReused: names.size - newCategories.length,
      warnings: rows.filter((r) => r.available && Object.values(r.prices).some((price) => price === null)).length, errors: 0 } };
}
export type ApplyOptions = { applyHash?: string; confirm?: string; allowProduction?: boolean };
type GuardEnvironment = Record<string, string | undefined>;
export function assertTarget(target: Target) {
  if (!/^[a-z0-9]+$/.test(target.projectId) || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(target.dataset)) throw new OnboardingError("Supply explicit valid --project and --dataset identifiers.");
}
export function authorizeApply(target: Target, options: ApplyOptions, env: GuardEnvironment) {
  assertTarget(target);
  if (!options.applyHash) return;
  const name = `${target.projectId}/${target.dataset}`;
  if (!/^[a-f0-9]{64}$/.test(options.applyHash) || options.confirm !== name) throw new OnboardingError("Apply requires the reviewed plan hash and --confirm project/dataset.");
  if (env.SANITY_CATALOG_NON_PRODUCTION_TARGET !== name && !(options.allowProduction === true && env.ALLOW_PRODUCTION_CATALOG_IMPORT === "true")) {
    throw new OnboardingError("Target is production-guarded. Apply requires both --allow-production and ALLOW_PRODUCTION_CATALOG_IMPORT=true, or an explicitly configured exact non-production target.");
  }
}
export async function importCatalog(bytes: Uint8Array, target: Target, options: ApplyOptions, env: GuardEnvironment, boundary: Boundary, report: (value: unknown) => void) {
  const rows = readCanonical(bytes, true);
  authorizeApply(target, options, env);
  const before = snapshot(await boundary.read());
  const initial = plan(rows, before, target);
  report({ target: `${target.projectId}/${target.dataset}`, productionGuarded: env.SANITY_CATALOG_NON_PRODUCTION_TARGET !== `${target.projectId}/${target.dataset}`, mode: options.applyHash ? "apply" : "dry-run", planHash: initial.hash, ...initial.summary });
  if (!options.applyHash) return initial;
  if (options.applyHash !== initial.hash) throw new OnboardingError("File or remote content changed since review. Run dry-run again; no writes.");
  let final = initial;
  if (initial.categoryMutations.length) {
    let created: Document[];
    try { created = snapshot(await boundary.commit(initial.categoryMutations)); }
    catch { throw new OnboardingError("Category transaction failed or its outcome is uncertain. Inspect remote content and dry-run again; no product transaction was sent."); }
    const after = snapshot(await boundary.read());
    if (digest(sorted([...before, ...created], (d) => d._id)) !== digest(after)) throw new OnboardingError("Catalog changed after category creation. Categories may exist; no products were written. Review a fresh dry-run.");
    final = plan(rows, after, target);
    if (final.newCategories.length) throw new OnboardingError("Created categories were not resolved; no products were written.");
  }
  if (final.mutations.length) {
    try { await boundary.commit(final.mutations); }
    catch { throw new OnboardingError("Product transaction failed or its outcome is uncertain. Do not blindly retry: inspect content and run a fresh dry-run/audit."); }
  }
  report({ applied: true, productTransactionSent: final.mutations.length > 0 });
  return final;
}
