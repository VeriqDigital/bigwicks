import { afterEach, expect, it, vi } from "vitest";
import { parseCustomerCsv, MAX_CUSTOMER_BYTES } from "@/lib/admin/customer-import-csv";
import { sealCustomerBatch, openCustomerBatch, type CustomerBatchPayload } from "@/lib/admin/customer-batch-token";
import { customerCsvHeader, fictionalCustomerCsv } from "../fixtures/customer-batch";
const parse = (csv: string) => parseCustomerCsv(Buffer.from(csv));
const row = (change: Record<string, string> = {}) => {
  const values: Record<string, string> = { companyName: " Fictional business ", customerNumber: " BW-001 ", email: " Buyer@Example.test ", pricingTier: " Tier 3 ", active: "true", ...change };
  return customerCsvHeader + "\n" + customerCsvHeader.split(",").map((key) => `"${values[key].replaceAll('"', '""')}"`).join(",");
};
afterEach(() => vi.unstubAllEnvs());
it("parses a fictional 50-customer batch and applies existing identity normalization", () => {
  expect(parse(fictionalCustomerCsv(50))).toMatchObject({ rowsRead: 50, errors: [] });
  expect(parse(row()).rows[0]).toEqual({ companyName: "Fictional business", customerNumber: "BW-001", email: "buyer@example.test", pricingTier: "Tier 3", active: true });
});
it.each(["companyName", "customerNumber", "email", "pricingTier", "active"])("requires %s", (field) => {
  expect(parse(row({ [field]: "" })).errors.some((e) => e.field === field)).toBe(true);
});
it.each(["bad", "a@", "a\n@example.test"])("rejects invalid email %s", (email) => expect(parse(row({ email })).errors.length).toBeGreaterThan(0));
it.each(["yes", "1", "TRUE", " false "])("rejects ambiguous boolean %s", (active) => expect(parse(row({ active })).errors[0].field).toBe("active"));
it.each(["companyName", "customerNumber", "pricingTier"])("rejects controls and oversized %s", (field) => {
  for (const value of ["bad\0value", "bad\nvalue", "bad\u202evalue", "x".repeat(201)]) expect(parse(row({ [field]: value })).errors.length).toBeGreaterThan(0);
});
it("rejects duplicate normalized email and trimmed customer number", () => {
  const csv = row() + "\n" + row({ email: "buyer@example.test", customerNumber: "BW-001" }).split("\n")[1];
  expect(parse(csv).errors).toEqual(expect.arrayContaining([expect.objectContaining({ row: 3, field: "email" }), expect.objectContaining({ row: 3, field: "customerNumber" })]));
});
it.each(["companyName,email", customerCsvHeader + ",password", customerCsvHeader + ",role", customerCsvHeader.replace("email", "companyName")])("rejects wrong or privileged headers %s", (headers) => expect(() => parse(headers + "\n" + headers.split(",").map(() => "x").join(","))).toThrow());
it("rejects empty, malformed, oversized, excessive row/record and invalid UTF-8 files", () => {
  for (const csv of ["", customerCsvHeader, customerCsvHeader + '\n"unclosed', fictionalCustomerCsv(251), row({ companyName: "x".repeat(2050) }), "x".repeat(MAX_CUSTOMER_BYTES + 1)]) expect(() => parse(csv)).toThrow();
  expect(() => parseCustomerCsv(Buffer.from([0xff]))).toThrow();
});
it("keeps formula-looking business text as inert text, never evaluates or exports it", () => {
  expect(parse(row({ companyName: "=1+1", customerNumber: "+001" })).rows[0]).toMatchObject({ companyName: "=1+1", customerNumber: "+001" });
});
it("encrypts preview rows and binds purpose, admin, session, expiry and integrity", () => {
  vi.stubEnv("AUTH_SECRET", "fictional-customer-batch-secret-0123456789");
  const payload: CustomerBatchPayload = { kind: "import", adminId: "admin-a", sessionVersion: 2, expiresAt: Date.now() + 10000, snapshot: "a".repeat(64), rows: parse(row()).rows };
  const token = sealCustomerBatch(payload);
  expect(token).not.toContain("buyer"); expect(openCustomerBatch(token, { id: "admin-a", sessionVersion: 2 })).toEqual(payload);
  for (const admin of [{ id: "other", sessionVersion: 2 }, { id: "admin-a", sessionVersion: 3 }]) expect(() => openCustomerBatch(token, admin)).toThrow();
  for (const bad of [token.slice(0, 20) + (token[20] === "A" ? "B" : "A") + token.slice(21), "x".repeat(512001), sealCustomerBatch({ ...payload, expiresAt: Date.now() - 1 })]) expect(() => openCustomerBatch(bad, { id: "admin-a", sessionVersion: 2 })).toThrow();
});
