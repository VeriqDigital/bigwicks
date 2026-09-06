import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(), allow: vi.fn(), verify: vi.fn(), auth: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ getDb: () => ({ user: { findUnique: mocks.findUnique } }) }));
vi.mock("@/lib/auth/rate-limit", () => ({ allowCredentialAttempt: mocks.allow }));
vi.mock("@/lib/auth/password", () => ({ verifyPassword: mocks.verify }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => { throw new Error(`redirect:${url}`); },
  notFound: () => { throw new Error("notFound"); },
}));

import { authorizeCredentials } from "@/lib/auth/credentials";
import { requireAdmin, requireCustomer, requireUser } from "@/lib/auth/authorization";
import { resolvePrincipal } from "@/lib/auth/principal";
import { createCustomer, editCustomer, setCustomerStatus } from "@/app/(portal)/admin/customers/actions";

const customer = {
  id: "user-a", email: "a@example.test", role: "CUSTOMER", active: true,
  sessionVersion: 0, passwordHash: "private-hash",
  customer: { id: "customer-a", companyName: "Test A", active: true, pricingTierId: "tier1" },
};
const admin = { ...customer, role: "ADMIN", customer: null };
beforeEach(() => {
  mocks.findUnique.mockResolvedValue(customer);
  mocks.allow.mockResolvedValue(true);
  mocks.verify.mockResolvedValue(true);
  mocks.auth.mockResolvedValue({ user: { id: "user-a", sessionVersion: 0 } });
});

describe("credential authentication", () => {
  it("normalizes email and ignores forged role, tier, customer and status", async () => {
    const result = await authorizeCredentials({ email: " A@EXAMPLE.TEST ", password: "correct", role: "ADMIN", customerId: "b", pricingTierId: "tier2", active: true });
    expect(result).toEqual({ id: "user-a", sessionVersion: 0 });
    expect(mocks.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { email: "a@example.test" } }));
  });
  it.each([{}, { email: [], password: "x" }, { email: "a@example.test", password: "x".repeat(129) }])("rejects invalid input before lookup", async (input) => {
    expect(await authorizeCredentials(input)).toBeNull();
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });
  it("rejects an incorrect password", async () => {
    mocks.verify.mockResolvedValue(false);
    expect(await authorizeCredentials({ email: customer.email, password: "wrong" })).toBeNull();
  });
  it("does password verification even for unknown accounts", async () => {
    mocks.findUnique.mockResolvedValue(null);
    expect(await authorizeCredentials({ email: "missing@example.test", password: "wrong" })).toBeNull();
    expect(mocks.verify).toHaveBeenCalledWith("wrong", undefined);
  });
  it("rejects a passwordless account even if dummy verification succeeds", async () => {
    mocks.findUnique.mockResolvedValue({ ...customer, passwordHash: null });
    expect(await authorizeCredentials({ email: customer.email, password: "unused-dummy-password" })).toBeNull();
    expect(mocks.verify).toHaveBeenCalledWith("unused-dummy-password", undefined);
  });
  it.each([
    { ...customer, active: false },
    { ...customer, customer: { ...customer.customer, active: false } },
    { ...customer, customer: null },
    { ...admin, active: false },
    { ...admin, customer: customer.customer },
  ])("rejects disabled or inconsistent accounts", async (user) => {
    mocks.findUnique.mockResolvedValue(user);
    expect(await authorizeCredentials({ email: customer.email, password: "correct" })).toBeNull();
  });
  it("applies limiting before database identity lookup and password work", async () => {
    mocks.allow.mockResolvedValue(false);
    expect(await authorizeCredentials({ email: customer.email, password: "correct" })).toBeNull();
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.verify).not.toHaveBeenCalled();
  });
  it("fails closed if rate-limit storage is unavailable", async () => {
    mocks.allow.mockRejectedValue(new Error("unavailable"));
    await expect(authorizeCredentials({ email: customer.email, password: "correct" })).rejects.toThrow();
    expect(mocks.verify).not.toHaveBeenCalled();
  });
});

describe("direct customer-management mutation authorization", () => {
  it.each([createCustomer, editCustomer, setCustomerStatus])("denies customer users before mutation or input validation", async (action) => {
    await expect(action({}, new FormData())).rejects.toThrow("notFound");
  });
  it.each([createCustomer, editCustomer, setCustomerStatus])("denies logged-out callers before mutation or input validation", async (action) => {
    mocks.auth.mockResolvedValue(null);
    await expect(action({}, new FormData())).rejects.toThrow("redirect:/login");
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });
});

describe("server authorization", () => {
  it.each([requireUser, requireAdmin, requireCustomer])("redirects unauthenticated requests", async (guard) => {
    mocks.auth.mockResolvedValue(null);
    await expect(guard()).rejects.toThrow("redirect:/login");
  });
  it("denies customers admin access", async () => {
    await expect(requireAdmin()).rejects.toThrow("notFound");
  });
  it("allows admins into admin and denies customer-only access", async () => {
    mocks.findUnique.mockResolvedValue(admin);
    expect((await requireAdmin()).role).toBe("ADMIN");
    await expect(requireCustomer()).rejects.toThrow("notFound");
  });
  it("resolves the current customer's association and tier from the database", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-a", sessionVersion: 0, role: "ADMIN", customerId: "b", pricingTierId: "tier2" } });
    expect((await requireCustomer()).customer).toEqual(customer.customer);
    mocks.findUnique.mockResolvedValue({ ...customer, customer: { ...customer.customer, pricingTierId: "tier2" } });
    expect((await requireCustomer()).customer.pricingTierId).toBe("tier2");
  });
  it.each([null, { ...customer, active: false }, { ...customer, customer: { ...customer.customer, active: false } }, { ...customer, sessionVersion: 1 }])("rejects stale sessions after deletion, disable or revocation", async (user) => {
    mocks.findUnique.mockResolvedValue(user);
    await expect(requireUser()).rejects.toThrow("redirect:/login");
  });
  it("fails closed on database errors", async () => {
    mocks.findUnique.mockRejectedValue(new Error("unavailable"));
    await expect(requireAdmin()).rejects.toThrow("unavailable");
  });
  it("does not resolve malformed session identities", async () => {
    expect(await resolvePrincipal(undefined, 0)).toBeNull();
    expect(await resolvePrincipal("user-a", "0")).toBeNull();
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });
});
