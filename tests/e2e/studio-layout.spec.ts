import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const configured = Boolean(process.env.NEXT_PUBLIC_SANITY_PROJECT_ID && process.env.NEXT_PUBLIC_SANITY_DATASET);

test.beforeEach(async ({ page }) => {
  await db.loginRateLimit.deleteMany();
  if (configured) {
    // Render Sanity's real signed-out interface with fictional providers, while
    // keeping every browser request away from live Sanity services.
    await page.route("https://*.sanity.io/**", async route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith("/users/me")) return route.fulfill({ json: null });
      if (path.endsWith("/auth/id")) return route.fulfill({ json: { id: null } });
      if (path.endsWith("/auth/providers")) return route.fulfill({ json: { providers: [
        { name: "google", title: "Google", url: "https://example.test/google" },
        { name: "github", title: "GitHub", url: "https://example.test/github" },
      ] } });
      return route.abort();
    });
  }
});
test.afterAll(async () => { await db.$disconnect(); });

async function expectPublicScroll(page: Page) {
  await expect(page.locator("header")).toBeVisible();
  await expect(page.locator("footer")).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight > innerHeight)).toBe(true);
  await page.mouse.move(180, 400);
  await page.mouse.wheel(0, 600);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflowY)).not.toBe("hidden");
}

async function expectStudioViewport(page: Page, signedIn = false) {
  await expect(page.locator(".studio-viewport")).toBeVisible();
  await expect(page.locator("body > header, body > footer")).toHaveCount(0);
  if (configured) {
    // Mount the real NextStudio viewport without signing in to a remote dataset.
    await expect(page.locator('#sanity[data-ui="NextStudioLayout"]')).toBeVisible();
    if (signedIn) await expect(page.getByTestId("studio-navbar")).toBeVisible();
    else await expect(page.getByText("Choose login provider", { exact: true })).toBeVisible();
  } else {
    await expect(page.getByRole("heading", { name: "Catalog Studio is not configured" })).toBeVisible();
  }
  const dimensions = await page.evaluate(() => {
    const shell = document.querySelector(".studio-viewport")!.getBoundingClientRect();
    const studio = document.querySelector("#sanity")?.getBoundingClientRect();
    return {
      top: shell.top, height: shell.height, width: shell.width,
      studioHeight: studio?.height,
      viewportHeight: innerHeight, viewportWidth: innerWidth,
      // Sanity reserves a stable scrollbar gutter on the body after sign-in.
      availableWidth: document.body.clientWidth,
      documentHeight: document.documentElement.scrollHeight,
      documentWidth: document.documentElement.scrollWidth,
      bodyHeight: document.body.scrollHeight,
    };
  });
  expect(dimensions.top).toBe(0);
  expect(dimensions.height).toBe(dimensions.viewportHeight);
  expect(dimensions.width).toBe(dimensions.availableWidth);
  if (configured) expect(dimensions.studioHeight).toBe(dimensions.viewportHeight);
  expect(dimensions.documentHeight).toBeLessThanOrEqual(dimensions.viewportHeight);
  expect(dimensions.bodyHeight).toBeLessThanOrEqual(dimensions.viewportHeight);
  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
  await page.mouse.move(180, 400);
  await page.mouse.wheel(0, 700);
  expect(await page.evaluate(() => scrollY)).toBe(0);
}

for (const viewport of [
  { width: 390, height: 844 }, { width: 768, height: 1024 },
  { width: 1440, height: 900 }, { width: 1920, height: 1080 },
]) {
  test(`Studio exit navigation works on tool and document routes at ${viewport.width}px`, async ({ page }, testInfo) => {
    test.skip(!configured, "Requires the isolated configured Studio build.");
    await page.setViewportSize(viewport);
    // Only fictional, read-only Sanity responses. Mutations and other remote
    // requests stay blocked; real publishing remains a manual verification.
    await page.route("https://*.sanity.io/**", async route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith("/users/me")) return route.fulfill({ json: {
        id: "fictional-admin", name: "Fictional Admin", email: "admin@example.test",
        roles: [{ name: "administrator", title: "Administrator" }],
      } });
      if (path.endsWith("/projects/testonly")) return route.fulfill({ json: {
        id: "testonly", displayName: "Fictional catalog", organizationId: "fictional-org",
        members: [{ id: "fictional-admin", role: "administrator", isRobot: false }],
      } });
      if (path.includes("/data/query/test")) return route.fulfill({ json: { result: [] } });
      return route.abort();
    });
    await page.goto("/login");
    await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
    await page.getByLabel("Password", { exact: true }).fill(process.env.SEED_ADMIN_PASSWORD!);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/admin$/);

    for (const path of ["/studio", "/studio/structure", "/studio/structure/product;fictional-product"]) {
      await page.goto(path);
      await expectStudioViewport(page, true);
      const exit = page.getByRole("link", { name: "Back to Admin", exact: true });
      await expect(exit).toHaveAttribute("href", "/admin");
      await expect(exit).toBeInViewport();
      await expect(page.getByTestId("studio-navbar").getByRole("button").first()).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(`exit-${path.split("/").at(-1) || "studio"}.png`) });
      await exit.focus();
      await expect(exit).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/\/admin$/);
      await expect(page.locator("header")).toBeVisible();
    }
  });

  test(`Studio isolates its viewport and restores the site shell at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto("/login");
    await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
    await page.getByLabel("Password", { exact: true }).fill(process.env.SEED_ADMIN_PASSWORD!);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.locator("header")).toBeVisible();
    await page.getByRole("link", { name: "Catalog Studio", exact: true }).click();
    await expectStudioViewport(page);
    await page.screenshot({ path: testInfo.outputPath("studio.png") });

    // Back restores the cached root layout without a reload or style cleanup effect.
    await page.goBack();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("footer")).toHaveCount(1);
    await page.getByRole("link", { name: "Public website", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await expectPublicScroll(page);
    await page.screenshot({ path: testInfo.outputPath("public-after-studio.png") });

    // The optional catch-all route must select the same standalone shell on load.
    await page.goto("/studio/structure/product");
    await expectStudioViewport(page);
  });
}
