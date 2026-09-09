import { mkdir, mkdtemp } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";
import EmbeddedPostgres from "embedded-postgres";

async function main() {
  if (!process.env.NODE_OPTIONS?.includes("tests/security/isolation.cjs")) throw Error("Use tests/bootstrap/run.mjs only.");
  await mkdir(".test-runtime", { recursive: true });
  const directory = await mkdtemp(resolve(".test-runtime/bootstrap-db-"));
  const port = await new Promise<number>((done, reject) => {
    const probe = createServer(); probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => { const address = probe.address();
      if (!address || typeof address === "string") return reject(Error("No test port"));
      probe.close(() => done(address.port));
    });
  });
  const password = randomBytes(24).toString("hex") + "@/?";
  const env = { ...process.env, DATABASE_URL: `postgresql://postgres:${encodeURIComponent(password)}@127.0.0.1:${port}/bootstrap_disposable` };
  const postgres = new EmbeddedPostgres({ databaseDir: directory, port, user: "postgres", password,
    authMethod: "scram-sha-256", persistent: true, postgresFlags: ["-h", "127.0.0.1"], onLog: () => {}, onError: () => {} });
  let started = false;
  try {
    await postgres.initialise(); await postgres.start(); started = true;
    if (process.platform === "win32") {
      let stopping: Promise<void> | undefined;
      postgres.stop = () => stopping ??= new Promise<void>((done, reject) => {
        const stop = spawn(resolve("node_modules/@embedded-postgres/windows-x64/native/bin/pg_ctl.exe"), ["-D", directory, "stop", "-m", "fast", "-w", "-t", "15"], { windowsHide: true, stdio: "ignore" });
        stop.once("error", reject); stop.once("exit", code => code === 0 ? done() : reject(Error("Disposable cluster shutdown failed")));
      });
    }
    await postgres.createDatabase("bootstrap_disposable");
    for (const args of [
      ["node_modules/prisma/build/index.js", "migrate", "deploy"],
      ["node_modules/vitest/vitest.mjs", "run", "--config", "tests/bootstrap/config.ts"],
    ]) {
      await new Promise<void>((done, reject) => {
        const child = spawn(process.execPath, args, { env, stdio: "inherit", windowsHide: true });
        child.once("error", reject); child.once("exit", code => code === 0 ? done() : reject(Error("Bootstrap rehearsal check failed")));
      });
    }
  } finally { if (started) await postgres.stop(); }
}
void main().catch(() => { console.error("Disposable bootstrap rehearsal failed; cluster cleanup attempted."); process.exit(1); });
