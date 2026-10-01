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
import { homepageCategoryCards } from "@/lib/catalog/homepage-categories";
import { fireworksCategories } from "@/data/fireworks";

beforeEach(() => {
  mock.content.mockResolvedValue([fictionalProduct({ slug: "sample", price: "91827.31", tier1: "81726.42", tier2: "71625.53" })]);
  mock.user.mockResolvedValue(null);
});

it("serves a public allowlisted DTO without pricing or an auth/pricing call", async () => {
  const result = await getPublicCatalog();
  expect(result.products[0]).toMatchObject({ name: "Fictional test product one", slug: "sample", video: null });
  expect(JSON.stringify(result)).not.toMatch(/91827\.31|81726\.42|71625\.53|tier1|tier2|price/);
  expect(result.products[0]).not.toHaveProperty("packing");
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

it("uses stable keys for missing slugs and tolerates missing optional content", async () => {
  mock.content.mockResolvedValue([fictionalProduct({ image: null, description: null, videoUrl: "javascript:alert(1)" })]);
  expect((await getPublicCatalog()).products[0]).toMatchObject({ slug: catalogKeys.one, image: null, description: null, video: null });
});
it.each(["../private", "", "UPPERCASE", "bad slug", 42])("fails closed for explicitly invalid slug %s", async (slug) => {
  mock.content.mockResolvedValue([fictionalProduct({ slug })]);
  expect((await getPublicCatalog()).products).toEqual([]);
});
it("prevents an API-written slug from hijacking another product's permanent key URL", async () => {
  mock.content.mockResolvedValue([
    fictionalProduct({ slug: catalogKeys.hidden }),
    fictionalProduct({ _id: "hidden", catalogKey: catalogKeys.hidden, slug: "hidden", available: false, publiclyVisible: false }),
  ]);
  expect((await getPublicCatalog()).products).toEqual([]);
});
it.each([
  [true, true], [true, false], [false, true], [false, false],
])("public visibility %s is independent of wholesale availability %s", async (publiclyVisible, available) => {
  mock.content.mockResolvedValue([fictionalProduct({ publiclyVisible, available, slug: "independent" })]);
  expect((await getPublicCatalog()).products).toHaveLength(publiclyVisible ? 1 : 0);
  expect((await sitemap()).some((entry) => entry.url.endsWith("/products/independent"))).toBe(publiclyVisible);
});
it.each([undefined, null])("keeps legacy missing public visibility %s visible even when wholesale unavailable", async (publiclyVisible) => {
  mock.content.mockResolvedValue([fictionalProduct({ publiclyVisible, available: false })]);
  expect((await getPublicCatalog()).products).toHaveLength(1);
});
it.each(["true", "false", 1, {}])("malformed public visibility fails closed: %j", async (publiclyVisible) => {
  mock.content.mockResolvedValue([fictionalProduct({ publiclyVisible })]);
  expect((await getPublicCatalog()).products).toEqual([]);
});
it("keeps curated card images and maps by explicit category identity, not names or product images", async () => {
  mock.content.mockResolvedValue([fictionalProduct({ category: { _id: "real-id", name: "Renamed category", homepageCard: "fountains" } })]);
  const cards = homepageCategoryCards((await getPublicCatalog()).products);
  expect(cards.map((card) => card.image)).toEqual(fireworksCategories.map((card) => card.image));
  expect(cards.find((card) => card.id === "fountains")).toMatchObject({ href: "/products?category=real-id", mapped: true });
  expect(cards.find((card) => card.id === "500-gram-cakes")).toMatchObject({ href: "/products", mapped: false });
  mock.content.mockResolvedValue([
    fictionalProduct({ category: { _id: "one", name: "One", homepageCard: "fountains" } }),
    fictionalProduct({ _id: "two", catalogKey: catalogKeys.two, category: { _id: "two", name: "Two", homepageCard: "fountains" } }),
  ]);
  expect(homepageCategoryCards((await getPublicCatalog()).products).find((card) => card.id === "fountains")).toMatchObject({ href: "/products", mapped: false });
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
