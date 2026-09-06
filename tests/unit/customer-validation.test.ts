import { expect, it } from "vitest";
import { createCustomerSchema, editCustomerSchema, customerStatusSchema } from "@/lib/admin/customer-validation";

const valid = { companyName: " Example business ", email: " SALES@EXAMPLE.TEST ", customerNumber: " ", pricingTierId: "c1234567890123456789012345", status: "disabled" };

it("normalizes email, business whitespace and optional customer numbers", () => {
  expect(createCustomerSchema.parse(valid)).toMatchObject({ companyName: "Example business", email: "sales@example.test", customerNumber: null });
  expect(createCustomerSchema.parse({ ...valid, customerNumber: undefined }).customerNumber).toBeNull();
});

it.each([
  { companyName: " " }, { companyName: "x".repeat(201) }, { email: "invalid" },
  { customerNumber: "x".repeat(101) }, { pricingTierId: "invalid" }, { status: "true" },
  { status: true }, { email: ["a@example.test"] },
])("rejects malformed customer fields", (fields) => {
  expect(createCustomerSchema.safeParse({ ...valid, ...fields }).success).toBe(false);
});

it("validates target IDs and rejects missing or invented status commands", () => {
  expect(editCustomerSchema.safeParse({ ...valid, customerId: "../../admin" }).success).toBe(false);
  expect(customerStatusSchema.safeParse({ customerId: valid.pricingTierId, status: "delete" }).success).toBe(false);
  expect(customerStatusSchema.safeParse({ customerId: valid.pricingTierId }).success).toBe(false);
});
