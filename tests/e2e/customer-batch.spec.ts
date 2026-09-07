import { expect, test, type Page, type Request, type Browser, type APIRequest } from "@playwright/test";
import { readdir, readFile, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { fictionalCustomerCsv } from "../fixtures/customer-batch";
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const where = { email: { startsWith: "browser-m5b" } };
const mailDir = process.env.TEST_ACCOUNT_MAIL_DIR!;
async function cleanup() {
  await db.accountToken.deleteMany({ where: { user: where } }); await db.customer.deleteMany({ where: { user: where } }); await db.user.deleteMany({ where });
  await db.pricingTier.deleteMany({ where: { name: "Browser Tier 3" } });
}
test.beforeEach(async () => { await cleanup(); await db.loginRateLimit.deleteMany(); });
test.afterAll(async () => { await cleanup(); await db.$disconnect(); });
async function login(page: Page, email = "admin@example.test", password = process.env.SEED_ADMIN_PASSWORD!) {
  await page.goto("/login"); await page.getByLabel("Email", { exact: true }).fill(email); await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click(); await expect(page).toHaveURL(email === "admin@example.test" ? /\/admin$/ : /\/portal$/);
}
async function responsive(page: Page, name: string) {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 }); await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/${name}-${width}.png`, fullPage: true });
  }
}
async function unauthorized(browser: Browser, requestApi: APIRequest, requests: Request[], hasUpload = false) {
  const context = await browser.newContext(); const customerPage = await context.newPage(); const anonymous = await requestApi.newContext();
  try {
    await login(customerPage, "tier1@example.test", process.env.SEED_TIER1_PASSWORD!);
    for (const client of [anonymous, context.request]) {
      for (const route of ["/admin/customers/import", "/admin/customers/import/template", "/admin/customers/invitations"]) {
        const response = await client.get(`http://localhost:3107${route}`, { maxRedirects: 0 });
        if (client === anonymous) expect(response.headers().location).toContain("/login"); else expect(response.status()).toBe(404);
      }
      for (const [index, request] of requests.entries()) {
        // Chromium omits file bytes from captured post data; reconstruct the upload.
        const upload = hasUpload && index === 0;
        const body = upload ? { multipart: { "0": JSON.stringify([null, "$K1"]), "_1_csv": { name: "fictional.csv", mimeType: "text/csv", buffer: Buffer.from(fictionalCustomerCsv()) } } } : { data: request.postDataBuffer()! };
        const response = await client.post(request.url(), { ...body, headers: { "next-action": request.headers()["next-action"], ...(!upload ? { "content-type": request.headers()["content-type"] } : {}), origin: "http://localhost:3107", accept: "text/x-component" }, maxRedirects: 0 });
        if (client === anonymous) expect(response.headers()["x-action-redirect"] ?? await response.text()).toContain("/login"); else expect(response.status()).toBe(404);
      }
    }
  } finally { await context.close(); await anonymous.dispose(); }
}
test("admin previews and imports 50 fictional customers without invitations, with dynamic tiers and protected actions", async ({ page, browser, playwright }) => {
  test.setTimeout(60000);
  const tier = await db.pricingTier.create({ data: { name: "Browser Tier 3", rank: 3 } });
  await login(page); await page.goto("/admin/customers"); await page.getByRole("link", { name: "Import customers", exact: true }).click();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  const template = await page.request.get("/admin/customers/import/template"); expect(await template.text()).toContain("companyName,customerNumber,email,pricingTier,active");
  const before = await readdir(mailDir); const requests: Request[] = [];
  page.on("request", (r) => { if (r.headers()["next-action"]) requests.push(r); });
  await page.getByLabel("Customer CSV file").setInputFiles({ name: "fictional.csv", mimeType: "text/csv", buffer: Buffer.from(fictionalCustomerCsv(50, "browser-m5b", "Browser Tier 3")) });
  await page.getByRole("button", { name: "Validate and preview", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Review customer import" })).toBeVisible();
  expect(await db.user.count({ where })).toBe(0); expect(await readdir(mailDir)).toEqual(before);
  await responsive(page, "customer-import-preview");
  await page.getByLabel("Create these customer accounts without sending invitations.").check();
  await page.getByRole("button", { name: "Confirm customer import", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("50 customer accounts created. No invitations were sent.");
  const users = await db.user.findMany({ where, include: { customer: true } }); expect(users).toHaveLength(50);
  for (const user of users) { expect(user.role).toBe("CUSTOMER"); expect(user.passwordHash).toBeNull(); expect(user.active).toBe(user.customer!.active); expect(user.customer!.pricingTierId).toBe(tier.id); }
  expect(await readdir(mailDir)).toEqual(before); expect(await db.accountToken.count({ where: { user: where } })).toBe(0);
  await unauthorized(browser, playwright.request, requests, true); expect(await db.user.count({ where })).toBe(50);
  await page.getByRole("link", { name: "Return to customer management" }).click();
  await expect(page.getByRole("row").filter({ hasText: "browser-m5b-0@example.test" })).toBeVisible();
});
test("bulk invitations require visible selection and confirmation, use existing setup flow and report retryable failure", async ({ page, browser, playwright }) => {
  test.setTimeout(60000);
  const tier = await db.pricingTier.findUniqueOrThrow({ where: { name: "Tier 1" } });
  for (const [i, active, passwordHash] of [[0, true, null], [1, true, null], [2, false, null], [3, true, "configured"]] as const) await db.user.create({ data: {
    email: `browser-m5b-${i}@example.test`, role: "CUSTOMER", active, passwordHash,
    customer: { create: { companyName: `Fictional invite ${i}`, customerNumber: `B5-${i}`, active, pricingTierId: tier.id } },
  } });
  await login(page); await page.goto("/admin/customers/invitations");
  expect(await page.locator('input[type="checkbox"]:checked').count()).toBe(0);
  await expect(page.getByText("browser-m5b-2@example.test", { exact: false })).toHaveCount(0);
  await expect(page.getByText("browser-m5b-3@example.test", { exact: false })).toHaveCount(0);
  const before = await readdir(mailDir); const requests: Request[] = [];
  page.on("request", (r) => { if (r.headers()["next-action"]) requests.push(r); });
  await page.getByRole("checkbox", { name: /Fictional invite 0/ }).check();
  await page.getByRole("checkbox", { name: /Fictional invite 1/ }).check();
  await page.getByRole("button", { name: "Review selected invitations" }).click();
  await expect(page.getByRole("heading", { name: "Review invitation recipients" })).toBeVisible();
  expect(await readdir(mailDir)).toEqual(before); expect(await db.accountToken.count({ where: { user: where } })).toBe(0);
  await responsive(page, "customer-invitation-preview");
  await page.getByLabel("Send setup invitations to these recipients.").check();
  await page.getByRole("button", { name: "Confirm and send invitations" }).click();
  await expect(page.getByRole("status")).toContainText("2 setup emails accepted for delivery; 0 not confirmed");
  const messages = (await readdir(mailDir)).filter((f) => f.endsWith(".json") && !before.includes(f)); expect(messages).toHaveLength(2);
  for (const file of messages) {
    const mail = JSON.parse(await readFile(join(mailDir, file), "utf8"));
    const raw = mail.text.match(/token=([a-f0-9]{64})/)[1]; expect(await page.content()).not.toContain(raw);
  }
  await unauthorized(browser, playwright.request, requests); expect(await db.accountToken.count({ where: { user: where } })).toBe(2);
  await page.reload(); await expect(page.getByText("Current setup link accepted; resend replaces it")).toHaveCount(2);
  await page.getByRole("checkbox", { name: /Fictional invite 0/ }).check(); await page.getByRole("button", { name: "Review selected invitations" }).click();
  await page.getByLabel("Send setup invitations to these recipients.").check();
  await writeFile(join(mailDir, "fail"), "fictional failure");
  try {
    await page.getByRole("button", { name: "Confirm and send invitations" }).click();
    await expect(page.getByRole("status")).toContainText("0 setup emails accepted for delivery; 1 not confirmed");
  } finally { await unlink(join(mailDir, "fail")); }
  await page.reload(); await page.getByRole("checkbox", { name: /Fictional invite 0/ }).check(); await page.getByRole("button", { name: "Review selected invitations" }).click();
  await page.getByLabel("Send setup invitations to these recipients.").check(); await page.getByRole("button", { name: "Confirm and send invitations" }).click();
  await expect(page.getByRole("status")).toContainText("1 setup emails accepted for delivery; 0 not confirmed");
});
