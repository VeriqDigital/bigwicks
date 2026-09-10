import { BootstrapError, confirmation, parseTarget } from "./plan";
import { openBootstrapDb } from "./bootstrap-core";
import { createAdditionalAdmin, inspectAdditionalAdmin, parseAddAdminRequest } from "./add-admin-core";
import { readHiddenPassword } from "./password-input";

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--help") {
    console.log("db:add-admin --expected-host HOST --expected-port PORT --expected-database DB --admin-email EMAIL --allow-production --confirm HOST:PORT/DB\nCreates one additional ADMIN after two matching hidden password entries. Existing emails always refuse. DATABASE_URL must be injected into the operator process; no .env files are loaded. No password arguments or --apply option. See docs/LAUNCH-RUNBOOK.md.");
    return;
  }
  const connection = parseTarget(process.env.DATABASE_URL);
  console.log(JSON.stringify({ target: connection.target, confirmation: confirmation(connection.target) }, null, 2));
  const request = parseAddAdminRequest(args, connection.target);
  console.log(JSON.stringify({ adminEmail: request.email }, null, 2));
  const db = openBootstrapDb(connection);
  try {
    await inspectAdditionalAdmin(db, request);
    if (!process.stdout.isTTY) throw new BootstrapError("Creation requires an interactive terminal; redirected output is refused.");
    let password = await readHiddenPassword();
    try {
      const result = await createAdditionalAdmin(db, request, password);
      console.log(`Additional ADMIN created:\n- email: ${result.email}\n- role: ${result.role}\n- active: ${result.active}\n- customer created: ${result.customersCreated}\n- email sent: ${result.emailsSent}`);
    } finally { password = ""; }
  } finally { await db.$disconnect(); }
}

void main().catch((error: unknown) => {
  console.error(error instanceof BootstrapError ? error.message : "Additional ADMIN command failed. STOP and independently check whether creation occurred before retrying; check local tooling and operator access without printing credentials.");
  process.exitCode = 1;
});
