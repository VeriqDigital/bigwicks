import { expect, test, type Page } from "@playwright/test";
import { readdir, readFile, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash, argon2id } from "argon2";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const email = "browser-m2b@example.test";
const password = "Browser account setup password";
const nextPassword = "Browser account replacement password";
const mailDir = process.env.TEST_ACCOUNT_MAIL_DIR!;
async function cleanup() {
  await db.customer.deleteMany({ where: { user: { email } } }); await db.user.deleteMany({ where: { email } });
}
test.beforeEach(async () => { await cleanup(); await db.loginRateLimit.deleteMany(); });
test.afterAll(async () => { await cleanup(); await db.$disconnect(); });
async function fixture(active = true, withPassword = false) {
  const tier = await db.pricingTier.findUniqueOrThrow({ where: { name: "Tier 1" } });
  return db.user.create({ data: { email, role: "CUSTOMER", active, passwordHash: withPassword ? await hash(password, { type: argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 }) : null,
    customer: { create: { companyName: "Browser setup business", pricingTierId: tier.id, active } } }, include: { customer: true } });
}
async function login(page: Page, target: string, secret: string) {
  await page.goto("/login"); await page.getByLabel("Email", { exact: true }).fill(target); await page.getByLabel("Password", { exact: true }).fill(secret);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}
async function latestLink(subject: string, before: string[]) {
  let link = "";
  await expect.poll(async () => {
    for (const file of await readdir(mailDir)) {
      if (!file.endsWith(".json") || before.includes(file)) continue;
      const mail = JSON.parse(await readFile(join(mailDir, file), "utf8"));
      if (mail.to.includes(email) && mail.subject === subject) link = mail.text.match(/http:\/\/localhost:3107\/\S+/)?.[0] ?? "";
    }
    return !!link;
  }).toBe(true);
  return link;
}
async function setPassword(page: Page, secret: string, button: string) {
  await page.getByLabel("New password", { exact: true }).fill(secret); await page.getByLabel("Confirm password", { exact: true }).fill(secret);
  await page.getByRole("button", { name: button, exact: true }).click();
}

test("admin sends/reissues setup, direct unauthorized invitation is denied, and customer chooses a password once", async ({ page, browser, playwright }) => {
  const user = await fixture();
  await login(page, "admin@example.test", process.env.SEED_ADMIN_PASSWORD!); await expect(page).toHaveURL(/\/admin$/);
  await page.goto(`/admin/customers/${user.customer!.id}`);
  const before = await readdir(mailDir);
  const capture = page.waitForRequest((r) => !!r.headers()["next-action"]);
  await page.getByRole("button", { name: "Send account setup link", exact: true }).click();
  const request = await capture;
  await expect(page.getByRole("status").filter({ hasText: "Setup email accepted" })).toBeVisible();
  const first = await latestLink("Set up your Big Wicks account", before);
  await expect(page.getByRole("button", { name: "Resend setup link", exact: true })).toBeVisible();
  const secondBefore = await readdir(mailDir);
  await page.getByRole("button", { name: "Resend setup link", exact: true }).click();
  await expect(page.getByRole("button", { name: "Resend setup link", exact: true })).toBeEnabled();
  const second = await latestLink("Set up your Big Wicks account", secondBefore);
  expect(second).not.toBe(first);
  const customerContext = await browser.newContext(); const customerPage = await customerContext.newPage();
  const anonymous = await playwright.request.newContext();
  try {
    await login(customerPage, "tier1@example.test", process.env.SEED_TIER1_PASSWORD!); await expect(customerPage).toHaveURL(/\/portal$/);
    const count = await db.accountToken.count({ where: { userId: user.id } });
    for (const context of [anonymous, customerContext.request]) {
      const response = await context.post(request.url(), { data: request.postDataBuffer()!, headers: { "next-action": request.headers()["next-action"], "content-type": request.headers()["content-type"], origin: "http://localhost:3107", accept: "text/x-component" }, maxRedirects: 0 });
      if (context === anonymous) expect(response.headers()["x-action-redirect"] ?? await response.text()).toContain("/login"); else expect(response.status()).toBe(404);
    }
    expect(await db.accountToken.count({ where: { userId: user.id } })).toBe(count);
  } finally { await anonymous.dispose(); await customerContext.close(); }
  const setupContext = await browser.newContext(); const setupPage = await setupContext.newPage();
  try {
    await setupPage.goto(first); await expect(setupPage.getByRole("heading", { name: "Link unavailable" })).toBeVisible();
    const response = await setupPage.goto(second);
    expect(response!.headers()["referrer-policy"]).toBe("no-referrer"); expect(response!.headers()["cache-control"]).toContain("no-store");
    await expect(setupPage.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(setupPage).toHaveURL(/\/setup-account$/);
    // React supplies hidden encrypted action metadata for progressive enhancement.
    // No explicit bearer token, digest, user ID or purpose is a form field.
    const hidden = await setupPage.locator('input[type="hidden"]').evaluateAll((inputs) => inputs.map((input) => ({ name: (input as HTMLInputElement).name, value: (input as HTMLInputElement).value })));
    expect(hidden.every((input) => input.name.startsWith("$ACTION_"))).toBe(true);
    const raw = new URL(second).searchParams.get("token")!;
    const stored = await db.accountToken.findFirstOrThrow({ where: { userId: user.id, consumedAt: null } });
    expect(hidden.some((input) => input.value.includes(raw) || input.value.includes(stored.tokenHash))).toBe(false);
    await setupPage.getByLabel("New password", { exact: true }).fill(password);
    await setupPage.getByLabel("Confirm password", { exact: true }).fill("A different password");
    await setupPage.getByRole("button", { name: "Set password", exact: true }).click(); await expect(setupPage.getByText("Passwords must match.", { exact: true })).toBeVisible();
    for (const width of [390, 768, 1440]) {
      await setupPage.setViewportSize({ width, height: 1000 }); await setupPage.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      expect(await setupPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await setupPage.screenshot({ path: `test-results/setup-account-${width}.png`, fullPage: true });
    }
    await setPassword(setupPage, password, "Set password"); await expect(setupPage).toHaveURL(/\/login\?password=updated$/);
    expect((await setupContext.cookies()).some((cookie) => cookie.name.endsWith("session-token"))).toBe(false);
    await setupPage.goto(second); await expect(setupPage.getByRole("heading", { name: "Link unavailable" })).toBeVisible();
    await login(setupPage, email, password); await expect(setupPage).toHaveURL(/\/portal$/);
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).sessionVersion).toBe(1);
    await page.reload(); await expect(page.getByRole("button", { name: /setup link/i })).toHaveCount(0);
  } finally { await setupContext.close(); }
});

