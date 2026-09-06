import { config } from "dotenv";
import { auditCatalog } from "../lib/catalog/audit";
import { getDb } from "../lib/db";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

async function main() {
  try {
    const report = await auditCatalog();
    console.log(JSON.stringify(report, null, 2));
    if (report.issues.length > 0) process.exitCode = 1;
  } catch {
    console.error("Catalog audit could not complete. Check Sanity configuration, database access and migrations.");
    process.exitCode = 2;
  } finally {
    if (process.env.DATABASE_URL) await getDb().$disconnect().catch(() => { process.exitCode = 2; });
  }
}
void main();
