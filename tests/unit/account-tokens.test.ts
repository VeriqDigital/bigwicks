import { afterEach, expect, it, vi } from "vitest";
import { passwordChoiceSchema, tokenDigest } from "@/lib/auth/account-tokens";
import { accountEmailConfig, sendAccountEmail } from "@/lib/auth/account-email";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it.each([undefined, null, [], "", "a".repeat(63), "g".repeat(64), "a".repeat(65)])("rejects malformed bearer tokens", (raw) => {
  expect(tokenDigest(raw)).toBeNull();
});
it("digests valid random-token format deterministically without returning the raw value", () => {
  expect(tokenDigest("a".repeat(64))).toMatch(/^[a-f0-9]{64}$/);
  expect(tokenDigest("a".repeat(64))).not.toBe("a".repeat(64));
  expect(tokenDigest("a".repeat(64))).toBe(tokenDigest("a".repeat(64)));
});
it.each(["x".repeat(14), "x".repeat(129)])("enforces existing password bounds", (password) => {
  expect(passwordChoiceSchema.safeParse({ password, confirmation: password }).success).toBe(false);
});
it("requires matching confirmation and preserves password whitespace", () => {
  const password = "  long password with spaces  ";
  expect(passwordChoiceSchema.parse({ password, confirmation: password }).password).toBe(password);
  expect(passwordChoiceSchema.safeParse({ password, confirmation: "something else" }).success).toBe(false);
});
it.each(["https://example.test/path", "http://example.test", "https://user:pass@example.test", "https://example.test/?x=y", "https://example.test/#x", "javascript:alert(1)"])("rejects unsafe canonical configuration", (origin) => {
  vi.stubEnv("RESEND_API_KEY", "test-only"); vi.stubEnv("ACCOUNT_FROM_EMAIL", "Accounts <accounts@example.test>"); vi.stubEnv("AUTH_URL", origin);
  expect(accountEmailConfig).toThrow();
});
it("sends only through configured Resend sender and canonical origin with timeout and no cache", async () => {
  vi.stubEnv("RESEND_API_KEY", "test-only"); vi.stubEnv("ACCOUNT_FROM_EMAIL", "Accounts <accounts@example.test>"); vi.stubEnv("AUTH_URL", "https://accounts.example.test");
  const fetcher = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetcher);
  await sendAccountEmail("recipient@example.test", "a".repeat(64), "ACCOUNT_SETUP", "test-id");
  const [url, options] = fetcher.mock.calls[0];
  expect(url).toBe("https://api.resend.com/emails");
  expect(options.signal).toBeInstanceOf(AbortSignal);
  expect(options.cache).toBe("no-store");
  const body = JSON.parse(options.body);
  expect(body.to).toEqual(["recipient@example.test"]);
  expect(body.from).toBe("Accounts <accounts@example.test>");
  expect(body.text).toContain(`https://accounts.example.test/setup-account?token=${"a".repeat(64)}`);
  expect(body.text).toContain("24 hours");
  fetcher.mockResolvedValue(new Response("sensitive provider error", { status: 500 }));
  await expect(sendAccountEmail("recipient@example.test", "b".repeat(64), "PASSWORD_RESET", "other")).rejects.toThrow("Account email delivery failed.");
});
