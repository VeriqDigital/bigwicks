import { afterAll, afterEach, beforeEach, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@/generated/prisma/client";
const mock = vi.hoisted(() => ({ auth: vi.fn(), mail: vi.fn(), config: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mock.auth }));
vi.mock("@/lib/auth/account-email", () => ({ accountEmailConfig: mock.config, sendAccountEmail: mock.mail }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw Error(`redirect:${url}`); }, notFound: () => { throw Error("notFound"); } }));
import { getDb } from "@/lib/db";
import * as tokens from "@/lib/auth/account-tokens";
import { previewCustomerInvitations, confirmCustomerInvitations } from "@/lib/admin/customer-invitations";
import { openCustomerBatch, sealCustomerBatch } from "@/lib/admin/customer-batch-token";
import { sendSetupLink } from "@/app/(portal)/admin/customers/invite-action";

const db = getDb();
const where = { email: { startsWith: "rel01-" } };
let tierId: string;
let admin: { id: string; sessionVersion: number };
async function cleanup() {
  await db.accountToken.deleteMany({ where: { user: where } });
  await db.customer.deleteMany({ where: { user: where } });
  await db.user.deleteMany({ where });
}
beforeEach(async () => {
  await cleanup(); await db.loginRateLimit.deleteMany();
  mock.mail.mockReset().mockResolvedValue(undefined); mock.config.mockReset().mockReturnValue({});
  admin = await db.user.findUniqueOrThrow({ where: { email: "admin@example.test" } });
  mock.auth.mockResolvedValue({ user: admin });
  tierId = (await db.pricingTier.findUniqueOrThrow({ where: { name: "Tier 1" } })).id;
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => { await cleanup(); await db.$disconnect(); });
async function customer(index = 0) {
  return db.user.create({ data: { email: `rel01-${index}@example.test`, role: "CUSTOMER", active: true,
    customer: { create: { companyName: `Fictional REL-01 ${index}`, active: true, pricingTierId: tierId } } }, include: { customer: true } });
}
type Customer = Awaited<ReturnType<typeof customer>>;
function individual(user: Customer) { const form = new FormData(); form.set("customerId", user.customer!.id); return sendSetupLink({}, form); }
async function preview(users: Customer[]) {
  const result = await previewCustomerInvitations(users.map(u => u.customer!.id));
  if (result.status !== "preview") throw Error("Missing fictional preview");
  return result;
}
async function review(user: Customer, channel: "individual" | "bulk" = "individual") {
  const row = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: tokens.setupReviewSelect });
  return { purpose: "ACCOUNT_SETUP", channel, expectedState: tokens.setupStateFingerprint(row) } as const;
}
function deferred() { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; }
// Both server-trusted reviews reach issuance before either can acquire User.
// This forces the pre-fix send/send race without sleeps or production hooks.
function claimBarrier(count: number, userId?: string) {
  const gate = deferred(); const ready = deferred(); let arrived = 0;
  const original = tokens.issueAccountToken;
  const spy = vi.spyOn(tokens, "issueAccountToken").mockImplementation(async (...args) => {
    if (!userId || args[0] === userId) { if (++arrived === count) ready.resolve(); await gate.promise; }
    return original(...args);
  });
  return { ready: ready.promise, release: gate.resolve, restore: () => spy.mockRestore() };
}
const key = (identity: string) => createHmac("sha256", process.env.AUTH_SECRET!).update(identity).digest("hex");
async function attempts(identity: string) { return (await db.loginRateLimit.findUnique({ where: { key: key(identity) } }))?.attempts ?? 0; }
async function quota(identity: string, used: number) { await db.loginRateLimit.create({ data: { key: key(identity), attempts: used, expiresAt: new Date(Date.now() + 3600000) } }); }
function digest(index = 0) { return tokens.tokenDigest(mock.mail.mock.calls[index][1])!; }
async function oneUsable(user: Customer) {
  expect(await db.accountToken.count({ where: { userId: user.id } })).toBe(1);
  const call = mock.mail.mock.calls.find(call => call[0] === user.email)!;
  expect(await tokens.accountTokenUsable(tokens.tokenDigest(call[1])!, "ACCOUNT_SETUP")).toBe(true);
}

