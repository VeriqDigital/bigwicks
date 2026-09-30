import "server-only";
import { failureMessage } from "./runtime/diagnostics.mjs";

export const exportMetadata = {
  state: true,
  kind: true,
  diagnostic: true,
  templateId: true,
  claimedAt: true,
  generatedAt: true,
} as const;
export const referenceValid = (value: unknown): value is string =>
  typeof value === "string" && /^BW-[A-F0-9]{20}$/.test(value);
export const CLAIM_LEASE_MS = 120000;
export function exportRecoveryMessage(record: { state: string; diagnostic: string | null; claimedAt: Date | string | null } | null, now = Date.now()) {
  if (record?.state === "GENERATING") {
    if (record.claimedAt && new Date(record.claimedAt).getTime() > now - CLAIM_LEASE_MS)
      return "Excel generation is currently claimed. Wait until two minutes after the attempt began before retrying.";
    return "The generation claim was interrupted and can now be retried.";
  }
  if (record?.state === "FAILED") return failureMessage(record.diagnostic);
  if (record?.state === "READY") return "The saved Excel export is ready.";
  return "Excel has not been generated. Use Generate/retry Excel to create the saved export.";
}
