// Only a newly initialized loopback cluster; never inherit application credentials.
import { execFileSync, spawn } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, symlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = process.cwd();
const env = {};
for (const key of ['SystemRoot', 'WINDIR', 'ComSpec', 'PATH', 'PATHEXT', 'TEMP', 'TMP', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE']) {
  if (process.env[key]) env[key] = process.env[key];
}
Object.assign(env, {
  NODE_ENV: 'test', NODE_OPTIONS: `--require "${resolve('tests/security/isolation.cjs').replaceAll('\\', '/')}"`,
  NEXT_PUBLIC_SITE_URL: 'https://www.example.test', NEXT_PUBLIC_SANITY_PROJECT_ID: '', NEXT_PUBLIC_SANITY_DATASET: '',
  NEXT_TELEMETRY_DISABLED: '1', CHECKPOINT_DISABLE: '1', DO_NOT_TRACK: '1',
});
mkdirSync('.test-runtime', { recursive: true });
const stage = mkdtempSync(resolve('.test-runtime/bootstrap-source-'));
const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', windowsHide: true }).split('\0').filter(Boolean);
// Explicit patch files support pre-commit verification; never enumerate arbitrary untracked files.
const patchFiles = ['scripts/production/plan.ts', 'scripts/production/bootstrap-core.ts', 'scripts/production/bootstrap.ts', 'scripts/production/password-input.ts', 'scripts/production/add-admin-core.ts', 'scripts/production/add-admin.ts', 'tests/unit/bootstrap.test.ts', 'tests/bootstrap/config.ts', 'tests/bootstrap/database.test.ts', 'tests/bootstrap/add-admin.test.ts', 'tests/bootstrap/add-admin-cli.ts', 'tests/bootstrap/postgres.ts', 'tests/bootstrap/run.mjs', 'tests/bootstrap/prompt-smoke.ts'];
for (const file of new Set([...tracked, ...patchFiles])) {
  if (/(^|\/)\.env(?:\.|$)/.test(file) || file.startsWith('public/')) continue;
  const target = resolve(stage, file); mkdirSync(dirname(target), { recursive: true }); copyFileSync(resolve(root, file), target);
}
symlinkSync(resolve(root, 'node_modules'), resolve(stage, 'node_modules'), 'junction');
console.log(`Bootstrap isolated source: ${stage}`);
for (const args of [
  ['node_modules/prisma/build/index.js', 'generate'],
  ['--import', 'tsx', 'tests/bootstrap/postgres.ts'],
  ['node_modules/eslint/bin/eslint.js'],
  ['node_modules/next/dist/bin/next', 'typegen'],
  ['node_modules/typescript/bin/tsc', '--noEmit', '--incremental', 'false'],
]) {
  const code = await new Promise((done, reject) => {
    const child = spawn(process.execPath, args, { cwd: stage, env, stdio: 'inherit', windowsHide: true });
    child.once('error', reject); child.once('exit', done);
  });
  if (code !== 0) { process.exitCode = code || 1; break; }
}
