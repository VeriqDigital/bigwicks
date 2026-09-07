import { test, expect, type Request } from "@playwright/test";
import { readdir } from "node:fs/promises";
import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
test.afterAll(async () => { await db.$disconnect(); });
test("AUDIT HTTP: public contact replay sends again; mismatched and null Origins block", async ({ page }) => {
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
  for (const origin of ["https://attacker.example.test", "null"]) {
    const response = await page.request.post(captured.url(), { headers: { ...headers, origin }, data: captured.postDataBuffer()!, maxRedirects: 0 });
    expect(response.status()).toBe(500); expect(await count()).toBe(before + 1);
  }
  for (let index = 0; index < 2; index++) {
    const response = await page.request.post(captured.url(), { headers: { ...headers, origin: "http://localhost:3107" }, data: captured.postDataBuffer()!, maxRedirects: 0 });
    expect(response.ok()).toBe(true);
  }
  expect(await count()).toBe(before + 3);
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
