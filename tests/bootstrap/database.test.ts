import { afterAll, afterEach, beforeEach, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { applyBootstrap, inspectBootstrap, openBootstrapDb } from "../../scripts/production/bootstrap-core";
import { confirmation, parseRequest, parseTarget, type Request } from "../../scripts/production/plan";
import { authorizeCredentials } from "../../lib/auth/credentials";
import { getDb } from "../../lib/db";
import { verifyPassword } from "../../lib/auth/password";

// This suite is reachable only through a fresh local-cluster harness.
const connection = parseTarget(process.env.DATABASE_URL);
if (connection.target.host !== "127.0.0.1" || connection.target.database !== "bootstrap_disposable" || !process.env.NODE_OPTIONS?.includes("tests/security/isolation.cjs")) throw Error("Use tests/bootstrap/run.mjs only.");
const db = openBootstrapDb(connection);
const args = ["--expected-host", connection.target.host, "--expected-port", String(connection.target.port), "--expected-database", connection.target.database, "--admin-email", "  Initial.Owner@Example.test  ", "--allow-production", "--confirm", confirmation(connection.target)];
const request = parseRequest(args, connection.target);
const password = "Fictional-admin-secret-7C";
const fetchSpy = vi.fn(() => { throw Error("Mail/remote fetch forbidden"); });
vi.stubGlobal("fetch", fetchSpy);
vi.mock("../../lib/auth/account-email", () => { throw Error("Bootstrap must not import account mail"); });
vi.mock("../../lib/auth/account-tokens", () => { throw Error("Bootstrap must not import account tokens"); });

async function snapshot() {
  return { users: await db.user.findMany(), customers: await db.customer.findMany(), tiers: await db.pricingTier.findMany({ orderBy: { rank: "asc" } }),
    prices: await db.productPrice.count(), tokens: await db.accountToken.count(), orders: await db.order.count(), items: await db.orderItem.count(), limits: await db.loginRateLimit.count() };
}
async function planned(): Promise<Request> {
  return { ...request, applyHash: (await inspectBootstrap(db, request)).planHash! };
}
beforeEach(async () => {
  await db.$executeRawUnsafe('DROP TRIGGER IF EXISTS bootstrap_test_failure ON public."User"');
  await db.$executeRawUnsafe('TRUNCATE public."AccountToken", public."OrderItem", public."Order", public."ProductPrice", public."Customer", public."User", public."PricingTier", public."LoginRateLimit"');
});
afterEach(() => { expect(fetchSpy).not.toHaveBeenCalled(); });
afterAll(async () => { await db.$disconnect(); await getDb().$disconnect(); vi.unstubAllGlobals(); });

it("dry-run plans only two tiers and normalized ADMIN with zero writes and a stable hash", async () => {
  const before = await snapshot(); const plan = await inspectBootstrap(db, request);
  expect(plan).toMatchObject({ status: "ready", adminEmail: "initial.owner@example.test", create: { tiers: [{ name: "Tier 1", rank: 1 }, { name: "Tier 2", rank: 2 }], admin: { role: "ADMIN", active: true, sessionVersion: 0, customer: null } } });
  expect(plan.planHash).toMatch(/^[a-f0-9]{64}$/);
  expect(await inspectBootstrap(db, request)).toEqual(plan); expect(await snapshot()).toEqual(before);
  const changed = await inspectBootstrap(db, { ...request, email: "different@example.test" });
  expect(changed.planHash).not.toBe(plan.planHash);
});
it("applies exactly 2 tiers + 1 ADMIN, never customers/prices/tokens/orders/limiter rows or mail", async () => {
  for (const name of ["AUTH_SECRET", "AUTH_URL", "RESEND_API_KEY", "ACCOUNT_FROM_EMAIL"]) expect(process.env[name]).toBeUndefined();
  expect((await applyBootstrap(db, await planned(), password)).status).toBe("created");
  const state = await snapshot();
  expect(state.users).toHaveLength(1); expect(state.tiers.map(({ name, rank }) => ({ name, rank }))).toEqual([{ name: "Tier 1", rank: 1 }, { name: "Tier 2", rank: 2 }]);
  expect(state.users[0]).toMatchObject({ email: request.email, role: "ADMIN", active: true, sessionVersion: 0 });
  expect(state.users[0].passwordHash).toMatch(/^\$argon2id\$/); expect(await verifyPassword(password, state.users[0].passwordHash!)).toBe(true);
  expect(state).toMatchObject({ customers: [], prices: 0, tokens: 0, orders: 0, items: 0, limits: 0 });
});
it("authenticates the created ADMIN through existing normalized credential login; wrong password fails", async () => {
  await applyBootstrap(db, await planned(), password);
  // AUTH_SECRET is supplied for existing login's limiter only, never bootstrap.
  vi.stubEnv("AUTH_SECRET", "fictional-login-only-secret-1234567890");
  try {
    expect(await authorizeCredentials({ email: " INITIAL.OWNER@EXAMPLE.TEST ", password })).toMatchObject({ sessionVersion: 0 });
    expect(await authorizeCredentials({ email: request.email, password: "wrong-password" })).toBeNull();
  } finally { vi.unstubAllEnvs(); }
});
it.each([14, 129])("rejects password length %i with no writes", async length => {
  const before = await snapshot(); await expect(applyBootstrap(db, await planned(), "x".repeat(length))).rejects.toThrow(/15 to 128/);
  expect(await snapshot()).toEqual(before);
});
it.each([15, 128])("accepts password length boundary %i using centralized hashing", async length => {
  await applyBootstrap(db, await planned(), "x".repeat(length));
  expect(await verifyPassword("x".repeat(length), (await db.user.findFirstOrThrow()).passwordHash!)).toBe(true);
});
it("repeat reports exact completion without changing password or any state", async () => {
  const plan = await planned(); await applyBootstrap(db, plan, password); const before = await snapshot();
  expect((await inspectBootstrap(db, request)).status).toBe("already-complete");
  expect((await applyBootstrap(db, plan, "Different-unused-password")).status).toBe("already-complete");
  expect(await snapshot()).toEqual(before);
});
it.each([
  [{ name: "Tier 1", rank: 2 }], [{ name: "Tier 3", rank: 3 }], [{ name: "Renamed", rank: 1 }],
  [{ name: "Tier 1", rank: 1 }], [{ name: "Tier 1", rank: 1 }, { name: "Tier 2", rank: 2 }],
].map(data => ({ data })))("refuses wrong/partial tier state %$ without repair", async ({ data }) => {
  await db.pricingTier.createMany({ data }); const before = await snapshot();
  await expect(inspectBootstrap(db, request)).rejects.toThrow(/Partial|Unexpected/); expect(await snapshot()).toEqual(before);
});
it.each(["CUSTOMER", "ADMIN"] as const)("refuses existing %s and never elevates or repairs", async role => {
  await db.user.create({ data: { email: request.email, role } }); const before = await snapshot();
  await expect(inspectBootstrap(db, request)).rejects.toThrow(); expect(await snapshot()).toEqual(before);
});
it("refuses different ADMIN and altered activation/version even after completed bootstrap", async () => {
  await applyBootstrap(db, await planned(), password);
  await expect(inspectBootstrap(db, { ...request, email: "another@example.test" })).rejects.toThrow();
  for (const data of [{ active: false }, { active: true, sessionVersion: 1 }]) {
    await db.user.update({ where: { email: request.email }, data }); const before = await snapshot();
    await expect(inspectBootstrap(db, request)).rejects.toThrow(); expect(await snapshot()).toEqual(before);
  }
});
it("refuses any preexisting Customer relation and prices", async () => {
  const tier = await db.pricingTier.create({ data: { name: "Tier 1", rank: 1 } });
  await db.user.create({ data: { email: request.email, role: "CUSTOMER", customer: { create: { companyName: "Fictional", pricingTierId: tier.id } } } });
  await db.productPrice.create({ data: { pricingTierId: tier.id, catalogKey: "11111111-1111-4111-8111-111111111111", price: "1.00" } });
  const before = await snapshot(); await expect(inspectBootstrap(db, request)).rejects.toThrow(/Unexpected/); expect(await snapshot()).toEqual(before);
});
it("refuses a stale plan after dry-run and accepts no apply without review", async () => {
  const plan = await planned(); await db.pricingTier.create({ data: { name: "Tier 1", rank: 1 } }); const before = await snapshot();
  await expect(applyBootstrap(db, plan, password)).rejects.toThrow(); expect(await snapshot()).toEqual(before);
  await expect(applyBootstrap(db, request, password)).rejects.toThrow(/reviewed/);
});
it("binds email, port, target and authoritative tiers/migrations in reviewed hash", async () => {
  const plan = await planned();
  await expect(applyBootstrap(db, { ...plan, email: "changed@example.test" }, password)).rejects.toThrow(/stale/);
  await expect(applyBootstrap(db, { ...plan, target: { ...plan.target, port: plan.target.port + 1 } }, password)).rejects.toThrow(/stale/);
  const before = await snapshot(); expect(before.users).toHaveLength(0); expect(before.tiers).toHaveLength(0);
});
it("serializes simultaneous callers: exactly one creation and one zero-write completion", async () => {
  const other = openBootstrapDb(connection);
  try {
    const plan = await planned(); const results = await Promise.all([applyBootstrap(db, plan, password), applyBootstrap(other, plan, password)]);
    expect(results.map(r => r.status).sort()).toEqual(["already-complete", "created"]);
    expect(await db.user.count()).toBe(1); expect(await db.pricingTier.count()).toBe(2); expect(await db.customer.count()).toBe(0);
  } finally { await other.$disconnect(); }
});
it("rolls back tiers if ADMIN creation fails, exposing no raw SQL exception", async () => {
  await db.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION public.bootstrap_test_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'FICTIONAL_PRIVATE_SQL_DETAIL'; END $$`);
  await db.$executeRawUnsafe('CREATE TRIGGER bootstrap_test_failure BEFORE INSERT ON public."User" FOR EACH ROW EXECUTE FUNCTION public.bootstrap_test_fail()');
  const before = await snapshot();
  await expect(applyBootstrap(db, await planned(), password)).rejects.toThrow(/transaction\/result failed/);
  expect(await snapshot()).toEqual(before);
});
it("refuses missing/changed migration history and inaccessible schema without repairs", async () => {
  const row = await db.$queryRaw<{ id: string; checksum: string }[]>`SELECT id, checksum FROM public."_prisma_migrations" ORDER BY migration_name LIMIT 1`;
  try {
    await db.$executeRaw`UPDATE public."_prisma_migrations" SET checksum = ${"0".repeat(64)} WHERE id = ${row[0].id}`;
    await expect(inspectBootstrap(db, request)).rejects.toThrow(/Migration history/);
  } finally { await db.$executeRaw`UPDATE public."_prisma_migrations" SET checksum = ${row[0].checksum} WHERE id = ${row[0].id}`; }
  await db.$executeRawUnsafe('ALTER TABLE public."Customer" RENAME TO "Customer_bootstrap_test"');
  try { await expect(inspectBootstrap(db, request)).rejects.toThrow(/inspection failed/); }
  finally { await db.$executeRawUnsafe('ALTER TABLE public."Customer_bootstrap_test" RENAME TO "Customer"'); }
});
it("refuses absent migration history and failed migration records", async () => {
  await db.$executeRawUnsafe('ALTER TABLE public."_prisma_migrations" RENAME TO "_prisma_migrations_bootstrap_test"');
  try { await expect(inspectBootstrap(db, request)).rejects.toThrow(/inspection failed/); }
  finally { await db.$executeRawUnsafe('ALTER TABLE public."_prisma_migrations_bootstrap_test" RENAME TO "_prisma_migrations"'); }
  const [row] = await db.$queryRaw<{ id: string; finished_at: Date }[]>`SELECT id, finished_at FROM public."_prisma_migrations" ORDER BY migration_name LIMIT 1`;
  try {
    await db.$executeRaw`UPDATE public."_prisma_migrations" SET finished_at = NULL WHERE id = ${row.id}`;
    await expect(inspectBootstrap(db, request)).rejects.toThrow(/Migration history/);
  } finally { await db.$executeRaw`UPDATE public."_prisma_migrations" SET finished_at = ${row.finished_at} WHERE id = ${row.id}`; }
  expect((await snapshot()).users).toHaveLength(0);
});
it("refuses preexisting limiter activity or account tokens without deleting anything", async () => {
  await db.loginRateLimit.create({ data: { key: "a".repeat(64), attempts: 1, expiresAt: new Date() } });
  const before = await snapshot(); await expect(inspectBootstrap(db, request)).rejects.toThrow(/Unexpected/); expect(await snapshot()).toEqual(before);
  await db.loginRateLimit.deleteMany();
  await applyBootstrap(db, await planned(), password);
  const user = await db.user.findFirstOrThrow();
  await db.accountToken.create({ data: { userId: user.id, tokenHash: "b".repeat(64), purpose: "PASSWORD_RESET", sessionVersion: 0, expiresAt: new Date() } });
  const complete = await snapshot(); await expect(inspectBootstrap(db, request)).rejects.toThrow(/Unexpected/); expect(await snapshot()).toEqual(complete);
});
it("mismatched expected host/database/confirmation never reaches a write", async () => {
  const before = await snapshot();
  for (const flag of ["--expected-host", "--expected-database", "--confirm", "--allow-production"]) {
    const invalid = [...args]; const index = invalid.indexOf(flag);
    if (flag === "--allow-production") invalid.splice(index, 1); else invalid[index + 1] = "mismatch";
    const result = spawnSync(process.execPath, ["--conditions=react-server", "--import", "tsx", "scripts/production/bootstrap.ts", ...invalid], { env: process.env, encoding: "utf8", windowsHide: true, timeout: 20000 });
    expect(result.status).toBe(1); safeOutput(result);
  }
  expect(await snapshot()).toEqual(before);
});

function cli(extra: string[] = [], overrides: Record<string, string> = {}) {
  return spawnSync(process.execPath, ["--conditions=react-server", "--import", "tsx", "scripts/production/bootstrap.ts", ...args, ...extra], {
    env: { ...process.env, ...overrides }, encoding: "utf8", windowsHide: true, timeout: 20000,
  });
}
function safeOutput(result: ReturnType<typeof cli>) {
  const text = result.stdout + result.stderr;
  for (const secret of [password, connection.password, encodeURIComponent(connection.password), process.env.DATABASE_URL!, "encoded%40fictional-secret", "encoded@fictional-secret"]) expect(text).not.toContain(secret);
  expect(text).not.toMatch(/\$argon2id\$|FICTIONAL_PRIVATE_SQL_DETAIL/);
}
it("CLI dry-run never prompts/writes; non-TTY apply and password flags refuse with safe output", async () => {
  const before = await snapshot(); const dry = cli(); expect(dry.status, dry.stderr).toBe(0); safeOutput(dry); expect(dry.stdout).toContain('"planHash"');
  const plan = await planned(); const apply = cli(["--apply", plan.applyHash!]);
  expect(apply.status).toBe(1); expect(apply.stderr).toMatch(/interactive terminal/); safeOutput(apply);
  const forbidden = cli(["--password", password]); expect(forbidden.status).toBe(1); safeOutput(forbidden);
  const wrong = cli([], { DATABASE_URL: "postgresql://operator:encoded%40fictional-secret@127.0.0.1:1/wrong_database" });
  expect(wrong.status).toBe(1); expect(wrong.stderr).toMatch(/Expected host/); safeOutput(wrong);
  expect(await snapshot()).toEqual(before);
});
it("CLI connection failure is sanitized and seed remains production/nonlocal guarded", () => {
  const brokenArgs = args.map(value => value === String(connection.target.port) ? "1" : value === confirmation(connection.target) ? `127.0.0.1:1/${connection.target.database}` : value);
  const failed = spawnSync(process.execPath, ["--conditions=react-server", "--import", "tsx", "scripts/production/bootstrap.ts", ...brokenArgs], { env: { ...process.env, DATABASE_URL: `postgresql://postgres:${encodeURIComponent(connection.password)}@127.0.0.1:1/bootstrap_disposable` }, encoding: "utf8", windowsHide: true });
  expect(failed.status).toBe(1); safeOutput(failed); expect(failed.stderr).toContain("inspection failed");
  for (const overrides of [{ NODE_ENV: "production" }, { DATABASE_URL: "postgresql://fictional:fictional@remote.example.test/test", NODE_ENV: "test" }] as const) {
    const seeded = spawnSync(process.execPath, ["--conditions=react-server", "--import", "tsx", "prisma/seed.ts"], { env: { ...process.env, ALLOW_DEVELOPMENT_SEED: "true", ...overrides }, encoding: "utf8", windowsHide: true, timeout: 10000 });
    expect(seeded.status).toBe(1); expect(seeded.stderr).toContain("Development seed failed"); safeOutput(seeded);
  }
  for (const name of readdirSync("scripts/production")) {
    expect(readFileSync(`scripts/production/${name}`, "utf8")).not.toMatch(/(?:from|import\s*)\s*["'][^"']*(?:seed|account-email|account-tokens|invitation|resend)/i);
  }
});
