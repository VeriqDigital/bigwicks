import { expect, test, type Page, type Request } from "@playwright/test";
import { readdir, readFile, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { fictionalProduct } from "../fixtures/catalog";

test.skip(!process.env.TEST_CATALOG_CONTENT_FILE, "Requires the isolated mocked Sanity build.");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const key = (index: number) => `a7000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
const keys = Array.from({ length: 201 }, (_, index) => key(index + 1));
let tier1: string; let customerId: string;
const products = () => [fictionalProduct({ _id: "order-alpha", catalogKey: key(1), sku: "ORDER-A", name: "Alpha fictional order product", image: null }), fictionalProduct({ _id: "order-beta", catalogKey: key(2), sku: "ORDER-B", name: "Beta fictional order product", image: null })];
async function content(value: unknown[], fail = false) { await writeFile(process.env.TEST_CATALOG_CONTENT_FILE!, JSON.stringify({ products: value, fail })); }
async function login(page: Page, who: "tier1" | "tier2" | "admin" = "tier1") {
  await page.goto("/login"); await page.getByLabel("Email", { exact: true }).fill(`${who}@example.test`);
  await page.getByLabel("Password", { exact: true }).fill(process.env[`SEED_${who.toUpperCase()}_PASSWORD`]!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click(); await expect(page).toHaveURL(who === "admin" ? /\/admin$/ : /\/portal$/);
}
async function cleanup() {
  await db.orderItem.deleteMany({ where: { order: { customerId } } }); await db.order.deleteMany({ where: { customerId } });
}
test.beforeEach(async () => {
  await db.loginRateLimit.deleteMany();
  tier1 = (await db.pricingTier.findUniqueOrThrow({ where: { name: "Tier 1" } })).id;
  customerId = (await db.customer.findFirstOrThrow({ where: { user: { email: "tier1@example.test" } } })).id;
  await cleanup(); await db.productPrice.deleteMany({ where: { catalogKey: { in: keys } } });
  await db.productPrice.createMany({ data: [{ catalogKey: key(1), pricingTierId: tier1, price: "19.99" }, { catalogKey: key(2), pricingTierId: tier1, price: "0.10" }] });
  await content(products());
});
test.afterAll(async () => { await cleanup(); await db.productPrice.deleteMany({ where: { catalogKey: { in: keys } } }); await db.$disconnect(); });
async function review(page: Page) {
  await page.getByRole("button", { name: "Review order", exact: true }).click(); await expect(page.getByRole("heading", { name: "Review order request" })).toBeVisible();
}

for (const interrupted of [false, true]) {
  test(`submission navigates without a global error flash${interrupted ? " after recovering a lost response" : ""}`, async ({ page }) => {
    // Mutation-time observation catches flashes shorter than locator polling.
    // Console events also survive a document replacement if Next needs one.
    const flashes: string[] = [];
    const interruptions: string[] = [];
    page.on("console", (message) => {
      if (message.text() === "ORDER_TEST_GLOBAL_ERROR_VISIBLE") flashes.push(message.text());
      if (message.text() === "ORDER_TEST_INTERRUPTION_VISIBLE") interruptions.push(message.text());
    });
    await page.addInitScript(() => {
      const check = () => {
        if (document.body?.innerText.includes("This page couldn't load")) console.debug("ORDER_TEST_GLOBAL_ERROR_VISIBLE");
        if (document.body?.innerText.includes("Submission was interrupted.")) console.debug("ORDER_TEST_INTERRUPTION_VISIBLE");
      };
      new MutationObserver(check).observe(document, { subtree: true, childList: true, characterData: true, attributes: true });
      document.addEventListener("DOMContentLoaded", check);
    });
    await login(page);
    // A known prior document makes replace-vs-assign history behavior explicit.
    await page.goto("/contact"); await page.goto("/portal");
    await page.getByLabel("Cases for Alpha fictional order product", { exact: true }).fill("2");
    await review(page);

    const submissions: string[] = [];
    page.on("request", (request) => { if (request.headers()["next-action"]) submissions.push(request.postData()!); });
    const redirects: { status: number; destination: string; revalidated?: string }[] = [];
    page.on("response", (response) => {
      const headers = response.headers();
      if (response.request().headers()["next-action"] && headers["x-action-redirect"]) {
        redirects.push({ status: response.status(), destination: headers["x-action-redirect"], revalidated: headers["x-action-revalidated"] });
      }
    });
    let releaseAction!: () => void;
    const actionGate = new Promise<void>((resolve) => { releaseAction = resolve; });
    let first = true;
    // Leave normal success un-intercepted to exercise Next's original streaming
    // response and router timing in both browsers. Only recovery buffers it.
    if (interrupted) await page.route((url) => url.pathname === "/portal", async (route) => {
      if (!route.request().headers()["next-action"]) return route.continue();
      if (!first) return route.continue();
      first = false;
      const response = await route.fetch({ maxRedirects: 0 }); // Real persistence and mocked notification.
      await actionGate;
      expect(response.status()).toBe(303);
      await route.abort("failed");
    });
    try {
      await page.getByRole("button", { name: "Submit order request", exact: true }).click();
      if (interrupted) {
        await expect(page.getByRole("button", { name: "Submitting…", exact: true })).toBeDisabled();
        await expect(page.getByRole("button", { name: "Back to cases", exact: true })).toBeDisabled();
      }
      await expect.poll(() => db.order.count({ where: { customerId } })).toBe(1);
      releaseAction();
      if (interrupted) {
        await expect(page.getByRole("status")).toContainText("Submission was interrupted. Retry this submission to recover the same order");
        await expect(page).toHaveURL(/\/portal$/);
        await expect(page.getByTestId("order-total")).toHaveText("39.98");
        await expect(page.getByRole("button", { name: "Back to cases", exact: true })).toBeEnabled();
        interruptions.length = 0;
        await page.getByRole("button", { name: "Submit order request", exact: true }).click();
      }
      await expect(page).toHaveURL(/\/portal\/confirmation\/BW-/);
      await expect(page.getByRole("heading", { name: "Order request submitted", exact: true })).toBeVisible();
      const reference = await page.getByTestId("order-reference").innerText();
      expect(redirects).toEqual([{ status: 303, destination: `/portal/confirmation/${reference};replace`, revalidated: undefined }]);
      // A framework redirect must never be mislabeled as an interrupted request.
      expect(interruptions).toEqual([]);
      expect(submissions).toHaveLength(interrupted ? 2 : 1);
      if (interrupted) expect(submissions[1]).toBe(submissions[0]);
      expect(await db.order.count({ where: { customerId } })).toBe(1);
      const mails = await Promise.all((await readdir(process.env.TEST_ACCOUNT_MAIL_DIR!)).filter((name) => name.endsWith(".json")).map(async (name) => JSON.parse(await readFile(join(process.env.TEST_ACCOUNT_MAIL_DIR!, name), "utf8"))));
      expect(mails.filter((mail) => mail.subject === `Wholesale order request ${reference}`)).toHaveLength(1);
      await page.goBack(); await expect(page).toHaveURL(/\/contact$/);
      await expect(page.getByRole("heading", { name: "Review order request" })).toHaveCount(0);
      await page.goForward(); await expect(page).toHaveURL(`/portal/confirmation/${reference}`);
      await expect(page.getByTestId("order-reference")).toHaveText(reference);
      expect(await db.order.count({ where: { customerId } })).toBe(1);
      expect(flashes).toEqual([]);
    } finally {
      releaseAction();
      await page.unrouteAll({ behavior: "wait" });
    }
  });
}

test("quantity entry, review, persisted confirmation, staff notification and order snapshots work end to end", async ({ page, browser, playwright }) => {
  await login(page);
  const quantity = page.getByLabel("Cases for Alpha fictional order product", { exact: true });
  await quantity.fill("1.5"); await expect(page.getByRole("alert").filter({ hasText: "Correct invalid case counts" })).toContainText("whole number");
  await expect(page.getByRole("button", { name: "Review order", exact: true })).toBeDisabled();
  await quantity.fill("3"); await page.getByLabel("Cases for Beta fictional order product", { exact: true }).fill("2");
  await page.getByLabel("Search products").fill("no match");
  await expect(page.getByText("2 selected products · Estimated total: 60.17")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click(); await expect(quantity).toHaveValue("3");
  const requests: Request[] = []; page.on("request", (request) => { if (request.headers()["next-action"]) requests.push(request); });
  await review(page); const reviewRequest = requests.at(-1)!;
  await expect(page.getByTestId("order-total")).toHaveText("60.17"); expect(await db.order.count({ where: { customerId } })).toBe(0);
  await page.getByRole("button", { name: "Submit order request", exact: true }).click(); await expect(page).toHaveURL(/\/portal\/confirmation\/BW-/);
  const submitRequest = requests.at(-1)!; const reference = await page.getByTestId("order-reference").innerText();
  await expect(page.getByRole("status")).toContainText("has been saved"); await expect(page.getByTestId("order-total")).toHaveText("60.17");
  expect(await page.content()).not.toContain("notificationStatus");
  const stored = await db.order.findUniqueOrThrow({ where: { reference }, include: { items: true } });
  expect(stored.items).toHaveLength(2); expect(stored.notificationStatus).toBe("ACCEPTED");
  const mails = await Promise.all((await readdir(process.env.TEST_ACCOUNT_MAIL_DIR!)).filter((name) => name.endsWith(".json")).map(async (name) => JSON.parse(await readFile(join(process.env.TEST_ACCOUNT_MAIL_DIR!, name), "utf8"))));
  const mail = mails.find((mail) => mail.subject === `Wholesale order request ${reference}`);
  expect(mail.to).toEqual(["orders@example.test"]); expect(mail.text).toContain("Line total: 59.97"); expect(mail.text).toContain("Submitted total: 60.17");
  const customerContext = await browser.newContext(); const otherPage = await customerContext.newPage();
  const adminContext = await browser.newContext(); const adminPage = await adminContext.newPage();
  const anonymous = await playwright.request.newContext();
  try {
    await login(otherPage, "tier2"); await login(adminPage, "admin");
    for (const context of [anonymous, customerContext.request, adminContext.request]) {
      for (const captured of [reviewRequest, submitRequest]) {
        const response = await context.post(captured.url(), { data: captured.postDataBuffer()!, headers: { "next-action": captured.headers()["next-action"], "content-type": captured.headers()["content-type"], origin: "http://localhost:3107", accept: "text/x-component" }, maxRedirects: 0 });
        if (context === anonymous) expect(response.headers()["x-action-redirect"] ?? await response.text()).toContain("/login");
        else if (context === adminContext.request) expect(response.status()).toBe(404);
        else expect(await response.text()).not.toContain(reference);
      }
      const confirmation = await context.get(`/portal/confirmation/${reference}`, { maxRedirects: 0 });
      expect(confirmation.status()).toBe(context === anonymous ? 307 : 404); expect(await confirmation.text()).not.toContain("60.17");
    }
    expect((await customerContext.request.get("/admin/orders")).status()).toBe(404);
    expect((await customerContext.request.get(`/admin/orders/${reference}`)).status()).toBe(404);
    const replay = await page.request.post(submitRequest.url(), { data: submitRequest.postDataBuffer()!, headers: { "next-action": submitRequest.headers()["next-action"], "content-type": submitRequest.headers()["content-type"], origin: "http://localhost:3107", accept: "text/x-component" }, maxRedirects: 0 });
    expect(replay.status()).toBe(303); expect(replay.headers()["x-action-redirect"]).toBe(`/portal/confirmation/${reference};replace`); expect(await db.order.count({ where: { customerId } })).toBe(1);
    await db.productPrice.updateMany({ where: { catalogKey: key(1) }, data: { price: "999.99" } }); await content([], true);
    await page.reload(); await expect(page.getByTestId("order-total")).toHaveText("60.17");
    await adminPage.getByRole("navigation", { name: "Administration navigation" }).getByRole("link", { name: "Orders", exact: true }).click();
    await adminPage.getByRole("link", { name: reference, exact: true }).click();
    await expect(adminPage.getByTestId("order-total")).toHaveText("60.17"); await expect(adminPage.getByText("Alpha fictional order product", { exact: true })).toBeVisible();
    for (const path of ["/", "/login", "/api/orders", "/orders", "/portal/orders"]) {
      const body = await (await anonymous.get(path)).text(); expect(body).not.toContain(reference); expect(body).not.toContain("60.17");
    }
  } finally { await anonymous.dispose(); await customerContext.close(); await adminContext.close(); }
});

test("price changes require a new review, unavailable items reject submission and failed email preserves the order", async ({ page, browser }) => {
  await login(page); await page.getByLabel("Cases for Alpha fictional order product", { exact: true }).fill("2"); await review(page);
  await db.productPrice.updateMany({ where: { catalogKey: key(1), pricingTierId: tier1 }, data: { price: "20.99" } });
  await page.getByRole("button", { name: "Submit order request", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("changed before submission"); await expect(page.getByTestId("order-total")).toHaveText("41.98");
  await expect(page).toHaveURL(/\/portal$/); await expect(page.getByRole("heading", { name: "Review order request" })).toBeVisible();
  expect(await db.order.count({ where: { customerId } })).toBe(0);
  await content(products().map((product) => ({ ...product, available: false })));
  await page.getByRole("button", { name: "Submit order request", exact: true }).click(); await expect(page.getByRole("status")).toContainText("no longer available");
  expect(await db.order.count({ where: { customerId } })).toBe(0); await content(products());
  const failFile = join(process.env.TEST_ACCOUNT_MAIL_DIR!, "fail"); await writeFile(failFile, "fictional failure");
  try {
    await page.getByRole("button", { name: "Submit order request", exact: true }).click(); await expect(page).toHaveURL(/\/portal\/confirmation\//);
    const reference = await page.getByTestId("order-reference").innerText();
    expect((await db.order.findUniqueOrThrow({ where: { reference } })).notificationStatus).toBe("FAILED");
    await expect(page.getByRole("status")).not.toContainText("email");
    const adminContext = await browser.newContext(); const adminPage = await adminContext.newPage();
    try { await login(adminPage, "admin"); await adminPage.goto(`/admin/orders/${reference}`); await expect(adminPage.getByText("failed", { exact: true })).toBeVisible(); }
    finally { await adminContext.close(); }
  } finally { await unlink(failFile); }
});

test("200-product quantity entry, review, confirmation and admin views fit phone/tablet/desktop", async ({ page, browser }) => {
  const many = Array.from({ length: 200 }, (_, index) => fictionalProduct({ _id: `order-many-${index}`, catalogKey: key(index + 1), sku: "LONG-SKU-".repeat(10), name: "Fictional ordering product " + "LongName".repeat(20), image: null }));
  await content(many); await db.productPrice.deleteMany({ where: { catalogKey: { in: keys } } });
  await db.productPrice.createMany({ data: many.map((product) => ({ catalogKey: product.catalogKey as string, pricingTierId: tier1, price: "19.99" })) });
  await login(page); await expect(page.locator('input[id^="quantity-"]')).toHaveCount(200);
  await page.locator('input[id^="quantity-"]').first().fill("999"); await page.locator('input[id^="quantity-"]').last().fill("2");
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 }); await page.locator('input[id^="quantity-"]').last().scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const input = await page.locator('input[id^="quantity-"]').last().boundingBox(); const summary = await page.getByLabel("Current order summary").boundingBox();
    expect(input!.y + input!.height).toBeLessThanOrEqual(summary!.y);
    await page.screenshot({ path: `test-results/order-quantities-${width}.png` });
  }
  await review(page); await expect(page.getByTestId("order-total")).toHaveText("20009.99");
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // Full-page captures must start at the top so the fixed public navbar is
    // not composited into the middle of the document at a prior scroll offset.
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: `test-results/order-review-${width}.png`, fullPage: true });
  }
  await page.getByRole("button", { name: "Submit order request", exact: true }).click(); await expect(page).toHaveURL(/\/portal\/confirmation\//);
  const reference = await page.getByTestId("order-reference").innerText();
  const adminContext = await browser.newContext(); const adminPage = await adminContext.newPage();
  try {
    await login(adminPage, "admin");
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `test-results/order-confirmation-${width}.png`, fullPage: true });
      await adminPage.setViewportSize({ width, height: 1000 }); await adminPage.goto("/admin/orders"); expect(await adminPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await adminPage.screenshot({ path: `test-results/order-admin-list-${width}.png`, fullPage: true }); await adminPage.goto(`/admin/orders/${reference}`);
      expect(await adminPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await adminPage.screenshot({ path: `test-results/order-admin-detail-${width}.png`, fullPage: true });
    }
  } finally { await adminContext.close(); }
});
