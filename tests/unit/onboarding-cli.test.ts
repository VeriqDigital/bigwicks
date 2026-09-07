import { afterAll, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, unlinkSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { readCanonical } from "../../scripts/onboarding/csv";

const prefix = resolve("data/onboarding", `fictional-test-${randomUUID()}`);
const resolved = prefix + ".csv"; const pricing = prefix + ".pricing.csv";
const artifacts = [resolved, pricing, prefix + "-bad.csv", prefix + "-blocked.csv", prefix + "-mapped.csv"];
afterAll(() => { for (const path of artifacts) if (existsSync(path)) unlinkSync(path); });
const cli = (...args: string[]) => spawnSync(process.execPath, ["--conditions=react-server", "--import", "./tests/fixtures/onboarding-no-network.mjs", "--import", "tsx", "scripts/onboarding/cli.ts", ...args], {
  encoding: "utf8", windowsHide: true, timeout: 20000,
  env: { ...process.env, SANITY_API_WRITE_TOKEN: "FICTIONAL_SECRET_DO_NOT_PRINT", SANITY_CATALOG_NON_PRODUCTION_TARGET: "", ALLOW_PRODUCTION_CATALOG_IMPORT: "false" },
});
it("prepares fictional artifacts, never overwrites, and performs offline import dry-run with all networking forbidden", () => {
  const result = cli("prepare", "tests/fixtures/onboarding.csv", resolved);
  expect(result.status, result.stderr).toBe(0);
  const report = JSON.parse(result.stdout); expect(report).toMatchObject({ preparationComplete: true, rows: 2, generatedCatalogKeys: 1 });
  for (const value of ["19.99", "17.25", "FICTIONAL_SECRET_DO_NOT_PRINT"]) expect(result.stdout + result.stderr).not.toContain(value);
  const content = readFileSync(resolved); expect(readCanonical(content, true)).toHaveLength(2); expect(existsSync(pricing)).toBe(true);
  expect(cli("prepare", "tests/fixtures/onboarding.csv", resolved).status).toBe(1);
  expect(readFileSync(resolved)).toEqual(content);
  const dry = cli("import", resolved, "--project", "testonly", "--dataset", "test", "--snapshot", "tests/fixtures/onboarding-empty.json");
  expect(dry.status, dry.stderr).toBe(0); expect(JSON.parse(dry.stdout)).toMatchObject({ mode: "dry-run", newProducts: 2, newCategories: 1, errors: 0 });
  for (const value of ["19.99", "17.25", "FICTIONAL_SECRET_DO_NOT_PRINT"]) expect(dry.stdout + dry.stderr).not.toContain(value);
  expect(cli("import", resolved, "--project", "testonly", "--dataset", "test", "--snapshot", "tests/fixtures/onboarding-empty.json", "--apply", "a".repeat(64)).stderr).toContain("offline dry-run only");
  const blocked = cli("import", resolved, "--project", "testonly", "--dataset", "test", "--apply", "a".repeat(64), "--confirm", "testonly/test");
  expect(blocked.status).toBe(1); expect(blocked.stderr).toContain("production-guarded");
}, 30000);
it("invalid input produces no applyable output and artifacts cannot be placed in public", () => {
  mkdirSync(resolve("data/onboarding"), { recursive: true });
  writeFileSync(prefix + "-bad.csv", "invalid,headers\nprivate,values\n");
  const invalid = cli("prepare", prefix + "-bad.csv", prefix + "-blocked.csv");
  expect(invalid.status).toBe(1); expect(existsSync(prefix + "-blocked.csv")).toBe(false);
  expect(invalid.stderr).not.toContain("private,values");
  const publicPath = resolve("public", `fictional-${randomUUID()}.csv`);
  expect(cli("prepare", "tests/fixtures/onboarding.csv", publicPath).status).toBe(1); expect(existsSync(publicPath)).toBe(false);
});

it("BoxHero CLI defaults to dry-run and requires a matching review before writing a cost-free mapped file", () => {
  const args = ["boxhero", "tests/fixtures/boxhero.csv", "tests/fixtures/boxhero-config.json"];
  const path = prefix + "-mapped.csv";
  const dry = cli(...args); expect(dry.status, dry.stderr).toBe(0); expect(existsSync(path)).toBe(false);
  const report = JSON.parse(dry.stdout); expect(report).toMatchObject({ mode: "dry-run", validCandidates: 1, blockedCandidates: 0 });
  const denied = cli(...args, "--write", path, "--reviewed", "b".repeat(64));
  expect(denied.status).toBe(1); expect(existsSync(path)).toBe(false);
  const written = cli(...args, "--write", path, "--reviewed", report.planHash);
  expect(written.status, written.stderr).toBe(0);
  const csv = readFileSync(path, "utf8");
  for (const secret of ["847263.51", "Unit Cost", "IGNORED-BOXHERO-ID", "FICTIONAL_SECRET_DO_NOT_PRINT"]) expect(csv + dry.stdout + written.stdout).not.toContain(secret);
  expect(readCanonical(Buffer.from(csv))[0]).toMatchObject({ catalogKey: "", available: false, prices: { "price:1:Tier 1": null, "price:2:Tier 2": "123.45" } });
  expect(cli(...args, "--write", path, "--reviewed", report.planHash).status).toBe(1); expect(readFileSync(path, "utf8")).toBe(csv);
}, 30000);
