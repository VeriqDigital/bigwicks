import { expect, test } from "@playwright/test";
import sharp from "sharp";

test("FRAMEWORK: local image optimization and missing/disallowed images", async ({ request }) => {
  const image = await request.get("/_next/image", {
    params: { url: "/Big wicks logo background removed.png", w: "64", q: "75" },
    headers: { accept: "image/avif,image/webp,*/*" },
  });
  expect(image.status()).toBe(200);
  // The application's formats are unchanged: Next defaults to WebP.
  expect(image.headers()["content-type"]).toBe("image/webp");
  const metadata = await sharp(await image.body()).metadata();
  expect(metadata.width).toBe(64);
  expect(metadata.format).toBe("webp");
  expect((await request.get("/fictional-missing-image.png")).status()).toBe(404);
  const missing = await request.get("/_next/image", { params: { url: "/fictional-missing-image.png", w: "64", q: "75" } });
  // The optimizer rejects the missing route's HTML as an invalid image.
  expect(missing.status()).toBe(400);
  expect(await missing.text()).toBe("The requested resource isn't a valid image.");
  const remote = await request.get("/_next/image", { params: { url: "https://images.example.test/fictional.png", w: "64", q: "75" } });
  expect(remote.status()).toBe(400);
  // Tiny benign in-memory fixture exercises the patched native AVIF codec too.
  const avif = await sharp({ create: { width: 2, height: 2, channels: 3, background: "white" } }).avif().toBuffer();
  const decoded = await sharp(avif).raw().toBuffer({ resolveWithObject: true });
  expect([decoded.info.width, decoded.info.height]).toEqual([2, 2]);
});

test("FRAMEWORK: configured Studio mounts to intercepted Sanity login providers", async ({ page }) => {
  const errors: string[] = [];
  let providerRequests = 0;
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.hostname === "localhost") return route.continue();
    if (url.hostname === "testonly.api.sanity.io" && route.request().method() === "GET") {
      if (url.pathname.endsWith("/auth/providers")) {
        providerRequests++;
        return route.fulfill({ json: { providers: [
          { name: "google", title: "Fictional Google", url: "https://identity.example.test/google" },
          { name: "github", title: "Fictional GitHub", url: "https://identity.example.test/github" },
        ] } });
      }
      if (url.pathname.endsWith("/users/me")) return route.fulfill({ status: 401, json: { error: "Unauthorized", message: "Fictional unauthenticated Studio session" } });
    }
    return route.abort();
  });
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
  await page.getByLabel("Password", { exact: true }).fill(process.env.SEED_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/studio");
  await expect(page.getByText("Choose login provider", { exact: true })).toBeVisible();
  expect(providerRequests).toBeGreaterThan(0);
  expect(errors).toEqual([]);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/studio-configured-${width}.png`, fullPage: true });
  }
});
