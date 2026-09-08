// Runs existing checks with fictional configuration and no private env loading.
import { spawn, execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { resolve, dirname, sep } from 'node:path';
import { mkdirSync, mkdtempSync, copyFileSync, symlinkSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
const sourceRoot = process.cwd();
const env = {};
for (const name of ['SystemRoot', 'WINDIR', 'ComSpec', 'PATH', 'PATHEXT', 'TEMP', 'TMP', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE']) {
  if (process.env[name]) env[name] = process.env[name];
}
Object.assign(env, {
  NODE_ENV: 'test', NODE_OPTIONS: `--require "${resolve('tests/security/isolation.cjs').replaceAll('\\', '/')}"`,
  DATABASE_URL: 'postgresql://fictional:fictional@127.0.0.1:1/isolated_audit_no_database',
  AUTH_SECRET: randomBytes(32).toString('base64'), AUTH_URL: 'http://localhost:3107', AUTH_TRUST_HOST: 'true',
  RESEND_API_KEY: 'isolated-test-key', ACCOUNT_FROM_EMAIL: 'accounts@example.test', ORDER_TO_EMAIL: 'orders@example.test',
  CONTACT_FROM_EMAIL: 'contact@example.test', CONTACT_TO_EMAIL: 'inquiries@example.test',
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3107', NEXT_PUBLIC_SANITY_PROJECT_ID: '', NEXT_PUBLIC_SANITY_DATASET: '',
  NEXT_TELEMETRY_DISABLED: '1', CHECKPOINT_DISABLE: '1', DO_NOT_TRACK: '1',
  NEXT_FONT_GOOGLE_MOCKED_RESPONSES: resolve('tests/security/font-responses.cjs'),
});
const commands = {
  lint: ['node_modules/eslint/bin/eslint.js'],
  typecheck: ['node_modules/typescript/bin/tsc', '--noEmit', '--incremental', 'false'],
  integration: ['--import', 'tsx', 'tests/run-integration.ts'],
  browsers: ['--import', 'tsx', 'tests/run-integration.ts', '--resume-isolated-browser-checks'],
  orders: ['--import', 'tsx', 'tests/security/focused.ts', '--orders'],
  unit: ['node_modules/vitest/vitest.mjs', 'run'],
  focused: ['--import', 'tsx', 'tests/security/focused.ts'],
  contact: ['--import', 'tsx', 'tests/security/focused.ts', '--contact'],
};
const command = commands[process.argv[2]];
if (!command) throw new Error('Choose lint, typecheck, integration, unit, contact, or browsers/orders/focused with an existing isolated build directory.');
// Native build tools also see a source directory with NO private env files.
mkdirSync('.test-runtime', { recursive: true });
const stage = mkdtempSync(resolve('.test-runtime/security-source-'));
const tracked = execFileSync('git', ['-c', `safe.directory=${sourceRoot.replaceAll('\\', '/')}`, 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8', env, windowsHide: true }).split('\0').filter(Boolean);
const securityFiles = readdirSync('tests/security').map(name => `tests/security/${name}`);
for (const file of new Set([...tracked, ...securityFiles])) {
  if (/(^|\/)\.env(?:\.|$)/.test(file) || file.startsWith('public/')) continue;
  const dest = resolve(stage, file); mkdirSync(dirname(dest), { recursive: true }); copyFileSync(resolve(sourceRoot, file), dest);
}
symlinkSync(resolve(sourceRoot, 'node_modules'), resolve(stage, 'node_modules'), 'junction');
symlinkSync(resolve(sourceRoot, 'public'), resolve(stage, 'public'), 'junction');
// Existing generated types are safe code, not data; integration regenerates them.
symlinkSync(resolve(sourceRoot, 'generated'), resolve(stage, 'generated'), 'junction');
const reuseBuild = ['focused', 'browsers', 'orders'].includes(process.argv[2]);
if (reuseBuild) {
  const built = realpathSync(resolve(sourceRoot, process.argv[3] ?? ''));
  if (!built.startsWith(realpathSync(resolve(sourceRoot, '.test-runtime')) + sep)) throw new Error('Use an isolated audit build.');
  {
    const builtPackage = JSON.parse(readFileSync(resolve(built, 'package.json'), 'utf8'));
    const currentPackage = JSON.parse(readFileSync(resolve(sourceRoot, 'package.json'), 'utf8'));
    if (builtPackage.dependencies.next !== currentPackage.dependencies.next) throw new Error('Framework version differs; run integration from scratch.');
    for (const file of tracked.filter(file => /^(app\/|components\/|lib\/|sanity\/|prisma\/|auth\.|[^/]*config\.|package(?:-lock)?\.json$)/.test(file))) {
      if (!readFileSync(resolve(built, file)).equals(readFileSync(resolve(sourceRoot, file)))) throw new Error(`Build input changed (${file}); run integration from scratch.`);
    }
  }
  symlinkSync(resolve(built, '.next'), resolve(stage, '.next'), 'junction');
}
console.log(`Audit source copy: ${stage}`);
const steps = process.argv[2] === 'typecheck'
  ? [['node_modules/prisma/build/index.js', 'generate'], ['node_modules/next/dist/bin/next', 'typegen'], command]
  : [[...command, ...(reuseBuild ? [] : process.argv.slice(3))]];
for (const step of steps) {
  const code = await new Promise(resolve => {
    const child = spawn(process.execPath, step, { cwd: stage, env, stdio: 'inherit', windowsHide: true });
    child.once('error', () => { console.error('Audit child could not start.'); resolve(1); });
    child.once('exit', code => resolve(code ?? 1));
  });
  if (code) { process.exitCode = code; break; }
}
