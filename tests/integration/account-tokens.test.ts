import { afterAll, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), send: vi.fn(), jobs: [] as (() => Promise<void>)[] }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/auth/account-email", () => ({ accountEmailConfig: () => ({}), sendAccountEmail: mocks.send }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/server", () => ({ after: (job: () => Promise<void>) => mocks.jobs.push(job) }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); }, notFound: () => { throw new Error("notFound"); } }));

import { getDb } from "@/lib/db";
import { accountTokenUsable, consumeAccountToken, issueAccountToken, setupReviewSelect, setupStateFingerprint, tokenDigest } from "@/lib/auth/account-tokens";
import { sendSetupLink } from "@/app/(portal)/admin/customers/invite-action";
import { requestPasswordReset } from "@/app/(portal)/forgot-password/actions";
import { editCustomer, setCustomerStatus } from "@/app/(portal)/admin/customers/actions";
import { hasPendingSetup } from "@/lib/admin/customers";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { authorizeCredentials } from "@/lib/auth/credentials";
import { resolvePrincipal } from "@/lib/auth/principal";

const db = getDb();
async function issue(userId: string, purpose: "ACCOUNT_SETUP" | "PASSWORD_RESET") {
  if (purpose === "PASSWORD_RESET") return issueAccountToken(userId, { purpose });
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: setupReviewSelect });
  const actor = await db.user.findUniqueOrThrow({ where: { email: "admin@example.test" } });
  return issueAccountToken(userId, { purpose, actor, channel: "individual", expectedState: setupStateFingerprint(user) });
}
const email = "test-m2b-account@example.test";
const password = "New isolated account password";
const oldPassword = "Old isolated account password";
let tier: string;
function form(fields: Record<string, string>) { const f = new FormData(); for (const [k, v] of Object.entries(fields)) f.set(k, v); return f; }
function choice(extra: Record<string, string> = {}) { return form({ password, confirmation: password, ...extra }); }
function digest() { return tokenDigest(mocks.send.mock.calls.at(-1)![1])!; }
async function jobs() { for (const job of mocks.jobs.splice(0)) await job(); }
async function fixture(active = true, withPassword = false) {
  return db.user.create({ data: { email, role: "CUSTOMER", active, passwordHash: withPassword ? await hashPassword(oldPassword) : null,
    customer: { create: { companyName: "Isolated account business", pricingTierId: tier, active } } }, include: { customer: true } });
}
async function cleanup() {
  const where = { email: { startsWith: "test-m2b-" } };
  await db.customer.deleteMany({ where: { user: where } }); await db.user.deleteMany({ where });
}
beforeEach(async () => {
  await cleanup(); await db.loginRateLimit.deleteMany();
  mocks.jobs.length = 0; mocks.send.mockReset().mockResolvedValue(undefined);
  const admin = await db.user.findUniqueOrThrow({ where: { email: "admin@example.test" } });
  mocks.auth.mockResolvedValue({ user: { id: admin.id, sessionVersion: admin.sessionVersion } });
  tier = (await db.pricingTier.findUniqueOrThrow({ where: { name: "Tier 1" } })).id;
});
afterAll(async () => { await cleanup(); await db.$disconnect(); });

