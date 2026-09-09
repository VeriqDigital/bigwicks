import { afterEach, expect, it, vi } from "vitest";
import { Readable, Writable } from "node:stream";
import type { ReadStream, WriteStream } from "node:tty";
import { confirmation, parseRequest, parseTarget } from "../../scripts/production/plan";
import { readHiddenPassword } from "../../scripts/production/password-input";

const url = "postgresql://operator:fictional%40password@db.example.test:5432/bootstrap?sslmode=verify-full";
const target = parseTarget(url).target;
const args = ["--expected-host", target.host, "--expected-port", "5432", "--expected-database", target.database, "--admin-email", "  Owner@Example.test  ", "--allow-production", "--confirm", confirmation(target)];
afterEach(() => vi.restoreAllMocks());
it("normalizes login email, binds explicit host/port/database and defaults to inspection", () => {
  expect(parseRequest(args, target)).toEqual({ target, email: "owner@example.test" });
  expect(parseTarget(url).password).toBe("fictional@password");
  expect(target.tls).toBe(true);
});
it.each([undefined, "", "not a URI", url + "#fragment", url + "&host=other", url + "&sslmode=disable", url.replace("verify-full", "no-verify"), url.replace("?sslmode=verify-full", ""), url.replace("/bootstrap", "/a/b"), url.replace("/bootstrap", "/a%2fb"), url.replace("/bootstrap", "/"), url.replace("db.example.test", "db.example.test."), url.replace("postgresql:", "https:"), url.replace("fictional%40password", ""), url + "\n"])("refuses malformed/ambiguous targets without echoing input %$", raw => {
  expect(() => parseTarget(raw)).toThrow(/DATABASE_URL missing, malformed or ambiguous/);
});
it.each(["--expected-host", "--expected-port", "--expected-database", "--confirm", "--allow-production"])("requires matching acknowledgement %s", flag => {
  const changed = [...args]; const index = changed.indexOf(flag);
  if (flag === "--allow-production") changed.splice(index, 1); else changed[index + 1] = "mismatch";
  expect(() => parseRequest(changed, target)).toThrow();
});
it.each(["", "\nowner@example.test", "owner@example.test\u0000", "bad", "x".repeat(255) + "@example.test"])("rejects invalid/control-bearing email %$", email => {
  const changed = [...args]; changed[changed.indexOf("--admin-email") + 1] = email;
  expect(() => parseRequest(changed, target)).toThrow();
});
it.each([["--password", "fictional-secret"], ["positional-secret"], ["--apply"], ["--apply", "bad"], ["--confirm", "again"]].map(extra => ({ extra })))("rejects unknown/password/repeated/malformed arguments %$", ({ extra }) => {
  expect(() => parseRequest([...args, ...extra], target)).toThrow();
});

function terminal() {
  const input = new Readable({ read() {} }) as ReadStream;
  Object.assign(input, { isTTY: true, isRaw: false, setRawMode(mode: boolean) { this.isRaw = mode; return this; } });
  let text = "";
  const output = new Writable({ write(chunk, _encoding, callback) { text += chunk.toString(); callback(); } }) as WriteStream;
  Object.assign(output, { isTTY: true });
  return { input, output, text: () => text };
}
const password = "Fictional-terminal-password";
it("hides and confirms input, handles backspace/CRLF and restores raw mode/listeners", async () => {
  const io = terminal(); const promise = readHiddenPassword(io.input, io.output);
  expect(io.input.isRaw).toBe(true);
  io.input.emit("data", Buffer.from(`${password}x\b\r\n${password}\r\n`));
  expect(await promise).toBe(password);
  expect(io.text()).not.toContain(password);
  expect(io.input.isRaw).toBe(false); expect(io.input.listenerCount("data")).toBe(0);
});
it.each(["short\r", "x".repeat(129), `${password}\rDifferent-valid-password\r`, "\u0003", "\u0004", "\u001b[A"])("refuses invalid/cancelled input without echo %$", input => {
  const io = terminal(); const promise = readHiddenPassword(io.input, io.output);
  io.input.emit("data", Buffer.from(input));
  expect(io.input.isRaw).toBe(false); expect(io.text()).not.toContain(password);
  return expect(promise).rejects.toThrow();
});
it("refuses non-TTY or failed raw mode without a visible fallback", async () => {
  const io = terminal(); Object.assign(io.input, { isTTY: false });
  await expect(readHiddenPassword(io.input, io.output)).rejects.toThrow(/terminal/);
  expect(io.text()).toBe("");
  Object.assign(io.input, { isTTY: true, setRawMode() { throw Error("unsupported"); } });
  await expect(readHiddenPassword(io.input, io.output)).rejects.toThrow();
  expect(io.text()).not.toContain("Initial ADMIN");
});
it("restores terminal on EOF and timeout", async () => {
  const io = terminal(); const pending = readHiddenPassword(io.input, io.output); io.input.emit("end");
  await expect(pending).rejects.toThrow(/cancelled/); expect(io.input.isRaw).toBe(false);
  vi.useFakeTimers();
  try {
    const waiting = readHiddenPassword(io.input, io.output); const rejected = expect(waiting).rejects.toThrow(/cancelled/);
    await vi.advanceTimersByTimeAsync(300000); await rejected;
    expect(io.input.isRaw).toBe(false);
  } finally { vi.useRealTimers(); }
});
