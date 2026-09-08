// SEC-03, REL-01 and SEC-04 reproductions retained as remediation regressions.
import { beforeEach, afterAll, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ auth: vi.fn(), mail: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mock.auth }));
vi.mock("@/lib/auth/account-email", () => ({ accountEmailConfig: () => ({}), sendAccountEmail: mock.mail }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw Error(`redirect:${url}`); }, notFound: () => { throw Error("notFound"); } }));
import { getDb } from "@/lib/db";
import { previewCustomerInvitations, confirmCustomerInvitations } from "@/lib/admin/customer-invitations";
import * as tokenService from "@/lib/auth/account-tokens";
import { editCustomer } from "@/app/(portal)/admin/customers/actions";
import { sendSetupLink } from "@/app/(portal)/admin/customers/invite-action";
import { submitContactForm } from "@/app/contact/actions";
import { contactSubjects } from "@/app/contact/contact-form-state";
import { CONTACT_EMAIL_LIMIT } from "@/lib/contact/policy";
import { getCustomerConfirmation } from "@/lib/orders/reads";
const db = getDb();
let admin: { id: string; sessionVersion: number };
let tierId: string;
const where = { email: { startsWith: "security-audit-" } };
async function cleanup() {
  await db.orderItem.deleteMany({ where: { order: { submittedByUser: where } } });
  await db.order.deleteMany({ where: { submittedByUser: where } });
  await db.accountToken.deleteMany({ where: { user: where } });
  await db.customer.deleteMany({ where: { user: where } });
  await db.user.deleteMany({ where });
}
beforeEach(async () => {
  await cleanup(); await db.loginRateLimit.deleteMany(); mock.mail.mockReset(); mock.mail.mockResolvedValue(undefined);
  admin = await db.user.create({ data: { email: "security-audit-admin@example.test", role: "ADMIN", active: true } });
  tierId = (await db.pricingTier.findUniqueOrThrow({ where: { name: "Tier 1" } })).id;
  mock.auth.mockResolvedValue({ user: admin });
});
afterAll(async () => { await cleanup(); await db.$disconnect(); });
async function customer(suffix: string) {
  return db.user.create({ data: { email: `security-audit-${suffix}@example.test`, role: "CUSTOMER", active: true,
    customer: { create: { companyName: `Fictional ${suffix}`, active: true, pricingTierId: tierId } } }, include: { customer: true } });
}
it("SEC-03 regression: six identical public contact submissions stop at the allowance", async () => {
  const transport = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id: "fictional" }));
  try {
    const form = new FormData();
    for (const [key, value] of Object.entries({ name: "Fictional Visitor", email: "visitor@example.test", subject: contactSubjects[0].value, message: "Fictional bounded security audit inquiry.", company: "" })) form.set(key, value);
    for (let count = 0; count < 6; count++) expect((await submitContactForm({ status: "idle", message: "" }, form)).status).toBe(count < CONTACT_EMAIL_LIMIT ? "success" : "error");
    expect(transport).toHaveBeenCalledTimes(CONTACT_EMAIL_LIMIT);
    expect(new Set(transport.mock.calls.map(([, options]) => (options!.headers as Record<string, string>)["Idempotency-Key"])).size).toBe(CONTACT_EMAIL_LIMIT);
    expect(transport.mock.calls.every(([, options]) => options?.signal instanceof AbortSignal)).toBe(true);
  } finally { transport.mockRestore(); }
});
it("REL-01 regression: distinct overlapping invitation previews claim one unchanged recipient once", async () => {
  const user = await customer("overlap");
  const one = await previewCustomerInvitations([user.customer!.id]);
  const two = await previewCustomerInvitations([user.customer!.id]);
  if (one.status !== "preview" || two.status !== "preview") throw Error("Missing previews");
  expect(one.token).not.toBe(two.token);
  let arrived = 0; let release!: () => void;
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const original = tokenService.issueAccountToken;
  const spy = vi.spyOn(tokenService, "issueAccountToken").mockImplementation(async (...args) => {
    if (++arrived === 2) release();
    await barrier; return original(...args);
  });
  try {
    const results = await Promise.all([confirmCustomerInvitations(one.token, true), confirmCustomerInvitations(two.token, true)]);
    expect(results.flatMap((r) => r.status === "success" ? r.results.map((row) => row.status) : []).sort()).toEqual(["accepted", "stale"]);
    expect(arrived).toBe(2); expect(mock.mail).toHaveBeenCalledTimes(1);
    expect(await db.accountToken.count({ where: { userId: user.id } })).toBe(1);
    expect(await tokenService.accountTokenUsable(tokenService.tokenDigest(mock.mail.mock.calls[0][1])!, "ACCOUNT_SETUP")).toBe(true);
    expect(await db.accountToken.count({ where: { userId: user.id, consumedAt: null, deliveredAt: { not: null } } })).toBe(1);
  } finally { release(); spy.mockRestore(); }
});
it("SEC-04 regression: revocation after the individual action guard prevents its SQL mutation", async () => {
  const user = await customer("revocation");
  const original = db.$transaction.bind(db);
  const spy = vi.spyOn(db, "$transaction").mockImplementationOnce(async (...args: unknown[]) => {
    await db.user.update({ where: { id: admin.id }, data: { active: false, sessionVersion: { increment: 1 } } });
    return Reflect.apply(original, db, args);
  });
  const form = new FormData();
  for (const [key, value] of Object.entries({ customerId: user.customer!.id, companyName: "Changed after admin revocation", email: user.email, customerNumber: "", pricingTierId: tierId })) form.set(key, value);
  try {
    expect((await editCustomer({}, form)).success).not.toBe(true);
    expect((await db.customer.findUniqueOrThrow({ where: { id: user.customer!.id } })).companyName).toBe("Fictional revocation");
  } finally { spy.mockRestore(); }
});
it("AUDIT: a different customer in the same tier cannot read an owner's confirmation", async () => {
  const owner = await customer("owner"); const other = await customer("same-tier");
  const reference = "BW-1234567890ABCDEF1234";
  await db.order.create({ data: { reference, submissionId: crypto.randomUUID(), reviewHash: "f".repeat(64), customerId: owner.customer!.id,
    submittedByUserId: owner.id, companyNameSnapshot: "Fictional PRIVATE OWNER", emailSnapshot: owner.email,
    pricingTierIdSnapshot: tierId, pricingTierNameSnapshot: "Tier 1", total: "0.00" } });
  mock.auth.mockResolvedValue({ user: other });
  await expect(getCustomerConfirmation(reference)).rejects.toThrow("notFound");
  mock.auth.mockResolvedValue({ user: owner });
  expect((await getCustomerConfirmation(reference)).companyName).toBe("Fictional PRIVATE OWNER");
});
it("REL-01 regression: overlapping individual and bulk invitations share one state claim and quota", async () => {
  const user = await customer("individual-overlap");
  const staged = await previewCustomerInvitations([user.customer!.id]);
  if (staged.status !== "preview") throw Error("Missing preview");
  let arrived = 0; let release!: () => void;
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const original = tokenService.issueAccountToken;
  const spy = vi.spyOn(tokenService, "issueAccountToken").mockImplementation(async (...args) => {
    if (++arrived === 2) release(); await barrier; return original(...args);
  });
  const form = new FormData(); form.set("customerId", user.customer!.id);
  try {
    const [bulk, individual] = await Promise.all([confirmCustomerInvitations(staged.token, true), sendSetupLink({}, form)]);
    if (bulk.status !== "success") throw Error("Missing bulk results");
    expect([bulk.results[0].status, individual.success ? "accepted" : "stale"].sort()).toEqual(["accepted", "stale"]);
    if (!individual.success) expect(individual.message).toContain("No setup email was attempted");
    expect(mock.mail).toHaveBeenCalledTimes(1);
    expect(await db.accountToken.count({ where: { userId: user.id } })).toBe(1);
    expect(await tokenService.accountTokenUsable(tokenService.tokenDigest(mock.mail.mock.calls[0][1])!, "ACCOUNT_SETUP")).toBe(true);
    expect(await db.accountToken.count({ where: { userId: user.id, consumedAt: null, deliveredAt: { not: null } } })).toBe(1);
  } finally { release(); spy.mockRestore(); }
  await sendSetupLink({}, form); await sendSetupLink({}, form); await sendSetupLink({}, form);
  expect(mock.mail).toHaveBeenCalledTimes(3); // Fourth is denied by the SHARED quota.
});
it("SEC-04 regression: bulk admin revocation before its claim blocks issuance", async () => {
  const user = await customer("bulk-revocation");
  const staged = await previewCustomerInvitations([user.customer!.id]);
  if (staged.status !== "preview") throw Error("Missing preview");
  const original = tokenService.issueAccountToken;
  const spy = vi.spyOn(tokenService, "issueAccountToken").mockImplementationOnce(async (...args) => {
    await db.user.update({ where: { id: admin.id }, data: { active: false, sessionVersion: { increment: 1 } } });
    return original(...args);
  });
  try {
    const result = await confirmCustomerInvitations(staged.token, true);
    expect(result.status === "success" && result.results[0].status).toBe("admin_changed");
    expect(mock.mail).not.toHaveBeenCalled();
    expect(await db.accountToken.count({ where: { userId: user.id } })).toBe(0);
  }
  finally { spy.mockRestore(); }
});
