import { afterAll, afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Prisma } from "@/generated/prisma/client";
const mock = vi.hoisted(() => ({ auth: vi.fn(), mail: vi.fn(), content: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mock.auth }));
vi.mock("@/lib/auth/account-email", () => ({ accountEmailConfig: () => ({}), sendAccountEmail: mock.mail }));
vi.mock("@/lib/catalog/content", () => ({ readPublishedCatalogContent: mock.content }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw Error(`redirect:${url}`); }, notFound: () => { throw Error("notFound"); } }));
import { getDb } from "@/lib/db";
import * as actorLock from "@/lib/auth/admin-transaction";
import * as tokens from "@/lib/auth/account-tokens";
import { createCustomer, editCustomer, setCustomerStatus } from "@/app/(portal)/admin/customers/actions";
import { sendSetupLink } from "@/app/(portal)/admin/customers/invite-action";
import { previewCustomerInvitations, confirmCustomerInvitations } from "@/lib/admin/customer-invitations";
import { previewCustomerImport, confirmCustomerImport } from "@/lib/admin/customer-import";
import { previewPricingImport, confirmPricingImport } from "@/lib/pricing/service";
import { csvHeaders } from "@/lib/pricing/csv";
import { fictionalProduct } from "../fixtures/catalog";
import { fictionalCustomerCsv } from "../fixtures/customer-batch";

const db = getDb();
const where = { email: { startsWith: "sec04-" } };
const catalogKey = "e4000000-0000-4000-8000-000000000001";
let admin: { id: string; sessionVersion: number }; let tierId: string;
async function cleanup() {
  await db.productPrice.deleteMany({ where: { catalogKey } });
  await db.accountToken.deleteMany({ where: { user: where } });
  await db.customer.deleteMany({ where: { user: where } });
  await db.user.deleteMany({ where });
}
beforeEach(async () => {
  await cleanup(); await db.loginRateLimit.deleteMany();
  admin = await db.user.create({ data: { email: "sec04-admin@example.test", role: "ADMIN", active: true } });
  tierId = (await db.pricingTier.findUniqueOrThrow({ where: { name: "Tier 1" } })).id;
  mock.auth.mockResolvedValue({ user: admin }); mock.mail.mockReset().mockResolvedValue(undefined);
  mock.content.mockResolvedValue([fictionalProduct({ _id: "sec04-product", catalogKey })]);
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  try {
    // P2034 can represent either serialization or deadlock. Check PostgreSQL's
    // own counter as well as safe caller results; do not call both "no deadlock".
    const rows = await db.$queryRaw<{ deadlocks: bigint }[]>`SELECT deadlocks FROM pg_stat_database WHERE datname = current_database()`;
    expect(Number(rows[0].deadlocks)).toBe(0);
  } finally { await cleanup(); await db.$disconnect(); }
});
function form(fields: Record<string, string>) { const f = new FormData(); for (const [k, v] of Object.entries(fields)) f.set(k, v); return f; }
function deferred() { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; }
async function customer(index = 0) {
  return db.user.create({ data: { email: `sec04-customer-${index}@example.test`, role: "CUSTOMER", active: true,
    customer: { create: { companyName: `Fictional SEC-04 ${index}`, active: true, pricingTierId: tierId } } }, include: { customer: true } });
}
type Customer = Awaited<ReturnType<typeof customer>>;
function fields(user?: Customer) { return form({ companyName: "Fictional changed business", email: user?.email ?? "sec04-created@example.test",
  customerNumber: "", pricingTierId: tierId, status: "active", ...(user ? { customerId: user.customer!.id } : {}) }); }
