import { expect, test } from "@playwright/test";
import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const key = "b2000000-0000-4000-8000-000000000001";
const privateAmount = "9827341.17";
test.afterAll(async () => { await db.productPrice.deleteMany({ where: { catalogKey: key } }); await db.$disconnect(); });

test("public HTML/RSC/metadata never includes private prices and there is no public catalog-price endpoint", async ({ request }) => {
  const tier = await db.pricingTier.findUniqueOrThrow({ where: { name: "Tier 1" } });
  await db.productPrice.upsert({ where: { catalogKey_pricingTierId: { catalogKey: key, pricingTierId: tier.id } }, create: { catalogKey: key, pricingTierId: tier.id, price: privateAmount }, update: { price: privateAmount } });
  for (const path of ["/", "/contact", "/login", "/forgot-password", "/robots.txt"]) {
    for (const headers of [{}, { RSC: "1" }] as Record<string, string>[]) {
      const body = await (await request.get(path, { headers })).text();
      expect(body.includes(privateAmount)).toBe(false); expect(body.includes(key)).toBe(false);
    }
  }
  for (const path of ["/api/catalog", "/api/prices", "/admin/products"]) expect((await request.get(path)).status()).toBe(404);
});

test("Studio requires ADMIN and builds/renders a clear fallback without a Sanity project", async ({ page, request }) => {
  await db.loginRateLimit.deleteMany();
  const anonymous = await request.get("/studio", { maxRedirects: 0 });
  expect(anonymous.status()).toBe(307); expect(anonymous.headers().location).toBe("/login");
  await page.goto("/login"); await page.getByLabel("Email", { exact: true }).fill("tier1@example.test");
  await page.getByLabel("Password", { exact: true }).fill(process.env.SEED_TIER1_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click(); await expect(page).toHaveURL(/\/portal$/);
  expect((await page.request.get("/studio")).status()).toBe(404);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
  await page.getByLabel("Password", { exact: true }).fill(process.env.SEED_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click(); await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/studio");
  await expect(page.getByRole("heading", { name: "Catalog Studio is not configured" })).toBeVisible();
  const fallback = page.getByRole("heading", { name: "Catalog Studio is not configured" }).locator("..");
  await expect(fallback).toHaveCSS("padding-left", "20px");
  await expect(fallback).toHaveCSS("padding-top", "64px");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/studio-unconfigured-${width}.png`, fullPage: true });
  }
});
