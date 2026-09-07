import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { MAX_ORDER_LINES, OrderError, requestedItems } from "./input";

const domain = "big-wicks/order-review/v1";
const schema = z.object({
  userId: z.string(), customerId: z.string(), sessionVersion: z.number().int(),
  submissionId: z.uuid(), expiresAt: z.number().int(), hash: z.string().regex(/^[a-f0-9]{64}$/),
  items: z.array(z.object({ catalogKey: z.uuid(), quantity: z.number().int().min(1).max(999) })).min(1).max(MAX_ORDER_LINES),
});
export type ReviewToken = z.infer<typeof schema>;
function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("Order review is not configured.");
  return createHash("sha256").update(domain).update("\0").update(secret).digest();
}
export function sealOrderReview(payload: ReviewToken) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(domain));
  const bytes = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), bytes]).toString("base64url");
}
export function openOrderReview(token: unknown, user: { id: string; sessionVersion: number; customer: { id: string } }): ReviewToken {
  try {
    if (typeof token !== "string" || token.length > 48000 || !/^[A-Za-z0-9_-]+$/.test(token)) throw new Error();
    const bytes = Buffer.from(token, "base64url");
    if (bytes.length < 29 || bytes.toString("base64url") !== token) throw new Error();
    const decipher = createDecipheriv("aes-256-gcm", key(), bytes.subarray(0, 12));
    decipher.setAAD(Buffer.from(domain)); decipher.setAuthTag(bytes.subarray(12, 28));
    const payload = schema.parse(JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8")));
    if (payload.userId !== user.id || payload.customerId !== user.customer.id || payload.sessionVersion !== user.sessionVersion) throw new Error();
    requestedItems(payload.items);
    // Expiry is checked after the persisted-idempotency lookup. A retry may
    // recover an already-created order, but an expired review cannot create one.
    return payload;
  } catch { throw new OrderError("This review is invalid. Review your order again."); }
}
