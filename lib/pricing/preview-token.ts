import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { MAX_IMPORT_ROWS, PricingError } from "./csv";

const domain = "big-wicks/pricing-preview/v2";
const amount = z.string().regex(/^\d{1,10}\.\d{2}$/).nullable();
const payloadSchema = z.object({
  adminId: z.string(), sessionVersion: z.number().int(), expiresAt: z.number().int(),
  snapshot: z.string().regex(/^[a-f0-9]{64}$/),
  rows: z.array(z.object({ catalogKey: z.uuid(), prices: z.record(z.string().max(130), amount) })).min(1).max(MAX_IMPORT_ROWS),
});
export type PreviewPayload = z.infer<typeof payloadSchema>;
function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new PricingError("Pricing preview is not configured. Contact the site administrator.");
  return createHash("sha256").update(domain).update("\0").update(secret).digest();
}
export function sealPreview(payload: PreviewPayload) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(domain));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  const token = Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
  if (token.length > 512000) throw new PricingError("Pricing preview is too large. Split the CSV into smaller imports.");
  return token;
}
export function openPreview(token: unknown, admin: { id: string; sessionVersion: number }): PreviewPayload {
  try {
    if (typeof token !== "string" || token.length > 512000 || !/^[A-Za-z0-9_-]+$/.test(token)) throw new Error();
    const packed = Buffer.from(token, "base64url");
    if (packed.length < 29 || packed.toString("base64url") !== token) throw new Error();
    const decipher = createDecipheriv("aes-256-gcm", key(), packed.subarray(0, 12));
    decipher.setAAD(Buffer.from(domain)); decipher.setAuthTag(packed.subarray(12, 28));
    const payload = payloadSchema.parse(JSON.parse(Buffer.concat([decipher.update(packed.subarray(28)), decipher.final()]).toString("utf8")));
    if (payload.adminId !== admin.id || payload.sessionVersion !== admin.sessionVersion || payload.expiresAt <= Date.now()) throw new Error();
    return payload;
  } catch { throw new PricingError("This preview is invalid or expired. Upload the CSV again to review a new preview."); }
}
