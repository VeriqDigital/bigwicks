import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";
import { createServer } from "node:net";
import EmbeddedPostgres from "embedded-postgres";
async function main() {
await mkdir(".test-runtime", { recursive: true });
const directory = await mkdtemp(resolve(".test-runtime/focused-"));
const databaseDirectory = resolve(directory, "db");
await mkdir(databaseDirectory);
const port = await new Promise<number>(done => { const s = createServer(); s.listen(0, "127.0.0.1", () => { const port = (s.address() as { port: number }).port; s.close(() => done(port)); }); });
const password = randomBytes(24).toString("hex");
const env = { ...process.env, DATABASE_URL: `postgresql://postgres:${password}@localhost:${port}/audit_focused`,
  ALLOW_DEVELOPMENT_SEED: "true", SEED_ADMIN_PASSWORD: randomBytes(24).toString("hex"), SEED_TIER1_PASSWORD: randomBytes(24).toString("hex"), SEED_TIER2_PASSWORD: randomBytes(24).toString("hex"),
  NEXT_PUBLIC_SANITY_PROJECT_ID: "testonly", NEXT_PUBLIC_SANITY_DATASET: "test", TEST_ACCOUNT_MAIL_DIR: resolve(directory, "mail"), TEST_CATALOG_CONTENT_FILE: resolve(directory, "catalog.json") };
await mkdir(env.TEST_ACCOUNT_MAIL_DIR); await writeFile(env.TEST_CATALOG_CONTENT_FILE, JSON.stringify({ products: [] }));
const postgres = new EmbeddedPostgres({ databaseDir: databaseDirectory, port, user: "postgres", password, authMethod: "scram-sha-256", persistent: true, postgresFlags: ["-h", "127.0.0.1"], onLog: () => {}, onError: () => {} });
let app: ChildProcess | undefined; let started = false;
const start = (args: string[], production = false) => spawn(process.execPath, args, { env: { ...env, NODE_ENV: production ? "production" : "test" }, windowsHide: true, stdio: "inherit" });
const run = async (args: string[], production = false) => { const child = start(args, production); await new Promise<void>((yes, no) => { child.once("error", no); child.once("exit", code => code === 0 ? yes() : no(Error(`Focused check failed: ${args[0]}`))); }); };
try {
  await postgres.initialise(); await postgres.start(); started = true;
  let stopping: Promise<void> | undefined;
  postgres.stop = () => stopping ??= new Promise<void>((yes, no) => {
    const child = spawn(resolve("node_modules/@embedded-postgres/windows-x64/native/bin/pg_ctl.exe"), ["-D", databaseDirectory, "stop", "-m", "fast", "-w", "-t", "15"], { windowsHide: true, stdio: "ignore" });
    child.once("error", no); child.once("exit", code => code === 0 ? yes() : no(Error("Audit cluster shutdown failed.")));
  });
  await postgres.createDatabase("audit_focused");
  const contactOnly = process.argv.includes("--contact");
  const revocation = process.argv.includes("--revocation");
  const invitations = process.argv.includes("--invitations") || revocation;
  const browserOnly = process.argv.includes("--browser-only");
  if (contactOnly || (invitations && !browserOnly)) await run(["node_modules/prisma/build/index.js", "generate"]);
  await run(["node_modules/prisma/build/index.js", "migrate", "deploy"]);
  await run(["--conditions=react-server", "--import", "tsx", "prisma/seed.ts"]);
  const ordersOnly = process.argv.includes("--orders");
  if (!ordersOnly && !browserOnly) await run(["node_modules/vitest/vitest.mjs", "run", "--config", revocation ? "tests/security/revocation.config.ts" : invitations ? "tests/security/invitations.config.ts" : contactOnly ? "tests/security/integration.config.ts" : "tests/security/focused.config.ts"]);
  if (invitations && process.argv.includes("--database")) return;
  if (contactOnly || (invitations && !browserOnly)) await run(["node_modules/next/dist/bin/next", "build"], true);
  app = start(["--import", "./tests/email-interceptor.mjs", "--import", "./tests/catalog-interceptor.mjs", "node_modules/next/dist/bin/next", "start", "--port", "3107", "--hostname", "localhost"], true);
  let ready = false;
  for (let count = 0; count < 60; count++) { try { if ((await fetch("http://localhost:3107/login")).ok) { ready = true; break; } } catch { /* Starting. */ } await new Promise(done => setTimeout(done, 250)); }
  if (!ready) throw Error("Isolated app did not start.");
  if (ordersOnly) await run(["node_modules/@playwright/test/cli.js", "test", "orders.spec.ts"]);
  if (invitations) await run(["node_modules/@playwright/test/cli.js", "test", "account-tokens.spec.ts", "customer-batch.spec.ts", ...(revocation ? ["customers.spec.ts", "--config", "tests/security/playwright.config.ts"] : [])]);
  else await run(["node_modules/@playwright/test/cli.js", "test", "--config", "tests/security/http.config.ts", ...(contactOnly ? ["--grep", "contact"] : [])]);
} finally {
  if (app && app.exitCode === null) { const closed = new Promise(done => app!.once("exit", done)); app.kill(); await closed; }
  if (started) await postgres.stop();
}
}
main().catch(error => { console.error("Focused audit failed:", String(error?.message ?? "unknown error").replace(/\b(?:postgres(?:ql)?|https?):\/\/\S+/g, "[redacted URL]")); process.exit(1); });
