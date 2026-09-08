"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/authorization";
import { customerIdSchema } from "@/lib/admin/customer-validation";
import { getDb } from "@/lib/db";
import { issueAccountToken, setupReviewSelect, setupStateFingerprint, type AccountTokenIssueStatus } from "@/lib/auth/account-tokens";
import type { CustomerFormState } from "./form-state";

export async function sendSetupLink(_state: CustomerFormState, form: FormData): Promise<CustomerFormState> {
  await requireAdmin();
  const parsed = customerIdSchema.safeParse(form.get("customerId"));
  if (!parsed.success) return { message: "Invalid customer. Reload the page." };
  let result: AccountTokenIssueStatus = "not_confirmed";
  try {
    const customer = await getDb().customer.findFirst({ where: { id: parsed.data, user: { role: "CUSTOMER", passwordHash: null } }, select: { user: { select: setupReviewSelect } } });
    if (!customer) return { message: "This customer is unavailable or already has a password." };
    result = await issueAccountToken(customer.user.id, { purpose: "ACCOUNT_SETUP", channel: "individual", expectedState: setupStateFingerprint(customer.user) });
  } catch { /* Safe UI error only; never log email URLs or provider exceptions. */ }
  revalidatePath(`/admin/customers/${parsed.data}`);
  if (result === "stale") return { message: "This account changed. No setup email was attempted. Reload the page and review before sending again." };
  if (result === "rate_limited") return { message: "Too many invitations. No setup email was attempted. Please try again later." };
  if (result === "ineligible") return { message: "This customer is unavailable or already has a password. No setup email was attempted." };
  return result === "accepted"
    ? { success: true, message: "Setup email accepted for delivery. The link expires in 24 hours. Earlier setup links no longer work." }
    : { message: "The setup email could not be confirmed. Reload this page and retry to issue a fresh link. Earlier links may no longer work." };
}
