import { expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

it("uses salted Argon2id hashes and validates passwords", async () => {
  const password = "Test-only strong password";
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  expect(first).toMatch(/^\$argon2id\$/);
  expect(first).not.toBe(second);
  expect(await verifyPassword(password, first)).toBe(true);
  expect(await verifyPassword("incorrect", first)).toBe(false);
  expect(await verifyPassword("incorrect")).toBe(false);
  expect(await verifyPassword(password, "invalid-hash")).toBe(false);
});

it("refuses weak or oversized provisioned passwords", () => {
  expect(() => hashPassword("short")).toThrow();
  expect(() => hashPassword("x".repeat(129))).toThrow();
});
