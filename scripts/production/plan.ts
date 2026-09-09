import { createHash } from "node:crypto";
import { loginEmailSchema } from "../../lib/auth/validation";

export class BootstrapError extends Error {}
export const tiers = [{ name: "Tier 1", rank: 1 }, { name: "Tier 2", rank: 2 }] as const;
export const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const controls = /[\u0000-\u001f\u007f-\u009f]/;
export type Target = { host: string; port: number; database: string; schema: "public"; tls: boolean };
export type Request = { target: Target; email: string; applyHash?: string };

export function parseTarget(raw: string | undefined): { target: Target; user: string; password: string } {
  try {
    if (!raw || raw !== raw.trim() || controls.test(raw)) throw new Error();
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    const database = url.pathname.slice(1);
    const port = Number(url.port || "5432");
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(host);
    const parameters = [...url.searchParams];
    // No driver query overrides, socket paths, encoded database paths or alternate schemas.
    if (!["postgres:", "postgresql:"].includes(url.protocol) || url.hash ||
        (!/^[a-z0-9]+(?:[a-z0-9.-]*[a-z0-9])?$/.test(host) && host !== "[::1]") || host.includes("..") ||
        !/^[A-Za-z0-9_][A-Za-z0-9_.-]{0,62}$/.test(database) ||
        !Number.isInteger(port) || port < 1 || port > 65535 ||
        parameters.length > 1 || parameters.some(([key, value]) => key !== "sslmode" || !["require", "verify-full", ...(local ? ["disable"] : [])].includes(value)) ||
        (!local && parameters.length !== 1)) throw new Error();
    const user = decodeURIComponent(url.username);
    const password = decodeURIComponent(url.password);
    if (!user || !password || controls.test(user) || controls.test(password)) throw new Error();
    return { target: { host, port, database, schema: "public", tls: !local || url.searchParams.get("sslmode") !== "disable" && parameters.length > 0 }, user, password };
  } catch {
    throw new BootstrapError("DATABASE_URL missing, malformed or ambiguous. Use an explicit PostgreSQL host/database/user/password; only sslmode is supported, with require or verify-full for remote TLS.");
  }
}

export const confirmation = (target: Target) => `${target.host}:${target.port}/${target.database}`;

export function parseRequest(args: string[], target: Target): Request {
  const flags = new Map<string, string>();
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (!["--expected-host", "--expected-port", "--expected-database", "--admin-email", "--allow-production", "--confirm", "--apply"].includes(key) || flags.has(key)) {
      throw new BootstrapError("Unknown or repeated bootstrap flag. Password arguments are never accepted. Use --help.");
    }
    const value = key === "--allow-production" ? "true" : args[++i];
    if (!value || value.startsWith("--")) throw new BootstrapError("Bootstrap flag is missing a value. Use --help.");
    flags.set(key, value);
  }
  if (flags.get("--expected-host") !== target.host || flags.get("--expected-port") !== String(target.port) || flags.get("--expected-database") !== target.database) {
    throw new BootstrapError("Expected host/port/database do not match the parsed target. STOP and independently verify the intended database.");
  }
  if (!flags.has("--allow-production")) throw new BootstrapError("--allow-production is required for this production-capable operator tool, including inspection.");
  if (flags.get("--confirm") !== confirmation(target)) throw new BootstrapError("--confirm must exactly match the displayed host:port/database target.");
  const email = flags.get("--admin-email") ?? "";
  const parsed = loginEmailSchema.safeParse(email);
  if (controls.test(email) || !parsed.success) throw new BootstrapError("Supply a valid ADMIN email (maximum 254 characters, no control characters). There is no default.");
  const applyHash = flags.get("--apply");
  if (applyHash !== undefined && !/^[a-f0-9]{64}$/.test(applyHash)) throw new BootstrapError("--apply requires the exact SHA-256 hash from the reviewed dry-run.");
  return { target, email: parsed.data, ...(applyHash ? { applyHash } : {}) };
}
