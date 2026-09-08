import { afterAll, afterEach, beforeEach, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { submitContactForm } from "@/app/contact/actions";
import { getDb } from "@/lib/db";
import { CONTACT_EMAIL_LIMIT, CONTACT_GLOBAL_LIMIT, CONTACT_EMAIL_TIMEOUT_MS } from "@/lib/contact/policy";

const db = getDb();
const idle = { status: "idle" as const, message: "" };
const failure = "We could not send your message right now. Please try again or call the store.";
const limited = "Too many messages have been submitted. Please wait and try again, or call the store.";
const sensitive = "fictional-provider-secret customer message database detail";
const key = (identity: string) => createHmac("sha256", process.env.AUTH_SECRET!).update(identity).digest("hex");
function form(values: Record<string, string> = {}) {
  const data = new FormData();
  for (const [name, value] of Object.entries({ name: "Fictional Visitor", email: "visitor@example.test", phone: "", subject: "general", message: "Fictional security test message.", company: "", ...values })) data.set(name, value);
  return data;
}
const submit = (values?: Record<string, string>) => submitContactForm(idle, form(values));
beforeEach(async () => {
  await db.loginRateLimit.deleteMany();
  vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id: "fictional" }));
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
afterAll(async () => { await db.loginRateLimit.deleteMany(); await db.$disconnect(); });

