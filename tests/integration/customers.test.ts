import { afterAll, beforeEach, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/auth", () => ({ auth: session.auth }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => { throw new Error(`redirect:${url}`); },
  notFound: () => { throw new Error("notFound"); },
}));

import { getDb } from "@/lib/db";
import { createCustomer, editCustomer, setCustomerStatus } from "@/app/(portal)/admin/customers/actions";
import { authorizeCredentials } from "@/lib/auth/credentials";
import { resolvePrincipal } from "@/lib/auth/principal";
import { hashPassword } from "@/lib/auth/password";
import { listCustomers, getCustomer } from "@/lib/admin/customers";

const db = getDb();
const email = "test-m2-customer@example.test";
const password = "Isolated test customer password";
let tier1: string;
let tier2: string;

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}
function fields(overrides: Record<string, string> = {}) {
  return { companyName: "Test business", email, customerNumber: "M2-TEST", pricingTierId: tier1, status: "active", ...overrides };
}
async function cleanup() {
  const where = { email: { startsWith: "test-m2-" } };
  await db.customer.deleteMany({ where: { user: where } });
  await db.user.deleteMany({ where });
}
async function fixture(withPassword = false) {
  await expect(createCustomer({}, form(fields()))).rejects.toThrow("redirect:/admin/customers/");
  const user = await db.user.findUniqueOrThrow({ where: { email }, include: { customer: true } });
  if (withPassword) await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } });
  return user;
}

beforeEach(async () => {
  await cleanup();
  await db.loginRateLimit.deleteMany();
  const admin = await db.user.findUniqueOrThrow({ where: { email: "admin@example.test" } });
  session.auth.mockResolvedValue({ user: { id: admin.id, sessionVersion: admin.sessionVersion } });
  tier1 = (await db.pricingTier.findUniqueOrThrow({ where: { name: "Tier 1" } })).id;
  tier2 = (await db.pricingTier.findUniqueOrThrow({ where: { name: "Tier 2" } })).id;
});
afterAll(async () => { await cleanup(); await db.$disconnect(); });

it("creates separate passwordless identity and business atomically, ignoring forged user fields", async () => {
  await expect(createCustomer({}, form(fields({ email: " TEST-M2-CUSTOMER@EXAMPLE.TEST ", role: "ADMIN", passwordHash: "forged", sessionVersion: "99", userId: "forged" })))).rejects.toThrow("redirect:/admin/customers/");
  const user = await db.user.findUniqueOrThrow({ where: { email }, include: { customer: true } });
  expect(user).toMatchObject({ role: "CUSTOMER", passwordHash: null, active: true, sessionVersion: 0 });
  expect(user.customer).toMatchObject({ userId: user.id, active: true, companyName: "Test business", pricingTierId: tier1 });
  expect(await authorizeCredentials({ email, password })).toBeNull();
  expect(await authorizeCredentials({ email, password: "unused-dummy-password" })).toBeNull();
  const dto = await getCustomer(user.customer!.id);
  expect(dto.passwordSet).toBe(false);
  expect(JSON.stringify(dto)).not.toContain("passwordHash");
});

it("rolls back the newly inserted user when customer-number uniqueness fails", async () => {
  await fixture();
  const result = await createCustomer({}, form(fields({ email: "test-m2-other@example.test" })));
  expect(result.message).toContain("already in use");
  expect(await db.user.findUnique({ where: { email: "test-m2-other@example.test" } })).toBeNull();
  expect(await db.customer.count({ where: { user: { email: { startsWith: "test-m2-" } } } })).toBe(1);
});

it("safely rejects duplicate normalized email without creating another business", async () => {
  await fixture();
  const result = await createCustomer({}, form(fields({ email: " TEST-M2-CUSTOMER@EXAMPLE.TEST ", customerNumber: "M2-OTHER" })));
  expect(result.message).toContain("already in use");
  expect(await db.customer.findUnique({ where: { customerNumber: "M2-OTHER" } })).toBeNull();
});

it("rejects missing and unsupported tiers on create and edit", async () => {
  const missing = "c1234567890123456789012345";
  const extra = await db.pricingTier.create({ data: { name: "Test unsupported tier" } });
  try {
    for (const pricingTierId of [missing, extra.id]) {
      expect((await createCustomer({}, form(fields({ pricingTierId })))).errors?.pricingTierId).toBeDefined();
      expect(await db.user.findUnique({ where: { email } })).toBeNull();
    }
    const user = await fixture();
    expect((await editCustomer({}, form(fields({ customerId: user.customer!.id, pricingTierId: missing })))).errors?.pricingTierId).toBeDefined();
    expect((await db.customer.findUniqueOrThrow({ where: { id: user.customer!.id } })).pricingTierId).toBe(tier1);
  } finally { await db.pricingTier.delete({ where: { id: extra.id } }); }
});

it("changes business details and tiers without revoking a session or changing account status", async () => {
  const user = await fixture(true);
  const result = await editCustomer({}, form(fields({ customerId: user.customer!.id, companyName: "Updated business", customerNumber: "", pricingTierId: tier2, role: "ADMIN", status: "disabled", sessionVersion: "99", userId: "forged" })));
  expect(result.success).toBe(true);
  const current = await resolvePrincipal(user.id, 0);
  expect(current).toMatchObject({ role: "CUSTOMER", active: true, sessionVersion: 0, customer: { companyName: "Updated business", pricingTierId: tier2, active: true } });
  expect((await db.customer.findUniqueOrThrow({ where: { id: user.customer!.id } })).customerNumber).toBeNull();
});

