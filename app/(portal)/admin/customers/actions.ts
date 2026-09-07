"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db";
import { invalidateAccountTokens } from "@/lib/auth/account-tokens";
import { validTier } from "@/lib/pricing/tiers";
import { createCustomerSchema, editCustomerSchema, customerStatusSchema } from "@/lib/admin/customer-validation";
import type { CustomerField, CustomerFormState } from "./form-state";

class CustomerInputError extends Error {
  constructor(message: string, readonly field?: CustomerField) { super(message); }
}

function readFields(formData: FormData) {
  // Explicit allowlist: never spread submitted role, userId, hash or sessionVersion.
  return {
    companyName: formData.get("companyName"), email: formData.get("email"),
    customerNumber: formData.get("customerNumber"), pricingTierId: formData.get("pricingTierId"),
    customerId: formData.get("customerId"), status: formData.get("status"),
  };
}

function formValues(raw: ReturnType<typeof readFields>): CustomerFormState["values"] {
  return Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, typeof value === "string" ? value : ""]));
}

function mutationError(error: unknown): CustomerFormState {
  if (error instanceof CustomerInputError) {
    return { message: error.message, errors: error.field ? { [error.field]: [error.message] } : undefined };
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      // Unique constraints are authoritative, including simultaneous submissions.
      return { message: "That login email or customer number is already in use. Check both fields." };
    }
    if (error.code === "P2034") return { message: "This account changed during your request. Please try again." };
    if (error.code === "P2025") return { message: "This customer could not be found. Reload the customer list." };
  }
  return { message: "Unable to save the customer. Please try again later." };
}

async function verifyTier(tx: Prisma.TransactionClient, id: string) {
  const tier = await tx.pricingTier.findUnique({ where: { id }, select: { id: true, rank: true, name: true } });
  if (!tier || !validTier(tier)) throw new CustomerInputError("Select a currently configured pricing tier.", "pricingTierId");
}

async function findCustomer(tx: Prisma.TransactionClient, id: string) {
  const customer = await tx.customer.findFirst({
    where: { id, user: { role: "CUSTOMER" } },
    select: { id: true, userId: true, user: { select: { email: true } } },
  });
  if (!customer) throw new CustomerInputError("This customer could not be found. Reload the customer list.");
  return customer;
}

function refreshCustomer(id: string) {
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${id}`);
}

export async function createCustomer(_state: CustomerFormState, formData: FormData): Promise<CustomerFormState> {
  await requireAdmin();
  const raw = readFields(formData);
  const values = formValues(raw);
  const parsed = createCustomerSchema.safeParse(raw);
  if (!parsed.success) return { values, message: "Check the highlighted fields.", errors: parsed.error.flatten().fieldErrors };
  let id: string;
  try {
    const data = parsed.data;
    id = await getDb().$transaction(async (tx) => {
      await verifyTier(tx, data.pricingTierId);
      const active = data.status === "active";
      const user = await tx.user.create({ data: { email: data.email, role: "CUSTOMER", active, passwordHash: null } });
      const customer = await tx.customer.create({ data: {
        userId: user.id, companyName: data.companyName, customerNumber: data.customerNumber,
        pricingTierId: data.pricingTierId, active,
      }, select: { id: true } });
      return customer.id;
    }, { isolationLevel: "Serializable" });
  } catch (error) { return { ...mutationError(error), values }; }
  refreshCustomer(id);
  redirect(`/admin/customers/${id}`);
}

export async function editCustomer(_state: CustomerFormState, formData: FormData): Promise<CustomerFormState> {
  await requireAdmin();
  const raw = readFields(formData);
  const values = formValues(raw);
  const parsed = editCustomerSchema.safeParse(raw);
  if (!parsed.success) return { values, message: "Check the highlighted fields.", errors: parsed.error.flatten().fieldErrors };
  const data = parsed.data;
  try {
    await getDb().$transaction(async (tx) => {
      const customer = await findCustomer(tx, data.customerId);
      await verifyTier(tx, data.pricingTierId);
      await tx.user.update({ where: { id: customer.userId }, data: {
        email: data.email,
        ...(customer.user.email !== data.email ? { sessionVersion: { increment: 1 } } : {}),
      } });
      if (customer.user.email !== data.email) await invalidateAccountTokens(tx, customer.userId);
      await tx.customer.update({ where: { id: customer.id }, data: {
        companyName: data.companyName, customerNumber: data.customerNumber, pricingTierId: data.pricingTierId,
      } });
    }, { isolationLevel: "Serializable" });
  } catch (error) { return { ...mutationError(error), values }; }
  refreshCustomer(data.customerId);
  return { success: true, message: "Customer details saved.", values: { ...values, email: data.email, companyName: data.companyName, customerNumber: data.customerNumber ?? "" } };
}

export async function setCustomerStatus(_state: CustomerFormState, formData: FormData): Promise<CustomerFormState> {
  await requireAdmin();
  const parsed = customerStatusSchema.safeParse(readFields(formData));
  if (!parsed.success) return { message: "Invalid customer or account status. Reload the page and try again." };
  const { customerId, status } = parsed.data;
  const active = status === "active";
  try {
    await getDb().$transaction(async (tx) => {
      const customer = await findCustomer(tx, customerId);
      // One account-access operation owns both flags. Always revoke, including
      // repeated requests and re-enables, so no previously issued session revives.
      await tx.user.update({ where: { id: customer.userId }, data: { active, sessionVersion: { increment: 1 } } });
      await invalidateAccountTokens(tx, customer.userId);
      await tx.customer.update({ where: { id: customer.id }, data: { active } });
    }, { isolationLevel: "Serializable" });
  } catch (error) { return mutationError(error); }
  refreshCustomer(customerId);
  return { success: true, message: active ? "Account enabled. A password is required to sign in." : "Account disabled. Existing sessions have been revoked." };
}
