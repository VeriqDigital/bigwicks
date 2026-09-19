import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Socket } from "node:net";
import pg from "pg";
import { developmentSeedConnection, SeedTargetError } from "../../prisma/seed-target";
import { hashPassword } from "../../lib/auth/password";

const boundary = vi.hoisted(() => ({ adapter: vi.fn(), client: vi.fn(), write: vi.fn() }));
vi.mock("dotenv/config", () => ({}));
vi.mock("@prisma/adapter-pg", () => ({ PrismaPg: class { constructor(config: unknown) { boundary.adapter(config); } } }));
vi.mock("../../generated/prisma/client", () => ({ PrismaClient: class {
  constructor() { boundary.client(); }
  $transaction = boundary.write;
  $disconnect = vi.fn();
} }));
vi.mock("../../lib/auth/password", async importOriginal => {
  const actual = await importOriginal<typeof import("../../lib/auth/password")>();
  return { ...actual, hashPassword: vi.fn(actual.hashPassword) };
});

const local = "postgresql://fixture:fictional%40secret@localhost:5432/seed_test";
const hostile = [
  ["remote host override", local + "?host=remote.example.test"],
  ["encoded remote override", local + "?host=%72emote.example.test"],
  ["encoded host key", local + "?%68ost=remote.example.test"],
  ["duplicate host remote last", local + "?host=localhost&host=remote.example.test"],
  ["duplicate host local last", local + "?host=remote.example.test&host=localhost"],
  ["empty host override", local + "?host="],
  ["local host override", local + "?host=127.0.0.1"],
  ["port override", local + "?port=6543"],
  ["encoded port key", local + "?%70ort=6543"],
  ["duplicate port", local + "?port=5432&port=6543"],
  ["socket host override", local + "?host=%2Ftmp%2Fpostgres"],
  ["socket authority", "postgresql://fixture:secret@%2Ftmp/seed_test"],
  ["socket protocol", "socket:/tmp/postgres?db=seed_test"],
  ["bare socket", "/tmp/postgres seed_test"],
  ["hostaddr override", local + "?hostaddr=203.0.113.1"],
  ["nested connection string", local + "?connectionString=" + encodeURIComponent("postgresql://u:p@remote.example.test/db")],
  ["SSL file option", local + "?sslrootcert=private-file"],
  ["unknown option", local + "?service=remote"],
  ["duplicate TLS option", local + "?sslmode=disable&sslmode=require"],
  ["unverified TLS", local + "?sslmode=no-verify"],
  ["remote authority", local.replace("localhost", "remote.example.test")],
  ["local-looking remote authority", local.replace("localhost", "localhost.example.test")],
  ["trailing dot", local.replace("localhost", "localhost.")],
  ["encoded authority", local.replace("localhost", "%6cocalhost")],
  ["other loopback address", local.replace("localhost", "127.0.0.2")],
  ["short IPv4", local.replace("localhost", "127.1")],
  ["integer IPv4", local.replace("localhost", "2130706433")],
  ["hex IPv4", local.replace("localhost", "0x7f000001")],
  ["mapped IPv6", local.replace("localhost", "[::ffff:127.0.0.1]")],
  ["remote IPv6", local.replace("localhost", "[2001:db8::1]")],
  ["missing host", "postgresql:///seed_test"],
  ["missing database", local.replace("/seed_test", "/")],
  ["missing user", "postgresql://:password@localhost/seed_test"],
  ["missing password", "postgresql://fixture@localhost/seed_test"],
  ["zero port", local.replace(":5432", ":0")],
  ["out-of-range port", local.replace(":5432", ":65536")],
  ["non-numeric port", local.replace(":5432", ":5432remote")],
  ["alternate protocol", local.replace("postgresql:", "https:")],
  ["fragment", local + "#private-fragment"],
  ["leading whitespace", " " + local],
  ["control character", local + "\n"],
  ["encoded control", local.replace("seed_test", "seed%00test")],
  ["invalid escape", local.replace("fictional%40secret", "%ZZ")],
  ["missing URL", undefined],
] as const;

