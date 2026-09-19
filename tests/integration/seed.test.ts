import { afterAll, expect, it } from "vitest";
import { spawn } from "node:child_process";
import { getDb } from "../../lib/db";
import { hashPassword, verifyPassword } from "../../lib/auth/password";

// The normal integration runner creates and seeds a disposable local cluster.
const db = getDb();
const emails = ["admin@example.test", "tier1@example.test", "tier2@example.test"];
afterAll(async () => { await db.$disconnect(); });

async function snapshot() {
  return {
    users: await db.user.findMany({ where: { email: { in: emails } }, orderBy: { email: "asc" } }),
    customers: await db.customer.findMany({ where: { user: { email: { in: emails } } }, orderBy: { userId: "asc" } }),
    tiers: await db.pricingTier.findMany({ where: { name: { in: ["Tier 1", "Tier 2"] } }, orderBy: { name: "asc" } }),
  };
}

it("safe local seed reruns preserve existing passwords, roles, status, tiers and customer associations", async () => {
  const original = await snapshot();
  expect(original.users).toHaveLength(3);
  expect(original.customers).toHaveLength(2);
  expect(original.tiers).toHaveLength(2);
  const admin = original.users.find(user => user.role === "ADMIN")!;
  const tier1 = original.tiers.find(tier => tier.name === "Tier 1")!;
  const customer = original.customers.find(row => row.pricingTierId !== tier1.id)!;
  const changedPassword = "Fictional-manually-changed-password";
  try {
    await db.user.update({ where: { id: admin.id }, data: {
      passwordHash: await hashPassword(changedPassword), active: false, role: "CUSTOMER", sessionVersion: 7,
    } });
    await db.customer.update({ where: { id: customer.id }, data: {
      pricingTierId: tier1.id, active: false, companyName: "Edited fictional company", customerNumber: "EDITED-FIXTURE",
    } });
    await db.pricingTier.update({ where: { id: tier1.id }, data: { rank: 42 } });
    const before = await snapshot();
    const result = await new Promise<{ code: number | null; output: string }>((resolve, reject) => {
      const child = spawn(process.execPath, ["--conditions=react-server", "--import", "tsx", "prisma/seed.ts"], {
        env: { ...process.env, NODE_ENV: "test", ALLOW_DEVELOPMENT_SEED: "true",
          SEED_ADMIN_PASSWORD: "Fictional-new-seed-password", SEED_TIER1_PASSWORD: "Fictional-new-seed-password",
          SEED_TIER2_PASSWORD: "Fictional-new-seed-password" },
        windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
      });
      let output = "";
      child.stdout.on("data", chunk => { output += chunk; });
      child.stderr.on("data", chunk => { output += chunk; });
      child.once("error", reject);
      child.once("exit", code => resolve({ code, output }));
    });
    expect(result.code).toBe(0);
    expect(result.output).toContain("Development fixtures ready");
    expect(result.output).not.toContain("Fictional-new-seed-password");
    expect(await snapshot()).toEqual(before);
    expect(await verifyPassword(changedPassword, before.users.find(user => user.id === admin.id)!.passwordHash!)).toBe(true);
  } finally {
    for (const user of original.users) await db.user.update({ where: { id: user.id }, data: user });
    for (const row of original.customers) await db.customer.update({ where: { id: row.id }, data: row });
    for (const tier of original.tiers) await db.pricingTier.update({ where: { id: tier.id }, data: tier });
  }
}, 30000);