it("admin invites a passwordless customer, stores only a digest and reliably reports setup pending", async () => {
  const user = await fixture();
  const result = await sendSetupLink({}, form({ customerId: user.customer!.id, userId: "forged", role: "ADMIN" }));
  expect(result.success).toBe(true);
  expect(mocks.send.mock.calls[0][0]).toBe(email);
  const raw = mocks.send.mock.calls[0][1];
  const token = await db.accountToken.findFirstOrThrow({ where: { userId: user.id } });
  expect(token.tokenHash).toBe(tokenDigest(raw));
  expect(JSON.stringify(token)).not.toContain(raw);
  expect(token.deliveredAt).not.toBeNull();
  expect(token.expiresAt.getTime() - token.createdAt.getTime()).toBeGreaterThan(23 * 60 * 60 * 1000);
  expect(await hasPendingSetup(user.customer!.id)).toBe(true);
  expect(JSON.stringify(result)).not.toContain(raw);
});
it.each(["anonymous", "customer"])("blocks %s direct invitation actions", async (caller) => {
  const user = await fixture(); mocks.auth.mockResolvedValue(caller === "anonymous" ? null : { user: { id: user.id, sessionVersion: 0 } });
  await expect(sendSetupLink({}, form({ customerId: user.customer!.id }))).rejects.toThrow(caller === "anonymous" ? "redirect:/login" : "notFound");
  expect(await db.accountToken.count({ where: { userId: user.id } })).toBe(0); expect(mocks.send).not.toHaveBeenCalled();
});
it("cannot invite ADMIN or already-set-up accounts through customer actions or token issuance", async () => {
  const admin = await db.user.findUniqueOrThrow({ where: { email: "admin@example.test" } });
  expect((await sendSetupLink({}, form({ customerId: admin.id }))).success).not.toBe(true);
  expect(await issue(admin.id, "ACCOUNT_SETUP")).toBe("ineligible");
  expect(await issue(admin.id, "PASSWORD_RESET")).toBe("ineligible");
  const user = await fixture(true, true);
  expect((await sendSetupLink({}, form({ customerId: user.customer!.id }))).success).not.toBe(true);
  expect(mocks.send).not.toHaveBeenCalled();
});
it("reissue supersedes previous setup links and a failed email never leaves a usable/pending link", async () => {
  const user = await fixture();
  await sendSetupLink({}, form({ customerId: user.customer!.id })); const first = digest();
  await sendSetupLink({}, form({ customerId: user.customer!.id })); const second = digest();
  expect(await accountTokenUsable(first, "ACCOUNT_SETUP")).toBe(false);
  expect((await consumeAccountToken(first, "ACCOUNT_SETUP", choice())).success).not.toBe(true);
  expect(await accountTokenUsable(second, "ACCOUNT_SETUP")).toBe(true);
  mocks.send.mockRejectedValue(new Error("provider failure"));
  expect((await sendSetupLink({}, form({ customerId: user.customer!.id }))).success).not.toBe(true);
  expect(await accountTokenUsable(second, "ACCOUNT_SETUP")).toBe(false);
  expect(await hasPendingSetup(user.customer!.id)).toBe(false);
  expect(await accountTokenUsable(digest(), "ACCOUNT_SETUP")).toBe(false);
});
it.each([true, false])("sets an Argon2id password once, revokes sessions and preserves active=%s", async (active) => {
  const user = await fixture(active); await issue(user.id, "ACCOUNT_SETUP"); const hash = digest();
  const admin = await db.user.findUniqueOrThrow({ where: { email: "admin@example.test" } });
  expect((await consumeAccountToken(hash, "ACCOUNT_SETUP", choice({ userId: admin.id, email: admin.email, role: "ADMIN", active: "true", purpose: "PASSWORD_RESET", expiresAt: "2099-01-01" }))).success).toBe(true);
  const current = await db.user.findUniqueOrThrow({ where: { id: user.id }, include: { customer: true } });
  expect(current).toMatchObject({ role: "CUSTOMER", active, sessionVersion: 1, customer: { active } });
  expect(current.passwordHash).toMatch(/^\$argon2id\$/); expect(await verifyPassword(password, current.passwordHash!)).toBe(true);
  expect(await db.user.findUniqueOrThrow({ where: { id: admin.id } })).toEqual(admin);
  expect((await consumeAccountToken(hash, "ACCOUNT_SETUP", choice())).success).not.toBe(true);
  expect(await authorizeCredentials({ email, password })).toEqual(active ? { id: user.id, sessionVersion: 1 } : null);
});
it.each(["invalid", "expired", "consumed", "undelivered", "wrong-purpose", "version-changed"])("rejects %s tokens at read and consumption", async (mode) => {
  const user = await fixture(); await issue(user.id, "ACCOUNT_SETUP"); let hash = digest();
  if (mode === "invalid") hash = "b".repeat(64);
  if (mode === "expired") await db.accountToken.updateMany({ where: { userId: user.id }, data: { expiresAt: new Date(0) } });
  if (mode === "consumed") await db.accountToken.updateMany({ where: { userId: user.id }, data: { consumedAt: new Date() } });
  if (mode === "undelivered") await db.accountToken.updateMany({ where: { userId: user.id }, data: { deliveredAt: null } });
  if (mode === "version-changed") await db.user.update({ where: { id: user.id }, data: { sessionVersion: 1 } });
  const purpose = mode === "wrong-purpose" ? "PASSWORD_RESET" : "ACCOUNT_SETUP";
  expect(await accountTokenUsable(hash, purpose)).toBe(false);
  expect((await consumeAccountToken(hash, purpose, choice({ purpose: "ACCOUNT_SETUP", expiresAt: "2099-01-01", consumedAt: "" }))).success).not.toBe(true);
  expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash).toBeNull();
});
it("validates policy/confirmation without consuming the link", async () => {
  const user = await fixture(); await issue(user.id, "ACCOUNT_SETUP"); const hash = digest();
  for (const fields of [{ password: "short", confirmation: "short" }, { password, confirmation: "mismatch" }, { password: "x".repeat(129), confirmation: "x".repeat(129) }]) {
    expect((await consumeAccountToken(hash, "ACCOUNT_SETUP", choice(fields))).errors).toBeDefined();
    expect(await accountTokenUsable(hash, "ACCOUNT_SETUP")).toBe(true);
  }
});
it("only one concurrent consumption wins and simultaneous reissues leave one live link", async () => {
  const user = await fixture();
  await Promise.all([issue(user.id, "ACCOUNT_SETUP"), issue(user.id, "ACCOUNT_SETUP")]);
  const live = await db.accountToken.findMany({ where: { userId: user.id, consumedAt: null, deliveredAt: { not: null } } });
  expect(live).toHaveLength(1);
  const results = await Promise.all([consumeAccountToken(live[0].tokenHash, "ACCOUNT_SETUP", choice()), consumeAccountToken(live[0].tokenHash, "ACCOUNT_SETUP", choice())]);
  expect(results.filter((r) => r.success)).toHaveLength(1);
  expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).sessionVersion).toBe(1);
});
it("rolls back token consumption when the password/session update fails", async () => {
  const user = await fixture();
  // Force a real PostgreSQL write error on version increment, after consumption.
  await db.user.update({ where: { id: user.id }, data: { sessionVersion: 2147483647 } });
  await issue(user.id, "ACCOUNT_SETUP"); const hash = digest();
  expect((await consumeAccountToken(hash, "ACCOUNT_SETUP", choice())).success).not.toBe(true);
  expect(await accountTokenUsable(hash, "ACCOUNT_SETUP")).toBe(true);
  expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash).toBeNull();
});
it("reset request returns the same response before eligibility lookup for existing, absent, admin and passwordless accounts", async () => {
  await fixture();
  const replies: { message: string }[] = [];
  for (const target of [email, "missing@example.test", "admin@example.test", "tier1@example.test"]) replies.push(await requestPasswordReset({}, form({ email: target })));
  expect(replies.every((r) => JSON.stringify(r) === JSON.stringify(replies[0]))).toBe(true);
  expect(mocks.send).not.toHaveBeenCalled();
  await jobs();
  expect(mocks.send).toHaveBeenCalledTimes(1); expect(mocks.send.mock.calls[0][0]).toBe("tier1@example.test");
  await db.accountToken.deleteMany({ where: { user: { email: "tier1@example.test" } } });
});
it("database rate limiting bounds reset email requests across concurrent calls with identical responses", async () => {
  await fixture(true, true);
  const results = await Promise.all(Array.from({ length: 8 }, () => requestPasswordReset({}, form({ email: ` ${email.toUpperCase()} ` }))));
  expect(new Set(results.map((r) => r.message)).size).toBe(1); expect(mocks.jobs).toHaveLength(3);
  await jobs(); expect(mocks.send).toHaveBeenCalledTimes(3);
  const global = await Promise.all(Array.from({ length: 40 }, (_, i) => requestPasswordReset({}, form({ email: `unknown-${i}@example.test` }))));
  expect(global.every((r) => r.message === results[0].message)).toBe(true); expect(mocks.jobs).toHaveLength(22);
});
it.each([true, false])("reset replaces password, revokes all sessions, and preserves active=%s", async (active) => {
  const user = await fixture(active, true);
  await requestPasswordReset({}, form({ email })); await jobs(); const first = digest();
  await requestPasswordReset({}, form({ email })); await jobs(); const second = digest();
  expect(await accountTokenUsable(first, "PASSWORD_RESET")).toBe(false);
  expect((await consumeAccountToken(second, "PASSWORD_RESET", choice())).success).toBe(true);
  const current = await db.user.findUniqueOrThrow({ where: { id: user.id }, include: { customer: true } });
  expect(current).toMatchObject({ active, sessionVersion: 1, customer: { active } });
  expect(await resolvePrincipal(user.id, 0)).toBeNull();
  expect(await authorizeCredentials({ email, password: oldPassword })).toBeNull();
  expect(await authorizeCredentials({ email, password })).toEqual(active ? { id: user.id, sessionVersion: 1 } : null);
  expect((await consumeAccountToken(second, "PASSWORD_RESET", choice())).success).not.toBe(true);
  expect(await db.accountToken.count({ where: { userId: user.id, consumedAt: null } })).toBe(0);
});
it.each(["ACCOUNT_SETUP", "PASSWORD_RESET"] as const)("email and access edits invalidate %s links; ordinary edits preserve them", async (purpose) => {
  const user = await fixture(true, purpose === "PASSWORD_RESET");
  await issue(user.id, purpose); const first = digest();
  const fields = { customerId: user.customer!.id, email, companyName: "Changed business", customerNumber: "", pricingTierId: tier };
  expect((await editCustomer({}, form(fields))).success).toBe(true); expect(await accountTokenUsable(first, purpose)).toBe(true);
  expect((await editCustomer({}, form({ ...fields, email: "test-m2b-changed@example.test" }))).success).toBe(true);
  expect(await accountTokenUsable(first, purpose)).toBe(false);
  await issue(user.id, purpose); const second = digest();
  await setCustomerStatus({}, form({ customerId: user.customer!.id, status: "disabled" }));
  await setCustomerStatus({}, form({ customerId: user.customer!.id, status: "active" }));
  expect(await accountTokenUsable(second, purpose)).toBe(false);
});
it("email change during delivery makes the sent link unusable and does not report success", async () => {
  const user = await fixture();
  mocks.send.mockImplementationOnce(async () => {
    await editCustomer({}, form({ customerId: user.customer!.id, email: "test-m2b-changed@example.test", companyName: "Changed", customerNumber: "", pricingTierId: tier }));
  });
  expect((await sendSetupLink({}, form({ customerId: user.customer!.id }))).success).not.toBe(true);
  expect(await accountTokenUsable(digest(), "ACCOUNT_SETUP")).toBe(false);
});
