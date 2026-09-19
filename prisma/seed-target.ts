import type { PoolConfig } from "pg";

export class SeedTargetError extends Error {}

// Follow the production tooling's explicit-driver-fields pattern without
// coupling development fixtures to production provisioning rules.
export function developmentSeedConnection(raw: string | undefined): PoolConfig {
  try {
    const controls = /[\u0000-\u001f\u007f-\u009f]/;
    if (!raw || raw !== raw.trim() || controls.test(raw)) throw new Error();
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    const port = Number(url.port || "5432");
    const parameters = [...url.searchParams];
    if (!["postgres:", "postgresql:"].includes(url.protocol) || url.hash ||
        !["localhost", "127.0.0.1", "[::1]"].includes(host) ||
        !Number.isInteger(port) || port < 1 || port > 65535 ||
        parameters.length > 1 || parameters.some(([key, value]) =>
          key !== "sslmode" || !["disable", "require", "verify-full"].includes(value))) throw new Error();
    const user = decodeURIComponent(url.username);
    const password = decodeURIComponent(url.password);
    // pg-connection-string uses decodeURI for database names, unlike credentials.
    const database = decodeURI(url.pathname.slice(1));
    if (!user || !password || !database || database.includes("/") ||
        [user, password, database].some(value => controls.test(value))) throw new Error();
    // Never forward the URI or query fields. Explicit nonempty routing fields
    // also prevent PGHOST/PGPORT/PGDATABASE defaults from changing this target.
    return {
      host: host === "[::1]" ? "::1" : host, port, user, password, database,
      ssl: parameters.length && url.searchParams.get("sslmode") !== "disable"
        ? { rejectUnauthorized: true } : false,
    };
  } catch {
    throw new SeedTargetError("Use a local PostgreSQL URL with explicit user/password/database, host localhost, 127.0.0.1 or [::1], and an optional authority port (1-65535). Only one sslmode=disable, require or verify-full query parameter is supported; routing overrides and socket URLs are refused.");
  }
}
