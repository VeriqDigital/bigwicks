import "server-only";
import { createHash } from "node:crypto";
import { getDb } from "@/lib/db";
import { LIMITS } from "./runtime/limits.mjs";
import { OrderSheetError } from "./worker";

// Private PostgreSQL Bytes boundary. Callers must authorize before reading files.
export const checksum = (bytes: Uint8Array | string) =>
  createHash("sha256").update(bytes).digest("hex");
export function safeFilename(input: string) {
  const name = input
    .split(/[\\/]/)
    .pop()!
    .replace(/[^a-zA-Z0-9._ -]/g, "_")
    .slice(0, 110);
  return `${name.replace(/\.xlsx$/i, "") || "order-sheet"}.xlsx`;
}
export async function readTemplateBytes(id: string) {
  const row = await getDb().orderSheetVersion.findUniqueOrThrow({
    where: { id },
    select: {
      original: true,
      checksum: true,
      configuration: true,
      parserVersion: true,
    },
  });
  if (
    row.original.length > LIMITS.upload ||
    checksum(row.original) !== row.checksum
  )
    throw new OrderSheetError("TEMPLATE_CHECKSUM", "PINNED_CONFIG_INVALID");
  return row;
}
export async function readExportBytes(orderId: string) {
  const row = await getDb().orderExport.findUnique({
    where: { orderId },
    select: {
      state: true,
      kind: true,
      diagnostic: true,
      bytes: true,
      checksum: true,
    },
  });
  if (!row || row.state !== "READY" || !row.bytes) return null;
  if (row.bytes.length > LIMITS.output || checksum(row.bytes) !== row.checksum)
    throw new OrderSheetError(
      "The saved export could not be verified. Contact the site administrator.",
    );
  return {
    bytes: Buffer.from(row.bytes),
    kind: row.kind!,
    diagnostic: row.diagnostic,
  };
}