const individual = (user: Customer) => sendSetupLink({}, form({ customerId: user.customer!.id }));
const changes = ["disabled", "version", "role", "deleted"] as const;
async function revoke(kind: typeof changes[number]) {
  if (kind === "deleted") { await db.user.delete({ where: { id: admin.id } }); return; }
  await db.user.update({ where: { id: admin.id }, data: kind === "disabled" ? { active: false } : kind === "version" ? { sessionVersion: { increment: 1 } } : { role: "CUSTOMER" } });
}
// Pause after the real request guard, before the authoritative transaction starts.
// No sleeps; the test awaits a committed revocation before releasing the request.
function transactionBarrier() {
  const ready = deferred(); const release = deferred(); const original = db.$transaction.bind(db);
  const spy = vi.spyOn(db, "$transaction").mockImplementationOnce(async (...args: unknown[]) => {
    ready.resolve(); await release.promise; return Reflect.apply(original, db, args);
  });
  return { ready: ready.promise, release: release.resolve, restore: () => spy.mockRestore() };
}
const operations = ["create", "edit", "status", "individual", "customer import", "pricing import"] as const;
it.each(operations.flatMap(operation => changes.map(change => ({ operation, change }))))(
  "$operation rejects actor $change after its guard and before SQL authorization", async ({ operation, change }) => {
    const user = await customer();
    // An existing setup row proves blocked edits/status/claims also preserve tokens.
    await individual(user); mock.mail.mockClear(); await db.loginRateLimit.deleteMany();
    let run: () => Promise<unknown>;
    if (operation === "customer import") {
      const stage = await previewCustomerImport(new File([fictionalCustomerCsv(2, "sec04-import")], "fictional.csv"));
      if (stage.status !== "preview") throw Error("Missing import preview");
      run = () => confirmCustomerImport(stage.token, true);
    } else if (operation === "pricing import") {
      const stage = await previewPricingImport(new File([`${[...csvHeaders, "price:1:Tier 1", "price:2:Tier 2"].join(",")}\n${catalogKey},,,,,12.34,`], "fictional.csv"));
      if (stage.status !== "preview") throw Error("Missing pricing preview");
      run = () => confirmPricingImport(stage.token, true);
    } else run = () => operation === "create" ? createCustomer({}, fields()) : operation === "edit" ? editCustomer({}, fields(user)) : operation === "status"
      ? setCustomerStatus({}, form({ customerId: user.customer!.id, status: "disabled" })) : individual(user);
    const before = await db.user.findUniqueOrThrow({ where: { id: user.id }, include: { customer: true, accountTokens: true } });
    const barrier = transactionBarrier(); const pending = run();
    try {
      await barrier.ready; await revoke(change); barrier.release();
      const result = await pending as { success?: boolean; status?: string; message?: string };
      expect(result.success).not.toBe(true); expect(result.status).not.toBe("success");
      expect(result.message).toMatch(/session changed|account changed/);
      expect(await db.user.findUniqueOrThrow({ where: { id: user.id }, include: { customer: true, accountTokens: true } })).toEqual(before);
      expect(await db.user.count({ where: { email: { in: ["sec04-created@example.test", "sec04-import-0@example.test", "sec04-import-1@example.test"] } } })).toBe(0);
      expect(await db.customer.count({ where: { user: where } })).toBe(1);
      expect(await db.productPrice.count({ where: { catalogKey } })).toBe(0);
      expect(await db.loginRateLimit.count()).toBe(0); expect(mock.mail).not.toHaveBeenCalled();
    } finally { barrier.release(); await pending; barrier.restore(); }
  }, 10000);

it.each(changes)("bulk preserves recipient 1 and stops recipients 2+ when actor is %s before claim 2", async change => {
  const users = await Promise.all([customer(1), customer(2), customer(3)]);
  const stage = await previewCustomerInvitations(users.map(u => u.customer!.id));
  if (stage.status !== "preview") throw Error("Missing invitation preview");
  const ready = deferred(); const release = deferred(); let calls = 0; const original = tokens.issueAccountToken;
  vi.spyOn(tokens, "issueAccountToken").mockImplementation(async (...args) => {
    if (++calls === 2) { ready.resolve(); await release.promise; }
    return original(...args);
  });
  const pending = confirmCustomerInvitations(stage.token, true);
  try {
    await ready.promise; expect(mock.mail).toHaveBeenCalledTimes(1); await revoke(change); release.resolve();
    const result = await pending;
    expect(result.status === "success" && result.results.map(r => r.status)).toEqual(["accepted", "admin_changed", "admin_changed"]);
    expect(result.message).toContain("2 not attempted"); expect(calls).toBe(2);
    expect(mock.mail).toHaveBeenCalledTimes(1);
    expect(await db.accountToken.count({ where: { user: where } })).toBe(1);
    expect(await tokens.accountTokenUsable(tokens.tokenDigest(mock.mail.mock.calls[0][1])!, "ACCOUNT_SETUP")).toBe(true);
  } finally { release.resolve(); await pending; }
}, 10000);

it.each(changes)("fresh %s actor requests still fail at the normal guard", async change => {
  const user = await customer(); await revoke(change);
  for (const run of [() => createCustomer({}, fields()), () => editCustomer({}, fields(user)), () => individual(user)]) {
    await expect(run()).rejects.toThrow("redirect:/login");
  }
  expect(mock.mail).not.toHaveBeenCalled();
});

