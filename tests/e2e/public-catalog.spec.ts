import { expect, test, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { fictionalProduct } from "../fixtures/catalog";

test.skip(!process.env.TEST_CATALOG_CONTENT_FILE, "Requires the isolated fictional content pass.");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const keys = [1, 2, 3, 4].map((i) => `f9000000-0000-4000-8000-${String(i).padStart(12, "0")}`);
const products = [
  fictionalProduct({ catalogKey: keys[0], publiclyVisible: true, slug: "fictional-cake", name: "Discovery cake", category: { _id: "actual-cakes-id", name: "Catalog cakes", homepageCard: "500-gram-cakes" }, videoUrl: "https://youtu.be/abcdefghijk?autoplay=1" }),
  fictionalProduct({ _id: "second", catalogKey: keys[1], publiclyVisible: true, available: false, name: "Discovery fountain", category: { _id: "actual-fountains-id", name: "Catalog fountains", homepageCard: "fountains" }, image: null, description: null }),
  fictionalProduct({ _id: "hidden", catalogKey: keys[2], publiclyVisible: false, slug: "hidden-discovery", name: "Hidden discovery", available: true }),
  fictionalProduct({ _id: "invalid-video", catalogKey: keys[3], slug: "invalid-video", name: "Unpriced discovery", videoUrl: "javascript:alert(1)" }),
];
const prices = ["91827.31", "81726.42", "71625.53", "61524.64"];
let tier1: string; let tier2: string;
async function content(rows = products) { await writeFile(process.env.TEST_CATALOG_CONTENT_FILE!, JSON.stringify({ products: rows })); }
async function login(page: Page, tier: 1 | 2) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(`tier${tier}@example.test`);
  await page.getByLabel("Password", { exact: true }).fill(process.env[`SEED_TIER${tier}_PASSWORD`]!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/portal$/);
}
test.beforeEach(async ({ page }) => {
  tier1 = (await db.pricingTier.findUniqueOrThrow({ where: { name: "Tier 1" } })).id;
  tier2 = (await db.pricingTier.findUniqueOrThrow({ where: { name: "Tier 2" } })).id;
  await db.loginRateLimit.deleteMany();
  await db.productPrice.deleteMany({ where: { catalogKey: { in: keys } } });
  await db.productPrice.createMany({ data: [
    { catalogKey: keys[0], pricingTierId: tier1, price: prices[0] },
    { catalogKey: keys[0], pricingTierId: tier2, price: prices[1] },
    { catalogKey: keys[2], pricingTierId: tier1, price: prices[2] },
    { catalogKey: keys[2], pricingTierId: tier2, price: prices[3] },
  ] });
  await content();
  await page.route("https://cdn.sanity.io/**", (route) => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#ddd"/><text x="90" y="150">Fictional product</text></svg>' }));
  await page.route(/https:\/\/(www.youtube-nocookie.com|player.vimeo.com|www.google.com)\//, (route) => route.fulfill({ contentType: "text/html", body: "<p>Isolated embed placeholder</p>" }));
});
test.afterAll(async () => {
  await db.productPrice.deleteMany({ where: { catalogKey: { in: keys } } });
  await db.$disconnect();
});

test("anonymous HTML and Flight have public content but no wholesale values or hidden product", async ({ page }) => {
  for (const path of ["/products", "/products/fictional-cake", `/products/${keys[1]}`]) {
    for (const headers of [{}, { RSC: "1" }] as Record<string, string>[]) {
      const response = await page.request.get(path, { headers });
      expect(response.ok()).toBe(true);
      const body = await response.text();
      for (const value of [...prices, "18/6/6", "Case packing", "Hidden discovery", "hidden-discovery", tier1, tier2, 'data-testid="product-price"', '"price":', '"pricingTierId":']) expect(body).not.toContain(value);
      if (headers.RSC) expect(response.headers()["content-type"]).toContain("text/x-component");
      expect(response.headers()["cache-control"]).toContain("no-store");
      const tampered = await (await page.request.get(`${path}?pricingTierId=${tier2}&price=0.01`, { headers })).text();
      for (const value of prices) expect(tampered).not.toContain(value);
    }
  }
  const sitemap = await (await page.request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/products/fictional-cake"); expect(sitemap).not.toContain("hidden-discovery");
  for (const value of prices) expect(sitemap).not.toContain(value);
});

for (const tier of [1, 2] as const) {
  test(`Tier ${tier} receives only its current saved price on both routes and payload formats`, async ({ page }) => {
    await login(page, tier);
    for (const path of ["/products", "/products/fictional-cake"]) {
      for (const headers of [{}, { RSC: "1" }] as Record<string, string>[]) {
        const response = await page.request.get(path, { headers });
        const body = await response.text();
        expect(body).toContain(prices[tier - 1]);
        for (const forbidden of [...prices.filter((_, i) => i !== tier - 1), tier1, tier2]) expect(body).not.toContain(forbidden);
        expect(response.headers()["cache-control"]).toContain("no-store");
        const tampered = await (await page.request.get(`${path}?pricingTierId=${tier === 1 ? tier2 : tier1}&role=ADMIN`, { headers })).text();
        expect(tampered).toContain(prices[tier - 1]);
        for (const forbidden of prices.filter((_, i) => i !== tier - 1)) expect(tampered).not.toContain(forbidden);
      }
    }
    await page.goto("/products/fictional-cake");
    await expect(page.getByTestId("product-price")).toHaveText(prices[tier - 1]);
    await expect(page.getByText("18/6/6", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: /Open wholesale catalog/ }).click();
    await expect(page.getByLabel("Cases for Discovery cake")).toBeVisible();
    await expect(page.getByRole("link", { name: /Product details for Discovery cake/ })).toHaveAttribute("href", "/products/fictional-cake");
    await expect(page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Hidden discovery", exact: true }) }).getByRole("link", { name: /Product details/ })).toHaveCount(0);
  });
}

test("hidden, draft, ambiguous and unknown slugs cannot expose content", async ({ page }) => {
  for (const path of ["hidden-discovery", keys[2], "does-not-exist"]) {
    const response = await page.request.get(`/products/${path}`);
    expect(await response.text()).not.toContain("Hidden discovery");
    // Next may stream a 200 containing its noindex not-found boundary.
    expect(response.status() === 404 || (await response.text()).includes('content="noindex"')).toBe(true);
  }
  await content([
    ...products,
    fictionalProduct({ _id: "drafts.secret", catalogKey: "f9000000-0000-4000-8000-000000000005", slug: "draft-secret", name: "Draft secret" }),
    fictionalProduct({ _id: "duplicate-slug", catalogKey: "f9000000-0000-4000-8000-000000000006", slug: "fictional-cake", available: false }),
  ]);
  for (const slug of ["draft-secret", "fictional-cake"]) {
    const body = await (await page.request.get(`/products/${slug}`)).text();
    expect(body).not.toContain("Draft secret"); expect(body).not.toContain("Discovery cake");
  }
});

test("homepage real-category links, filters and clickable product cards lead to matching content", async ({ page }) => {
  await page.goto("/");
  const link = page.getByRole("link", { name: "Browse Fountains", exact: true });
  await expect(page.locator("#shop .category-card")).toHaveCount(8);
  const image = page.locator("#shop .category-card").filter({ has: page.getByRole("heading", { name: "Fountains", exact: true }) }).getByRole("img");
  await expect(image).toHaveAttribute("src", /fountains\.jpg/);
  await expect(link).toHaveAttribute("href", "/products?category=actual-fountains-id");
  await link.click();
  await expect(page.getByRole("article")).toHaveCount(1);
  await page.getByRole("link", { name: /Discovery fountain/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Discovery fountain");
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.getByText("Image unavailable")).toBeVisible();
  await page.getByRole("link", { name: "All fireworks" }).click();
  await page.getByRole("searchbox", { name: "Search products" }).fill("cake");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByRole("article")).toHaveCount(1);
});

test("public visibility and wholesale availability independently control all four combinations", async ({ page, request }) => {
  await login(page, 1);
  for (const [publiclyVisible, available] of [[true, true], [true, false], [false, true], [false, false]]) {
    await content([fictionalProduct({ ...products[0], publiclyVisible, available })]);
    for (const headers of [{}, { RSC: "1" }] as Record<string, string>[]) {
      const catalog = await (await request.get("/products", { headers })).text();
      expect(catalog.includes("Discovery cake")).toBe(publiclyVisible);
      expect(catalog).not.toContain(prices[0]); expect(catalog).not.toContain("18/6/6");
      const detail = await (await request.get("/products/fictional-cake", { headers })).text();
      expect(detail.includes("Discovery cake")).toBe(publiclyVisible);
      expect(detail).not.toContain(prices[0]); expect(detail).not.toContain("18/6/6");
    }
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap.includes("/products/fictional-cake")).toBe(publiclyVisible);
    const home = await (await request.get("/")).text();
    expect(home.includes("/products?category=actual-cakes-id")).toBe(publiclyVisible);
    await page.goto("/portal");
    const item = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Discovery cake", exact: true }) });
    await expect(item).toHaveCount(available ? 1 : 0);
    if (available) {
      await expect(item.getByTestId("product-price")).toHaveText(prices[0]);
      await expect(item.getByRole("link", { name: /Product details/ })).toHaveCount(publiclyVisible ? 1 : 0);
      await item.getByLabel("Cases for Discovery cake").fill("2");
      await page.getByRole("button", { name: "Review order", exact: true }).click();
      await expect(page.getByRole("heading", { name: /review/i })).toBeVisible();
    }
  }
});

test("explicit invalid slug is inaccessible even through its key alias", async ({ request }) => {
  await content([fictionalProduct({ ...products[0], slug: "bad slug" })]);
  for (const path of ["/products", `/products/${keys[0]}`, "/products/bad%20slug", "/sitemap.xml"]) {
    const body = await (await request.get(path)).text();
    expect(body).not.toContain("Discovery cake");
    expect(body).not.toContain("18/6/6");
  }
});

test("safe video embeds, canonical metadata, and invalid/no video states", async ({ page }) => {
  await page.goto("/products/fictional-cake");
  await expect(page.locator("iframe")).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/abcdefghijk");
  await expect(page.locator("iframe")).toHaveAttribute("title", "Discovery cake demonstration on YouTube");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/products\/fictional-cake$/);
  await expect(page).toHaveTitle("Discovery cake | Big Wicks Fireworks");
  await page.goto(`/products/${keys[0]}`);
  await expect(page).toHaveURL(/\/products\/fictional-cake$/);
  await page.goto("/products/invalid-video");
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Unpriced discovery");
});

test("public catalog and detail work at phone, tablet and desktop widths", async ({ page }, testInfo) => {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/products", "/products/fictional-cake"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`${path.endsWith("cake") ? "detail" : "catalog"}-${width}.png`), fullPage: true });
    }
  }
});
