import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import type { AccountTokenPurpose, Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { hashPassword } from "./password";
import { accountEmailConfig, sendAccountEmail } from "./account-email";
import { consumeBucket } from "./rate-limit";

export const invalidLinkMessage = "This link is invalid or no longer available. Request a new link or contact Big Wicks.";
export const passwordChoiceSchema = z.object({
  password: z.string().min(15, "Use 15 to 128 characters.").max(128, "Use 15 to 128 characters."),
  confirmation: z.string().min(1, "Confirm your password.").max(128),
}).refine((value) => value.password === value.confirmation, { path: ["confirmation"], message: "Passwords must match." });

export function tokenDigest(raw: unknown): string | null {
  return typeof raw === "string" && /^[a-f0-9]{64}$/.test(raw) ? createHash("sha256").update(raw).digest("hex") : null;
}

// All token writers lock the identity first, then read current state. This also
// serializes with staff email/status updates and simultaneous token consumption.
async function lockUser(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${id} FOR UPDATE`;
  return tx.user.findUnique({ where: { id }, include: { customer: { select: { id: true } } } });
}

export async function invalidateAccountTokens(tx: Prisma.TransactionClient, userId: string) {
  await tx.accountToken.updateMany({ where: { userId, consumedAt: null }, data: { consumedAt: new Date() } });
}

export async function issueAccountToken(userId: string, purpose: AccountTokenPurpose, expectedEmail?: string): Promise<boolean> {
  // Check configuration before superseding anything. Raw token stays server-only.
  accountEmailConfig();
  const raw = randomBytes(32).toString("hex");
  const token = await getDb().$transaction(async (tx) => {
    const user = await lockUser(tx, userId);
    if (!user || user.role !== "CUSTOMER" || !user.customer ||
        (expectedEmail !== undefined && user.email !== expectedEmail) ||
        (purpose === "ACCOUNT_SETUP" ? user.passwordHash !== null : !user.passwordHash)) return null;
    await tx.accountToken.updateMany({ where: { userId, purpose, consumedAt: null }, data: { consumedAt: new Date() } });
    const row = await tx.accountToken.create({ data: {
      userId, tokenHash: tokenDigest(raw)!, purpose, sessionVersion: user.sessionVersion,
      expiresAt: new Date(Date.now() + (purpose === "ACCOUNT_SETUP" ? 24 : 1) * 60 * 60 * 1000),
    } });
    return { ...row, email: user.email };
  });
  if (!token) return false;
  try {
    await sendAccountEmail(token.email, raw, purpose, token.id);
    // A concurrent reissue, email/access change, or password change may have won.
    const result = await getDb().accountToken.updateMany({
      where: { id: token.id, consumedAt: null, expiresAt: { gt: new Date() }, user: { email: token.email, role: "CUSTOMER", sessionVersion: token.sessionVersion } },
      data: { deliveredAt: new Date() },
    });
    return result.count === 1;
  } catch {
    // Even if cleanup fails, deliveredAt remains null and validation fails closed.
    await getDb().accountToken.updateMany({ where: { id: token.id, consumedAt: null }, data: { consumedAt: new Date() } }).catch(() => {});
    return false;
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
