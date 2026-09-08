"use server";

import { after } from "next/server";
import { loginEmailSchema } from "@/lib/auth/validation";
import { consumeBucket } from "@/lib/auth/rate-limit";
import { issueAccountToken } from "@/lib/auth/account-tokens";
import { getDb } from "@/lib/db";

export async function requestPasswordReset(_state: { message?: string }, form: FormData) {
  const result = { message: "If an eligible account exists for that email, you will receive a reset link shortly. Check your inbox and spam folder." };
  const parsed = loginEmailSchema.safeParse(form.get("email"));
  if (!parsed.success) return result;
  try {
    if (!await consumeBucket("account-reset:global", 30, 60)) return result;
    await getDb().$executeRaw`DELETE FROM "LoginRateLimit" WHERE "expiresAt" < NOW()`;
    if (!await consumeBucket(`account-reset:${parsed.data}`, 3, 15 * 60)) return result;
    // Lookup and delivery run after the response so account eligibility/provider
    // latency cannot be inferred from response content or delivery timing.
    after(async () => {
      try {
        const user = await getDb().user.findFirst({ where: { email: parsed.data, role: "CUSTOMER", passwordHash: { not: null }, customer: { isNot: null } }, select: { id: true } });
        if (user && await issueAccountToken(user.id, { purpose: "PASSWORD_RESET", expectedEmail: parsed.data }) !== "accepted") console.error("Account reset email could not be confirmed.");
      } catch { console.error("Account reset request could not be completed."); }
    });
  } catch { /* Fail closed with the same public response. */ }
  return result;
}
