// Fictional test content only. Never seed or import this into a real dataset.
export const catalogKeys = {
  one: "a1000000-0000-4000-8000-000000000001",
  two: "a1000000-0000-4000-8000-000000000002",
  hidden: "a1000000-0000-4000-8000-000000000003",
  orphan: "a1000000-0000-4000-8000-000000000004",
};
export function fictionalProduct(overrides: Record<string, unknown> = {}) {
  return {
    _id: "fictional-product-one", catalogKey: catalogKeys.one, sku: "TEST-ONLY-001", name: "Fictional test product one", available: true,
    category: { _id: "fictional-category", name: "Fictional category" },
    description: "Fictional content used only by automated tests.",
    image: { url: "https://cdn.sanity.io/images/testonly/test/fictional-100x100.png", alt: "Fictional test image" },
    ...overrides,
  };
}
