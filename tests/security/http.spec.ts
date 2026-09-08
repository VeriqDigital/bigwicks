import { test, expect, type Request } from "@playwright/test";
import { readdir } from "node:fs/promises";
import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { CONTACT_EMAIL_LIMIT } from "../../lib/contact/policy";
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
test.afterAll(async () => { await db.$disconnect(); });
test("SEC-03 HTTP: public contact replay is bounded; mismatched and null Origins block", async ({ page }, testInfo) => {
  await db.loginRateLimit.deleteMany();
  const count = async () => (await readdir(process.env.TEST_ACCOUNT_MAIL_DIR!)).filter(name => name.endsWith(".json")).length;
  await page.goto("/contact");
  await page.locator("#contact-name").fill("Fictional HTTP Visitor");
  await page.locator("#contact-email").fill("http@example.test");
  await page.locator("#contact-subject").selectOption("general");
  await page.locator("#contact-message").fill("Fictional bounded security audit inquiry.");
  let captured: Request | undefined;
  page.on("request", request => { if (request.headers()["next-action"]) captured = request; });
  const before = await count();
  await page.getByRole("button", { name: "Send Message", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("message has been sent");
  expect(await count()).toBe(before + 1);
  if (!captured) throw Error("Missing contact request");
  const headers = { "next-action": captured.headers()["next-action"], "content-type": captured.headers()["content-type"], accept: "text/x-component" };
  const rowsBeforeOriginChecks = await db.loginRateLimit.findMany({ orderBy: { key: "asc" } });
  for (const origin of ["https://attacker.example.test", "null"]) {
    const response = await page.request.post(captured.url(), { headers: { ...headers, origin }, data: captured.postDataBuffer()!, maxRedirects: 0 });
    expect(response.status()).toBe(500); expect(await count()).toBe(before + 1);
  }
  expect(await db.loginRateLimit.findMany({ orderBy: { key: "asc" } })).toEqual(rowsBeforeOriginChecks);
  // Simultaneous direct action POSTs bypass the disabled-button UX. Forged
  // forwarding/IP headers cannot create a fresh application allowance.
  const responses = await Promise.all(Array.from({ length: CONTACT_EMAIL_LIMIT + 3 }, (_, index) =>
    page.request.post(captured!.url(), { headers: { ...headers, origin: "http://localhost:3107",
      "x-forwarded-for": `192.0.2.${index + 1}`, "x-real-ip": `198.51.100.${index + 1}`, forwarded: `for=203.0.113.${index + 1}`,
    }, data: captured!.postDataBuffer()!, maxRedirects: 0 })));
  const bodies: string[] = [];
  for (const response of responses) {
    expect(response.ok()).toBe(true);
    bodies.push(await response.text());
  }
  expect(bodies.filter(body => body.includes("message has been sent"))).toHaveLength(CONTACT_EMAIL_LIMIT - 1);
  expect(bodies.filter(body => body.includes("Too many messages have been submitted"))).toHaveLength(4);
  expect(await count()).toBe(before + CONTACT_EMAIL_LIMIT);
  // An omitted Origin is different from literal "null" in Next 16.3.4. It can
  // reach the action, but it still cannot bypass the application allowance.
  const missingOrigin = await page.request.post(captured.url(), { headers, data: captured.postDataBuffer()!, maxRedirects: 0 });
  expect(missingOrigin.ok()).toBe(true);
  expect(await missingOrigin.text()).toContain("Too many messages have been submitted");
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/contact");
    await page.locator("#contact-name").fill("Fictional HTTP Visitor");
    await page.locator("#contact-email").fill("http@example.test");
    await page.locator("#contact-subject").selectOption("general");
    await page.locator("#contact-message").fill("Fictional bounded security audit inquiry.");
    await page.getByRole("button", { name: "Send Message", exact: true }).click();
    const alert = page.locator("form").getByRole("alert");
    await expect(alert).toContainText("Too many messages have been submitted");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await alert.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`contact-limited-${width}.png`) });
  }
  expect(await count()).toBe(before + CONTACT_EMAIL_LIMIT);
});
test("AUDIT HTTP: same-tier order ownership, session fields and revoked admin direct reads", async ({ page }) => {
  const owner = await db.user.findUniqueOrThrow({ where: { email: "tier1@example.test" }, include: { customer: true } });
  const reference = "BW-FFFFFFFFFFFFFFFFFFFF";
  await db.order.create({ data: { reference, submissionId: crypto.randomUUID(), reviewHash: "f".repeat(64), customerId: owner.customer!.id, submittedByUserId: owner.id,
    companyNameSnapshot: "AUDIT_ONLY_OWNER_MARKER", emailSnapshot: owner.email, pricingTierIdSnapshot: owner.customer!.pricingTierId, pricingTierNameSnapshot: "Tier 1", total: "0.00" } });
  await db.user.create({ data: { email: "same-tier-http@example.test", active: true, role: "CUSTOMER", passwordHash: owner.passwordHash,
    customer: { create: { companyName: "Fictional same-tier HTTP", active: true, pricingTierId: owner.customer!.pricingTierId } } } });
  await page.goto("/login"); await page.getByLabel("Email", { exact: true }).fill("same-tier-http@example.test");
  await page.getByLabel("Password", { exact: true }).fill(process.env.SEED_TIER1_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click(); await expect(page).toHaveURL(/\/portal$/);
  for (const headers of [{}, { rsc: "1" }] as Record<string, string>[]) {
    const response = await page.request.get(`/portal/confirmation/${reference}`, { headers });
    const body = await response.text();
    expect(body).not.toContain("AUDIT_ONLY_OWNER_MARKER");
    expect([200, 404]).toContain(response.status());
    // A streamed notFound may have already sent HTTP 200. Require its actual
    // denial sentinel, rather than mistaking a status code for authorization.
    if (response.status() === 200) expect(body).toContain("NEXT_HTTP_ERROR_FALLBACK;404");
  }
  const session = await (await page.request.get("/api/auth/session")).json();
  expect(Object.keys(session.user).sort()).toEqual(["id", "sessionVersion"]);
  await page.getByRole("button", { name: "Sign out", exact: true }).click(); await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email", { exact: true }).fill("admin@example.test"); await page.getByLabel("Password", { exact: true }).fill(process.env.SEED_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click(); await expect(page).toHaveURL(/\/admin$/);
  await db.user.update({ where: { email: "admin@example.test" }, data: { active: false, sessionVersion: { increment: 1 } } });
  for (const route of ["/admin/customers/import/template", "/admin/pricing/export", `/admin/orders/${reference}`]) {
    const response = await page.request.get(route, { maxRedirects: 0 }); expect([303, 307]).toContain(response.status());
    expect(await response.text()).not.toContain("AUDIT_ONLY_OWNER_MARKER");
  }
});
