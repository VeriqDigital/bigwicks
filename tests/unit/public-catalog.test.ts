import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ content: vi.fn(), user: vi.fn(), pricing: vi.fn() }));
vi.mock("@/lib/catalog/content", () => ({ readPublishedCatalogContent: mock.content }));
vi.mock("@/lib/auth/authorization", () => ({ getCurrentUser: mock.user }));
vi.mock("@/lib/catalog/service", () => ({ getAvailableCatalogForCustomer: mock.pricing }));
import { getPublicCatalog, publicCategories } from "@/lib/catalog/public";
import { getVisitorPricing } from "@/lib/catalog/visitor";
import { productVideo } from "@/lib/catalog/video";
import { categoryHref } from "@/lib/catalog/urls";
import { fictionalProduct, catalogKeys } from "../fixtures/catalog";
import sitemap from "../../app/sitemap";

beforeEach(() => {
  mock.content.mockResolvedValue([fictionalProduct({ slug: "sample", price: "91827.31", tier1: "81726.42", tier2: "71625.53" })]);
  mock.user.mockResolvedValue(null);
});

it("serves a public allowlisted DTO without pricing or an auth/pricing call", async () => {
  const result = await getPublicCatalog();
  expect(result.products[0]).toMatchObject({ name: "Fictional test product one", slug: "sample", video: null });
  expect(JSON.stringify(result)).not.toMatch(/91827\.31|81726\.42|71625\.53|tier1|tier2|price/);
  expect(mock.user).not.toHaveBeenCalled(); expect(mock.pricing).not.toHaveBeenCalled();
});

it("preserves existing visibility, excludes drafts/releases and fails closed for slug collisions", async () => {
  mock.content.mockResolvedValue([
    fictionalProduct({ slug: "collision" }),
    fictionalProduct({ _id: "hidden", catalogKey: catalogKeys.hidden, available: false, slug: "collision" }),
    fictionalProduct({ _id: "drafts.other", catalogKey: catalogKeys.two, slug: "draft" }),
    fictionalProduct({ _id: "versions.release.other", catalogKey: catalogKeys.orphan, slug: "release" }),
  ]);
  expect((await getPublicCatalog()).products).toEqual([]);
});

it("uses stable keys for missing/invalid slugs and tolerates missing optional content", async () => {
  mock.content.mockResolvedValue([fictionalProduct({ slug: "../private", image: null, description: null, videoUrl: "javascript:alert(1)" })]);
  expect((await getPublicCatalog()).products[0]).toMatchObject({ slug: catalogKeys.one, image: null, description: null, video: null });
});
it("prevents an API-written slug from hijacking another product's permanent key URL", async () => {
  mock.content.mockResolvedValue([
    fictionalProduct({ slug: catalogKeys.hidden }),
    fictionalProduct({ _id: "hidden", catalogKey: catalogKeys.hidden, slug: "hidden", available: false }),
  ]);
  expect((await getPublicCatalog()).products).toEqual([]);
});

it("builds category links from real identities, independent of category labels", async () => {
  const categories = publicCategories((await getPublicCatalog()).products);
  expect(categories).toEqual([{ id: "fictional-category", name: "Fictional category" }]);
  expect(categoryHref(categories[0].id)).toBe("/products?category=fictional-category");
});

it("sitemap contains public products only and never invokes pricing", async () => {
  expect(await sitemap()).toContainEqual({ url: expect.stringContaining("/products/sample") });
  expect(mock.pricing).not.toHaveBeenCalled();
});

it.each([null, { role: "ADMIN" }, { role: "CUSTOMER", customer: { active: false } }])("never calls the price service for ineligible visitors", async (user) => {
  mock.user.mockResolvedValue(user);
  expect(await getVisitorPricing()).toBeNull(); expect(mock.pricing).not.toHaveBeenCalled();
});

it("delegates eligible customers to the independently authorized zero-input service", async () => {
  mock.user.mockResolvedValue({ role: "CUSTOMER", customer: { active: true } });
  mock.pricing.mockResolvedValue({ status: "ready", products: [] });
  expect(await getVisitorPricing()).toEqual({ status: "ready", products: [] });
  expect(mock.pricing).toHaveBeenCalledWith();
});

it.each([
  ["https://www.youtube.com/watch?v=abcdefghijk&autoplay=1", "https://www.youtube-nocookie.com/embed/abcdefghijk"],
  ["https://youtu.be/abcdefghijk?t=20", "https://www.youtube-nocookie.com/embed/abcdefghijk"],
  ["https://youtube.com/shorts/abcdefghijk", "https://www.youtube-nocookie.com/embed/abcdefghijk"],
  ["https://vimeo.com/12345678", "https://player.vimeo.com/video/12345678"],
  ["https://player.vimeo.com/video/12345678", "https://player.vimeo.com/video/12345678"],
])("reconstructs supported videos without arbitrary parameters: %s", (input, output) => {
  expect(productVideo(input)?.embedUrl).toBe(output);
});
it.each([undefined, "", "javascript:alert(1)", '<iframe src="evil">', "https://youtube.com.evil.test/watch?v=abcdefghijk", "http://youtu.be/abcdefghijk", "https://user:pass@youtu.be/abcdefghijk", "https://youtu.be:444/abcdefghijk", "https://youtu.be/not-valid", "https://vimeo.com/channels/123", "https://example.test/video.mp4"])("omits unsupported video %s", (input) => {
  expect(productVideo(input)).toBeNull();
});
