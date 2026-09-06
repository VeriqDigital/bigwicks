import { expect, test, type Page, type Request } from "@playwright/test";
import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
test.beforeEach(async () => { await db.loginRateLimit.deleteMany(); });
test.afterAll(async () => {
  await db.customer.deleteMany({ where: { user: { email: { startsWith: "browser-m2-" } } } });
  await db.user.deleteMany({ where: { email: { startsWith: "browser-m2-" } } });
  await db.$disconnect();
});

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

test("staff create and edit customers, handle conflicts, and protect direct mutation requests", async ({ page, browser, playwright }) => {
  await login(page, "admin@example.test", process.env.SEED_ADMIN_PASSWORD!);
  await expect(page).toHaveURL(/\/admin$/);
  await page.getByRole("link", { name: "Manage customers", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/customers$/);
  await page.getByRole("link", { name: "Create customer", exact: true }).click();
  await page.getByLabel("Company name", { exact: true }).fill("Browser Test Wholesale");
  await page.getByLabel("Login email", { exact: true }).fill("tier1@example.test");
  await page.getByLabel("Pricing tier", { exact: true }).selectOption({ label: "Tier 1" });
  await page.getByRole("button", { name: "Create customer", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("already in use");
  await expect(page.getByLabel("Company name", { exact: true })).toHaveValue("Browser Test Wholesale");
  await expect(page.getByLabel("Pricing tier", { exact: true }).locator("option:checked")).toHaveText("Tier 1");

  const requests: Request[] = [];
  page.on("request", (request) => { if (request.headers()["next-action"]) requests.push(request); });
  await page.getByLabel("Login email", { exact: true }).fill("browser-m2-new@example.test");
  await page.getByLabel("Customer number (optional)", { exact: true }).fill("BROWSER-M2");
  await page.getByLabel("Account status", { exact: true }).selectOption("active");
  await page.getByRole("button", { name: "Create customer", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/customers\/c[a-z0-9]+$/);
  const createRequest = requests.at(-1)!;
  await expect(page.getByText("Password not set. This account cannot sign in yet.", { exact: true })).toBeVisible();
  await page.getByLabel("Company name", { exact: true }).fill("Browser Updated Wholesale");
  await page.getByLabel("Pricing tier", { exact: true }).selectOption({ label: "Tier 2" });
  await page.getByRole("button", { name: "Save customer", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Customer details saved." })).toBeVisible();
  const editRequest = requests.at(-1)!;
  await page.getByRole("button", { name: "Disable account", exact: true }).click();
  await expect(page.getByRole("button", { name: "Enable account", exact: true })).toBeVisible();
  const statusRequest = requests.at(-1)!;
  await page.getByRole("button", { name: "Enable account", exact: true }).click();
  await expect(page.getByRole("button", { name: "Disable account", exact: true })).toBeVisible();
  const record = await db.user.findUniqueOrThrow({ where: { email: "browser-m2-new@example.test" }, include: { customer: true } });
  expect(record).toMatchObject({ role: "CUSTOMER", active: true, passwordHash: null, sessionVersion: 2, customer: { active: true, companyName: "Browser Updated Wholesale" } });
  const customerContext = await browser.newContext();
  const customerPage = await customerContext.newPage();
  await login(customerPage, "tier1@example.test", process.env.SEED_TIER1_PASSWORD!);
  await expect(customerPage).toHaveURL(/\/portal$/);
  const anonymous = await playwright.request.newContext();
  try {
    for (const context of [anonymous, customerContext.request]) {
      for (const captured of [createRequest, editRequest, statusRequest]) {
        const response = await context.post(captured.url(), {
          data: captured.postDataBuffer()!,
          headers: { "next-action": captured.headers()["next-action"], "content-type": captured.headers()["content-type"], origin: "http://localhost:3107", accept: "text/x-component" },
          maxRedirects: 0,
        });
        const body = await response.text();
        if (context === anonymous) {
          expect(response.headers()["x-action-redirect"] ?? body).toContain("/login");
        } else {
          expect(response.status()).toBe(404);
        }
        expect(body).not.toContain("Customer details saved.");
      }
    }
    expect(await db.user.findUniqueOrThrow({ where: { id: record.id }, include: { customer: true } })).toEqual(record);
  } finally { await anonymous.dispose(); await customerContext.close(); }

  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/customer-edit-${width}.png`, fullPage: true });
  }
  await page.getByRole("link", { name: "Back to customers", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: "Browser Updated Wholesale" })).toContainText("Tier 2");
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/customer-list-${width}.png`, fullPage: true });
  }
});

test("staff disable revokes a real customer session and re-enable cannot restore its cookie", async ({ page, browser }) => {
  const user = await db.user.findUniqueOrThrow({ where: { email: "tier1@example.test" }, include: { customer: true } });
  const customerContext = await browser.newContext();
  const customerPage = await customerContext.newPage();
  await login(customerPage, user.email, process.env.SEED_TIER1_PASSWORD!);
  await expect(customerPage).toHaveURL(/\/portal$/);
  const oldCookies = await customerContext.cookies();
  await login(page, "admin@example.test", process.env.SEED_ADMIN_PASSWORD!);
  await expect(page).toHaveURL(/\/admin$/);
  try {
    await page.goto(`/admin/customers/${user.customer!.id}`);
    await page.getByRole("button", { name: "Disable account", exact: true }).click();
    await expect(page.getByRole("button", { name: "Enable account", exact: true })).toBeVisible();
    await customerPage.goto("/portal");
    await expect(customerPage).toHaveURL(/\/login$/);
    await login(customerPage, user.email, process.env.SEED_TIER1_PASSWORD!);
    await expect(customerPage.getByRole("status")).toContainText("Unable to sign in");
    await page.getByRole("button", { name: "Enable account", exact: true }).click();
    await expect(page.getByRole("button", { name: "Disable account", exact: true })).toBeVisible();
    await customerContext.addCookies(oldCookies);
    await customerPage.goto("/portal");
    await expect(customerPage).toHaveURL(/\/login$/);
    await login(customerPage, user.email, process.env.SEED_TIER1_PASSWORD!);
    await expect(customerPage).toHaveURL(/\/portal$/);
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).sessionVersion).toBe(user.sessionVersion + 2);
  } finally {
    await db.user.update({ where: { id: user.id }, data: { active: true } });
    await db.customer.update({ where: { userId: user.id }, data: { active: true } });
    await customerContext.close();
  }
});