it("individual vs individual uses separate Prisma pools and one SQL state claim", async () => {
  const user = await customer(); const barrier = claimBarrier(2);
  const other = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 2 }) });
  const original = db.$transaction.bind(db); const separate = other.$transaction.bind(other);
  const locked = deferred(); const unlock = deferred();
  const blocker = original(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${user.id} FOR UPDATE`;
    locked.resolve(); await unlock.promise;
  });
  await locked.promise;
  let transactions = 0;
  // The first two calls are the competing claim transactions, on separate pools.
  const txSpy = vi.spyOn(db, "$transaction").mockImplementation((...args: unknown[]) => Reflect.apply(++transactions === 2 ? separate : original, db, args));
  const pending = Promise.all([individual(user), individual(user)]);
  try {
    await barrier.ready; barrier.release();
    // Both independent SQL sessions must actually wait at User before release.
    // A check outside that lock cannot claim the same old state safely.
    await expect.poll(async () => {
      const rows = await db.$queryRaw<{ count: bigint }[]>`SELECT count(*) FROM pg_stat_activity
        WHERE datname = current_database() AND wait_event_type = 'Lock'
          AND query LIKE '%SELECT "id" FROM "User"%FOR UPDATE%' AND pid <> pg_backend_pid()`;
      return Number(rows[0].count);
    }).toBe(2);
    unlock.resolve(); await blocker;
    const results = await pending;
    expect(results.filter(r => r.success)).toHaveLength(1);
    expect(results.filter(r => r.message?.includes("No setup email was attempted"))).toHaveLength(1);
    expect(mock.mail).toHaveBeenCalledTimes(1); await oneUsable(user);
    expect(await attempts(`account-invite:${user.id}`)).toBe(1);
    expect(await attempts("account-invite:global")).toBe(1);
  } finally { unlock.resolve(); barrier.release(); await blocker; await pending; barrier.restore(); txSpy.mockRestore(); await other.$disconnect(); }
});

it.each(["accepted", "undelivered", "failed"])("competing fresh reviews of an existing %s setup token have one winner", async state => {
  const user = await customer(); await individual(user);
  if (state !== "accepted") await db.accountToken.updateMany({ where: { userId: user.id }, data: {
    deliveredAt: null, ...(state === "failed" ? { consumedAt: new Date() } : {}),
  } });
  const request = await review(user); const barrier = claimBarrier(2);
  const pending = Promise.all([tokens.issueAccountToken(user.id, request), tokens.issueAccountToken(user.id, request)]);
  try {
    await barrier.ready; barrier.release(); expect((await pending).sort()).toEqual(["accepted", "stale"]);
    expect(mock.mail).toHaveBeenCalledTimes(2); // One initial setup plus one competing winner.
    expect(await db.accountToken.count({ where: { userId: user.id } })).toBe(2);
    expect(await tokens.accountTokenUsable(digest(0), "ACCOUNT_SETUP")).toBe(false);
    expect(await tokens.accountTokenUsable(digest(1), "ACCOUNT_SETUP")).toBe(true);
  } finally { barrier.release(); await pending; barrier.restore(); }
});

it("partially overlapping batches preserve successful earlier and non-overlapping recipients", async () => {
  const users = await Promise.all([customer(1), customer(2), customer(3)]);
  users.sort((a, b) => a.customer!.id.localeCompare(b.customer!.id));
  const [one, shared, three] = users;
  const a = await preview([one, shared]); const b = await preview([shared, three]);
  const barrier = claimBarrier(2, shared.id);
  const pending = Promise.all([confirmCustomerInvitations(a.token, true), confirmCustomerInvitations(b.token, true)]);
  try {
    await barrier.ready;
    expect(mock.mail).toHaveBeenCalledTimes(1); // A's earlier recipient already committed and sent.
    barrier.release();
    const batches = await pending;
    const rows = batches.flatMap(r => r.status === "success" ? r.results : []);
    expect(rows.filter(r => r.id === shared.customer!.id).map(r => r.status).sort()).toEqual(["accepted", "stale"]);
    expect(rows.filter(r => r.id !== shared.customer!.id).map(r => r.status)).toEqual(["accepted", "accepted"]);
    expect(batches.every(r => r.message.includes("Acceptance is not inbox delivery"))).toBe(true);
    expect(mock.mail).toHaveBeenCalledTimes(3);
    for (const user of users) await oneUsable(user);
    expect(await attempts("account-bulk-invite:global")).toBe(3);
  } finally { barrier.release(); await pending; barrier.restore(); }
});

it("reverse provider completion for different recipients leaves both links usable and no SQL lock spans I/O", async () => {
  const a = await customer(1); const b = await customer(2); const entered = deferred(); const finish = deferred();
  mock.mail.mockImplementationOnce(async () => { entered.resolve(); await finish.promise; });
  const first = individual(a);
  try {
    await entered.promise;
    // NOWAIT would fail immediately if issuance still held this recipient's lock.
    await db.$transaction(async tx => { await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${a.id} FOR UPDATE NOWAIT`; });
    expect((await individual(b)).success).toBe(true); await oneUsable(b);
    expect(await tokens.accountTokenUsable(digest(), "ACCOUNT_SETUP")).toBe(false);
    finish.resolve(); expect((await first).success).toBe(true);
    expect(mock.mail).toHaveBeenCalledTimes(2); await oneUsable(a);
  } finally { finish.resolve(); await first; }
});

