import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { lockAdminActor, AdminSessionChangedError } from "@/lib/auth/admin-transaction";
import { requireAdmin } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db";
import { validTiers } from "@/lib/pricing/tiers";
import { insertCustomer } from "./customer-create";
import { CustomerBatchError, MAX_CUSTOMER_BYTES, parseCustomerCsv, type CustomerImportRow, type CustomerImportIssue } from "./customer-import-csv";
import { batchFingerprint, openCustomerBatch, sealCustomerBatch } from "./customer-batch-token";

export function customerBatchMessage(error: unknown) { return error instanceof CustomerBatchError ? error.message : "Unable to complete this batch. Create a fresh preview and try again."; }
export async function verifyBatchAdmin(tx: Prisma.TransactionClient, admin: { id: string; sessionVersion: number }) {
  try { await lockAdminActor(tx, admin); }
  catch (error) {
    if (error instanceof AdminSessionChangedError) throw new CustomerBatchError(error.message);
    throw error;
  }
}
async function snapshot(tx: Prisma.TransactionClient) {
  const [tiers, users, customers] = await Promise.all([
    tx.pricingTier.findMany({ orderBy: { rank: "asc" } }),
    tx.user.findMany({ select: { id: true, email: true, role: true, active: true, sessionVersion: true, updatedAt: true }, orderBy: { id: "asc" }, take: 5001 }),
    tx.customer.findMany({ select: { id: true, userId: true, companyName: true, customerNumber: true, pricingTierId: true, active: true, updatedAt: true }, orderBy: { id: "asc" }, take: 5001 }),
  ]);
  if (!validTiers(tiers) || users.length > 5000 || customers.length > 5000) throw new CustomerBatchError("Customer or tier data needs review before importing.");
  return { tiers, users, customers, fingerprint: batchFingerprint({ tiers, users, customers }) };
}
function plan(rows: CustomerImportRow[], current: Awaited<ReturnType<typeof snapshot>>) {
  const errors: CustomerImportIssue[] = [];
  const resolved = rows.map((row, index) => {
    const matches = current.tiers.filter((t) => t.name === row.pricingTier);
    if (matches.length !== 1) errors.push({ row: index + 2, field: "pricingTier", message: "Use the exact name of one currently configured tier." });
    if (current.users.some((user) => user.email.trim().toLowerCase() === row.email)) errors.push({ row: index + 2, field: "email", message: "Already belongs to an existing user. Import is create-only." });
    if (current.customers.some((customer) => customer.customerNumber === row.customerNumber)) errors.push({ row: index + 2, field: "customerNumber", message: "Already belongs to an existing customer. Import is create-only." });
    return { ...row, pricingTierId: matches[0]?.id ?? "" };
  });
  return { resolved, errors };
}
export function customerSummary(rows: CustomerImportRow[]) {
  return { count: rows.length, active: rows.filter((r) => r.active).length, inactive: rows.filter((r) => !r.active).length,
    tiers: [...new Set(rows.map((r) => r.pricingTier))].map((name) => ({ name, count: rows.filter((r) => r.pricingTier === name).length })) };
}
export async function previewCustomerImport(file: unknown) {
  const admin = await requireAdmin();
  try {
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".csv") || !file.size || file.size > MAX_CUSTOMER_BYTES) throw new CustomerBatchError("Choose a nonempty .csv file no larger than 128 KiB.");
    const parsed = parseCustomerCsv(new Uint8Array(await file.arrayBuffer()));
    if (parsed.errors.length) return { status: "invalid" as const, message: "No accounts created. Correct the CSV errors.", errors: parsed.errors };
    const current = await getDb().$transaction(snapshot, { isolationLevel: "RepeatableRead" });
    const result = plan(parsed.rows, current);
    if (result.errors.length) return { status: "invalid" as const, message: "No accounts created. Correct the CSV errors.", errors: result.errors };
    const token = sealCustomerBatch({ kind: "import", adminId: admin.id, sessionVersion: admin.sessionVersion, expiresAt: Date.now() + 600000, snapshot: current.fingerprint, rows: parsed.rows });
    return { status: "preview" as const, token, rows: parsed.rows, summary: customerSummary(parsed.rows) };
  } catch (error) { return { status: "invalid" as const, message: customerBatchMessage(error), errors: [] }; }
}
export async function confirmCustomerImport(token: unknown, confirmed: boolean) {
  const admin = await requireAdmin();
  try {
    if (confirmed !== true) throw new CustomerBatchError("Confirm the customer creation before importing.");
    const staged = openCustomerBatch(token, admin);
    if (staged.kind !== "import") throw new CustomerBatchError("Wrong preview. Upload the customer CSV again.");
    await getDb().$transaction(async (tx) => {
      await verifyBatchAdmin(tx, admin);
      const current = await snapshot(tx);
      if (current.fingerprint !== staged.snapshot || staged.expiresAt <= Date.now()) throw new CustomerBatchError("Customer or tier data changed, or the preview expired. No accounts created. Upload again.");
      const result = plan(staged.rows, current);
      if (result.errors.length) throw new CustomerBatchError("The batch no longer validates. Upload again.");
      for (const row of result.resolved) await insertCustomer(tx, { ...row, status: row.active ? "active" : "disabled" });
    }, { isolationLevel: "Serializable", maxWait: 5000, timeout: 30000 });
    return { status: "success" as const, message: `${staged.rows.length} customer accounts created. No invitations were sent.`, summary: customerSummary(staged.rows) };
  } catch (error) { return { status: "invalid" as const, message: customerBatchMessage(error) }; }
}
