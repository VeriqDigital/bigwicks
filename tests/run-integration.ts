import { mkdir, mkdtemp } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";
import { createServer } from "node:net";
import EmbeddedPostgres from "embedded-postgres";

async function main() {
  const root = resolve(".test-runtime");
  await mkdir(root, { recursive: true });
  const directory = await mkdtemp(resolve(root, "auth-"));
  const mailDirectory = await mkdtemp(resolve(root, "mail-"));
  const port = await new Promise<number>((done, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      if (!address || typeof address === "string") return reject(new Error("No local port available."));
      probe.close(() => done(address.port));
    });
  });
  const password = randomBytes(24).toString("hex");
  const env = {
    ...process.env,
    DATABASE_URL: `postgresql://postgres:${password}@localhost:${port}/big_wicks_auth_test`,
    AUTH_SECRET: randomBytes(32).toString("base64"),
    AUTH_URL: "http://localhost:3107",
    AUTH_TRUST_HOST: "true",
    RESEND_API_KEY: "isolated-test-key",
    ACCOUNT_FROM_EMAIL: "Big Wicks Tests <accounts@example.test>",
    TEST_ACCOUNT_MAIL_DIR: mailDirectory,
    ALLOW_DEVELOPMENT_SEED: "true",
    SEED_ADMIN_PASSWORD: randomBytes(24).toString("hex"),
    SEED_TIER1_PASSWORD: randomBytes(24).toString("hex"),
    SEED_TIER2_PASSWORD: randomBytes(24).toString("hex"),
    NODE_ENV: "test",
  };
  const postgres = new EmbeddedPostgres({
    databaseDir: directory, port, user: "postgres", password,
    authMethod: "scram-sha-256", persistent: true,
    postgresFlags: ["-h", "127.0.0.1"],
    onLog: (message) => { if (/FATAL|PANIC|could not/i.test(String(message))) console.error(String(message)); },
    onError: () => console.error("Test PostgreSQL client error."),
  });
  function start(args: string[], production = false) {
    return spawn(process.execPath, args, {
      env: { ...env, NODE_ENV: production ? "production" : "test" },
      stdio: "inherit", windowsHide: true,
    });
  }
  async function run(args: string[], production = false) {
    const child = start(args, production);
    await new Promise<void>((yes, no) => {
      child.once("error", no);
      child.once("exit", (code) => code === 0 ? yes() : no(new Error(`Check failed (${code}): ${args[0]}`)));
    });
  }
  let app: ChildProcess | undefined;
  let started = false;
  try {
    console.log("Starting isolated PostgreSQL authentication checks.");
    await postgres.initialise();
    await postgres.start();
    started = true;
    await postgres.createDatabase("big_wicks_auth_test");
    await run(["node_modules/prisma/build/index.js", "generate"]);
    await run(["node_modules/prisma/build/index.js", "migrate", "deploy"]);
    await run(["--conditions=react-server", "--import", "tsx", "prisma/seed.ts"]);
    await run(["node_modules/vitest/vitest.mjs", "run", "--config", "vitest.integration.config.ts"]);
    await run(["node_modules/next/dist/bin/next", "build"], true);
    app = start(["--import", "./tests/email-interceptor.mjs", "node_modules/next/dist/bin/next", "start", "--port", "3107", "--hostname", "localhost"], true);
    let ready = false;
    for (let i = 0; i < 60; i++) {
      if (app.exitCode !== null) throw new Error("Test application exited before readiness.");
      try { ready = (await fetch(env.AUTH_URL + "/login")).ok; } catch { /* Starting. */ }
      if (ready) break;
      await new Promise((done) => setTimeout(done, 500));
    }
    if (!ready) throw new Error("Test application did not become ready.");
    await run(["node_modules/@playwright/test/cli.js", "test"]);
  } finally {
    if (app && app.exitCode === null) {
      const exited = new Promise((done) => app!.once("exit", done));
      app.kill();
      await exited;
    }
    if (started) await postgres.stop();
    // Retained under the ignored directory for debugging; never touch a user's database.
  }
}

main().catch((error) => {
  console.error(error ?? new Error("Test PostgreSQL failed to start."));
  // Cleanup has completed in finally. The embedded cluster's beforeExit hook
  // otherwise forces exit code 0, masking failed checks in CI.
  process.exit(1);
});