it("sends plain text to fixed recipients with validated reply_to and a unique key for legitimate followups", async () => {
  for (let i = 0; i < 2; i++) expect((await submit({ email: "  Visitor@Example.test  ", to: "forged@example.test", from: "forged@example.test", reply_to: "forged@example.test" })).status).toBe("success");
  const calls = vi.mocked(fetch).mock.calls;
  expect(calls).toHaveLength(2);
  for (const [url, options] of calls) {
    expect(url).toBe("https://api.resend.com/emails");
    const body = JSON.parse(options!.body as string);
    expect(body).toMatchObject({ from: process.env.CONTACT_FROM_EMAIL, to: [process.env.CONTACT_TO_EMAIL], reply_to: "Visitor@Example.test" });
    expect(body.text).toContain("Fictional security test message."); expect(body).not.toHaveProperty("html");
    expect(options!.signal).toBeInstanceOf(AbortSignal);
  }
  expect(new Set(calls.map(([, options]) => (options!.headers as Record<string, string>)["Idempotency-Key"])).size).toBe(2);
});
it("normalizes case and whitespace into one HMAC email identity", async () => {
  for (const email of [" visitor@example.test ", "VISITOR@EXAMPLE.TEST", "Visitor@Example.Test"]) expect((await submit({ email })).status).toBe("success");
  expect((await submit()).message).toBe(limited);
  expect(fetch).toHaveBeenCalledTimes(CONTACT_EMAIL_LIMIT);
  const rows = await db.loginRateLimit.findMany();
  expect(rows).toHaveLength(2);
  expect(rows.map(row => row.key).sort()).toEqual([key("contact:global"), key("contact:email:visitor@example.test")].sort());
  expect(rows.find(row => row.key === key("contact:email:visitor@example.test"))!.attempts).toBe(CONTACT_EMAIL_LIMIT);
});
it("bounds rotating emails and their stored identities with the aggregate allowance", async () => {
  for (let i = 0; i < CONTACT_GLOBAL_LIMIT + 4; i++) {
    const result = await submit({ email: `rotate-${i}@example.test` });
    expect(result.status).toBe(i < CONTACT_GLOBAL_LIMIT ? "success" : "error");
    if (i >= CONTACT_GLOBAL_LIMIT) expect(result.message).toBe(limited);
  }
  expect(fetch).toHaveBeenCalledTimes(CONTACT_GLOBAL_LIMIT);
  expect(await db.loginRateLimit.count()).toBe(CONTACT_GLOBAL_LIMIT + 1);
});
it.each([false, true])("simultaneous submissions cannot exceed the atomic allowance (rotating=%s)", async rotating => {
  // Release all calls together, keeping the number of callers bounded. Real SQL,
  // including first-row INSERT contention, arbitrates every allowance.
  let release!: () => void;
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const allowance = rotating ? CONTACT_GLOBAL_LIMIT : CONTACT_EMAIL_LIMIT;
  const pending = Array.from({ length: allowance + 5 }, async (_, i) => {
    await barrier; return submit({ email: rotating ? `concurrent-${i}@example.test` : "concurrent@example.test" });
  });
  release(); const results = await Promise.all(pending);
  expect(results.filter(result => result.status === "success")).toHaveLength(allowance);
  expect(results.filter(result => result.message === limited)).toHaveLength(5);
  expect(fetch).toHaveBeenCalledTimes(allowance);
});
it("honeypot succeeds without database or transport work", async () => {
  const query = vi.spyOn(db, "$queryRaw"); const cleanup = vi.spyOn(db, "$executeRaw");
  expect((await submit({ company: "bot", email: "invalid" })).status).toBe("success");
  expect(query).not.toHaveBeenCalled(); expect(cleanup).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
});
it.each([
  ["name", "x"], ["name", "x".repeat(101)], ["name", "Header\ninjection"],
  ["email", "invalid"], ["email", "visitor@example.test\r\nBcc: other@example.test"], ["email", "a".repeat(250) + "@example.test"],
  ["phone", "invalid"], ["subject", "forged"], ["message", "short"], ["message", "x".repeat(3001)],
])("invalid %s preserves field errors without database or transport work", async (field, value) => {
  const query = vi.spyOn(db, "$queryRaw"); const cleanup = vi.spyOn(db, "$executeRaw");
  const result = await submit({ [field]: value });
  expect(result.status).toBe("error"); expect(result.fieldErrors).toHaveProperty(field);
  expect(query).not.toHaveBeenCalled(); expect(cleanup).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
});
it.each(["global", "email", "cleanup", "secret"])("fails closed when %s evaluation fails", async stage => {
  if (stage === "secret") vi.stubEnv("AUTH_SECRET", "");
  else if (stage === "cleanup") vi.spyOn(db, "$executeRaw").mockRejectedValueOnce(Error(sensitive));
  else {
    const original = db.$queryRaw.bind(db); let calls = 0;
    vi.spyOn(db, "$queryRaw").mockImplementation((...args) => {
      if (++calls === (stage === "global" ? 1 : 2)) return Promise.reject(Error(sensitive)) as ReturnType<typeof db.$queryRaw>;
      return Reflect.apply(original, db, args);
    });
  }
  const result = await submit();
  expect(result.message).toContain("Online messaging is temporarily unavailable");
  expect(fetch).not.toHaveBeenCalled();
  expect(console.error).toHaveBeenCalledExactlyOnceWith("Contact form abuse protection is unavailable.");
  expect(JSON.stringify(result)).not.toContain(sensitive);
});
it("missing mail configuration returns unavailable before consuming buckets", async () => {
  vi.stubEnv("RESEND_API_KEY", "");
  expect((await submit()).message).toContain("Online messaging is temporarily unavailable");
  expect(await db.loginRateLimit.count()).toBe(0); expect(fetch).not.toHaveBeenCalled();
});
it.each(["http", "network"])("provider %s failure returns and logs only safe details; failures still spend allowance", async mode => {
  if (mode === "http") vi.mocked(fetch).mockResolvedValue(new Response(sensitive, { status: 503 }));
  else vi.mocked(fetch).mockRejectedValue(Error(sensitive));
  for (let i = 0; i < CONTACT_EMAIL_LIMIT; i++) expect((await submit()).message).toBe(failure);
  expect((await submit()).message).toBe(limited);
  expect(fetch).toHaveBeenCalledTimes(CONTACT_EMAIL_LIMIT);
  expect(vi.mocked(console.error).mock.calls).toEqual(Array.from({ length: CONTACT_EMAIL_LIMIT }, () => [mode === "http" ? "Contact form email delivery failed with status 503." : "Contact form email delivery failed."]));
});
it("a stalled provider is aborted by the actual ten-second signal and fails safely", async () => {
  const timeout = vi.spyOn(AbortSignal, "timeout");
  let started = 0;
  vi.mocked(fetch).mockImplementation(async (_url, options) => {
    started = performance.now();
    return new Promise<Response>((_resolve, reject) => options!.signal!.addEventListener("abort", () => reject(Error(sensitive)), { once: true }));
  });
  expect((await submit()).message).toBe(failure);
  const elapsed = performance.now() - started;
  expect(timeout).toHaveBeenCalledExactlyOnceWith(CONTACT_EMAIL_TIMEOUT_MS);
  expect(elapsed).toBeGreaterThanOrEqual(CONTACT_EMAIL_TIMEOUT_MS - 100);
  expect(elapsed).toBeLessThan(CONTACT_EMAIL_TIMEOUT_MS + 2000);
  expect(console.error).toHaveBeenCalledExactlyOnceWith("Contact form email delivery failed.");
}, 15_000);
it("contact-only traffic cleans expired rows, preserves live rows, and allows a later message", async () => {
  await db.loginRateLimit.create({ data: { key: key("live-other-caller"), attempts: 1, expiresAt: new Date(Date.now() + 60_000) } });
  await db.loginRateLimit.create({ data: { key: key("expired-other-caller"), attempts: 1, expiresAt: new Date(0) } });
  for (let i = 0; i < CONTACT_EMAIL_LIMIT; i++) await submit();
  expect((await submit()).message).toBe(limited);
  await db.loginRateLimit.updateMany({ where: { key: { in: [key("contact:global"), key("contact:email:visitor@example.test")] } }, data: { expiresAt: new Date(0) } });
  expect((await submit()).status).toBe("success");
  expect(await db.loginRateLimit.findUnique({ where: { key: key("expired-other-caller") } })).toBeNull();
  expect(await db.loginRateLimit.findUnique({ where: { key: key("live-other-caller") } })).not.toBeNull();
  expect(fetch).toHaveBeenCalledTimes(CONTACT_EMAIL_LIMIT + 1);
});