async function waitingOnActor() {
  const rows = await db.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*)::bigint AS count FROM pg_stat_activity
    WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE '%User%' AND pid <> pg_backend_pid()`;
  return Number(rows[0].count);
}
it.each(["edit", "individual"])("%s waits for an uncommitted actor revocation and fails safely after it commits", async operation => {
  const user = await customer(); const ready = deferred(); const release = deferred();
  const revocation = db.$transaction(async tx => {
    await tx.user.update({ where: { id: admin.id }, data: { sessionVersion: { increment: 1 } } });
    ready.resolve(); await release.promise;
  }, { timeout: 10000 });
  await ready.promise;
  const pending = operation === "edit" ? editCustomer({}, fields(user)) : individual(user);
  try {
    await expect.poll(waitingOnActor, { timeout: 3000 }).toBe(1);
    release.resolve(); await revocation;
    expect((await pending).success).not.toBe(true);
    expect((await db.customer.findUniqueOrThrow({ where: { id: user.customer!.id } })).companyName).toBe(user.customer!.companyName);
    expect(await db.accountToken.count({ where: { userId: user.id } })).toBe(0); expect(mock.mail).not.toHaveBeenCalled();
  } finally { release.resolve(); await revocation; await pending; }
}, 15000);

it("an authorized mutation holds its actor lock until commit; waiting revocation cannot undo it", async () => {
  const user = await customer(); const ready = deferred(); const release = deferred(); const original = actorLock.lockAdminActor;
  vi.spyOn(actorLock, "lockAdminActor").mockImplementationOnce(async (...args) => {
    await original(...args); ready.resolve(); await release.promise;
  });
  const pending = editCustomer({}, fields(user)); let revocation: Promise<unknown> | undefined;
  try {
    await ready.promise; revocation = revoke("version");
    await expect.poll(waitingOnActor, { timeout: 3000 }).toBe(1);
    release.resolve(); expect((await pending).success).toBe(true); await revocation;
    expect((await db.customer.findUniqueOrThrow({ where: { id: user.customer!.id } })).companyName).toBe("Fictional changed business");
    await expect(editCustomer({}, fields(user))).rejects.toThrow("redirect:/login");
  } finally { release.resolve(); await pending; await revocation; }
}, 15000);

it("claim commits before mail; actor and recipient locks are free during provider I/O and later revocation permits acceptance", async () => {
  const user = await customer(); const ready = deferred(); const release = deferred();
  mock.mail.mockImplementationOnce(async () => { ready.resolve(); await release.promise; });
  const pending = individual(user);
  try {
    await ready.promise;
    await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${admin.id} FOR UPDATE NOWAIT`;
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${user.id} FOR UPDATE NOWAIT`;
      await tx.user.update({ where: { id: admin.id }, data: { active: false } });
    });
    release.resolve(); expect((await pending).success).toBe(true);
    expect(await tokens.accountTokenUsable(tokens.tokenDigest(mock.mail.mock.calls[0][1])!, "ACCOUNT_SETUP")).toBe(true);
  } finally { release.resolve(); await pending; }
}, 10000);

it.each(["two customers", "same customer", "edit vs invite"])("bounded same-admin concurrency: %s has no lock-order deadlock", async scenario => {
  const a = await customer(1); const b = scenario === "two customers" ? await customer(2) : a;
  const ready = deferred(); const release = deferred(); let arrivals = 0; const original = actorLock.lockAdminActor;
  vi.spyOn(actorLock, "lockAdminActor").mockImplementation(async (tx: Prisma.TransactionClient, actor: actorLock.AdminActor) => {
    await original(tx, actor); if (++arrivals === 2) ready.resolve(); await release.promise;
  });
  const transaction = db.$transaction.bind(db); const sqlFailures: unknown[] = [];
  vi.spyOn(db, "$transaction").mockImplementation(async (...args: unknown[]) => {
    try { return await Reflect.apply(transaction, db, args); }
    catch (error) { sqlFailures.push(error); throw error; }
  });
  const pending = Promise.all([editCustomer({}, fields(a)), scenario === "edit vs invite" ? individual(b) : editCustomer({}, fields(b))]);
  try {
    await ready.promise; release.resolve(); const results = await pending;
    expect(results.some(r => r.success)).toBe(true);
    if (scenario === "two customers") expect(results.every(r => r.success)).toBe(true);
    // SERIALIZABLE may reject a same-target stale snapshot: safe retry, no raw SQL.
    for (const result of results) if (!result.success) expect(result.message).toMatch(/changed during your request|No setup email was attempted/);
    for (const failure of sqlFailures) {
      expect(JSON.stringify(failure)).not.toMatch(/40P01|deadlock detected/i);
    }
    expect(arrivals).toBe(2);
  } finally { release.resolve(); await pending; }
}, 15000);
