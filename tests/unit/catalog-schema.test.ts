import { expect, it, vi } from "vitest";
import type { ValidationContext } from "sanity";
import { product, validateCatalogKey } from "@/sanity/schemaTypes/product";
import { category } from "@/sanity/schemaTypes/category";
import { isCatalogKey } from "@/sanity/catalog-key";
import { catalogKeys } from "../fixtures/catalog";

it("generates fresh immutable keys, starts unavailable and has no pricing fields", () => {
  const initial = product.initialValue as () => { catalogKey: string; available: boolean };
  const one = initial(); const two = initial();
  expect(isCatalogKey(one.catalogKey)).toBe(true); expect(one.catalogKey).not.toBe(two.catalogKey); expect(one.available).toBe(false);
  expect(product.fields.find((field) => field.name === "catalogKey")).toHaveProperty("readOnly", true);
  expect(product.fields.find((field) => field.name === "sku")).not.toHaveProperty("readOnly", true);
  expect(product.fields.some((field) => /price|tier/i.test(field.name))).toBe(false);
  expect(category.fields.map((field) => field.name)).toEqual(["name"]);
});
it("validates uniqueness across other drafts/published docs and rejects identity changes", async () => {
  const fetch = vi.fn().mockResolvedValue({ duplicate: false, publishedKey: catalogKeys.one });
  const withConfig = vi.fn().mockReturnValue({ fetch });
  const context = { document: { _id: "drafts.test-product" }, getClient: () => ({ withConfig }) } as unknown as ValidationContext;
  expect(await validateCatalogKey(catalogKeys.one, context)).toBe(true);
  expect(withConfig).toHaveBeenCalledWith({ perspective: "raw", useCdn: false });
  expect(fetch.mock.calls[0][1]).toEqual({ key: catalogKeys.one, id: "test-product", draft: "drafts.test-product" });
  expect(await validateCatalogKey(catalogKeys.two, context)).toContain("must never change");
  fetch.mockResolvedValue({ duplicate: true, publishedKey: null });
  expect(await validateCatalogKey(catalogKeys.one, context)).toContain("another document");
  fetch.mockRejectedValue(new Error("private upstream detail"));
  expect(await validateCatalogKey(catalogKeys.one, context)).toBe("Catalog identity could not be verified. Try again before publishing.");
  expect(await validateCatalogKey("SKU-001", context)).toContain("generated catalog key");
});
