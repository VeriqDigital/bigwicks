// Audit observations assert CURRENT behavior. They are not claims that it is safe.
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
it("AUDIT: six identical public contact submissions produce six outbound attempts", async () => {
  const transport = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id: "fictional" }));
  try {
    const form = new FormData();
    for (const [key, value] of Object.entries({ name: "Fictional Visitor", email: "visitor@example.test", subject: contactSubjects[0].value, message: "Fictional bounded security audit inquiry.", company: "" })) form.set(key, value);
    for (let count = 0; count < 6; count++) expect((await submitContactForm({ status: "idle", message: "" }, form)).status).toBe("success");
    expect(transport).toHaveBeenCalledTimes(6);
    expect(new Set(transport.mock.calls.map(([, options]) => (options!.headers as Record<string, string>)["Idempotency-Key"])).size).toBe(6);
    expect(transport.mock.calls.every(([, options]) => !options?.signal)).toBe(true);
  } finally { transport.mockRestore(); }
});
it("AUDIT: distinct overlapping invitation previews both issue for one unchanged recipient", async () => {
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
    await Promise.all([confirmCustomerInvitations(one.token, true), confirmCustomerInvitations(two.token, true)]);
    expect(arrived).toBe(2); expect(mock.mail).toHaveBeenCalledTimes(2);
    expect(await db.accountToken.count({ where: { userId: user.id, consumedAt: null, deliveredAt: { not: null } } })).toBe(1);
  } finally { release(); spy.mockRestore(); }
});
it("AUDIT: revocation after the individual action guard does not prevent its SQL mutation", async () => {
  const user = await customer("revocation");
  const original = db.$transaction.bind(db);
  const spy = vi.spyOn(db, "$transaction").mockImplementationOnce(async (...args: unknown[]) => {
    await db.user.update({ where: { id: admin.id }, data: { active: false, sessionVersion: { increment: 1 } } });
    return Reflect.apply(original, db, args);
  });
  const form = new FormData();
  for (const [key, value] of Object.entries({ customerId: user.customer!.id, companyName: "Changed after admin revocation", email: user.email, customerNumber: "", pricingTierId: tierId })) form.set(key, value);
  try {
    expect((await editCustomer({}, form)).success).toBe(true);
    expect((await db.customer.findUniqueOrThrow({ where: { id: user.customer!.id } })).companyName).toBe("Changed after admin revocation");
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
it("AUDIT: overlapping individual and bulk invitations share quota but can both issue", async () => {
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
    await Promise.all([confirmCustomerInvitations(staged.token, true), sendSetupLink({}, form)]);
    expect(mock.mail).toHaveBeenCalledTimes(2);
    expect(await db.accountToken.count({ where: { userId: user.id, consumedAt: null, deliveredAt: { not: null } } })).toBe(1);
  } finally { release(); spy.mockRestore(); }
  await sendSetupLink({}, form); await sendSetupLink({}, form);
  expect(mock.mail).toHaveBeenCalledTimes(3); // Fourth is denied by the SHARED quota.
});
it("AUDIT: bulk admin revocation after its per-recipient check still permits that issuance", async () => {
  const user = await customer("bulk-revocation");
  const staged = await previewCustomerInvitations([user.customer!.id]);
  if (staged.status !== "preview") throw Error("Missing preview");
  const original = tokenService.issueAccountToken;
  const spy = vi.spyOn(tokenService, "issueAccountToken").mockImplementationOnce(async (...args) => {
    await db.user.update({ where: { id: admin.id }, data: { active: false, sessionVersion: { increment: 1 } } });
    return original(...args);
  });
  try { await confirmCustomerInvitations(staged.token, true); expect(mock.mail).toHaveBeenCalledTimes(1); }
  finally { spy.mockRestore(); }
});
