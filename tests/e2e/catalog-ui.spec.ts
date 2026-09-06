import { expect, test, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { fictionalProduct } from "../fixtures/catalog";

test.skip(!process.env.TEST_CATALOG_CONTENT_FILE, "Runs in the isolated configured-catalog browser pass.");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const key = (index: number) => `c3000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
const fixtureKeys = Array.from({ length: 207 }, (_, index) => key(index));
const longName = "Zulu fictional product " + "LongName".repeat(20);
const products = [
  fictionalProduct({ _id: "alpha", catalogKey: key(1), name: "Alpha fictional cake", sku: "FIC-A-001", category: { _id: "cakes", name: "Fictional cakes" } }),
  fictionalProduct({ _id: "beta", catalogKey: key(2), name: "Beta fictional fountain", sku: "FIC-B-002", category: { _id: "fountains", name: "Fictional fountains" }, image: null, description: null }),
  fictionalProduct({ _id: "zulu", catalogKey: key(3), name: longName, sku: "LONG".repeat(25), category: null, image: null, description: "LongDescription".repeat(300) }),
  fictionalProduct({ _id: "hidden", catalogKey: key(4), name: "Hidden fictional product", available: false, category: { _id: "hidden", name: "Hidden category" } }),
  fictionalProduct({ _id: "unpriced", catalogKey: key(5), name: "Unpriced fictional product", category: { _id: "unpriced", name: "Unpriced category" } }),
];
let tier1: string; let tier2: string;
async function content(value: { products?: unknown[]; fail?: boolean }) {
  await writeFile(process.env.TEST_CATALOG_CONTENT_FILE!, JSON.stringify(value));
}
async function login(page: Page, index: 1 | 2 = 1) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(`tier${index}@example.test`);
  await page.getByLabel("Password", { exact: true }).fill(process.env[index === 1 ? "SEED_TIER1_PASSWORD" : "SEED_TIER2_PASSWORD"]!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/portal$/);
}
test.beforeEach(async ({ page }) => {
  await db.loginRateLimit.deleteMany();
  tier1 = (await db.pricingTier.findUniqueOrThrow({ where: { name: "Tier 1" } })).id;
  tier2 = (await db.pricingTier.findUniqueOrThrow({ where: { name: "Tier 2" } })).id;
  await db.productPrice.deleteMany({ where: { catalogKey: { in: fixtureKeys } } });
  await db.productPrice.createMany({ data: [
    ...["12001.11", "9.99", "10.01", "33333.33"].map((price, index) => ({ catalogKey: key(index + 1), pricingTierId: tier1, price })),
    ...["23002.22", "8.88", "7.77", "44444.44", "55555.55"].map((price, index) => ({ catalogKey: key(index + 1), pricingTierId: tier2, price })),
  ] });
  await content({ products });
  await page.route("https://**.sanity.io/**", async (route) => {
    if (new URL(route.request().url()).hostname === "cdn.sanity.io") return route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect x="110" y="65" width="180" height="170" fill="#d62935"/><text x="200" y="150" text-anchor="middle" fill="white" font-size="22">TEST FIXTURE</text></svg>' });
    await route.abort();
  });
});
test.afterAll(async () => {
  await db.productPrice.deleteMany({ where: { catalogKey: { in: fixtureKeys } } });
  await db.$disconnect();
});

test("customer catalog renders authorized products and supports search/category/name/price sorting", async ({ page }) => {
  await login(page);
  const cards = page.getByRole("article");
  await expect(cards).toHaveCount(3);
  await expect(cards.first()).toContainText("12001.11");
  await expect(cards.nth(1)).toContainText("Image unavailable");
  await expect(cards.nth(1)).not.toContainText("undefined");
  await expect(page.getByRole("img", { name: "Fictional test image" })).toBeVisible();
  const search = page.getByRole("searchbox", { name: "Search products" });
  const requests: string[] = [];
  page.on("request", (request) => {
    // Existing public navigation prefetches its links as they enter the viewport.
    // Exclude only Next's explicit prefetch requests to known public pages.
    const publicPrefetch = request.headers()["next-router-prefetch"] === "1" && ["/", "/contact"].includes(new URL(request.url()).pathname);
    if (!publicPrefetch && (request.resourceType() === "fetch" || request.resourceType() === "xhr")) requests.push(request.url());
  });
  for (const query of [" ALPHA ", "fic-a-001", "CAKES"]) {
    await search.fill(query); await expect(cards).toHaveCount(1); await expect(cards).toContainText("Alpha fictional cake");
  }
  await search.fill("");
  await page.getByLabel("Category", { exact: true }).selectOption("fountains");
  await expect(cards).toHaveCount(1); await expect(cards).toContainText("Beta fictional fountain");
  await page.getByRole("button", { name: "Clear filters" }).click();
  for (const [sort, names] of [
    ["name-asc", ["Alpha fictional cake", "Beta fictional fountain", longName]],
    ["name-desc", [longName, "Beta fictional fountain", "Alpha fictional cake"]],
    ["price-asc", ["Beta fictional fountain", longName, "Alpha fictional cake"]],
    ["price-desc", ["Alpha fictional cake", longName, "Beta fictional fountain"]],
  ] as const) {
    await page.getByLabel("Sort by").selectOption(sort);
    await expect(cards.getByRole("heading")).toHaveText([...names]);
  }
  for (const query of ["Hidden fictional", "Unpriced fictional", "does not exist"]) {
    await search.fill(query);
    await expect(cards).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "No products match your search." })).toBeVisible();
    await expect(page.getByRole("status")).toHaveText("0 of 3 products");
  }
  expect(requests).toEqual([]);
  await expect(page.getByLabel("Category", { exact: true }).locator("option")).toHaveText(["All products", "Fictional cakes", "Fictional fountains"]);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(cards).toHaveCount(3);
  await page.getByText("Wholesale account details", { exact: true }).click();
  await expect(page.getByText("tier1@example.test", { exact: true })).toBeVisible();
});

test("customer catalog ignores query/form context and never serializes other prices or internal associations", async ({ page }) => {
  await login(page);
  const other = await db.customer.findFirstOrThrow({ where: { user: { email: "tier2@example.test" } } });
  const forbidden = ["23002.22", "33333.33", "44444.44", "55555.55", key(4), key(5), tier1, tier2, other.id, other.userId];
  for (const headers of [{}, { RSC: "1" }] as Record<string, string>[]) {
    const response = await page.request.get("/portal", { headers });
    const body = await response.text();
    expect(body).toContain("12001.11");
    for (const value of forbidden) expect(body).not.toContain(value);
    expect(response.headers()["cache-control"]).toContain("no-store");
    const tampered = await (await page.request.get(`/portal?customerId=${other.id}&userId=${other.userId}&pricingTierId=${tier2}&role=ADMIN&price=0.01`, { headers })).text();
    expect(tampered).toContain("12001.11");
    // Next's router echoes supplied URL query values in its navigation payload.
    // Those are attacker input, not serialized authoritative associations.
    for (const value of forbidden.slice(0, 7)) expect(tampered).not.toContain(value);
  }
  const post = await page.request.post("/portal", { form: { customerId: other.id, pricingTierId: tier2, price: "0.01" } });
  // Next renders a page for a plain POST without a Server Action identifier.
  // The page must still authorize the session and ignore all form context.
  expect(post.status()).toBe(200); expect(await post.text()).toContain("12001.11");
  for (const value of forbidden) expect(await post.text()).not.toContain(value);
  const { csrfToken } = await (await page.request.get("/api/auth/csrf")).json();
  await page.request.post("/api/auth/callback/credentials", { form: { csrfToken, email: "tier1@example.test", password: process.env.SEED_TIER1_PASSWORD!, role: "ADMIN", customerId: other.id, pricingTierId: tier2 }, maxRedirects: 0 });
  const afterForgery = await (await page.request.get("/portal")).text();
  expect(afterForgery).toContain("12001.11"); expect(afterForgery).not.toContain("23002.22");
  expect((await page.request.get("/admin")).status()).toBe(404);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  const metadata = await page.locator("head").innerHTML();
  expect(metadata).not.toContain("12001.11");
  for (const src of await page.locator("script[src]").evaluateAll((scripts) => scripts.map((script) => (script as HTMLScriptElement).src))) {
    const bundle = await (await page.request.get(src)).text();
    expect(bundle).not.toContain("12001.11"); expect(bundle).not.toContain("23002.22"); expect(bundle).not.toContain(key(1));
  }
});

test("customer catalog refresh resolves changed tier and revocation without another login", async ({ page }) => {
  await login(page);
  const user = await db.user.findUniqueOrThrow({ where: { email: "tier1@example.test" } });
  try {
    await db.customer.update({ where: { userId: user.id }, data: { pricingTierId: tier2 } });
    await page.reload();
    await expect(page.getByTestId("product-price").first()).toHaveText("23002.22");
    expect(await page.content()).not.toContain("12001.11");
    await db.user.update({ where: { id: user.id }, data: { sessionVersion: { increment: 1 } } });
    await page.reload(); await expect(page).toHaveURL(/\/login$/);
    expect(await page.content()).not.toContain("23002.22");
  } finally {
    await db.customer.update({ where: { userId: user.id }, data: { pricingTierId: tier1 } });
  }
  await login(page, 2);
  await expect(page.getByTestId("product-price").first()).toHaveText("23002.22");
});

test("customer catalog distinguishes empty and safe failure, retries, and handles broken images", async ({ page }) => {
  await content({ products: [] }); await login(page);
  await expect(page.getByRole("heading", { name: "No products are currently available." })).toBeVisible();
  await expect(page.getByRole("searchbox")).toHaveCount(0);
  await content({ fail: true }); await page.reload();
  await expect(page.getByRole("status")).toHaveText("The catalog is temporarily unavailable. Please try again later.");
  expect(await page.content()).not.toContain("FICTIONAL_PROVIDER_SECRET");
  await content({ products });
  await page.route("https://cdn.sanity.io/**", (route) => route.abort());
  await page.getByRole("link", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("article")).toHaveCount(3);
  await expect(page.getByRole("article").first()).toContainText("Image unavailable");
});

test("customer catalog protects real content from anonymous/admin/disabled access and public endpoints", async ({ page, request }) => {
  for (const path of ["/portal", "/portal?pricingTierId=other"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(307); expect(response.headers().location).toBe("/login");
    expect(await response.text()).not.toContain("12001.11");
  }
  const anonymousPost = await request.post("/portal", { form: { pricingTierId: tier1 }, maxRedirects: 0 });
  expect(anonymousPost.status()).toBe(307); expect(anonymousPost.headers().location).toBe("/login");
  expect(await anonymousPost.text()).not.toContain("12001.11");
  for (const path of ["/", "/contact", "/login", "/api/catalog", "/api/prices", "/admin"]) {
    for (const headers of [{}, { RSC: "1" }] as Record<string, string>[]) {
      const body = await (await request.get(path, { headers })).text();
      for (const value of ["12001.11", "23002.22", key(1)]) expect(body).not.toContain(value);
    }
  }
  await login(page);
  const user = await db.user.findUniqueOrThrow({ where: { email: "tier1@example.test" } });
  for (const target of ["user", "customer"] as const) {
    try {
      if (target === "user") await db.user.update({ where: { id: user.id }, data: { active: false } });
      else await db.customer.update({ where: { userId: user.id }, data: { active: false } });
      const body = await (await page.request.get("/portal", { headers: { RSC: "1" } })).text();
      expect(body).toContain("NEXT_REDIRECT;replace;/login;307;"); expect(body).not.toContain("12001.11");
    } finally {
      await db.user.update({ where: { id: user.id }, data: { active: true } });
      await db.customer.update({ where: { userId: user.id }, data: { active: true } });
    }
  }
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
  await page.getByLabel("Password", { exact: true }).fill(process.env.SEED_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click(); await expect(page).toHaveURL(/\/admin$/);
  expect((await page.request.get("/portal")).status()).toBe(404);
  expect((await page.request.post("/portal", { form: { role: "CUSTOMER", pricingTierId: tier1 } })).status()).toBe(404);
  for (const path of ["/admin", "/admin/customers"]) {
    const body = await (await page.request.get(path)).text(); expect(body).not.toContain("12001.11"); expect(body).not.toContain("23002.22");
  }
});

test("customer catalog remains usable with 200 products at mobile, tablet, desktop and wide widths", async ({ page }) => {
  const many = Array.from({ length: 197 }, (_, index) => fictionalProduct({ _id: `many-${index}`, catalogKey: key(index + 10), name: `Fictional display product ${String(index).padStart(3, "0")}`, image: null }));
  await db.productPrice.createMany({ data: many.map((p) => ({ catalogKey: p.catalogKey as string, pricingTierId: tier1, price: "123.45" })) });
  await content({ products: [...products, ...many] });
  await login(page);
  await expect(page.getByRole("article")).toHaveCount(200);
  for (const width of [390, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.getByRole("searchbox").fill("fictional");
    await expect(page.getByRole("article")).toHaveCount(200);
    await page.getByLabel("Category", { exact: true }).selectOption("fountains");
    await expect(page.getByRole("article")).toHaveCount(1);
    await page.getByRole("button", { name: "Clear filters" }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("searchbox").focus();
    await expect(page.getByRole("searchbox")).toBeFocused();
    await expect(page.getByRole("searchbox")).toHaveCSS("outline-style", "solid");
    await page.keyboard.press("Tab"); await expect(page.getByLabel("Category", { exact: true })).toBeFocused();
    await page.screenshot({ path: `test-results/catalog-${width}.png` });
    await page.getByRole("article").first().screenshot({ path: `test-results/catalog-card-${width}.png` });
    await page.getByRole("searchbox").fill("Zulu");
    await expect(page.getByRole("article")).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/catalog-long-${width}.png` });
    await page.getByRole("article").screenshot({ path: `test-results/catalog-long-card-${width}.png` });
    await page.getByRole("button", { name: "Clear filters" }).click();
  }
});
