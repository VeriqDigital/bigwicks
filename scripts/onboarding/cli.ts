import "server-only";
import { config } from "dotenv";
import { createClient } from "@sanity/client";
import { sanityApiVersion } from "../../sanity/environment";
import { OnboardingError, prepare, readCanonical } from "./csv";
import { boundedFile, writeArtifacts } from "./files";
import { assertTarget, authorizeApply, importCatalog, MAX_DOCUMENTS, type Boundary, type ApplyOptions } from "./plan";

export async function run(args: string[]) {
  const [command, input, ...rest] = args;
  if (!input || input.startsWith("--")) throw new OnboardingError("Use catalog:prepare input.csv data/onboarding/resolved.csv, or catalog:import resolved.csv --project ID --dataset NAME [--snapshot file.json].");
  if (command === "prepare") {
    if (rest.length !== 1) throw new OnboardingError("Prepare requires exactly input and output paths.");
    const result = prepare(await boundedFile(input));
    const paths = await writeArtifacts(rest[0], result.resolvedCsv, result.pricingCsv);
    console.log(JSON.stringify({ preparationComplete: true, ...result.summary, ...paths }, null, 2));
    return;
  }
  if (command !== "import") throw new OnboardingError("Unknown onboarding command.");
  const flags = new Map<string, string>();
  for (let index = 0; index < rest.length; index++) {
    const key = rest[index];
    if (!["--project", "--dataset", "--snapshot", "--apply", "--confirm", "--allow-production"].includes(key) || flags.has(key)) throw new OnboardingError("Unknown or repeated import flag.");
    const value = key === "--allow-production" ? "true" : rest[++index];
    if (!value || value.startsWith("--")) throw new OnboardingError("Import flag requires a value.");
    flags.set(key, value);
  }
  const target = { projectId: flags.get("--project") ?? "", dataset: flags.get("--dataset") ?? "" };
  const options: ApplyOptions = { applyHash: flags.get("--apply"), confirm: flags.get("--confirm"), allowProduction: flags.has("--allow-production") };
  assertTarget(target);
  const bytes = await boundedFile(input); readCanonical(bytes, true); // Validate before configuration/network.
  const offline = flags.get("--snapshot");
  if (offline && options.applyHash) throw new OnboardingError("--snapshot is offline dry-run only; it can never apply remotely.");
  let boundary: Boundary;
  if (offline) {
    const data = new TextDecoder("utf-8", { fatal: true }).decode(await boundedFile(offline));
    boundary = { read: async () => JSON.parse(data), commit: async () => { throw new OnboardingError("Offline snapshots cannot write."); } };
  } else {
    config({ path: ".env.local", quiet: true }); config({ path: ".env", quiet: true });
    authorizeApply(target, options, process.env);
    const token = process.env.SANITY_API_WRITE_TOKEN;
    if (!token?.trim()) throw new OnboardingError("CLI-only SANITY_API_WRITE_TOKEN is required, including for full draft-aware remote dry-runs.");
    const client = createClient({ ...target, token, apiVersion: sanityApiVersion, useCdn: false, perspective: "raw", maxRetries: 0, timeout: 30000 });
    boundary = {
      read: () => client.fetch(`*[_type in ["product", "category"]] | order(_id asc) [0...${MAX_DOCUMENTS + 1}]{_id,_rev,_type,catalogKey,sku,name,description,available,category{_type,_ref}}`, {}, { cache: "no-store" }),
      commit: (mutations) => client.mutate(mutations, { visibility: "sync", returnDocuments: true, returnFirst: false, autoGenerateArrayKeys: false }),
    };
  }
  await importCatalog(bytes, target, options, process.env, boundary, (report) => console.log(JSON.stringify(report, null, 2)));
}

void run(process.argv.slice(2)).catch((error: unknown) => {
  // Never print SDK/HTTP error payloads, token values or raw input records.
  console.error(error instanceof OnboardingError ? error.message : "Onboarding failed. Check file access, target/token permissions and remote state. If a write was attempted, inspect the target and dry-run again before retrying.");
  process.exitCode = 1;
});
