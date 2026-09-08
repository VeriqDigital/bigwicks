import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import type { AccountTokenPurpose, Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { hashPassword } from "./password";
import { accountEmailConfig, sendAccountEmail } from "./account-email";
import { lockAdminActor, AdminSessionChangedError, type AdminActor } from "./admin-transaction";
import { consumeBucket } from "./rate-limit";

export const invalidLinkMessage = "This link is invalid or no longer available. Request a new link or contact Big Wicks.";
export const passwordChoiceSchema = z.object({
  password: z.string().min(15, "Use 15 to 128 characters.").max(128, "Use 15 to 128 characters."),
  confirmation: z.string().min(1, "Confirm your password.").max(128),
}).refine((value) => value.password === value.confirmation, { path: ["confirmation"], message: "Passwords must match." });

export function tokenDigest(raw: unknown): string | null {
  return typeof raw === "string" && /^[a-f0-9]{64}$/.test(raw) ? createHash("sha256").update(raw).digest("hex") : null;
}

const latestSetupToken = {
  where: { purpose: "ACCOUNT_SETUP" as const }, orderBy: [{ createdAt: "desc" as const }, { id: "desc" as const }], take: 1,
  select: { id: true, createdAt: true, consumedAt: true, deliveredAt: true, expiresAt: true, sessionVersion: true },
};
// Shared server-only projection. Never pass it to a Client Component.
export const setupReviewSelect = {
  id: true, email: true, role: true, active: true, passwordHash: true, sessionVersion: true,
  customer: { select: { id: true, active: true } }, accountTokens: latestSetupToken,
} satisfies Prisma.UserSelect;
type SetupReview = Prisma.UserGetPayload<{ select: typeof setupReviewSelect }>;
export function setupStateFingerprint(user: SetupReview) {
  return createHash("sha256").update(JSON.stringify([
    "account-setup-review/v1", user.id, user.email, user.role, user.active, user.passwordHash !== null,
    user.sessionVersion, user.customer, user.accountTokens[0] ?? null,
  ])).digest("hex");
}

export type AccountTokenRequest =
  | { purpose: "ACCOUNT_SETUP"; actor: AdminActor; expectedState: string; channel: "individual" | "bulk"; reviewExpiresAt?: number }
  | { purpose: "PASSWORD_RESET"; expectedEmail?: string };
export type AccountTokenIssueStatus = "accepted" | "admin_changed" | "stale" | "ineligible" | "rate_limited" | "not_confirmed";

// Token writers lock the recipient before reading current state. ADMIN setup
// claims first lock the actor; reset/consumption/finalization never lock an actor.
// This serializes with staff email/status updates and token consumption.
async function lockUser(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${id} FOR UPDATE`;
  return tx.user.findUnique({ where: { id }, select: setupReviewSelect });
}

export async function invalidateAccountTokens(tx: Prisma.TransactionClient, userId: string) {
  await tx.accountToken.updateMany({ where: { userId, consumedAt: null }, data: { consumedAt: new Date() } });
}

export async function issueAccountToken(userId: string, request: AccountTokenRequest): Promise<AccountTokenIssueStatus> {
  // Check configuration before superseding anything. Raw token stays server-only.
  accountEmailConfig();
  const { purpose } = request;
  const raw = randomBytes(32).toString("hex");
  const claim = await getDb().$transaction(async (tx) => {
    if (request.purpose === "ACCOUNT_SETUP") {
      try { await lockAdminActor(tx, request.actor); }
      catch (error) {
        if (error instanceof AdminSessionChangedError) return { status: "admin_changed" as const };
        throw error;
      }
    }
    const user = await lockUser(tx, userId);
    if (request.purpose === "ACCOUNT_SETUP" && (!user || setupStateFingerprint(user) !== request.expectedState ||
        (request.reviewExpiresAt !== undefined && request.reviewExpiresAt <= Date.now()))) return { status: "stale" as const };
    if (!user || user.role !== "CUSTOMER" || !user.customer ||
        (request.purpose === "ACCOUNT_SETUP" && request.channel === "bulk" && (!user.active || !user.customer.active)) ||
        (request.purpose === "PASSWORD_RESET" && request.expectedEmail !== undefined && user.email !== request.expectedEmail) ||
        (purpose === "ACCOUNT_SETUP" ? user.passwordHash !== null : !user.passwordHash)) return { status: "ineligible" as const };
    if (request.purpose === "ACCOUNT_SETUP") {
      // Same transaction/lock as the comparison and insertion. A stale loser
      // spends no quota. Global admission is retained if the recipient is capped.
      const bulk = request.channel === "bulk";
      if (!await consumeBucket(bulk ? "account-bulk-invite:global" : "account-invite:global", bulk ? 100 : 30, 3600, tx) ||
          !await consumeBucket(`account-invite:${userId}`, 3, 900, tx)) return { status: "rate_limited" as const };
    }
    await tx.accountToken.updateMany({ where: { userId, purpose, consumedAt: null }, data: { consumedAt: new Date() } });
    // PostgreSQL NOW() is transaction-start time, not lock-acquisition time.
    // Keep setup ordering strictly increasing even for waiting transactions,
    // equal millisecond timestamps or differing application-instance clocks.
    const createdAt = purpose === "ACCOUNT_SETUP"
      ? new Date(Math.max(Date.now(), (user.accountTokens[0]?.createdAt.getTime() ?? 0) + 1)) : undefined;
    const row = await tx.accountToken.create({ data: {
      userId, tokenHash: tokenDigest(raw)!, purpose, sessionVersion: user.sessionVersion,
      ...(createdAt ? { createdAt } : {}),
      expiresAt: new Date(Date.now() + (purpose === "ACCOUNT_SETUP" ? 24 : 1) * 60 * 60 * 1000),
    } });
    return { status: "claimed" as const, token: { ...row, email: user.email } };
  });
  if (claim.status !== "claimed") return claim.status;
  const { token } = claim;
  try {
    await sendAccountEmail(token.email, raw, purpose, token.id);
    // A concurrent reissue, email/access change, or password change may have won.
    // Short SQL-only finalization also serializes reviewed deliveredAt changes.
    const result = await getDb().$transaction(async (tx) => {
      await lockUser(tx, userId);
      return tx.accountToken.updateMany({
      where: { id: token.id, consumedAt: null, expiresAt: { gt: new Date() }, user: { email: token.email, role: "CUSTOMER", sessionVersion: token.sessionVersion } },
      data: { deliveredAt: new Date() },
      });
    });
    return result.count === 1 ? "accepted" : "not_confirmed";
  } catch {
    // Even if cleanup fails, deliveredAt remains null and validation fails closed.
    await getDb().$transaction(async (tx) => {
      await lockUser(tx, userId);
      await tx.accountToken.updateMany({ where: { id: token.id, consumedAt: null }, data: { consumedAt: new Date() } });
    }).catch(() => {});
    return "not_confirmed";
  }
}

function usableWhere(digest: string, purpose: AccountTokenPurpose) {
  return { tokenHash: digest, purpose, consumedAt: null, deliveredAt: { not: null }, expiresAt: { gt: new Date() } };
}

async function findUsableToken(db: Prisma.TransactionClient, digest: string, purpose: AccountTokenPurpose) {
  if (!/^[a-f0-9]{64}$/.test(digest)) return null;
  const row = await db.accountToken.findFirst({ where: usableWhere(digest, purpose), include: { user: { include: { customer: { select: { id: true } } } } } });
  if (!row || row.user.role !== "CUSTOMER" || !row.user.customer || row.sessionVersion !== row.user.sessionVersion ||
      (purpose === "ACCOUNT_SETUP" ? row.user.passwordHash !== null : !row.user.passwordHash)) return null;
  return row;
}

export async function accountTokenUsable(digest: string, purpose: AccountTokenPurpose) {
  try { return !!await findUsableToken(getDb(), digest, purpose); } catch { return false; }
}

export type PasswordResult = { message?: string; success?: boolean; errors?: { password?: string[]; confirmation?: string[] } };

export async function consumeAccountToken(digest: string, purpose: AccountTokenPurpose, form: FormData): Promise<PasswordResult> {
  // Only the trusted action closure supplies digest/purpose. Ignore every other
  // submitted identity, token, status, role or expiry field.
  const parsed = passwordChoiceSchema.safeParse({ password: form.get("password"), confirmation: form.get("confirmation") });
  if (!parsed.success) return { message: "Check your password and confirmation.", errors: parsed.error.flatten().fieldErrors };
  try {
    if (!await consumeBucket("account-consume:global", 60, 60) || !await consumeBucket(`account-consume:${digest}`, 10, 15 * 60)) return { message: "Too many attempts. Please try again later." };
    const candidate = await findUsableToken(getDb(), digest, purpose);
    if (!candidate) return { message: invalidLinkMessage };
    // Expensive hash outside the lock; everything is revalidated after hashing.
    const passwordHash = await hashPassword(parsed.data.password);
    return await getDb().$transaction(async (tx) => {
      await lockUser(tx, candidate.userId);
      const token = await findUsableToken(tx, digest, purpose);
      if (!token) return { message: invalidLinkMessage };
      const consumed = await tx.accountToken.updateMany({ where: usableWhere(digest, purpose), data: { consumedAt: new Date() } });
      if (consumed.count !== 1) return { message: invalidLinkMessage };
      await tx.user.update({ where: { id: token.userId }, data: { passwordHash, sessionVersion: { increment: 1 } } });
      await invalidateAccountTokens(tx, token.userId);
      return { success: true };
    });
  } catch { return { message: "Unable to save your password. Please try again or request a new link." }; }
}
