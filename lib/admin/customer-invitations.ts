import "server-only";
import { setTimeout as pause } from "node:timers/promises";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db";
import { issueAccountToken, setupReviewSelect, setupStateFingerprint, type AccountTokenIssueStatus } from "@/lib/auth/account-tokens";
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
      user: { select: { ...setupReviewSelect, updatedAt: true } } } });
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
    const results: { id: string; companyName: string; email: string; status: AccountTokenIssueStatus }[] = [];
    for (const [index, row] of rows.entries()) {
      if (index) await pause(600); // Sequential pacing below two provider calls/second.
      let status: AccountTokenIssueStatus = "not_confirmed";
      try {
        // Re-resolve authorization and recipient state for each outbound operation.
        await getDb().$transaction((tx) => verifyBatchAdmin(tx, admin));
        const current = await recipients([row.id]);
        if (staged.expiresAt <= Date.now() || batchFingerprint(current) !== batchFingerprint([row])) {
          status = "stale";
        } else {
          // rows matched the encrypted preview snapshot. Carry THAT state, never
          // silently adopt a newer token from the pre-loop/per-row rechecks.
          status = await issueAccountToken(row.user.id, { purpose: "ACCOUNT_SETUP", channel: "bulk",
            expectedState: setupStateFingerprint(row.user), reviewExpiresAt: staged.expiresAt });
        }
      } catch { /* Fixed result only: no provider errors or token material. */ }
      results.push({ id: row.id, companyName: row.companyName, email: row.user.email, status });
    }
    const count = (status: AccountTokenIssueStatus) => results.filter((r) => r.status === status).length;
    return { status: "success" as const, results, message: `${count("accepted")} setup emails accepted for delivery; ${count("stale")} changed and not attempted; ${count("ineligible") + count("rate_limited")} other recipients not attempted; ${count("not_confirmed")} not confirmed. Acceptance is not inbox delivery.` };
  } catch (error) { return { status: "invalid" as const, message: customerBatchMessage(error) }; }
}
