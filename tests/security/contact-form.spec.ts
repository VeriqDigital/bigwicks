import { test, expect, type Page } from "@playwright/test";
import { readdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { createHmac } from "node:crypto";
import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { CONTACT_EMAIL_LIMIT, CONTACT_EMAIL_TIMEOUT_MS } from "../../lib/contact/policy";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const mailDirectory = process.env.TEST_ACCOUNT_MAIL_DIR!;
const configured = Boolean(process.env.CONTACT_FROM_EMAIL);
const draft = {
  name: "Fictional Contact Visitor",
  email: "contact-draft@example.test",
  phone: "5551234567",
  subject: "general",
  message: 'A fictional inquiry with <b>literal markup</b> & "quotes".\nPlease retain the second line.',
};
type Draft = typeof draft;
async function fill(page: Page, values: Draft) {
  for (const [field, value] of Object.entries(values)) {
    const input = page.locator(`#contact-${field}`);
    if (field === "subject") await input.selectOption(value);
    else await input.fill(value);
  }
}
async function expectValues(page: Page, values: Draft | "empty") {
  for (const field of Object.keys(draft) as (keyof Draft)[]) {
    await expect(page.locator(`#contact-${field}`)).toHaveValue(values === "empty" ? "" : values[field]);
  }
}
const mailCount = async () => (await readdir(mailDirectory)).filter(name => name.endsWith(".json")).length;
test.beforeEach(async () => { await db.loginRateLimit.deleteMany(); });
test.afterEach(async () => {
  for (const marker of ["fail", "timeout"]) await rm(join(mailDirectory, marker), { force: true });
});
test.afterAll(async () => { await db.$disconnect(); });

for (const mode of ["validation", "provider", "timeout", "quota"] as const) {
  test(`contact retains all draft fields after ${mode} failure and clears once after a successful retry`, async ({ page }) => {
    test.skip(!configured, "Requires the isolated configured mail pass.");
    const values = { ...draft, phone: mode === "validation" ? "not-a-phone" : draft.phone };
    if (mode === "provider" || mode === "timeout") await writeFile(join(mailDirectory, mode === "provider" ? "fail" : "timeout"), "fictional failure");
    if (mode === "quota") {
      await db.loginRateLimit.create({ data: {
        key: createHmac("sha256", process.env.AUTH_SECRET!).update(`contact:email:${draft.email}`).digest("hex"),
        attempts: CONTACT_EMAIL_LIMIT, expiresAt: new Date(Date.now() + 60_000),
      } });
    }
    await page.goto("/contact");
    const form = page.locator("form");
    const submit = form.getByRole("button", { name: "Send Message", exact: true });
    await fill(page, values);
    const before = await mailCount();
    const started = Date.now();
    await submit.click();
    if (mode === "timeout") {
      await expect(form.getByRole("button", { name: "Sending…" })).toBeDisabled();
      await expectValues(page, values);
    }
    await expect(form.getByRole("alert")).toContainText(
      mode === "validation" ? "correct the highlighted" : mode === "quota" ? "Too many messages" : "could not send",
      { timeout: CONTACT_EMAIL_TIMEOUT_MS + 5000 },
    );
    await expect(submit).toBeEnabled();
    await expectValues(page, values);
    if (mode === "timeout") expect(Date.now() - started).toBeGreaterThanOrEqual(CONTACT_EMAIL_TIMEOUT_MS - 100);
    expect(await mailCount()).toBe(before);
    await expect(form.locator("b")).toHaveCount(0);
    if (mode === "validation") await expect(page.locator("#contact-phone")).toHaveAttribute("aria-invalid", "true");

    // A second error must retain the latest edits, including a changed select.
    const edited = { ...values, name: "Edited Contact Visitor", subject: "visit", message: "An edited fictional inquiry for the next attempt." };
    if (mode === "validation") {
      await fill(page, edited);
      await Promise.all([
        page.waitForResponse(response => Boolean(response.request().headers()["next-action"])),
        submit.click(),
      ]);
      await expect(submit).toBeEnabled();
      await expectValues(page, edited);
    }
    await rm(join(mailDirectory, "fail"), { force: true });
    await rm(join(mailDirectory, "timeout"), { force: true });
    await db.loginRateLimit.deleteMany();
    await fill(page, { ...edited, phone: draft.phone });
    await form.evaluate(element => {
      element.setAttribute("data-reset-count", "0");
      element.addEventListener("reset", () => element.setAttribute("data-reset-count", String(Number(element.getAttribute("data-reset-count")) + 1)));
    });
    await submit.click();
    await expect(form.getByRole("status")).toContainText("message has been sent");
    await expect(submit).toBeEnabled();
    await expectValues(page, "empty");
    await expect(form).toHaveAttribute("data-reset-count", "1");
    await expect(page.locator("#contact-phone")).toHaveAttribute("aria-invalid", "false");
    expect(await mailCount()).toBe(before + 1);

    // A subsequent draft must not be cleared by an effect from the prior success.
    await fill(page, draft);
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expectValues(page, draft);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await expect(form).toHaveAttribute("data-reset-count", "1");
  });
}

test("contact retains its draft when mail configuration is missing", async ({ page }) => {
  test.skip(configured, "Run against the isolated app with CONTACT_FROM_EMAIL omitted.");
  await page.goto("/contact");
  await fill(page, draft);
  const before = await mailCount();
  await page.getByRole("button", { name: "Send Message", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText("Online messaging is temporarily unavailable");
  await expectValues(page, draft);
  expect(await mailCount()).toBe(before);
  expect(await db.loginRateLimit.count()).toBe(0);
});

test("contact preserves validation errors and clears success without JavaScript", async ({ browser }) => {
  test.skip(!configured, "Requires the isolated configured mail pass.");
  const context = await browser.newContext({ javaScriptEnabled: false,
    proxy: { server: "http://127.0.0.1:9", bypass: "localhost,127.0.0.1,[::1]" },
  });
  const page = await context.newPage();
  try {
    await page.goto("http://localhost:3107/contact");
    const values = { ...draft, phone: "not-a-phone" };
    await fill(page, values);
    const before = await mailCount();
    // Native keyboard submission also works while CSS scroll positioning settles.
    await page.getByRole("button", { name: "Send Message", exact: true }).press("Enter");
    await expect(page.locator("form").getByRole("alert")).toContainText("correct the highlighted");
    await expectValues(page, values);
    expect(await mailCount()).toBe(before);
    await page.locator("#contact-phone").fill(draft.phone);
    await page.getByRole("button", { name: "Send Message", exact: true }).press("Enter");
    await expect(page.locator("form").getByRole("status")).toContainText("message has been sent");
    await expectValues(page, "empty");
    expect(await mailCount()).toBe(before + 1);
  } finally { await context.close(); }
});