it("revokes sessions when the normalized login email changes, but not for casing changes", async () => {
  const user = await fixture(true);
  expect((await editCustomer({}, form(fields({ customerId: user.customer!.id, email: email.toUpperCase() })))).success).toBe(true);
  expect(await resolvePrincipal(user.id, 0)).not.toBeNull();
  expect((await editCustomer({}, form(fields({ customerId: user.customer!.id, email: "test-m2-renamed@example.test" })))).success).toBe(true);
  expect(await resolvePrincipal(user.id, 0)).toBeNull();
  expect(await authorizeCredentials({ email, password })).toBeNull();
  expect(await authorizeCredentials({ email: "test-m2-renamed@example.test", password })).toMatchObject({ id: user.id, sessionVersion: 1 });
});

it("rolls back email, version and business edits on duplicate customer number", async () => {
  const user = await fixture(true);
  await expect(createCustomer({}, form(fields({ email: "test-m2-other@example.test", customerNumber: "M2-OTHER" })))).rejects.toThrow("redirect:");
  const result = await editCustomer({}, form(fields({ customerId: user.customer!.id, email: "test-m2-renamed@example.test", companyName: "Should roll back", customerNumber: "M2-OTHER" })));
  expect(result.message).toContain("already in use");
  expect(await db.user.findUniqueOrThrow({ where: { id: user.id }, include: { customer: true } })).toMatchObject({ email, sessionVersion: 0, customer: { companyName: "Test business", customerNumber: "M2-TEST" } });
  expect((await editCustomer({}, form(fields({ customerId: user.customer!.id, email: "admin@example.test" })))).message).toContain("already in use");
});

it("disables and re-enables both flags with session revocation that cannot be reversed", async () => {
  const user = await fixture(true);
  expect(await authorizeCredentials({ email, password })).toMatchObject({ sessionVersion: 0 });
  expect((await setCustomerStatus({}, form({ customerId: user.customer!.id, status: "disabled" }))).success).toBe(true);
  expect(await db.user.findUniqueOrThrow({ where: { id: user.id }, include: { customer: true } })).toMatchObject({ active: false, sessionVersion: 1, customer: { active: false } });
  expect(await resolvePrincipal(user.id, 0)).toBeNull();
  expect(await authorizeCredentials({ email, password })).toBeNull();
  expect((await setCustomerStatus({}, form({ customerId: user.customer!.id, status: "active" }))).success).toBe(true);
  expect(await resolvePrincipal(user.id, 0)).toBeNull();
  expect(await resolvePrincipal(user.id, 1)).toBeNull();
  expect(await authorizeCredentials({ email, password })).toMatchObject({ sessionVersion: 2 });
});

it("repairs mismatched flags and keeps concurrent access changes consistent", async () => {
  const user = await fixture(true);
  await db.user.update({ where: { id: user.id }, data: { active: false } });
  expect((await getCustomer(user.customer!.id)).statusMismatch).toBe(true);
  await setCustomerStatus({}, form({ customerId: user.customer!.id, status: "active" }));
  expect((await getCustomer(user.customer!.id)).statusMismatch).toBe(false);
  await Promise.all(["disabled", "active", "disabled"].map((status) => setCustomerStatus({}, form({ customerId: user.customer!.id, status }))));
  const current = await db.user.findUniqueOrThrow({ where: { id: user.id }, include: { customer: true } });
  expect(current.active).toBe(current.customer!.active);
  expect(current.sessionVersion).toBeGreaterThan(1);
  expect(await resolvePrincipal(user.id, 0)).toBeNull();
});

it("rejects nonexistent IDs and cannot target an admin identity or change their role", async () => {
  const admin = await db.user.findUniqueOrThrow({ where: { email: "admin@example.test" } });
  for (const customerId of [admin.id, "c1234567890123456789012345"]) {
    expect((await editCustomer({}, form(fields({ customerId })))).success).not.toBe(true);
    expect((await setCustomerStatus({}, form({ customerId, status: "disabled" }))).success).not.toBe(true);
  }
  expect(await db.user.findUniqueOrThrow({ where: { id: admin.id } })).toMatchObject({ role: "ADMIN", active: true, sessionVersion: admin.sessionVersion });
});

it("uses real database authorization for direct action and data-access calls", async () => {
  const user = await fixture(true);
  for (const caller of [null, { user: { id: user.id, sessionVersion: 0 } }]) {
    session.auth.mockResolvedValue(caller);
    for (const action of [createCustomer, editCustomer, setCustomerStatus]) {
      await expect(action({}, form(fields({ customerId: user.customer!.id, status: "disabled" })))).rejects.toThrow(caller ? "notFound" : "redirect:/login");
    }
    await expect(listCustomers()).rejects.toThrow();
    await expect(getCustomer(user.customer!.id)).rejects.toThrow();
  }
  expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).sessionVersion).toBe(0);
});
