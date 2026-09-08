import { afterAll, beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ auth: vi.fn(), mail: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mock.auth }));
vi.mock("@/lib/auth/account-email", () => ({ accountEmailConfig: () => ({}), sendAccountEmail: mock.mail }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw Error(`redirect:${url}`); }, notFound: () => { throw Error("notFound"); } }));
import { getDb } from "@/lib/db";
import { previewCustomerImport, confirmCustomerImport } from "@/lib/admin/customer-import";
import { listInvitationCandidates, previewCustomerInvitations, confirmCustomerInvitations } from "@/lib/admin/customer-invitations";
import { sealCustomerBatch, openCustomerBatch } from "@/lib/admin/customer-batch-token";
import { GET as template } from "@/app/(portal)/admin/customers/import/template/route";
import { fictionalCustomerCsv } from "../fixtures/customer-batch";
import * as creation from "@/lib/admin/customer-create";
import { issueAccountToken, setupReviewSelect, setupStateFingerprint } from "@/lib/auth/account-tokens";
const db = getDb();
let admin: { id: string; sessionVersion: number }; let tierId: string;
const where = { email: { startsWith: "test-m5b" } };
const file = (csv = fictionalCustomerCsv()) => new File([csv], "customers.csv");
async function cleanup() {
  await db.accountToken.deleteMany({ where: { user: where } });
  await db.customer.deleteMany({ where: { user: where } }); await db.user.deleteMany({ where });
  await db.pricingTier.deleteMany({ where: { name: "Fictional Tier 3" } });
}
beforeEach(async () => {
  await cleanup(); await db.loginRateLimit.deleteMany(); mock.mail.mockReset(); mock.mail.mockResolvedValue(undefined);
  admin = await db.user.create({ data: { email: "test-m5b-admin@example.test", active: true, role: "ADMIN" } });
  tierId = (await db.pricingTier.findUniqueOrThrow({ where: { name: "Tier 1" } })).id;
  mock.auth.mockResolvedValue({ user: admin });
});
afterAll(async () => { await cleanup(); await db.$disconnect(); });
async function stage(csv?: string) { const result = await previewCustomerImport(file(csv)); expect(result.status).toBe("preview"); if (result.status !== "preview") throw Error("Missing preview"); return result; }
async function customer(index = 0, change: { active?: boolean; passwordHash?: string; role?: "ADMIN" | "CUSTOMER" } = {}) {
  return db.user.create({ data: { email: `test-m5b-invite-${index}@example.test`, active: true, role: "CUSTOMER", ...change,
    customer: { create: { companyName: `Fictional invite ${index}`, customerNumber: `INV-${index}`, active: change.active ?? true, pricingTierId: tierId } } }, include: { customer: true } });
}
async function inviteStage(ids: string[]) { const result = await previewCustomerInvitations(ids); expect(result.status).toBe("preview"); if (result.status !== "preview") throw Error("Missing invitation preview"); return result; }
it("previews zero mutations, creates 50 passwordless CUSTOMER accounts atomically, supports future tiers, and sends no mail", async () => {
  await db.pricingTier.create({ data: { name: "Fictional Tier 3", rank: 3 } });
  const before = await db.user.count(); const staged = await stage(fictionalCustomerCsv(50, "test-m5b", "Fictional Tier 3"));
  expect(await db.user.count()).toBe(before); expect(await db.accountToken.count({ where: { user: where } })).toBe(0);
  expect((await confirmCustomerImport(staged.token, false)).status).toBe("invalid");
  expect((await confirmCustomerImport(staged.token, true)).status).toBe("success");
  const created = await db.user.findMany({ where: { email: { startsWith: "test-m5b-", endsWith: "@example.test" }, role: "CUSTOMER" }, include: { customer: { include: { pricingTier: true } } } });
  expect(created).toHaveLength(50);
  for (const user of created) { expect(user.passwordHash).toBeNull(); expect(user.sessionVersion).toBe(0); expect(user.active).toBe(user.customer!.active); expect(user.customer!.pricingTier.name).toBe("Fictional Tier 3"); }
  expect(mock.mail).not.toHaveBeenCalled(); expect(await db.accountToken.count({ where: { user: where } })).toBe(0);
  expect((await confirmCustomerImport(staged.token, true)).status).toBe("invalid"); expect(await db.user.count()).toBe(before + 50);
});
it.each(["admin email", "customer email", "customer number", "unknown tier"])("rejects %s without overwriting", async (kind) => {
  const existing = await customer(); const before = await db.user.findMany({ orderBy: { id: "asc" } });
  let csv = fictionalCustomerCsv();
  if (kind === "admin email") csv = csv.replace("test-m5b-0@example.test", "TEST-M5B-ADMIN@example.test");
  if (kind === "customer email") csv = csv.replace("test-m5b-0@example.test", existing.email.toUpperCase());
  if (kind === "customer number") csv = csv.replace(",test-m5b-0,", ",INV-0,");
  if (kind === "unknown tier") csv = csv.replace("Tier 1", "No such tier");
  expect((await previewCustomerImport(file(csv))).status).toBe("invalid"); expect(await db.user.findMany({ orderBy: { id: "asc" } })).toEqual(before);
});
it.each(["tier", "customer", "collision"])("rejects %s drift between preview and confirmation", async (kind) => {
  const existing = await customer(); const staged = await stage();
  if (kind === "tier") await db.pricingTier.update({ where: { id: tierId }, data: { name: "Changed Tier" } });
  if (kind === "customer") await db.customer.update({ where: { id: existing.customer!.id }, data: { companyName: "Changed", updatedAt: existing.customer!.updatedAt } });
  if (kind === "collision") await db.user.create({ data: { email: "test-m5b-0@example.test" } });
  try { expect((await confirmCustomerImport(staged.token, true)).status).toBe("invalid"); }
  finally { if (kind === "tier") await db.pricingTier.update({ where: { id: tierId }, data: { name: "Tier 1" } }); }
});
it("rolls back earlier inserts when a later insert fails", async () => {
  const staged = await stage(fictionalCustomerCsv(2)); const original = creation.insertCustomer; let count = 0;
  const spy = vi.spyOn(creation, "insertCustomer").mockImplementation(async (tx, input) => { if (++count === 2) throw Error("injected insert failure"); return original(tx, input); });
  try { expect((await confirmCustomerImport(staged.token, true)).status).toBe("invalid"); expect(await db.user.count({ where: { email: { in: ["test-m5b-0@example.test", "test-m5b-1@example.test"] } } })).toBe(0); }
  finally { spy.mockRestore(); }
});
it("rejects tampered, expired and wrong-admin previews and concurrent replays are safe", async () => {
  const staged = await stage();
  expect((await confirmCustomerImport(staged.token + "x", true)).status).toBe("invalid");
  const payload = openCustomerBatch(staged.token, admin);
  expect((await confirmCustomerImport(sealCustomerBatch({ ...payload, expiresAt: Date.now() - 1 }), true)).status).toBe("invalid");
  expect((await confirmCustomerImport(sealCustomerBatch({ ...payload, adminId: "other" }), true)).status).toBe("invalid");
  const results = await Promise.all([confirmCustomerImport(staged.token, true), confirmCustomerImport(staged.token, true)]);
  expect(results.filter((r) => r.status === "success")).toHaveLength(1);
});
it("limits inputs before expensive work and rejects forged tier/password columns", async () => {
  for (const csv of [fictionalCustomerCsv().replace("active\n", "active,password\n"), fictionalCustomerCsv().replace("pricingTier", "pricingTierId"), "x".repeat(128 * 1024 + 1)]) expect((await previewCustomerImport(file(csv))).status).toBe("invalid");
  const response = await template(); expect(await response.text()).toBe("companyName,customerNumber,email,pricingTier,active\r\n"); expect(response.headers.get("cache-control")).toContain("no-store");
});
it.each(["anonymous", "customer", "disabled", "revoked"])("denies %s every import/invitation read and action", async (kind) => {
  const user = await customer();
  if (kind === "anonymous") mock.auth.mockResolvedValue(null);
  if (kind === "customer") mock.auth.mockResolvedValue({ user });
  if (kind === "disabled") await db.user.update({ where: { id: admin.id }, data: { active: false } });
  if (kind === "revoked") await db.user.update({ where: { id: admin.id }, data: { sessionVersion: 1 } });
  for (const action of [template, listInvitationCandidates, () => previewCustomerImport(file()), () => confirmCustomerImport("forged", true), () => previewCustomerInvitations([user.customer!.id]), () => confirmCustomerInvitations("forged", true)]) await expect(action()).rejects.toThrow(kind === "customer" ? "notFound" : "redirect:/login");
  expect(mock.mail).not.toHaveBeenCalled();
});
it("offers only active passwordless customers, rejects ineligible and oversized selections", async () => {
  const good = await customer(); const configured = await customer(1, { passwordHash: "fictional hash" }); const disabled = await customer(2, { active: false }); const wrongRole = await customer(3, { role: "ADMIN" });
  const list = await listInvitationCandidates(); expect(list.rows.map((r) => r.id)).toContain(good.customer!.id);
  for (const bad of [configured, disabled, wrongRole]) { expect(list.rows.map((r) => r.id)).not.toContain(bad.customer!.id); expect((await previewCustomerInvitations([bad.customer!.id])).status).toBe("invalid"); }
  for (const ids of [[], [admin.id], [good.customer!.id, good.customer!.id], Array(26).fill(good.customer!.id)]) expect((await previewCustomerInvitations(ids)).status).toBe("invalid");
  expect(mock.mail).not.toHaveBeenCalled();
});
it("requires confirmation, reuses setup tokens, reports partial failure and blocks replay without exposing tokens", async () => {
  const one = await customer(); const two = await customer(1); const staged = await inviteStage([one.customer!.id, two.customer!.id]);
  expect(mock.mail).not.toHaveBeenCalled(); expect(await db.accountToken.count({ where: { user: where } })).toBe(0);
  expect((await confirmCustomerInvitations(staged.token, false)).status).toBe("invalid"); expect(mock.mail).not.toHaveBeenCalled();
  mock.mail.mockResolvedValueOnce(undefined).mockRejectedValueOnce(Error("private provider payload"));
  const result = await confirmCustomerInvitations(staged.token, true); expect(result.status).toBe("success");
  if (result.status !== "success") throw Error("Expected result");
  expect(result.results.map((r) => r.status).sort()).toEqual(["accepted", "not_confirmed"]);
  const tokens = await db.accountToken.findMany({ where: { user: where } }); expect(tokens).toHaveLength(2);
  expect(tokens.filter((t) => t.deliveredAt && !t.consumedAt)).toHaveLength(1); expect(tokens.filter((t) => !t.deliveredAt && t.consumedAt)).toHaveLength(1);
  for (const call of mock.mail.mock.calls) { expect(call[2]).toBe("ACCOUNT_SETUP"); expect(JSON.stringify(result)).not.toContain(call[1]); }
  expect(JSON.stringify(result)).not.toContain("private provider payload");
  expect((await confirmCustomerInvitations(staged.token, true)).status).toBe("invalid"); expect(mock.mail).toHaveBeenCalledTimes(2);
});
it("rejects recipient drift and concurrent invitation confirmations send only once", async () => {
  const user = await customer(); const staged = await inviteStage([user.customer!.id]);
  await db.user.update({ where: { id: user.id }, data: { email: "test-m5b-changed@example.test" } });
  expect((await confirmCustomerInvitations(staged.token, true)).status).toBe("invalid"); expect(mock.mail).not.toHaveBeenCalled();
  const fresh = await inviteStage([user.customer!.id]);
  await Promise.all([confirmCustomerInvitations(fresh.token, true), confirmCustomerInvitations(fresh.token, true)]);
  expect(mock.mail).toHaveBeenCalledTimes(1); expect(mock.mail.mock.calls[0][0]).toBe("test-m5b-changed@example.test");
});
it("rechecks bulk issuance active flags, email and session version under the existing User lock", async () => {
  const user = await customer();
  const review = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: setupReviewSelect });
  const request = { purpose: "ACCOUNT_SETUP", channel: "bulk", expectedState: setupStateFingerprint(review) } as const;
  expect(await issueAccountToken(user.id, { ...request, expectedState: setupStateFingerprint({ ...review, email: "forged@example.test" }) })).toBe("stale");
  expect(await issueAccountToken(user.id, { ...request, expectedState: setupStateFingerprint({ ...review, sessionVersion: 1 }) })).toBe("stale");
  await db.customer.update({ where: { id: user.customer!.id }, data: { active: false } });
  expect(await issueAccountToken(user.id, request)).toBe("stale");
  expect(mock.mail).not.toHaveBeenCalled(); expect(await db.accountToken.count({ where: { userId: user.id } })).toBe(0);
});