const originalExitCode = process.exitCode;
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("ALLOW_DEVELOPMENT_SEED", "true");
  vi.stubEnv("DATABASE_URL", local);
  for (const key of ["SEED_ADMIN_PASSWORD", "SEED_TIER1_PASSWORD", "SEED_TIER2_PASSWORD"]) vi.stubEnv(key, "Fictional-seed-password");
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(Socket.prototype, "connect").mockImplementation(() => { throw Error("Network forbidden in seed guard tests"); });
});
afterEach(() => {
  process.exitCode = originalExitCode;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function refusedSeed() {
  vi.resetModules();
  await import("../../prisma/seed");
  await vi.waitFor(() => expect(console.error).toHaveBeenCalled());
  expect(process.exitCode).toBe(1);
  expect(boundary.adapter).not.toHaveBeenCalled();
  expect(boundary.client).not.toHaveBeenCalled();
  expect(boundary.write).not.toHaveBeenCalled();
  expect(Socket.prototype.connect).not.toHaveBeenCalled();
  const output = vi.mocked(console.error).mock.calls.flat().join(" ");
  expect(output).toContain("Development seed failed");
  expect(output).not.toContain("fictional@secret");
  expect(output).not.toContain("fictional%40secret");
  expect(output).not.toContain("postgresql://");
  expect(output).not.toContain("remote.example.test");
}

it.each(hostile)("refuses %s before hashing, adapter/client creation or writes", async (_label, raw) => {
  expect(() => developmentSeedConnection(raw)).toThrow(SeedTargetError);
  vi.stubEnv("DATABASE_URL", raw);
  await refusedSeed();
  expect(hashPassword).not.toHaveBeenCalled();
  expect(console.error).toHaveBeenCalledWith(expect.stringContaining("routing overrides and socket URLs are refused"));
});

it.each([
  ["NODE_ENV", "production"], ["ALLOW_DEVELOPMENT_SEED", undefined],
  ["ALLOW_DEVELOPMENT_SEED", "false"], ["ALLOW_DEVELOPMENT_SEED", "TRUE"],
] as const)("retains the %s=%s runtime guard before any side effects", async (key, value) => {
  vi.stubEnv(key, value);
  await refusedSeed();
  expect(hashPassword).not.toHaveBeenCalled();
});

it.each(["SEED_ADMIN_PASSWORD", "SEED_TIER1_PASSWORD", "SEED_TIER2_PASSWORD"])("requires fixture credential %s before any database use", async key => {
  vi.stubEnv(key, undefined);
  await refusedSeed();
});

it.each([
  [local, "localhost", 5432],
  [local.replace("localhost", "127.0.0.1"), "127.0.0.1", 5432],
  [local.replace("localhost", "[::1]"), "::1", 5432],
  [local.replace("localhost", "[0:0:0:0:0:0:0:1]"), "::1", 5432],
  [local.replace("localhost", "LOCALHOST"), "localhost", 5432],
  [local.replace(":5432", ":6543"), "localhost", 6543],
  [local.replace(":5432", ""), "localhost", 5432],
  [local.replace("postgresql:", "postgres:"), "localhost", 5432],
  ["postgresql://USER:PASSWORD@localhost:5432/big_wicks", "localhost", 5432],
] as const)("passes only normalized local fields to the installed driver %$", (raw, host, port) => {
  vi.stubEnv("PGHOST", "remote.example.test");
  vi.stubEnv("PGPORT", "9999");
  vi.stubEnv("PGDATABASE", "wrong_database");
  const config = developmentSeedConnection(raw);
  expect(config).not.toHaveProperty("connectionString");
  // Constructing a pg Client parses the exact fields but does not connect.
  const driver = new pg.Client(config);
  expect(driver.host).toBe(host);
  expect(driver.port).toBe(port);
  expect(driver.database).toBe(raw.endsWith("big_wicks") ? "big_wicks" : "seed_test");
  expect(Socket.prototype.connect).not.toHaveBeenCalled();
});

it.each(["disable", "require", "verify-full"])("supports a single explicit sslmode=%s without forwarding query fields", mode => {
  const config = developmentSeedConnection(local + "?sslmode=" + mode);
  expect(config.ssl).toEqual(mode === "disable" ? false : { rejectUnauthorized: true });
  expect(config.password).toBe("fictional@secret");
  expect(Object.keys(config).sort()).toEqual(["database", "host", "password", "port", "ssl", "user"]);
});

it("preserves the installed parser's database-name decoding", () => {
  const raw = local.replace("seed_test", "seed%20test%3F");
  expect(developmentSeedConnection(raw).database).toBe(new pg.Client({ connectionString: raw }).database);
});

it("reproduces the old authority/driver mismatch without network access", () => {
  const raw = local + "?host=%72emote.example.test&port=6543";
  expect(new URL(raw).hostname).toBe("localhost");
  const driver = new pg.Client({ connectionString: raw });
  expect(driver.host).toBe("remote.example.test");
  expect(driver.port).toBe(6543);
  expect(() => developmentSeedConnection(raw)).toThrow(SeedTargetError);
  expect(Socket.prototype.connect).not.toHaveBeenCalled();
});

it("the seed hands the validated fields to PrismaPg after hashing valid fixture credentials", async () => {
  vi.resetModules();
  await import("../../prisma/seed");
  await vi.waitFor(() => expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Development fixtures ready")));
  expect(boundary.adapter).toHaveBeenCalledExactlyOnceWith(developmentSeedConnection(local));
  expect(hashPassword).toHaveBeenCalledTimes(3);
  expect(boundary.client).toHaveBeenCalledTimes(1);
  expect(boundary.write).toHaveBeenCalledTimes(1);
  expect(console.error).not.toHaveBeenCalled();
  expect(Socket.prototype.connect).not.toHaveBeenCalled();
});
