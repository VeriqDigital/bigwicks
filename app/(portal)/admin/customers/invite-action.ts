"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/authorization";
import { customerIdSchema } from "@/lib/admin/customer-validation";
import { getDb } from "@/lib/db";
import { issueAccountToken } from "@/lib/auth/account-tokens";
import { consumeBucket } from "@/lib/auth/rate-limit";
import type { CustomerFormState } from "./form-state";

export async function sendSetupLink(_state: CustomerFormState, form: FormData): Promise<CustomerFormState> {
  await requireAdmin();
  const parsed = customerIdSchema.safeParse(form.get("customerId"));
  if (!parsed.success) return { message: "Invalid customer. Reload the page." };
  let sent = false;
  try {
    const customer = await getDb().customer.findFirst({ where: { id: parsed.data, user: { role: "CUSTOMER", passwordHash: null } }, select: { userId: true } });
    if (!customer) return { message: "This customer is unavailable or already has a password." };
    if (!await consumeBucket("account-invite:global", 30, 60 * 60) || !await consumeBucket(`account-invite:${customer.userId}`, 3, 15 * 60)) return { message: "Too many invitations. Please try again later." };
    sent = await issueAccountToken(customer.userId, "ACCOUNT_SETUP");
  } catch { /* Safe UI error only; never log email URLs or provider exceptions. */ }
  revalidatePath(`/admin/customers/${parsed.data}`);
  return sent
    ? { success: true, message: "Setup email accepted for delivery. The link expires in 24 hours. Earlier setup links no longer work." }
    : { message: "The setup email could not be confirmed. Reload this page and retry to issue a fresh link. Earlier links may no longer work." };
}
