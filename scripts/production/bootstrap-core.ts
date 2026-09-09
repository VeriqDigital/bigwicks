import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../../generated/prisma/client";
import { hashPassword } from "../../lib/auth/password";
import { BootstrapError, digest, parseTarget, tiers, type Request } from "./plan";

export function openBootstrapDb(connection: ReturnType<typeof parseTarget>) {
  const { target, user, password } = connection;
  // Explicit driver fields prevent PG* environment defaults or URL query overrides
  // from silently changing the target. Never pass/log the connection URI.
  return new PrismaClient({ adapter: new PrismaPg({
    host: target.host === "[::1]" ? "::1" : target.host, port: target.port,
    database: target.database, user, password, ssl: target.tls ? { rejectUnauthorized: true } : false,
    options: "-c search_path=public", max: 1, connectionTimeoutMillis: 5000, statement_timeout: 10000,
  }, { schema: "public" }), log: [] });
}

function expectedMigrations() {
  const directory = new URL("../../prisma/migrations/", import.meta.url);
  return readdirSync(directory, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => {
    const raw = readFileSync(new URL(`${entry.name}/migration.sql`, directory), "utf8");
    const lf = raw.replaceAll("\r\n", "\n");
    const checksum = (text: string) => createHash("sha256").update(text).digest("hex");
    return { name: entry.name, checksum: checksum(lf), accepted: [checksum(raw), checksum(lf), checksum(lf.replaceAll("\n", "\r\n"))] };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

async function readState(tx: Prisma.TransactionClient, request: Request) {
  const [identity] = await tx.$queryRaw<{ database: string }[]>`SELECT current_database() AS database`;
  if (identity.database !== request.target.database) throw new BootstrapError("Connected database identity differs from the reviewed target. STOP.");
  const migrations = await tx.$queryRaw<{ migration_name: string; checksum: string; finished: boolean; rolled_back: boolean; applied_steps_count: number }[]>`
    SELECT migration_name, checksum, finished_at IS NOT NULL AS finished,
      rolled_back_at IS NOT NULL AS rolled_back, applied_steps_count
    FROM public."_prisma_migrations" ORDER BY migration_name`;
  const expected = expectedMigrations();
  if (expected.length !== 6 || migrations.length !== expected.length || migrations.some((row, i) =>
    row.migration_name !== expected[i].name || !row.finished || row.rolled_back || row.applied_steps_count < 1 || !expected[i].accepted.includes(row.checksum))) {
    throw new BootstrapError("Migration history is incomplete or differs from the reviewed six migrations. Run the documented migration phase separately; investigate drift/failed migrations.");
  }
  const counts = {
    users: await tx.user.count(), admins: await tx.user.count({ where: { role: "ADMIN" } }),
    customerUsers: await tx.user.count({ where: { role: "CUSTOMER" } }), customers: await tx.customer.count(),
    tiers: await tx.pricingTier.count(), prices: await tx.productPrice.count(), tokens: await tx.accountToken.count(),
    orders: await tx.order.count(), orderItems: await tx.orderItem.count(), loginRateLimits: await tx.loginRateLimit.count(),
  };
  if (counts.users > 1 || counts.tiers > 2 || counts.customerUsers || counts.customers || counts.prices || counts.tokens || counts.orders || counts.orderItems || counts.loginRateLimits) {
    throw new BootstrapError("Unexpected existing bootstrap data. STOP and investigate; no automatic cleanup or repair is permitted.");
  }
  const observedTiers = await tx.pricingTier.findMany({ orderBy: { rank: "asc" } });
  // Only a boolean about hash presence/type enters memory for existing users.
  const users = await tx.$queryRaw<{ id: string; email: string; role: string; active: boolean; sessionVersion: number; hasPassword: boolean }[]>`
    SELECT id, email, role, active, "sessionVersion", COALESCE("passwordHash" LIKE '$argon2id$%', false) AS "hasPassword"
    FROM public."User" ORDER BY id`;
  const empty = counts.users === 0 && counts.tiers === 0;
  const admin = users[0];
  const complete = counts.users === 1 && counts.admins === 1 && counts.tiers === 2 &&
    observedTiers.every((tier, i) => tier.name === tiers[i].name && tier.rank === tiers[i].rank) &&
    admin.email === request.email && admin.role === "ADMIN" && admin.active && admin.sessionVersion === 0 && admin.hasPassword;
  if (!empty && !complete) throw new BootstrapError("Partial or unexpected tier/ADMIN state. STOP; bootstrap never overwrites passwords, roles, activation, versions or tiers.");
  const schema = expected.map(({ name, checksum }) => ({ name, checksum }));
  return { status: empty ? "ready" as const : "already-complete" as const, counts,
    fingerprint: digest({ schema, counts, tiers: observedTiers, users }), schema };
}

function planFor(request: Request, state: Awaited<ReturnType<typeof readState>>) {
  const plan = {
    domain: "big-wicks/initial-bootstrap/v1", target: request.target, adminEmail: request.email,
    create: { tiers, admin: { email: request.email, role: "ADMIN", active: true, sessionVersion: 0, customer: null } },
    stateFingerprint: state.fingerprint, migrations: state.schema,
  };
  return { status: state.status, target: request.target, adminEmail: request.email, counts: state.counts,
    ...(state.status === "ready" ? { create: plan.create, planHash: digest(plan) } : {}) };
}

export async function inspectBootstrap(db: PrismaClient, request: Request) {
  try {
    return await db.$transaction(async tx => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      return planFor(request, await readState(tx, request));
    }, { isolationLevel: "RepeatableRead", timeout: 15000 });
  } catch (error) {
    if (error instanceof BootstrapError) throw error;
    throw new BootstrapError("Read-only bootstrap inspection failed. Check target access, public schema and migration phase; no migrations or repairs are automatic.");
  }
}

export async function applyBootstrap(db: PrismaClient, request: Request, password: string) {
  if (!request.applyHash) throw new BootstrapError("Apply requires a reviewed plan hash.");
  const before = await inspectBootstrap(db, request);
  if (before.status === "already-complete") return before;
  if (before.planHash !== request.applyHash) throw new BootstrapError("Reviewed plan is stale or mismatched. Dry-run again and review before applying.");
  if (password.length < 15 || password.length > 128) throw new BootstrapError("Passwords must contain 15 to 128 characters.");
  // Central hashing policy; no terminal input or Argon2 work while holding locks.
  const passwordHash = await hashPassword(password);
  try {
    const result = await db.$transaction(async tx => {
      await tx.$executeRaw`SET LOCAL lock_timeout = '5s'`;
      // Self-conflicting table locks serialize bootstrap callers AND exclude other
      // inserts/updates/deletes until commit. READ COMMITTED reads fresh state after waiting.
      await tx.$executeRaw`LOCK TABLE public."_prisma_migrations", public."User", public."Customer",
        public."PricingTier", public."ProductPrice", public."AccountToken", public."Order",
        public."OrderItem", public."LoginRateLimit" IN SHARE ROW EXCLUSIVE MODE`;
      const current = planFor(request, await readState(tx, request));
      if (current.status === "already-complete") return current;
      if (current.planHash !== request.applyHash) throw new BootstrapError("Reviewed plan changed before commit. STOP and dry-run again.");
      for (const tier of tiers) await tx.pricingTier.create({ data: tier });
      await tx.user.create({ data: { email: request.email, passwordHash, role: "ADMIN", active: true, sessionVersion: 0 } });
      const verified = planFor(request, await readState(tx, request));
      if (verified.status !== "already-complete") throw new BootstrapError("Bootstrap postcondition failed; transaction refused.");
      return { ...verified, status: "created" as const };
    }, { isolationLevel: "ReadCommitted", maxWait: 10000, timeout: 15000 });
    // Independent read-only readback after commit. An uncertain result is never retried automatically.
    const verified = await inspectBootstrap(db, request);
    if (verified.status !== "already-complete") throw new BootstrapError("Post-commit verification differed. STOP and investigate.");
    return { ...verified, status: result.status };
  } catch (error) {
    if (error instanceof BootstrapError) throw error;
    throw new BootstrapError("Bootstrap transaction/result failed. No automatic retry. Dry-run first to determine whether commit occurred; investigate locks, permissions or database errors without exposing credentials.");
  }
}
