import { afterEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import type { Mutation } from "@sanity/client";
import { canonicalCsv, headers, MAX_BYTES, MAX_RECORD, prepare, readCanonical, type Row } from "../../scripts/onboarding/csv";
import { authorizeApply, importCatalog, plan, snapshot, type Boundary, type Document } from "../../scripts/onboarding/plan";
import { csvHeaders, parsePricingCsv } from "@/lib/pricing/csv";

const key = (n = 1) => `be000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const row = (change: Partial<Row> = {}): Row => ({ catalogKey: key(), sku: "FICTIONAL-A", name: "Fictional product", category: "Fictional category", description: "", available: true, tier1Price: "19.99", tier2Price: null, ...change });
const bytes = (...rows: Row[]) => Buffer.from(canonicalCsv(rows));
const target = { projectId: "testonly", dataset: "test" };
const env = { SANITY_CATALOG_NON_PRODUCTION_TARGET: "testonly/test" };
const category = (): Document => ({ _id: "category-original", _rev: "rev-1", _type: "category", name: "Fictional category" });
const product = (change: Partial<Document> = {}): Document => ({ _id: "product-original", _rev: "rev-1", _type: "product", catalogKey: key(), sku: "FICTIONAL-A", name: "Fictional product", description: "", available: true, category: { _type: "reference", _ref: "category-original" }, ...change });
afterEach(() => { vi.unstubAllGlobals(); });

describe("canonical preparation", () => {
  it("generates missing UUIDs once, preserves supplied identities and exact prices, and exports the existing pricing contract", () => {
    const result = prepare(bytes(row({ catalogKey: "" }), row({ catalogKey: key(2), sku: "FICTIONAL-B", tier1Price: "000.10", tier2Price: "9999999999.99" })));
    expect(result.rows[0].catalogKey).toMatch(/^[a-f0-9-]{14}4[a-f0-9-]{21}$/);
    expect(result.rows[1].catalogKey).toBe(key(2));
    expect(result.summary.generatedCatalogKeys).toBe(1); expect(result.rows[1].tier1Price).toBe("0.10");
    expect(prepare(Buffer.from(result.resolvedCsv)).resolvedCsv).toBe(result.resolvedCsv);
    expect(prepare(Buffer.from(result.resolvedCsv)).summary.generatedCatalogKeys).toBe(0);
    expect(result.pricingCsv.replace(/^\uFEFF/, "").split("\r\n")[0]).toBe(csvHeaders.join(","));
    const parsed = parsePricingCsv(Buffer.from(result.pricingCsv));
    expect(parsed.errors).toEqual([]); expect(parsed.rows[1]).toMatchObject({ catalogKey: key(2), tier1Price: "0.10", tier2Price: "9999999999.99" });
  });
  it.each(["bad", key().toUpperCase(), "00000000-0000-1000-8000-000000000001"])("rejects malformed/noncanonical key %s", (catalogKey) => {
    expect(() => prepare(bytes(row({ catalogKey })))).toThrow(/catalogKey/);
  });
  it("requires resolved identities and rejects duplicate keys/SKUs including normalized aliases", () => {
    expect(() => readCanonical(bytes(row({ catalogKey: "" })), true)).toThrow(/catalogKey/);
    expect(() => prepare(bytes(row(), row({ sku: "DIFFERENT" })))).toThrow(/duplicate identity/);
    expect(() => prepare(bytes(row(), row({ catalogKey: key(2), sku: "fictional-a" })))).toThrow(/duplicate SKU/);
  });
  it.each(["sku", "name", "category"] as const)("requires %s", (field) => expect(() => prepare(bytes(row({ [field]: " " })))).toThrow(field));
  it.each(["yes", "1", "0", "", "on", "truthy"])("rejects ambiguous availability %s", (value) => {
    expect(() => prepare(Buffer.from(canonicalCsv([row()]).replace('"true"', `"${value}"`)))).toThrow(/available/);
  });
  it("normalizes explicit booleans, whitespace and optional content", () => {
    const input = canonicalCsv([row({ sku: " A ", category: " Fictional   category ", description: "Line one\r\nLine two" })]).replace('"true"', '" TRUE "');
    expect(prepare(Buffer.from(input)).rows[0]).toMatchObject({ sku: "A", category: "Fictional category", description: "Line one\nLine two", available: true, tier2Price: null });
    expect(prepare(bytes(row({ available: false, description: "", tier1Price: null }))).rows[0]).toMatchObject({ available: false, tier1Price: null });
  });
  it.each(["-1", "1.001", "1e2", "NaN", "Infinity", "$1.00", "1,000", "10000000000"])("rejects invalid price %s without printing the amount", (value) => {
    expect(() => prepare(bytes(row({ tier1Price: value })))).toThrow(/tier1Price: invalid/);
  });
  it("rejects malformed quoting, headers, column counts, UTF-8, controls and limits", () => {
    for (const input of [Buffer.from([0xff]), Buffer.from(headers.join(",") + '\n"unterminated'), Buffer.from(headers.join(",") + '\nx,y'), Buffer.from(canonicalCsv([row()]).replace("sku,name", "sku,sku")), bytes(row({ name: "bad\0text" })), bytes(row({ sku: "bad\ntext" })), bytes(row({ name: "hidden\u202e" })), Buffer.alloc(MAX_BYTES + 1), bytes(row({ description: "x".repeat(MAX_RECORD + 1) }))]) {
      expect(() => prepare(input)).toThrow();
    }
    expect(() => prepare(bytes(...Array.from({ length: 501 }, (_, i) => row({ catalogKey: key(i + 1), sku: `F-${i}` }))))).toThrow(/500/);
    expect(prepare(bytes(...Array.from({ length: 500 }, (_, i) => row({ catalogKey: key(i + 1), sku: `F-${i}` })))).rows).toHaveLength(500);
  });
  it("round-trips spreadsheet-safe human text, Unicode, commas and multiline descriptions", () => {
    const source = row({ sku: "=FICTIONAL()", name: "'Literal", category: "@Fictional", description: 'Text, "quoted"\nsecond line' });
    const result = prepare(bytes(source));
    expect(result.rows[0]).toEqual(source);
    expect(result.resolvedCsv).toContain("'=FICTIONAL()"); expect(result.pricingCsv).toContain("'@Fictional");
    expect(readCanonical(Buffer.from(result.resolvedCsv), true)).toEqual(result.rows);
    expect(prepare(Buffer.from(result.resolvedCsv)).resolvedCsv).toBe(result.resolvedCsv);
  });
});

function memory(initial: Document[] = []) {
  let docs = structuredClone(initial); const commits: Mutation[][] = [];
  const boundary: Boundary = {
    read: vi.fn(async () => structuredClone(docs)),
    commit: vi.fn(async (mutations) => {
      const next = structuredClone(docs); const changed: Document[] = [];
      for (const m of mutations) {
        if ("create" in m) {
          expect(m.create).not.toHaveProperty("_id");
          const created = { ...m.create, _id: randomUUID(), _rev: randomUUID() } as Document; next.push(created); changed.push(created);
        } else if ("patch" in m) {
          const p = next.find((d) => d._id === m.patch.id);
          if (!p || p._rev !== m.patch.ifRevisionID) throw new Error("Revision conflict");
          Object.assign(p, m.patch.set); p._rev = randomUUID(); changed.push(p);
        } else throw new Error("Unexpected mutation");
      }
      commits.push(structuredClone(mutations)); docs = next; return structuredClone(changed);
    }),
  };
  return { boundary, commits, documents: () => docs };
}
async function apply(input: Uint8Array, store: ReturnType<typeof memory>) {
  const preview = await importCatalog(input, target, {}, env, store.boundary, () => {});
  return importCatalog(input, target, { applyHash: preview.hash, confirm: "testonly/test" }, env, store.boundary, () => {});
}
describe("isolated Sanity boundary", () => {
  it("dry-runs with zero writes; creates categories then products atomically; repeated resolved import is a no-op", async () => {
    vi.stubGlobal("fetch", () => { throw new Error("Real network forbidden"); });
    const m = memory(); const input = bytes(row(), row({ catalogKey: key(2), sku: "FICTIONAL-B", category: "fictional category" }));
    const preview = await importCatalog(input, target, {}, env, m.boundary, () => {});
    expect(preview.summary).toMatchObject({ newProducts: 2, newCategories: 1 }); expect(m.commits).toHaveLength(0);
    await apply(input, m);
    expect(m.commits).toHaveLength(2); expect(m.documents().filter((d) => d._type === "product")).toHaveLength(2);
    await apply(input, m); expect(m.commits).toHaveLength(2);
    const payload = JSON.stringify(m.commits);
    for (const secret of ["tier1Price", "tier2Price", "19.99", "ProductPrice"]) expect(payload).not.toContain(secret);
  });
  it("matches only catalogKey; SKU/name changes update the existing ID, preserve omitted products/images and reuse category", async () => {
    const original = { ...product(), image: { asset: { _ref: "fictional-image" } } };
    const omitted = product({ _id: "omitted", catalogKey: key(2), sku: "OMITTED" }); const m = memory([category(), original, omitted]);
    await apply(bytes(row({ sku: "CHANGED", name: "Changed fictional name" })), m);
    expect(m.documents()).toHaveLength(3); expect(m.documents().find((d) => d._id === "product-original")).toMatchObject({ sku: "CHANGED", name: "Changed fictional name", catalogKey: key(), image: original.image });
    expect(m.documents().find((d) => d._id === "omitted")).toEqual(omitted);
    expect(m.commits[0].every((mutation) => "patch" in mutation)).toBe(true);
  });
  it.each([
    [product(), product({ _id: "duplicate" })],
    [product({ catalogKey: "bad" })],
    [category(), { ...category(), _id: "duplicate-category", name: " FICTIONAL  CATEGORY " }],
    [product({ _id: "drafts.product" })],
    [{ ...category(), _id: "versions.release.category" }],
    [{ ...category(), _id: undefined }],
  ])("blocks ambiguous/malformed/draft remote data before any mutation %#", async (...documents) => {
    const m = memory(documents as Document[]);
    await expect(apply(bytes(row()), m)).rejects.toThrow(); expect(m.commits).toHaveLength(0);
  });
  it("never matches a new key by SKU and blocks final SKU collisions", async () => {
    const m = memory([category(), product()]);
    await expect(apply(bytes(row({ catalogKey: key(2) })), m)).rejects.toThrow(/duplicate normalized SKUs/); expect(m.commits).toHaveLength(0);
  });
  it("checks projected document capacity before creating categories or products", async () => {
    const m = memory([category(), ...Array.from({ length: 1499 }, (_, i) => product({ _id: `existing-${i}`, catalogKey: key(i + 1), sku: `EXISTING-${i}` }))]);
    await expect(apply(bytes(row({ catalogKey: key(2000), category: "New fictional category" })), m)).rejects.toThrow(/1,500-document/);
    expect(m.commits).toHaveLength(0);
  });
  it("rejects invalid input and stale approval before writes", async () => {
    const m = memory([category()]);
    await expect(apply(bytes(row({ catalogKey: "" })), m)).rejects.toThrow(/catalogKey/); expect(m.boundary.read).not.toHaveBeenCalled();
    const preview = plan([row()], snapshot([category()]), target);
    await expect(importCatalog(bytes(row({ name: "Changed" })), target, { applyHash: preview.hash, confirm: "testonly/test" }, env, m.boundary, () => {})).rejects.toThrow(/changed since review/);
    expect(m.commits).toHaveLength(0);
  });
  it("reports a failed/uncertain category transaction without attempting products", async () => {
    const m = memory(); vi.mocked(m.boundary.commit).mockRejectedValue(new Error("sensitive-provider-payload"));
    await expect(apply(bytes(row()), m)).rejects.toThrow(/Category transaction failed or its outcome is uncertain/);
    expect(m.boundary.commit).toHaveBeenCalledTimes(1); expect(m.documents()).toEqual([]);
  });
  it("stops if another writer changes content between category and product transactions", async () => {
    const m = memory([product()]);
    vi.mocked(m.boundary.read).mockResolvedValueOnce([product()]).mockResolvedValueOnce([product()]).mockResolvedValueOnce([product({ _rev: "changed" })]);
    await expect(apply(bytes(row()), m)).rejects.toThrow(/changed after category creation/);
    expect(m.commits).toHaveLength(1); expect(m.documents().find((d) => d._type === "product")?.name).toBe("Fictional product");
  });
  it("revision conflicts fail the whole product transaction and never overwrite a concurrent edit", async () => {
    const m = memory([category(), product()]);
    vi.mocked(m.boundary.commit).mockRejectedValue(new Error("Revision conflict"));
    await expect(apply(bytes(row({ name: "New name" })), m)).rejects.toThrow(/Product transaction failed/);
    expect(m.documents()[1].name).toBe("Fictional product"); expect(m.commits).toHaveLength(0);
  });
});
describe("production safeguards", () => {
  const options = { applyHash: "a".repeat(64), confirm: "testonly/test" };
  it("defaults every target to production-guarded, independent of dataset spelling", () => {
    expect(() => authorizeApply(target, options, {})).toThrow(/production-guarded/);
    expect(() => authorizeApply(target, options, { SANITY_CATALOG_NON_PRODUCTION_TARGET: "other/test" })).toThrow();
    expect(() => authorizeApply(target, { ...options, allowProduction: true }, {})).toThrow();
    expect(() => authorizeApply(target, options, { ALLOW_PRODUCTION_CATALOG_IMPORT: "true" })).toThrow();
    expect(() => authorizeApply(target, { ...options, allowProduction: true }, { ALLOW_PRODUCTION_CATALOG_IMPORT: "true" })).not.toThrow();
    expect(() => authorizeApply(target, options, env)).not.toThrow();
    expect(() => authorizeApply(target, { ...options, confirm: "other/test" }, env)).toThrow();
  });
  it("binds a deterministic plan to target/content/revisions, not prices", () => {
    const docs = snapshot([category()]); const first = plan([row()], docs, target);
    expect(plan([row({ tier1Price: "0.01" })], docs, target).hash).toBe(first.hash);
    expect(plan([row()], docs, { ...target, dataset: "production" }).hash).not.toBe(first.hash);
    expect(plan([row()], snapshot([{ ...category(), _rev: "another" }]), target).hash).not.toBe(first.hash);
  });
});
