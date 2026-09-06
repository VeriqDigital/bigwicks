import { afterEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ create: vi.fn(), fetch: vi.fn() }));
vi.mock("@sanity/client", () => ({ createClient: mock.create }));
import { readPublishedCatalogContent, catalogContentQuery } from "@/lib/catalog/content";

afterEach(() => { vi.unstubAllEnvs(); });
it("reads only explicitly selected published content without credentials or caching", async () => {
  vi.stubEnv("NEXT_PUBLIC_SANITY_PROJECT_ID", "testonly"); vi.stubEnv("NEXT_PUBLIC_SANITY_DATASET", "test");
  mock.create.mockReturnValue({ fetch: mock.fetch }); mock.fetch.mockResolvedValue([]);
  expect(await readPublishedCatalogContent()).toEqual([]);
  expect(mock.create).toHaveBeenCalledWith(expect.objectContaining({ perspective: "published", useCdn: false, stega: false, maxRetries: 0 }));
  expect(mock.create.mock.calls[0][0]).not.toHaveProperty("token");
  expect(mock.fetch).toHaveBeenCalledWith(catalogContentQuery, {}, { cache: "no-store" });
  expect(catalogContentQuery).not.toMatch(/price|pricingTier|\.\.\./i);
});
it("does not contact any project when configuration is missing", async () => {
  vi.stubEnv("NEXT_PUBLIC_SANITY_PROJECT_ID", ""); vi.stubEnv("NEXT_PUBLIC_SANITY_DATASET", "");
  await expect(readPublishedCatalogContent()).rejects.toThrow("not configured");
  expect(mock.create).not.toHaveBeenCalled();
});
