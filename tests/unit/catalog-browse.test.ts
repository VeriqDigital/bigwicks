import { describe, expect, it } from "vitest";
import { browseCatalog, comparePrices } from "@/components/catalog/browse";
import ProductImage, { catalogImageLoader } from "@/components/catalog/ProductImage";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { CustomerCatalogProduct } from "@/lib/catalog/service";

const products: CustomerCatalogProduct[] = [
  { catalogKey: "b", sku: "TEST-B", name: "Beta", category: null, image: null, description: null, brand: null, packing: null, price: "10.01" },
  { catalogKey: "a", sku: "TEST-A", name: "Alpha", category: { id: "cat", name: "Test cakes" }, image: null, description: null, brand: null, packing: null, price: "9.99" },
];
describe("catalog browsing uses only the supplied authorized DTO", () => {
  it.each([[" ALPHA ", "a"], ["test-b", "b"], ["CAKES", "a"]])("searches trimmed case-insensitive name/SKU/category: %s", (query, key) => {
    expect(browseCatalog(products, query, "", "name-asc").map((p) => p.catalogKey)).toEqual([key]);
  });
  it("combines category and search, and accepts optional content", () => {
    expect(browseCatalog(products, "", "cat", "name-asc")).toEqual([products[1]]);
    expect(browseCatalog(products, "Beta", "cat", "name-asc")).toEqual([]);
    expect(browseCatalog([], "", "", "name-asc")).toEqual([]);
  });
  it.each(["name-asc", "price-asc", "name-desc", "price-desc"] as const)("sorts %s without mutating input or price strings", (sort) => {
    expect(browseCatalog(products, "", "", sort).map((p) => p.catalogKey)).toEqual(sort.endsWith("asc") ? ["a", "b"] : ["b", "a"]);
    expect(products.map((p) => p.price)).toEqual(["10.01", "9.99"]);
  });
  it("compares exact money text across decimal and integer boundaries", () => {
    const amounts = ["9999999999.99", "0.00", "10.00", "9.99", "0.01", "9999999999.98"];
    expect(amounts.sort(comparePrices)).toEqual(["0.00", "0.01", "9.99", "10.00", "9999999999.98", "9999999999.99"]);
    expect(comparePrices("12.34", "12.34")).toBe(0);
  });
});
it("bounds image dimensions and replaces arbitrary query parameters without cropping", () => {
  const url = new URL(catalogImageLoader({ src: "https://cdn.sanity.io/images/testonly/test/fiction-2000x2000.png?dl=1", width: 3840 }));
  expect(url.searchParams.get("w")).toBe("960"); expect(url.searchParams.get("h")).toBe("720");
  expect(url.searchParams.get("fit")).toBe("max"); expect(url.searchParams.has("dl")).toBe(false);
});
it.each(["https://example.test/images/file.png", "http://cdn.sanity.io/images/file.png", "https://cdn.sanity.io/files/file.pdf"])("rejects unexpected image source %s", (src) => {
  expect(() => catalogImageLoader({ src, width: 320 })).toThrow("Invalid catalog image");
});
it("renders a safe fallback for malformed optional image URLs", () => {
  const markup = renderToStaticMarkup(createElement(ProductImage, { image: { url: "https://cdn.sanity.io:81/images/file.png", alt: "Fictional" } }));
  expect(markup).toContain("Image unavailable"); expect(markup).not.toContain("<img");
});