it("fresh review resends once, supersedes the old delivered link, and only the current link can be consumed", async () => {
  const user = await customer(); const oldReview = await review(user);
  expect(await tokens.issueAccountToken(user.id, oldReview)).toBe("accepted");
  expect(await tokens.issueAccountToken(user.id, oldReview)).toBe("stale");
  const fresh = await preview([user]); expect(fresh.rows[0].pending).toBe(true);
  const result = await confirmCustomerInvitations(fresh.token, true);
  expect(result.status === "success" && result.results[0].status).toBe("accepted");
  expect(mock.mail).toHaveBeenCalledTimes(2);
  expect(await tokens.accountTokenUsable(digest(0), "ACCOUNT_SETUP")).toBe(false);
  expect(await tokens.accountTokenUsable(digest(1), "ACCOUNT_SETUP")).toBe(true);
  const choice = new FormData(); choice.set("password", "Fictional REL-01 password"); choice.set("confirmation", "Fictional REL-01 password");
  expect((await tokens.consumeAccountToken(digest(0), "ACCOUNT_SETUP", choice)).success).not.toBe(true);
  expect((await tokens.consumeAccountToken(digest(1), "ACCOUNT_SETUP", choice)).success).toBe(true);
  expect((await tokens.consumeAccountToken(digest(1), "ACCOUNT_SETUP", choice)).success).not.toBe(true);
});

it("a deliberately fresh review during provider I/O can supersede it; older completion cannot revive that link", async () => {
  const user = await customer(); const entered = deferred(); const finish = deferred();
  mock.mail.mockImplementationOnce(async () => { entered.resolve(); await finish.promise; });
  const first = individual(user);
  try {
    await entered.promise;
    expect((await individual(user)).success).toBe(true); // Fresh review of the newly committed undelivered token.
    finish.resolve(); expect((await first).success).not.toBe(true);
    expect(mock.mail).toHaveBeenCalledTimes(2);
    expect(await tokens.accountTokenUsable(digest(0), "ACCOUNT_SETUP")).toBe(false);
    expect(await tokens.accountTokenUsable(digest(1), "ACCOUNT_SETUP")).toBe(true);
    const rows = await db.accountToken.findMany({ where: { userId: user.id } });
    expect(rows.filter(t => t.deliveredAt && !t.consumedAt)).toHaveLength(1);
  } finally { finish.resolve(); await first; }
});

it.each([false, true])("provider failure remains recoverable through fresh review (cleanup fails=%s)", async cleanupFails => {
  const user = await customer(); const old = await review(user); const original = db.$transaction.bind(db);
  mock.mail.mockImplementationOnce(async () => {
    if (cleanupFails) vi.spyOn(db, "$transaction").mockRejectedValueOnce(Error("fictional cleanup failure"));
    throw Error("private provider exception");
  });
  expect(await tokens.issueAccountToken(user.id, old)).toBe("not_confirmed");
  expect(await tokens.accountTokenUsable(digest(), "ACCOUNT_SETUP")).toBe(false);
  if (cleanupFails) vi.spyOn(db, "$transaction").mockImplementation((...args: unknown[]) => Reflect.apply(original, db, args));
  expect(await tokens.issueAccountToken(user.id, old)).toBe("stale");
  expect(await tokens.issueAccountToken(user.id, await review(user))).toBe("accepted");
  expect(mock.mail).toHaveBeenCalledTimes(2);
  expect(await tokens.accountTokenUsable(digest(1), "ACCOUNT_SETUP")).toBe(true);
  expect(await attempts(`account-invite:${user.id}`)).toBe(2);
});

