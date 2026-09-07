import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { hashPassword } from "../lib/auth/password";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (process.env.NODE_ENV === "production" || process.env.ALLOW_DEVELOPMENT_SEED !== "true") {
    throw new Error("Seed refused: explicitly enable ALLOW_DEVELOPMENT_SEED on a development database.");
  }
  if (!connectionString || !["localhost", "127.0.0.1", "[::1]"].includes(new URL(connectionString).hostname)) {
    throw new Error("Development seeding is restricted to a local PostgreSQL database.");
  }
  const fixtures = [
    { email: "admin@example.test", password: process.env.SEED_ADMIN_PASSWORD, role: "ADMIN" as const },
    { email: "tier1@example.test", password: process.env.SEED_TIER1_PASSWORD, role: "CUSTOMER" as const },
    { email: "tier2@example.test", password: process.env.SEED_TIER2_PASSWORD, role: "CUSTOMER" as const },
  ];
  // Validate and hash before writing anything; never print plaintext passwords.
  const hashes = await Promise.all(fixtures.map(({ password }) => hashPassword(password ?? "")));
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    await db.$transaction(async (tx) => {
      const tiers = await Promise.all(["Tier 1", "Tier 2"].map((name, index) =>
        tx.pricingTier.upsert({ where: { name }, update: {}, create: { name, rank: index + 1 } }),
      ));
      for (const [index, fixture] of fixtures.entries()) {
        // Repeat seeds preserve existing passwords, status, roles and tier changes.
        await tx.user.upsert({
          where: { email: fixture.email }, update: {},
          create: {
            email: fixture.email, passwordHash: hashes[index], role: fixture.role, active: true,
            ...(index > 0 ? { customer: { create: {
              companyName: `Development Customer ${index}`,
              customerNumber: `DEV-${index}`,
              pricingTierId: tiers[index - 1].id,
              active: true,
            } } } : {}),
          },
        });
      }
    });
    console.log("Development fixtures ready: admin@example.test, tier1@example.test, tier2@example.test.");
  } finally {
    await db.$disconnect();
  }
}

main().catch(() => {
  console.error("Development seed failed. Check local database access, opt-in and password requirements in docs/AUTH.md.");
  process.exitCode = 1;
});
