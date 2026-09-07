import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { createCustomerSchema } from "./customer-validation";
import { validTier } from "@/lib/pricing/tiers";

// Shared by individual and bulk creation. Caller owns the transaction.
export async function insertCustomer(tx: Prisma.TransactionClient, input: unknown) {
  const data = createCustomerSchema.parse(input);
  const tier = await tx.pricingTier.findUnique({ where: { id: data.pricingTierId } });
  if (!tier || !validTier(tier)) throw new Error("Invalid customer tier");
  const active = data.status === "active";
  const user = await tx.user.create({ data: { email: data.email, role: "CUSTOMER", active, passwordHash: null } });
  return tx.customer.create({ data: {
    userId: user.id, companyName: data.companyName, customerNumber: data.customerNumber, pricingTierId: tier.id, active,
  }, select: { id: true } });
}
