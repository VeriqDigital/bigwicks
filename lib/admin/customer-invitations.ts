import "server-only";
import { setTimeout as pause } from "node:timers/promises";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db";
import { issueAccountToken } from "@/lib/auth/account-tokens";
import { consumeBucket } from "@/lib/auth/rate-limit";
import { customerIdSchema } from "./customer-validation";
import { CustomerBatchError } from "./customer-import-csv";
import { batchFingerprint, MAX_INVITATIONS, openCustomerBatch, sealCustomerBatch } from "./customer-batch-token";
import { customerBatchMessage, verifyBatchAdmin } from "./customer-import";

const idsSchema = z.array(customerIdSchema).min(1).max(MAX_INVITATIONS).refine((ids) => new Set(ids).size === ids.length);
const eligible = { active: true, user: { role: "CUSTOMER" as const, active: true, passwordHash: null } };
async function recipients(ids?: string[]) {
  return getDb().customer.findMany({ where: { ...eligible, ...(ids ? { id: { in: ids } } : {}) }, take: 501, orderBy: { id: "asc" },
    select: { id: true, companyName: true, customerNumber: true, updatedAt: true,
      user: { select: { id: true, email: true, sessionVersion: true, updatedAt: true,
        accountTokens: { where: { purpose: "ACCOUNT_SETUP" }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1, select: { id: true, consumedAt: true, deliveredAt: true, expiresAt: true } } } } } });
}
function recipientDto(row: Awaited<ReturnType<typeof recipients>>[number]) {
  return { id: row.id, companyName: row.companyName, customerNumber: row.customerNumber ?? "", email: row.user.email,
    pending: row.user.accountTokens.some((t) => !t.consumedAt && !!t.deliveredAt && t.expiresAt > new Date()) };
}
export async function listInvitationCandidates() {
  await requireAdmin();
  const rows = await recipients();
  return { rows: rows.slice(0, 500).map(recipientDto), truncated: rows.length > 500 };
}
export async function previewCustomerInvitations(rawIds: unknown) {
  const admin = await requireAdmin();
  try {
    const parsed = idsSchema.safeParse(rawIds);
    if (!parsed.success) throw new CustomerBatchError(`Select 1–${MAX_INVITATIONS} distinct customers.`);
    const rows = await recipients(parsed.data);
    if (rows.length !== parsed.data.length) throw new CustomerBatchError("Some selected accounts are no longer eligible. Refresh the list.");
    const token = sealCustomerBatch({ kind: "invitations", adminId: admin.id, sessionVersion: admin.sessionVersion,
      expiresAt: Date.now() + 600000, snapshot: batchFingerprint(rows), ids: rows.map((r) => r.id) });
    return { status: "preview" as const, token, rows: rows.map(recipientDto) };
  } catch (error) { return { status: "invalid" as const, message: customerBatchMessage(error) }; }
}
export async function confirmCustomerInvitations(token: unknown, confirmed: boolean) {
  const admin = await requireAdmin();
  try {
    if (confirmed !== true) throw new CustomerBatchError("Confirm the displayed recipients before sending invitations.");
    const staged = openCustomerBatch(token, admin);
    if (staged.kind !== "invitations") throw new CustomerBatchError("Wrong preview. Select recipients again.");
    const rows = await recipients(staged.ids);
    if (batchFingerprint(rows) !== staged.snapshot) throw new CustomerBatchError("Selected accounts changed. Review a fresh recipient list.");
    // Atomic cross-instance replay guard. Interrupted batches require a fresh review.
    await getDb().$transaction((tx) => verifyBatchAdmin(tx, admin));
    if (!await consumeBucket(`customer-bulk-invite-preview:${batchFingerprint(token)}`, 1, 600)) throw new CustomerBatchError("This invitation batch was already attempted. Refresh and review delivery status before retrying.");
    const results: { id: string; companyName: string; email: string; accepted: boolean }[] = [];
    for (const [index, row] of rows.entries()) {
      if (index) await pause(600); // Sequential pacing below two provider calls/second.
      let accepted = false;
      try {
        // Re-resolve authorization and recipient state for each outbound operation.
        await getDb().$transaction((tx) => verifyBatchAdmin(tx, admin));
        const current = await recipients([row.id]);
        if (staged.expiresAt > Date.now() && batchFingerprint(current) === batchFingerprint([row]) &&
            await consumeBucket("account-bulk-invite:global", 100, 3600) &&
            await consumeBucket(`account-invite:${row.user.id}`, 3, 900)) {
          accepted = await issueAccountToken(row.user.id, "ACCOUNT_SETUP", row.user.email, row.user.sessionVersion);
        }
      } catch { /* Fixed result only: no provider errors or token material. */ }
      results.push({ id: row.id, companyName: row.companyName, email: row.user.email, accepted });
    }
    return { status: "success" as const, results, message: `${results.filter((r) => r.accepted).length} setup emails accepted for delivery; ${results.filter((r) => !r.accepted).length} not confirmed. Acceptance is not inbox delivery.` };
  } catch (error) { return { status: "invalid" as const, message: customerBatchMessage(error) }; }
}