test("reset request is generic, customer resets once, and the prior real session and password are revoked", async ({ page, browser }) => {
  const user = await fixture(true, true);
  const sessionContext = await browser.newContext(); const sessionPage = await sessionContext.newPage();
  try {
    await login(sessionPage, email, password); await expect(sessionPage).toHaveURL(/\/portal$/);
    await page.goto("/login"); await page.getByRole("link", { name: "Forgot password?", exact: true }).click();
    await page.getByLabel("Login email", { exact: true }).fill("missing@example.test"); await page.getByRole("button", { name: "Request reset link" }).click();
    await expect(page.getByRole("status")).toContainText("If an eligible account exists"); const generic = await page.getByRole("status").textContent();
    const before = await readdir(mailDir);
    await page.getByLabel("Login email", { exact: true }).fill(email); await page.getByRole("button", { name: "Request reset link" }).click();
    await expect(page.getByRole("button", { name: "Request reset link" })).toBeEnabled(); expect(await page.getByRole("status").textContent()).toBe(generic);
    const link = await latestLink("Reset your Big Wicks password", before);
    await page.goto(link); await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
    await setPassword(page, nextPassword, "Reset password"); await expect(page).toHaveURL(/\/login\?password=updated$/);
    await sessionPage.goto("/portal"); await expect(sessionPage).toHaveURL(/\/login$/);
    await login(page, email, password); await expect(page.getByRole("status")).toContainText("Unable to sign in");
    await page.goto(link); await expect(page.getByRole("heading", { name: "Link unavailable" })).toBeVisible();
    await login(page, email, nextPassword); await expect(page).toHaveURL(/\/portal$/);
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).sessionVersion).toBe(1);
  } finally { await sessionContext.close(); }
});

test("failed invitation is reported honestly and a fresh setup for a disabled customer never enables access", async ({ page, browser }) => {
  const user = await fixture(false);
  await login(page, "admin@example.test", process.env.SEED_ADMIN_PASSWORD!); await expect(page).toHaveURL(/\/admin$/);
  await page.goto(`/admin/customers/${user.customer!.id}`);
  await writeFile(join(mailDir, "fail"), "test failure");
  try {
    await page.getByRole("button", { name: "Send account setup link", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "could not be confirmed" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Send account setup link", exact: true })).toBeEnabled();
  } finally { await unlink(join(mailDir, "fail")); }
  const before = await readdir(mailDir);
  await page.getByRole("button", { name: "Send account setup link", exact: true }).click();
  const link = await latestLink("Set up your Big Wicks account", before);
  const customerContext = await browser.newContext(); const customerPage = await customerContext.newPage();
  try {
    await customerPage.goto(link); await setPassword(customerPage, password, "Set password"); await expect(customerPage).toHaveURL(/\/login\?password=updated$/);
    await login(customerPage, email, password); await expect(customerPage.getByRole("status")).toContainText("Unable to sign in");
    expect(await db.user.findUniqueOrThrow({ where: { id: user.id }, include: { customer: true } })).toMatchObject({ active: false, sessionVersion: 1, customer: { active: false } });
  } finally { await customerContext.close(); }
});
