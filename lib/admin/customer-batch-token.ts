import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { importRowSchema, CustomerBatchError, MAX_CUSTOMER_ROWS } from "./customer-import-csv";
import { customerIdSchema } from "./customer-validation";

export const MAX_INVITATIONS = 25;
const domain = "big-wicks/customer-batch-preview/v1";
const base = z.object({ adminId: z.string(), sessionVersion: z.number().int(), expiresAt: z.number().int(), snapshot: z.string().regex(/^[a-f0-9]{64}$/) });
const payloadSchema = z.discriminatedUnion("kind", [
  base.extend({ kind: z.literal("import"), rows: z.array(importRowSchema).min(1).max(MAX_CUSTOMER_ROWS) }).strict(),
  base.extend({ kind: z.literal("invitations"), ids: z.array(customerIdSchema).min(1).max(MAX_INVITATIONS) }).strict(),
]);
export type CustomerBatchPayload = z.infer<typeof payloadSchema>;
export const batchFingerprint = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new CustomerBatchError("Customer previews are not configured.");
  return createHash("sha256").update(domain).update("\0").update(secret).digest();
}
export function sealCustomerBatch(payload: CustomerBatchPayload) {
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(domain));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payloadSchema.parse(payload)), "utf8"), cipher.final()]);
  const token = Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
  if (token.length > 512000) throw new CustomerBatchError("Preview too large. Split the CSV.");
  return token;
}
export function openCustomerBatch(token: unknown, admin: { id: string; sessionVersion: number }) {
  try {
    if (typeof token !== "string" || token.length > 512000 || !/^[A-Za-z0-9_-]+$/.test(token)) throw Error();
    const packed = Buffer.from(token, "base64url");
    if (packed.length < 29 || packed.toString("base64url") !== token) throw Error();
    const decipher = createDecipheriv("aes-256-gcm", key(), packed.subarray(0, 12));
    decipher.setAAD(Buffer.from(domain)); decipher.setAuthTag(packed.subarray(12, 28));
    const data = payloadSchema.parse(JSON.parse(Buffer.concat([decipher.update(packed.subarray(28)), decipher.final()]).toString("utf8")));
    if (data.adminId !== admin.id || data.sessionVersion !== admin.sessionVersion || data.expiresAt <= Date.now()) throw Error();
    return data;
  } catch { throw new CustomerBatchError("This preview is invalid or expired. Create a new preview."); }
}
