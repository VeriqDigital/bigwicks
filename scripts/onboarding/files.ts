import "server-only";
import { open, mkdir, realpath, unlink } from "node:fs/promises";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";
import { MAX_BYTES, OnboardingError } from "./csv";

export async function boundedFile(path: string) {
  const file = await open(path, "r");
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > MAX_BYTES) throw new OnboardingError("Input must be a regular file of at most 2 MiB.");
    const buffer = Buffer.alloc(MAX_BYTES + 1); let size = 0;
    while (size < buffer.length) { const result = await file.read(buffer, size, buffer.length - size); if (!result.bytesRead) break; size += result.bytesRead; }
    if (size > MAX_BYTES) throw new OnboardingError("Input grew beyond 2 MiB.");
    return buffer.subarray(0, size);
  } finally { await file.close(); }
}
function inside(root: string, path: string) {
  const rel = relative(root, path);
  return Boolean(rel) && !isAbsolute(rel) && rel !== ".." && !rel.startsWith("..\\") && !rel.startsWith("../");
}
async function outputPaths(resolvedPath: string) {
  // Restrict outputs to one ignored directory, not public/ or arbitrary paths.
  const workspace = await realpath(process.cwd());
  const data = resolve(workspace, "data");
  await mkdir(data, { recursive: true });
  if (await realpath(data) !== data) throw new OnboardingError("data must not be a symlink/junction.");
  const root = resolve(data, "onboarding"); await mkdir(root, { recursive: true });
  if (await realpath(root) !== root) throw new OnboardingError("Onboarding output directory must not be a symlink/junction.");
  const target = resolve(resolvedPath);
  if (!inside(root, target) || dirname(target) !== root || !/^[a-zA-Z0-9_-]+\.csv$/.test(basename(target))) throw new OnboardingError("Write artifacts directly under data/onboarding/ using a simple .csv filename.");
  const pricing = target.slice(0, -4) + ".pricing.csv";
  return { workspace, target, pricing };
}
export async function writeMapped(path: string, csv: string) {
  const { workspace, target } = await outputPaths(path);
  const file = await open(target, "wx", 0o600);
  try { await file.writeFile(csv, "utf8"); await file.sync(); }
  catch (error) { await file.close(); await unlink(target); throw error; }
  finally { await file.close(); }
  return relative(workspace, target);
}
export async function writeArtifacts(resolvedPath: string, resolvedCsv: string, pricingCsv: string) {
  const { workspace, target, pricing } = await outputPaths(resolvedPath);
  const created: string[] = [];
  try {
    for (const [path, body] of [[target, resolvedCsv], [pricing, pricingCsv]]) {
      const file = await open(path, "wx", 0o600); created.push(path);
      try { await file.writeFile(body, "utf8"); await file.sync(); } finally { await file.close(); }
    }
  } catch {
    // Only remove files created by this invocation; never overwrite a resolved map.
    for (const path of created) await unlink(path);
    throw new OnboardingError("Could not create both artifacts. Existing files are never overwritten; use a new output name.");
  }
  return { resolvedCatalog: relative(workspace, target), pricingImport: relative(workspace, pricing) };
}
