import "server-only";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db";
import { customerIdSchema, supportedTierNames } from "./customer-validation";

const customerSelect = {
  id: true, companyName: true, customerNumber: true, pricingTierId: true, active: true,
  pricingTier: { select: { name: true } },
  user: { select: { email: true, active: true, passwordHash: true } },
} as const;

function customerDto(customer: {
  id: string; companyName: string; customerNumber: string | null; pricingTierId: string; active: boolean;
  pricingTier: { name: string }; user: { email: string; active: boolean; passwordHash: string | null };
}) {
  // Password material never crosses the server boundary, including RSC props.
  return {
    id: customer.id, companyName: customer.companyName, email: customer.user.email,
    customerNumber: customer.customerNumber ?? "", pricingTierId: customer.pricingTierId,
    pricingTierName: customer.pricingTier.name,
    active: customer.active && customer.user.active,
    statusMismatch: customer.active !== customer.user.active,
    passwordSet: !!customer.user.passwordHash,
  };
}

export async function listCustomers() {
  await requireAdmin();
  const rows = await getDb().customer.findMany({
    where: { user: { role: "CUSTOMER" } }, select: customerSelect,
    orderBy: [{ companyName: "asc" }, { id: "asc" }],
  });
  return rows.map(customerDto);
}

export async function getCustomer(id: string) {
  await requireAdmin();
  if (!customerIdSchema.safeParse(id).success) notFound();
  const customer = await getDb().customer.findFirst({ where: { id, user: { role: "CUSTOMER" } }, select: customerSelect });
  if (!customer) notFound();
  return customerDto(customer);
}

export async function listCustomerTiers() {
  await requireAdmin();
  return getDb().pricingTier.findMany({ where: { name: { in: supportedTierNames } }, select: { id: true, name: true }, orderBy: { name: "asc" } });
}

export async function hasPendingSetup(customerId: string) {
  await requireAdmin();
  const user = await getDb().user.findFirst({ where: { role: "CUSTOMER", passwordHash: null, customer: { id: customerId } }, select: { id: true, sessionVersion: true } });
  if (!user) return false;
  return !!await getDb().accountToken.findFirst({ where: { userId: user.id, sessionVersion: user.sessionVersion, purpose: "ACCOUNT_SETUP", consumedAt: null, deliveredAt: { not: null }, expiresAt: { gt: new Date() } }, select: { id: true } });
}
