import { BootstrapError, confirmation, parseRequest, parseTarget } from "./plan";
import { applyBootstrap, inspectBootstrap, openBootstrapDb } from "./bootstrap-core";
import { readHiddenPassword } from "./password-input";

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--help") {
    console.log("db:bootstrap --expected-host HOST --expected-port PORT --expected-database DB --admin-email EMAIL --allow-production --confirm HOST:PORT/DB [--apply REVIEWED_SHA256]\nDefault: read-only inspection, no password prompt. Apply: hidden interactive password + confirmation. DATABASE_URL must be injected into the operator process; no .env files are loaded. Never supply a password argument. See docs/LAUNCH-RUNBOOK.md phase 2.");
    return;
  }
  const connection = parseTarget(process.env.DATABASE_URL);
  console.log(JSON.stringify({ target: connection.target, confirmation: confirmation(connection.target) }, null, 2));
  const request = parseRequest(args, connection.target);
  const db = openBootstrapDb(connection);
  try {
    const plan = await inspectBootstrap(db, request);
    console.log(JSON.stringify(plan, null, 2));
    if (!request.applyHash || plan.status === "already-complete") return;
    if (plan.planHash !== request.applyHash) throw new BootstrapError("Reviewed plan is stale or mismatched. Dry-run again; no write attempted.");
    if (!process.stdout.isTTY) throw new BootstrapError("Apply requires an interactive terminal; redirected output is refused.");
    let password = await readHiddenPassword();
    try {
      const result = await applyBootstrap(db, request, password);
      console.log(JSON.stringify({ ...result, tiersCreated: result.status === "created" ? 2 : 0, adminsCreated: result.status === "created" ? 1 : 0, customersCreated: 0, emailsSent: 0 }, null, 2));
    } finally { password = ""; }
  } finally { await db.$disconnect(); }
}

void main().catch((error: unknown) => {
  // Never print raw driver/Prisma exceptions or connection/password/hash material.
  console.error(error instanceof BootstrapError ? error.message : "Bootstrap failed. STOP and inspect with a dry-run before retrying; check local tooling and operator access without printing credentials.");
  process.exitCode = 1;
});