it.each(["email", "session", "user-active", "customer-active", "password", "role"])("%s change after bulk checks but before claim is stale and does no I/O", async change => {
  const user = await customer(); const staged = await preview([user]);
  const barrier = claimBarrier(1); const pending = confirmCustomerInvitations(staged.token, true);
  try {
    await barrier.ready;
    await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${user.id} FOR UPDATE`;
      if (change === "customer-active") await tx.customer.update({ where: { id: user.customer!.id }, data: { active: false } });
      else await tx.user.update({ where: { id: user.id }, data: change === "email" ? { email: "rel01-changed@example.test" }
        : change === "session" ? { sessionVersion: { increment: 1 } } : change === "user-active" ? { active: false }
          : change === "role" ? { role: "ADMIN" } : { passwordHash: "fictional configured password hash" } });
    });
    barrier.release(); const result = await pending;
    expect(result.status === "success" && result.results[0].status).toBe("stale");
    expect(result.message).toContain("1 changed and not attempted");
    expect(mock.mail).not.toHaveBeenCalled(); expect(await db.accountToken.count({ where: { userId: user.id } })).toBe(0);
    expect(await attempts("account-bulk-invite:global")).toBe(0);
  } finally { barrier.release(); await pending; barrier.restore(); }
});

it.each(["email", "active", "session", "password"])("individual server review rejects a subsequent %s change before issuance", async change => {
  const user = await customer(); const barrier = claimBarrier(1); const pending = individual(user);
  try {
    await barrier.ready;
    await db.user.update({ where: { id: user.id }, data: change === "email" ? { email: "rel01-changed@example.test" }
      : change === "active" ? { active: false } : change === "session" ? { sessionVersion: 1 } : { passwordHash: "fictional configured" } });
    barrier.release(); expect((await pending).message).toContain("No setup email was attempted");
    expect(mock.mail).not.toHaveBeenCalled(); expect(await db.accountToken.count({ where: { userId: user.id } })).toBe(0);
  } finally { barrier.release(); await pending; barrier.restore(); }
});

it.each(["consumedAt", "deliveredAt", "expiresAt"] as const)("review includes latest token %s, including failed/undelivered states", async field => {
  const user = await customer(); await individual(user);
  const request = await review(user);
  await db.accountToken.updateMany({ where: { userId: user.id }, data: { [field]: field === "deliveredAt" ? null : new Date(0) } });
  expect(await tokens.issueAccountToken(user.id, request)).toBe("stale");
  expect(mock.mail).toHaveBeenCalledTimes(1); expect(await db.accountToken.count({ where: { userId: user.id } })).toBe(1);
});

it("a newer token always changes the review even with equal or backwards creation clocks", async () => {
  const user = await customer(); await individual(user);
  // Simulate a prior instance whose wall clock was ahead. New issuance must
  // still sort after it; ordering by default transaction NOW() alone is unsafe.
  await db.accountToken.updateMany({ where: { userId: user.id }, data: { createdAt: new Date(Date.now() + 60000) } });
  const request = await review(user);
  expect(await tokens.issueAccountToken(user.id, request)).toBe("accepted");
  expect(await tokens.issueAccountToken(user.id, request)).toBe("stale");
  expect(mock.mail).toHaveBeenCalledTimes(2);
  const rows = await db.accountToken.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  expect(rows[0].createdAt.getTime()).toBeGreaterThan(rows[1].createdAt.getTime());
  expect(rows[0].tokenHash).toBe(digest(1));
});

it("same-preview replay cannot pass the SQL replay bucket even while the first claim is paused", async () => {
  const user = await customer(); const staged = await preview([user]); const barrier = claimBarrier(1);
  const pending = confirmCustomerInvitations(staged.token, true);
  try {
    await barrier.ready;
    const replay = await confirmCustomerInvitations(staged.token, true);
    expect(replay.status).toBe("invalid"); expect(replay.message).toContain("already attempted"); expect(mock.mail).not.toHaveBeenCalled();
    barrier.release(); expect((await pending).status).toBe("success"); expect(mock.mail).toHaveBeenCalledTimes(1); await oneUsable(user);
  } finally { barrier.release(); await pending; barrier.restore(); }
});

it("expired, tampered and caller/session-mismatched invitation previews never send", async () => {
  const user = await customer(); const staged = await preview([user]); const payload = openCustomerBatch(staged.token, admin);
  for (const token of [staged.token + "x", sealCustomerBatch({ ...payload, expiresAt: Date.now() - 1 }),
    sealCustomerBatch({ ...payload, adminId: "other" }), sealCustomerBatch({ ...payload, sessionVersion: admin.sessionVersion + 1 })]) {
    expect((await confirmCustomerInvitations(token, true)).status).toBe("invalid");
  }
  expect(mock.mail).not.toHaveBeenCalled(); expect(await db.loginRateLimit.count()).toBe(0);
});

it.each(["individual", "bulk"] as const)("%s global last slot admits only one concurrent different-recipient claim", async channel => {
  const identity = channel === "bulk" ? "account-bulk-invite:global" : "account-invite:global";
  const limit = channel === "bulk" ? 100 : 30; await quota(identity, limit - 1);
  const a = await customer(1); const b = await customer(2);
  const [ar, br] = await Promise.all([review(a, channel), review(b, channel)]);
  const barrier = claimBarrier(2);
  const pending = Promise.all([tokens.issueAccountToken(a.id, ar), tokens.issueAccountToken(b.id, br)]);
  try {
    await barrier.ready; barrier.release(); expect((await pending).sort()).toEqual(["accepted", "rate_limited"]);
    expect(mock.mail).toHaveBeenCalledTimes(1); expect(await attempts(identity)).toBe(limit);
    expect(await db.accountToken.count({ where: { user: where } })).toBe(1);
    expect(await tokens.accountTokenUsable(digest(), "ACCOUNT_SETUP")).toBe(true);
    expect(await db.loginRateLimit.count()).toBe(2); // No per-recipient bucket for the global loser.
  } finally { barrier.release(); await pending; barrier.restore(); }
});

it("shared per-recipient last slot is bounded across bulk/individual; capped fresh claims do not create tokens", async () => {
  const user = await customer(); await quota(`account-invite:${user.id}`, 2);
  const staged = await preview([user]); const barrier = claimBarrier(2);
  const pending = Promise.all([individual(user), confirmCustomerInvitations(staged.token, true)]);
  try {
    await barrier.ready; barrier.release(); await pending; expect(mock.mail).toHaveBeenCalledTimes(1);
  } finally { barrier.release(); await pending; barrier.restore(); }
  const request = await review(user);
  for (let i = 0; i < 35; i++) expect(await tokens.issueAccountToken(user.id, request)).toBe("rate_limited");
  expect(await attempts(`account-invite:${user.id}`)).toBe(3); expect(await attempts("account-invite:global")).toBe(30);
  expect(mock.mail).toHaveBeenCalledTimes(1); await oneUsable(user);
});

it("configuration and SQL insertion failures preserve the prior token; quota and token writes roll back together", async () => {
  const user = await customer(); await individual(user); const request = await review(user);
  mock.config.mockImplementationOnce(() => { throw Error("private configuration"); });
  await expect(tokens.issueAccountToken(user.id, request)).rejects.toThrow("private configuration");
  const original = db.$transaction.bind(db);
  vi.spyOn(db, "$transaction").mockImplementationOnce((...args: unknown[]) => {
    const work = args[0] as (tx: Prisma.TransactionClient) => Promise<unknown>;
    return original(async tx => {
      vi.spyOn(tx.accountToken, "create").mockRejectedValueOnce(Error("fictional insert failure"));
      return work(tx);
    });
  });
  await expect(tokens.issueAccountToken(user.id, request)).rejects.toThrow("fictional insert failure");
  expect(mock.mail).toHaveBeenCalledTimes(1); await oneUsable(user);
  expect(await attempts(`account-invite:${user.id}`)).toBe(1); expect(await attempts("account-invite:global")).toBe(1);
});
