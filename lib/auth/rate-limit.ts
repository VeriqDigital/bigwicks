import "server-only";
import { createHmac } from "node:crypto";
import { getDb } from "@/lib/db";

export async function consumeBucket(identity: string, limit: number, seconds: number) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must contain at least 32 characters.");
  const key = createHmac("sha256", secret).update(identity).digest("hex");
  // Atomic, bounded counter: concurrent requests cannot exceed the allowance.
  // PostgreSQL time avoids differences between application-instance clocks.
  const rows = await getDb().$queryRaw<{ attempts: number }[]>`
    INSERT INTO "LoginRateLimit" ("key", "attempts", "expiresAt")
    VALUES (${key}, 1, NOW() + make_interval(secs => ${seconds}::int))
    ON CONFLICT ("key") DO UPDATE SET
      "attempts" = CASE WHEN "LoginRateLimit"."expiresAt" <= NOW()
        THEN 1 ELSE "LoginRateLimit"."attempts" + 1 END,
      "expiresAt" = CASE WHEN "LoginRateLimit"."expiresAt" <= NOW()
        THEN NOW() + make_interval(secs => ${seconds}::int)
        ELSE "LoginRateLimit"."expiresAt" END
    WHERE "LoginRateLimit"."expiresAt" <= NOW() OR "LoginRateLimit"."attempts" < ${limit}
    RETURNING "attempts"
  `;
  return rows.length === 1;
}

export async function cleanupExpiredBuckets() {
  await getDb().$executeRaw`DELETE FROM "LoginRateLimit" WHERE "expiresAt" < NOW()`;
}

export async function allowCredentialAttempt(email: string) {
  // Global cap also bounds random-email spraying and password-hash resource use.
  // No reliance on client-controlled IP/forwarding headers.
  if (!await consumeBucket("global", 100, 60)) return false;
  await cleanupExpiredBuckets();
  return consumeBucket(`email:${email}`, 5, 15 * 60);
}
