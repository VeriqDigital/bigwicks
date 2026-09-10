import { afterAll, afterEach, beforeEach, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import type { Prisma } from "../../generated/prisma/client";
import { createAdditionalAdmin, inspectAdditionalAdmin, parseAddAdminRequest } from "../../scripts/production/add-admin-core";
import { applyBootstrap, inspectBootstrap, openBootstrapDb } from "../../scripts/production/bootstrap-core";
import { BootstrapError, confirmation, parseRequest, parseTarget } from "../../scripts/production/plan";
import { authorizeCredentials } from "../../lib/auth/credentials";
import { getDb } from "../../lib/db";
import { verifyPassword } from "../../lib/auth/password";

const connection = parseTarget(process.env.DATABASE_URL);
if (connection.target.host !== "127.0.0.1" || connection.target.database !== "bootstrap_disposable" || !process.env.NODE_OPTIONS?.includes("tests/security/isolation.cjs")) throw Error("Use tests/bootstrap/run.mjs only.");
const db = openBootstrapDb(connection);
const args = ["--expected-host", connection.target.host, "--expected-port", String(connection.target.port), "--expected-database", connection.target.database, "--admin-email", "  Additional.Owner@Example.test  ", "--allow-production", "--confirm", confirmation(connection.target)];
const request = parseAddAdminRequest(args, connection.target);
const password = "Fictional-additional-admin-7E";
const fetchSpy = vi.fn(() => { throw Error("Mail/remote fetch forbidden"); });
vi.stubGlobal("fetch", fetchSpy);
vi.mock("../../lib/auth/account-email", () => { throw Error("Add-admin must not import mail"); });
vi.mock("../../lib/auth/account-tokens", () => { throw Error("Add-admin must not import tokens"); });

async function snapshot() {
  return {
    users: await db.user.findMany({ orderBy: { email: "asc" } }),
    customers: await db.customer.findMany({ orderBy: { id: "asc" } }),
    tiers: await db.pricingTier.findMany({ orderBy: { rank: "asc" } }),
    prices: await db.productPrice.findMany(), tokens: await db.accountToken.findMany(),
    orders: await db.order.findMany(), items: await db.orderItem.findMany(), limits: await db.loginRateLimit.findMany(),
  };
}
beforeEach(async () => {
  await db.$executeRawUnsafe('DROP TRIGGER IF EXISTS add_admin_test_failure ON public."User"');
  await db.$executeRawUnsafe('TRUNCATE public."AccountToken", public."OrderItem", public."Order", public."ProductPrice", public."Customer", public."User", public."PricingTier", public."LoginRateLimit"');
  const initial = { ...parseRequest(args, connection.target), email: "initial.owner@example.test" };
  const plan = await inspectBootstrap(db, initial);
  await applyBootstrap(db, { ...initial, applyHash: plan.planHash! }, "Fictional-initial-admin-7E");
});
afterEach(() => { expect(fetchSpy).not.toHaveBeenCalled(); vi.restoreAllMocks(); });
afterAll(async () => { await db.$disconnect(); await getDb().$disconnect(); vi.unstubAllGlobals(); });

it("creates exactly one normalized active ADMIN in a running DB without changing any other rows", async () => {
  const tier = await db.pricingTier.findFirstOrThrow();
  const customer = await db.user.create({ data: { email: "customer@example.test", role: "CUSTOMER", active: true, customer: { create: { companyName: "Fictional customer", pricingTierId: tier.id, active: true } } } });
  await db.productPrice.create({ data: { pricingTierId: tier.id, catalogKey: "11111111-1111-4111-8111-111111111111", price: "12.34" } });
  await db.accountToken.create({ data: { userId: customer.id, tokenHash: "a".repeat(64), purpose: "ACCOUNT_SETUP", sessionVersion: 0, expiresAt: new Date() } });
  await db.loginRateLimit.create({ data: { key: "b".repeat(64), attempts: 1, expiresAt: new Date() } });
  const before = await snapshot();
  await inspectAdditionalAdmin(db, request);
  expect(await snapshot()).toEqual(before);
  const result = await createAdditionalAdmin(db, request, password);
  expect(result).toEqual({ email: "additional.owner@example.test", role: "ADMIN", active: true, customersCreated: 0, emailsSent: 0 });
  const after = await snapshot();
  expect(after.users).toHaveLength(before.users.length + 1);
  expect({ ...after, users: after.users.filter(user => user.email !== request.email) }).toEqual(before);
  const admin = await db.user.findUniqueOrThrow({ where: { email: request.email }, include: { customer: true, accountTokens: true } });
  expect(admin).toMatchObject({ role: "ADMIN", active: true, sessionVersion: 0, customer: null, accountTokens: [] });
  expect(admin.passwordHash).toMatch(/^\$argon2id\$/);
  expect(await verifyPassword(password, admin.passwordHash!)).toBe(true);
});
it("does not require any pricing tier state", async () => {
  await db.pricingTier.deleteMany();
  await createAdditionalAdmin(db, request, password);
  expect(await db.pricingTier.count()).toBe(0);
  expect(await db.user.count()).toBe(2);
});
it("authenticates with the existing normalized credential login", async () => {
  await createAdditionalAdmin(db, request, password);
  const admin = await db.user.findUniqueOrThrow({ where: { email: request.email } });
  vi.stubEnv("AUTH_SECRET", "fictional-login-only-secret-1234567890");
  try {
    expect(await authorizeCredentials({ email: " ADDITIONAL.OWNER@EXAMPLE.TEST ", password })).toEqual({ id: admin.id, sessionVersion: 0 });
    expect(await authorizeCredentials({ email: request.email, password: "wrong-password" })).toBeNull();
  } finally { vi.unstubAllEnvs(); }
});
it.each([
  { role: "ADMIN", active: true }, { role: "ADMIN", active: false },
  { role: "CUSTOMER", active: true }, { role: "CUSTOMER", active: false },
] as const)("refuses existing $role active=$active without changing any field or relation", async ({ role, active }) => {
  const tier = await db.pricingTier.findFirstOrThrow();
  await db.user.create({ data: { email: request.email, role, active, sessionVersion: 7, passwordHash: "existing-private-hash", ...(role === "CUSTOMER" ? { customer: { create: { companyName: "Fictional existing", pricingTierId: tier.id, active } } } : {}) } });
  const before = await snapshot();
  await expect(inspectAdditionalAdmin(db, request)).rejects.toThrow(/Email already exists/);
  await expect(createAdditionalAdmin(db, request, password)).rejects.toThrow(/Email already exists/);
  const result = cli(); expect(result.status).toBe(1); expect(result.stderr).toContain("Email already exists"); safeOutput(result);
  expect(await snapshot()).toEqual(before);
});
it.each([14, 129])("refuses password length %i before writing", async length => {
  const before = await snapshot();
  await expect(createAdditionalAdmin(db, request, "x".repeat(length))).rejects.toThrow(/15 to 128/);
  expect(await snapshot()).toEqual(before);
});
it.each([15, 128])("accepts password boundary %i with existing hashing", async length => {
  await createAdditionalAdmin(db, request, "x".repeat(length));
  const admin = await db.user.findUniqueOrThrow({ where: { email: request.email } });
  expect(await verifyPassword("x".repeat(length), admin.passwordHash!)).toBe(true);
});
it("refuses a connected database identity mismatch inside the write transaction", async () => {
  const before = await snapshot();
  await expect(createAdditionalAdmin(db, { ...request, target: { ...request.target, database: "wrong" } }, password)).rejects.toThrow(/identity differs/);
  expect(await snapshot()).toEqual(before);
});
it("races two absent-email checks: the unique constraint permits exactly one ADMIN", async () => {
  const other = openBootstrapDb(connection);
  // Pause both successful absence reads before either insert, deterministically
  // exercising P2002 rather than merely the ordinary existing-row refusal.
  let arrivals = 0;
  let release!: () => void;
  const barrier = new Promise<void>(resolve => { release = resolve; });
  function synchronized(client: typeof db) {
    const transaction = client.$transaction.bind(client);
    return vi.spyOn(client, "$transaction").mockImplementation((async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>, options?: Parameters<typeof client.$transaction>[1]) => {
      return transaction(async tx => {
        const find = tx.user.findUnique.bind(tx.user);
        // The production call only awaits this result; fluent relation methods
        // on Prisma's generic promise are deliberately unused in this barrier.
        vi.spyOn(tx.user, "findUnique").mockImplementation((async (query: Prisma.UserFindUniqueArgs) => {
          const row = await find(query);
          if (++arrivals === 2) release();
          await barrier;
          return row;
        }) as unknown as typeof tx.user.findUnique);
        return callback(tx);
      }, options);
    }) as typeof client.$transaction);
  }
  synchronized(db); synchronized(other);
  try {
    const before = await snapshot();
    const results = await Promise.allSettled([createAdditionalAdmin(db, request, password), createAdditionalAdmin(other, request, password)]);
    expect(arrivals).toBe(2);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const refusal = results.find(result => result.status === "rejected") as PromiseRejectedResult;
    expect(refusal.reason).toBeInstanceOf(BootstrapError);
    expect(refusal.reason.message).toBe("Email already exists. Additional ADMIN creation refused; no existing user was changed.");
    const after = await snapshot();
    expect(after.users.filter(user => user.email === request.email)).toHaveLength(1);
    expect({ ...after, users: after.users.filter(user => user.email !== request.email) }).toEqual(before);
  } finally { release(); await other.$disconnect(); }
});
it.each(["--expected-host", "--expected-port", "--expected-database", "--allow-production", "--confirm"])("CLI refuses invalid %s before writing", async flag => {
  const invalid = [...args]; const index = invalid.indexOf(flag);
  if (flag === "--allow-production") invalid.splice(index, 1); else invalid[index + 1] = "mismatch";
  const before = await snapshot(); const result = cli(invalid);
  expect(result.status).toBe(1); safeOutput(result);
  expect(await snapshot()).toEqual(before);
});
it.each([[], ["--password", "fictional-forbidden-secret"], ["--password=fictional-forbidden-secret"], ["positional-secret"], ["--apply", "a".repeat(64)], ["--confirm", "again"]].map(extra => ({ extra })))("CLI refuses non-TTY or forbidden/repeated arguments %$", async ({ extra }) => {
  const before = await snapshot(); const result = cli([...args, ...extra]);
  expect(result.status).toBe(1); safeOutput(result);
  if (!extra.length) expect(result.stderr).toMatch(/interactive terminal/);
  expect(await snapshot()).toEqual(before);
});
it.each(["", "invalid", "\nowner@example.test", "x".repeat(255) + "@example.test"])("requires a valid control-free email %$", async email => {
  const invalid = [...args]; invalid[invalid.indexOf("--admin-email") + 1] = email;
  const before = await snapshot(); const result = cli(invalid);
  expect(result.status).toBe(1); safeOutput(result); expect(await snapshot()).toEqual(before);
});
it("runs the CLI through both hidden prompts and prints only safe success fields", async () => {
  const before = await snapshot(); const result = cli(args, true);
  expect(result.status, result.stderr).toBe(0); safeOutput(result);
  expect(result.stderr).toContain("Initial ADMIN password"); expect(result.stderr).toContain("Confirm ADMIN password");
  expect(result.stdout).toContain(`Additional ADMIN created:\n- email: ${request.email}\n- role: ADMIN\n- active: true\n- customer created: 0\n- email sent: 0`);
  const after = await snapshot(); expect(after.users).toHaveLength(before.users.length + 1);
  expect({ ...after, users: after.users.filter(user => user.email !== request.email) }).toEqual(before);
});
it("sanitizes SQL failures on the actual CLI and rolls back the create", async () => {
  await db.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION public.add_admin_test_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'FICTIONAL_PRIVATE_SQL_DETAIL'; END $$`);
  await db.$executeRawUnsafe('CREATE TRIGGER add_admin_test_failure AFTER INSERT ON public."User" FOR EACH ROW EXECUTE FUNCTION public.add_admin_test_fail()');
  const before = await snapshot(); const result = cli(args, true);
  expect(result.status).toBe(1); expect(result.stderr).toContain("result is uncertain"); safeOutput(result);
  expect(await snapshot()).toEqual(before);
});
it("sanitizes connection failures without showing credentials", () => {
  const broken = args.map(value => value === String(connection.target.port) ? "1" : value === confirmation(connection.target) ? `127.0.0.1:1/${connection.target.database}` : value);
  const result = cli(broken, false, { DATABASE_URL: `postgresql://postgres:${encodeURIComponent(connection.password)}@127.0.0.1:1/bootstrap_disposable` });
  expect(result.status).toBe(1); expect(result.stderr).toContain("inspection failed"); safeOutput(result);
});

function cli(flags = args, terminal = false, overrides: Record<string, string> = {}) {
  return spawnSync(process.execPath, ["--conditions=react-server", "--import", "tsx", terminal ? "tests/bootstrap/add-admin-cli.ts" : "scripts/production/add-admin.ts", ...flags], {
    env: { ...process.env, ...overrides }, encoding: "utf8", windowsHide: true, timeout: 20000,
  });
}
function safeOutput(result: ReturnType<typeof cli>) {
  const text = result.stdout + result.stderr;
  for (const secret of [password, "existing-private-hash", "fictional-forbidden-secret", "positional-secret", connection.password, encodeURIComponent(connection.password), process.env.DATABASE_URL!]) expect(text).not.toContain(secret);
  expect(text).not.toMatch(/\$argon2id\$|passwordHash|FICTIONAL_PRIVATE_SQL_DETAIL|PrismaClientKnownRequestError|PrismaClientInitializationError/);
}
