import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
test.beforeEach(async () => { await db.loginRateLimit.deleteMany(); });
test.afterAll(async () => { await db.$disconnect(); });

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

test("unauthenticated direct and RSC requests cannot access protected routes", async ({ request }) => {
  for (const path of ["/admin", "/portal", "/account"]) {
    for (const headers of [{}, { RSC: "1" }] as Record<string, string>[]) {
      const response = await request.get(path, { headers, maxRedirects: 0 });
      const body = await response.text();
      if (headers.RSC) {
        // Next.js streams RSC redirects in the payload after sending HTTP 200.
        expect(response.status()).toBe(200);
        expect(body).toContain("NEXT_REDIRECT;replace;/login;307;");
      } else {
        expect(response.status()).toBe(307);
        expect(response.headers().location).toBe("/login");
      }
      expect(response.headers()["cache-control"]).toContain("no-store");
      expect(body).not.toContain("Development Customer");
      expect(body).not.toContain("You are signed in as an administrator");
    }
  }
  expect((await request.get("/register")).status()).toBe(404);
  expect((await request.get("/signup")).status()).toBe(404);
});

test("admin signs in, accesses admin, and signs out", async ({ page }) => {
  await login(page, "admin@example.test", process.env.SEED_ADMIN_PASSWORD!);
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Administration", exact: true })).toBeVisible();
  expect((await page.request.get("/portal")).status()).toBe(404);
  const cookie = (await page.context().cookies()).find(({ name }) => name.endsWith("session-token"));
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe("Lax");
  const session = await (await page.request.get("/api/auth/session")).json();
  expect(Object.keys(session.user).sort()).toEqual(["id", "sessionVersion"]);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login$/);
});

test("both customers see their own shell and cannot access admin", async ({ page }) => {
  for (const [index, password] of [[1, process.env.SEED_TIER1_PASSWORD], [2, process.env.SEED_TIER2_PASSWORD]] as const) {
    await login(page, `tier${index}@example.test`, password!);
    await expect(page).toHaveURL(/\/portal$/);
    await expect(page.getByText(`Signed in for Development Customer ${index}.`, { exact: true })).toBeVisible();
    const response = await page.request.get("/admin");
    expect(response.status()).toBe(404);
    expect(await response.text()).not.toContain("You are signed in as an administrator");
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
  }
});

test("disabling identity or business rejects login and existing sessions", async ({ page }) => {
  for (const target of ["user", "customer"] as const) {
    await db.loginRateLimit.deleteMany();
    const user = await db.user.findUniqueOrThrow({ where: { email: "tier1@example.test" } });
    await login(page, user.email, process.env.SEED_TIER1_PASSWORD!);
    await expect(page).toHaveURL(/\/portal$/);
    try {
      if (target === "user") await db.user.update({ where: { id: user.id }, data: { active: false } });
      else await db.customer.update({ where: { userId: user.id }, data: { active: false } });
      await page.goto("/portal");
      await expect(page).toHaveURL(/\/login$/);
      expect(await (await page.request.get("/api/auth/session")).json()).toBeNull();
      await login(page, user.email, process.env.SEED_TIER1_PASSWORD!);
      await expect(page.getByRole("status")).toContainText("Unable to sign in");
      await expect(page).toHaveURL(/\/login$/);
    } finally {
      await db.user.update({ where: { id: user.id }, data: { active: true } });
      await db.customer.update({ where: { userId: user.id }, data: { active: true } });
    }
  }
});

test("direct Auth.js callbacks enforce CSRF, limiting and ignore forged claims", async ({ request }) => {
  const withoutCsrf = await request.post("/api/auth/callback/credentials", {
    form: { email: "admin@example.test", password: process.env.SEED_ADMIN_PASSWORD! }, maxRedirects: 0,
  });
  expect(withoutCsrf.headers().location).toContain("MissingCSRF");
  expect(await (await request.get("/api/auth/session")).json()).toBeNull();
  const { csrfToken } = await (await request.get("/api/auth/csrf")).json();
  await request.post("/api/auth/callback/credentials", {
    form: { csrfToken, email: "tier1@example.test", password: process.env.SEED_TIER1_PASSWORD!, role: "ADMIN", customerId: "other", pricingTierId: "other", callbackUrl: "https://example.org" },
    maxRedirects: 0,
  });
  expect((await request.get("/admin")).status()).toBe(404);
  expect(await (await request.get("/portal")).text()).toContain("Development Customer 1");
  for (let i = 0; i < 5; i++) {
    await request.post("/api/auth/callback/credentials", { form: { csrfToken, email: "tier2@example.test", password: "wrong" } });
  }
  const limited = await request.post("/api/auth/callback/credentials", {
    form: { csrfToken, email: "tier2@example.test", password: process.env.SEED_TIER2_PASSWORD! }, maxRedirects: 0,
  });
  expect(limited.headers().location).toContain("CredentialsSignin");
  expect(await (await request.get("/portal")).text()).toContain("Development Customer 1");
});

test("login and protected shells work at phone, tablet and desktop widths", async ({ page }) => {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
    expect(await page.locator('meta[name="robots"]').getAttribute("content")).toContain("noindex");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/login-${width}.png` });
  }
  await login(page, "tier1@example.test", process.env.SEED_TIER1_PASSWORD!);
  await expect(page).toHaveURL(/\/portal$/);
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/portal-${width}.png` });
  }
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await login(page, "admin@example.test", process.env.SEED_ADMIN_PASSWORD!);
  await expect(page).toHaveURL(/\/admin$/);
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole("heading", { name: "Administration", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/admin-${width}.png` });
  }
});
