import { expect, test, type Page, type Request } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { fictionalProduct } from "../fixtures/catalog";

test.skip(!process.env.TEST_CATALOG_CONTENT_FILE, "Requires the isolated mocked Sanity browser pass.");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const key = (index: number) => `e5000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
const keys = Array.from({ length: 201 }, (_, index) => key(index + 1));
const headers = "catalogKey,sku,productName,category,available,price:1:Tier 1,price:2:Tier 2";
let tier1: string; let tier2: string;
const csv = (value = "14567.89") => `${headers}\r\n${key(1)},EDITED-SKU,Edited name,,true,${value},\r\n${key(2)},TEST-ONLY-001,Fictional hidden product,,false,7.01,8.02\r\n`;
async function content(products: unknown[], fail = false) { await writeFile(process.env.TEST_CATALOG_CONTENT_FILE!, JSON.stringify({ products, fail })); }
async function login(page: Page, admin = true) {
  await page.goto("/login"); await page.getByLabel("Email", { exact: true }).fill(admin ? "admin@example.test" : "tier1@example.test");
  await page.getByLabel("Password", { exact: true }).fill(process.env[admin ? "SEED_ADMIN_PASSWORD" : "SEED_TIER1_PASSWORD"]!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click(); await expect(page).toHaveURL(admin ? /\/admin$/ : /\/portal$/);
}
async function upload(page: Page, text = csv()) {
  await page.getByLabel("Pricing CSV file").setInputFiles({ name: "fictional-prices.csv", mimeType: "text/csv", buffer: Buffer.from(text) });
  await page.getByRole("button", { name: "Validate and preview", exact: true }).click();
}
test.beforeEach(async () => {
  await db.loginRateLimit.deleteMany();
  tier1 = (await db.pricingTier.findUniqueOrThrow({ where: { name: "Tier 1" } })).id;
  tier2 = (await db.pricingTier.findUniqueOrThrow({ where: { name: "Tier 2" } })).id;
  await db.productPrice.deleteMany({ where: { catalogKey: { in: keys } } });
  await db.productPrice.createMany({ data: [{ catalogKey: key(1), pricingTierId: tier1, price: "11223.45" }, { catalogKey: key(1), pricingTierId: tier2, price: "22334.56" }] });
  await content([fictionalProduct({ _id: "pricing-first", catalogKey: key(1), image: null }), fictionalProduct({ _id: "pricing-hidden", catalogKey: key(2), name: "Fictional hidden product", available: false, image: null })]);
});
test.afterAll(async () => { await db.productPrice.deleteMany({ where: { catalogKey: { in: keys } } }); await db.$disconnect(); });

test("configured Tier 3 renders, exports, imports and reaches its customer at responsive widths", async ({ page }) => {
  const third = await db.pricingTier.create({ data: { name: "Tier 3", rank: 3 } });
  const customer = await db.customer.findFirstOrThrow({ where: { user: { email: "tier1@example.test" } } });
  try {
    await login(page); await page.goto("/admin/customers/new");
    await expect(page.getByLabel("Pricing tier", { exact: true }).locator("option", { hasText: "Tier 3" })).toHaveCount(1);
    await page.goto("/admin/pricing");
    await expect(page.getByRole("columnheader", { name: "Tier 3", exact: true })).toBeVisible();
    const exported = await (await page.request.get("/admin/pricing/export")).text();
    expect(exported).toContain("price:3:Tier 3");
    await upload(page, `${headers},price:3:Tier 3\n${key(1)},TEST-ONLY-001,Fictional test product one,,true,10.01,12.03,17.29\n`);
    await page.getByRole("heading", { name: "Review pricing import" }).waitFor();
    await page.getByRole("button", { name: "Confirm pricing import", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Pricing import applied." })).toBeVisible();
    await page.reload();
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `test-results/pricing-third-tier-${width}.png` });
    }
    await db.customer.update({ where: { id: customer.id }, data: { pricingTierId: third.id } });
    await page.getByRole("button", { name: "Sign out", exact: true }).click(); await login(page, false);
    await expect(page.getByTestId("product-price")).toHaveText("17.29");
    await expect(page.getByText("Brand: Fictional brand", { exact: true })).toBeVisible();
    await expect(page.getByText("Packing: 18/6/6", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Cases for Fictional test product one", { exact: true })).toBeVisible();
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole("article").screenshot({ path: `test-results/catalog-case-${width}.png` });
    }
  } finally {
    await db.customer.update({ where: { id: customer.id }, data: { pricingTierId: customer.pricingTierId } });
    await db.productPrice.deleteMany({ where: { pricingTierId: third.id } }); await db.pricingTier.delete({ where: { id: third.id } });
  }
});

test("admin pricing export, validation, preview and explicit confirmation update the customer catalog", async ({ page, browser, playwright }) => {
  await login(page);
  const navigation = page.getByRole("navigation", { name: "Administration navigation" });
  for (const [label, href] of [["Customers", "/admin/customers"], ["Pricing", "/admin/pricing"], ["Catalog Studio", "/studio"], ["Public website", "/"]]) await expect(navigation.getByRole("link", { name: label, exact: true })).toHaveAttribute("href", href);
  await navigation.getByRole("link", { name: "Pricing", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Pricing management" })).toBeVisible();
  const downloadEvent = page.waitForEvent("download"); await page.getByRole("link", { name: "Download pricing CSV" }).click();
  expect((await downloadEvent).suggestedFilename()).toBe("big-wicks-pricing.csv");
  const exported = await page.request.get("/admin/pricing/export");
  expect(exported.headers()["cache-control"]).toContain("private, no-store");
  expect(await exported.text()).toContain("11223.45"); expect(await exported.text()).toContain(key(2));
  const requests: Request[] = [];
  page.on("request", (request) => { if (request.headers()["next-action"]) requests.push(request); });
  await upload(page, csv("1.234")); await expect(page.getByRole("status")).toContainText("Correct the CSV errors");
  await expect(page.getByRole("button", { name: "Confirm pricing import" })).toHaveCount(0);
  await upload(page); await expect(page.getByRole("heading", { name: "Review pricing import" })).toBeVisible();
  const previewRequest = requests.at(-1)!;
  expect((await db.productPrice.findUniqueOrThrow({ where: { catalogKey_pricingTierId: { catalogKey: key(1), pricingTierId: tier1 } } })).price.toFixed(2)).toBe("11223.45");
  await page.getByText("Review all proposed values", { exact: true }).click();
  await expect(page.getByText("Tier 1: 11223.45 → 14567.89 (update)", { exact: true })).toBeVisible();
  await page.getByRole("checkbox").check();
  // Forged fields must not override the authenticated, encrypted preview.
  await page.locator('input[name="previewToken"]').evaluate((input) => {
    for (const [name, value] of [["price", "0.01"], ["tier1Price", "0.01"], ["pricingTierId", "attacker-tier"]]) {
      const extra = document.createElement("input"); extra.type = "hidden"; extra.name = name; extra.value = value; input.closest("form")!.append(extra);
    }
  });
  await page.getByRole("button", { name: "Confirm pricing import", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Pricing import applied." })).toBeVisible();
  const confirmRequest = requests.at(-1)!;
  expect((await db.productPrice.findUniqueOrThrow({ where: { catalogKey_pricingTierId: { catalogKey: key(1), pricingTierId: tier1 } } })).price.toFixed(2)).toBe("14567.89");
  expect(await db.productPrice.findUnique({ where: { catalogKey_pricingTierId: { catalogKey: key(1), pricingTierId: tier2 } } })).toBeNull();
  const customerContext = await browser.newContext(); const customerPage = await customerContext.newPage();
  const anonymous = await playwright.request.newContext();
  try {
    await login(customerPage, false); await expect(customerPage.getByTestId("product-price")).toHaveText("14567.89");
    for (const context of [anonymous, customerContext.request]) {
      for (const path of ["/admin/pricing", "/admin/pricing/export"]) {
        const response = await context.get(path, { maxRedirects: 0 });
        expect(response.status()).toBe(context === anonymous ? 307 : 404); expect(await response.text()).not.toContain("14567.89");
      }
      for (const captured of [previewRequest, confirmRequest]) {
        // Chromium omits file bytes from postDataBuffer. Rebuild the upload's
        // observed React form encoding; ordinary confirmation can be replayed.
        const body = captured === previewRequest ? {
          multipart: { "0": JSON.stringify([{ status: "idle" }, "$K1"]), "_1_csv": { name: "fictional-prices.csv", mimeType: "text/csv", buffer: Buffer.from(csv()) } },
        } : { data: captured.postDataBuffer()! };
        const response = await context.post(captured.url(), { ...body, headers: { "next-action": captured.headers()["next-action"], ...(captured === confirmRequest ? { "content-type": captured.headers()["content-type"] } : {}), origin: "http://localhost:3107", accept: "text/x-component" }, maxRedirects: 0 });
        if (context === anonymous) expect(response.headers()["x-action-redirect"] ?? await response.text()).toContain("/login");
        else expect(response.status()).toBe(404);
        expect(await response.text()).not.toContain("14567.89");
      }
    }
    await upload(page, csv("15678.90")); await page.getByRole("button", { name: "Confirm pricing import", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Pricing import applied." })).toBeVisible();
    await customerPage.reload(); await expect(customerPage.getByTestId("product-price")).toHaveText("15678.90");
  } finally { await anonymous.dispose(); await customerContext.close(); }
});

test("admin pricing rejects tampered and stale previews and fails safely when Sanity is unavailable", async ({ page }) => {
  await login(page); await page.goto("/admin/pricing"); await upload(page);
  await page.getByRole("heading", { name: "Review pricing import" }).waitFor();
  await page.locator('input[name="previewToken"]').evaluate((input) => { (input as HTMLInputElement).value = "tampered"; });
  await page.getByRole("checkbox").check(); await page.getByRole("button", { name: "Confirm pricing import", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("invalid or expired");
  await upload(page); await page.getByRole("heading", { name: "Review pricing import" }).waitFor();
  await db.productPrice.updateMany({ where: { catalogKey: key(1), pricingTierId: tier1 }, data: { price: "33445.67" } });
  await page.getByRole("checkbox").check(); await page.getByRole("button", { name: "Confirm pricing import", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("changed after this preview");
  await content([], true); await page.reload();
  await expect(page.getByRole("status")).toHaveText("Pricing data is temporarily unavailable. Please try again later.");
  await expect(page.getByRole("link", { name: "Download pricing CSV" })).toHaveCount(0);
  expect((await page.request.get("/admin/pricing/export")).status()).toBe(503);
  expect(await page.content()).not.toContain("FICTIONAL_PROVIDER_SECRET");
});

test("admin pricing supports 200 products at phone, tablet and desktop widths without public price leaks", async ({ page, request }) => {
  const many = Array.from({ length: 200 }, (_, index) => fictionalProduct({ _id: `pricing-many-${index}`, catalogKey: key(index + 1), sku: "LONG-SKU-".repeat(10), name: "Fictional pricing product " + "LongName".repeat(20), image: null }));
  await content(many); await login(page); await page.goto("/admin/pricing");
  await expect(page.getByRole("region", { name: "Current pricing table" }).locator("tbody tr")).toHaveCount(200);
  const fullCsv = headers + "\r\n" + many.map((product) => `${product.catalogKey},${product.sku},${product.name},,true,14567.89,`).join("\r\n");
  await upload(page, fullCsv); await page.getByRole("heading", { name: "Review pricing import" }).waitFor();
  await expect(page.getByRole("status")).toContainText("200 rows read · 200 products matched");
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("button", { name: "Validate and preview", exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/pricing-import-${width}.png` });
    await page.getByRole("heading", { name: "Pricing management" }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/pricing-dashboard-${width}.png` });
    await page.getByRole("button", { name: "Confirm pricing import", exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/pricing-confirm-${width}.png` });
    await page.getByRole("region", { name: "Current pricing table" }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/pricing-table-${width}.png` });
  }
  await page.getByRole("checkbox").check(); await page.getByRole("button", { name: "Confirm pricing import", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Pricing import applied." })).toBeVisible();
  expect(await db.productPrice.count({ where: { catalogKey: { in: keys }, pricingTierId: tier1, price: "14567.89" } })).toBe(200);
  expect(await db.productPrice.count({ where: { catalogKey: { in: keys }, pricingTierId: tier2 } })).toBe(0);
  for (const path of ["/", "/contact", "/login", "/api/pricing", "/api/prices"]) {
    const body = await (await request.get(path)).text(); expect(body).not.toContain("11223.45"); expect(body).not.toContain("22334.56"); expect(body).not.toContain("14567.89");
  }
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  expect(await page.locator("head").innerHTML()).not.toContain("11223.45");
});
