import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";
import { createServer } from "node:net";
import EmbeddedPostgres from "embedded-postgres";

async function main() {
  // Only the sanitized security wrapper enables this continuation after an
  // unchanged source tree has already passed database tests and its first build.
  const resumeBrowsers = process.argv.includes("--resume-isolated-browser-checks");
  if (resumeBrowsers && !process.env.NODE_OPTIONS?.includes("tests/security/isolation.cjs")) {
    throw new Error("Resume browser checks through tests/security/run.mjs only.");
  }
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
    ORDER_TO_EMAIL: "orders@example.test",
    TEST_ACCOUNT_MAIL_DIR: mailDirectory,
    TEST_CATALOG_CONTENT_FILE: "",
    // Tests never depend on or contact a real content dataset, even if local
    // development configuration points to one. Content tests mock the boundary.
    NEXT_PUBLIC_SANITY_PROJECT_ID: "",
    NEXT_PUBLIC_SANITY_DATASET: "",
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
  async function stopApp() {
    if (app && app.exitCode === null) {
      const exited = new Promise((done) => app!.once("exit", done));
      app.kill();
      await exited;
    }
  }
  async function waitForApp() {
    for (let i = 0; i < 60; i++) {
      if (!app || app.exitCode !== null) throw new Error("Test application exited before readiness.");
      try { if ((await fetch(env.AUTH_URL + "/login")).ok) return; } catch { /* Starting. */ }
      await new Promise((done) => setTimeout(done, 500));
    }
    throw new Error("Test application did not become ready.");
  }
  try {
    console.log("Starting isolated PostgreSQL authentication checks.");
    await postgres.initialise();
    await postgres.start();
    started = true;
    if (process.platform === "win32") {
      // embedded-postgres uses taskkill /f /t on Windows, which can orphan PG18
      // I/O workers and lock node_modules during npm ci. Gracefully stop only
      // this newly created cluster instead. Its exit hook calls this same
      // idempotent method, so it cannot wait on an already-exited process.
      let stopping: Promise<void> | undefined;
      postgres.stop = () => stopping ??= new Promise<void>((yes, no) => {
        const stop = spawn(resolve("node_modules/@embedded-postgres/windows-x64/native/bin/pg_ctl.exe"),
          ["-D", directory, "stop", "-m", "fast", "-w", "-t", "15"],
          { windowsHide: true, stdio: "ignore" });
        stop.once("error", no);
        stop.once("exit", (code) => code === 0 ? yes() : no(new Error("Isolated PostgreSQL shutdown failed.")));
      });
    }
    await postgres.createDatabase("big_wicks_auth_test");
    if (!resumeBrowsers) await run(["node_modules/prisma/build/index.js", "generate"]);
    await run(["node_modules/prisma/build/index.js", "migrate", "deploy"]);
    await run(["--conditions=react-server", "--import", "tsx", "prisma/seed.ts"]);
    if (!resumeBrowsers) {
      await run(["node_modules/vitest/vitest.mjs", "run", "--config", "vitest.integration.config.ts"]);
      await run(["node_modules/next/dist/bin/next", "build"], true);
    } else {
      console.log("Resuming browsers from the isolated unconfigured build; unit/database tests are not rerun.");
    }
    app = start(["--import", "./tests/email-interceptor.mjs", "node_modules/next/dist/bin/next", "start", "--port", "3107", "--hostname", "localhost"], true);
    await waitForApp();
    await run(["node_modules/@playwright/test/cli.js", "test"]);
    await stopApp();
    // A second build verifies the configured content path without a remote
    // project. The first still verifies unconfigured builds and Studio fallback.
    env.NEXT_PUBLIC_SANITY_PROJECT_ID = "testonly";
    env.NEXT_PUBLIC_SANITY_DATASET = "test";
    env.TEST_CATALOG_CONTENT_FILE = resolve(directory, "catalog.json");
    await writeFile(env.TEST_CATALOG_CONTENT_FILE, JSON.stringify({ products: [] }));
    await run(["node_modules/next/dist/bin/next", "build"], true);
    app = start(["--import", "./tests/email-interceptor.mjs", "--import", "./tests/catalog-interceptor.mjs", "node_modules/next/dist/bin/next", "start", "--port", "3107", "--hostname", "localhost"], true);
    await waitForApp();
    await run(["node_modules/@playwright/test/cli.js", "test", "catalog-ui.spec.ts", "pricing.spec.ts", "orders.spec.ts", "customer-batch.spec.ts"]);
  } finally {
    await stopApp();
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
