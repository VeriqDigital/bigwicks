import { afterAll, beforeEach, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { authorizeCredentials } from "@/lib/auth/credentials";
import { consumeBucket } from "@/lib/auth/rate-limit";
import { resolvePrincipal } from "@/lib/auth/principal";

const db = getDb();
beforeEach(async () => { await db.loginRateLimit.deleteMany(); });
afterAll(async () => { await db.$disconnect(); });

it("authenticates all three seeded identities and their distinct domain associations", async () => {
  for (const [email, password, role, tier] of [
    ["admin@example.test", process.env.SEED_ADMIN_PASSWORD, "ADMIN", undefined],
    ["tier1@example.test", process.env.SEED_TIER1_PASSWORD, "CUSTOMER", "Tier 1"],
    ["tier2@example.test", process.env.SEED_TIER2_PASSWORD, "CUSTOMER", "Tier 2"],
  ]) {
    const identity = await authorizeCredentials({ email, password });
    expect(identity).not.toBeNull();
    const user = await db.user.findUniqueOrThrow({ where: { id: identity!.id }, include: { customer: { include: { pricingTier: true } } } });
    expect(user.role).toBe(role);
    expect(user.customer?.pricingTier.name).toBe(tier);
    expect(Object.keys(identity!).sort()).toEqual(["id", "sessionVersion"]);
  }
});

it("enforces rate limiting atomically under concurrent requests and resets expired windows", async () => {
  const results = await Promise.all(Array.from({ length: 15 }, () => consumeBucket("concurrent-test", 5, 900)));
  expect(results.filter(Boolean)).toHaveLength(5);
  await db.loginRateLimit.updateMany({ data: { expiresAt: new Date(0) } });
  expect(await consumeBucket("concurrent-test", 5, 900)).toBe(true);
});

it("blocks the sixth account attempt even with correct credentials", async () => {
  for (let i = 0; i < 5; i++) {
    expect(await authorizeCredentials({ email: "tier1@example.test", password: "incorrect" })).toBeNull();
  }
  expect(await authorizeCredentials({ email: " TIER1@EXAMPLE.TEST ", password: process.env.SEED_TIER1_PASSWORD })).toBeNull();
});

it("rejects user and business disables and resolves tier changes without reissuing a session", async () => {
  const user = await db.user.findUniqueOrThrow({ where: { email: "tier1@example.test" }, include: { customer: true } });
  const tier2 = await db.pricingTier.findUniqueOrThrow({ where: { name: "Tier 2" } });
  try {
    await db.user.update({ where: { id: user.id }, data: { active: false } });
    expect(await authorizeCredentials({ email: user.email, password: process.env.SEED_TIER1_PASSWORD })).toBeNull();
    expect(await resolvePrincipal(user.id, user.sessionVersion)).toBeNull();
    await db.user.update({ where: { id: user.id }, data: { active: true } });
    await db.customer.update({ where: { userId: user.id }, data: { active: false } });
    expect(await authorizeCredentials({ email: user.email, password: process.env.SEED_TIER1_PASSWORD })).toBeNull();
    expect(await resolvePrincipal(user.id, user.sessionVersion)).toBeNull();
    await db.customer.update({ where: { userId: user.id }, data: { active: true, pricingTierId: tier2.id } });
    expect((await resolvePrincipal(user.id, user.sessionVersion))?.customer?.pricingTierId).toBe(tier2.id);
    await db.user.update({ where: { id: user.id }, data: { sessionVersion: { increment: 1 } } });
    expect(await resolvePrincipal(user.id, user.sessionVersion)).toBeNull();
  } finally {
    await db.user.update({ where: { id: user.id }, data: { active: true, sessionVersion: user.sessionVersion } });
    await db.customer.update({ where: { userId: user.id }, data: { active: true, pricingTierId: user.customer!.pricingTierId } });
  }
});
