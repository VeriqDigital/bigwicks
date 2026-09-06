import "server-only";
import { z } from "zod";
import { loginEmailSchema } from "@/lib/auth/validation";

export const customerIdSchema = z.string().cuid("Invalid customer ID.");
export const accountStatusSchema = z.enum(["active", "disabled"]);
export const customerFieldsSchema = z.object({
  companyName: z.string().trim().min(1, "Enter a company name.").max(200),
  email: loginEmailSchema,
  customerNumber: z.string().trim().max(100).nullish().transform((value) => value || null),
  pricingTierId: z.string().cuid("Select a pricing tier."),
});
export const createCustomerSchema = customerFieldsSchema.extend({ status: accountStatusSchema });
export const editCustomerSchema = customerFieldsSchema.extend({ customerId: customerIdSchema });
export const customerStatusSchema = z.object({ customerId: customerIdSchema, status: accountStatusSchema });

export const supportedTierNames = ["Tier 1", "Tier 2"];
