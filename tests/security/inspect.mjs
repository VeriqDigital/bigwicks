// Read-only audit inventory; output never includes matched secret values.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
if (process.argv[2] === 'dependencies') {
  for (const name of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) {
    console.log(JSON.stringify({ name, locked: lock.packages[`node_modules/${name}`]?.version,
      installed: JSON.parse(readFileSync(`node_modules/${name}/package.json`, 'utf8')).version }));
  }
  const publicPackages = {};
  for (const [path, data] of Object.entries(lock.packages)) {
    if (!path || !data.version || !data.resolved?.startsWith('https://registry.npmjs.org/')) continue;
    const name = path.split('node_modules/').at(-1);
    (publicPackages[name] ??= new Set()).add(data.version);
  }
  // Only public npm package names/versions go to npm's advisory endpoint.
  // No source, repository identity, dependency paths, credentials, or findings.
  const response = await fetch('https://registry.npmjs.org/-/npm/v1/security/advisories/bulk', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.fromEntries(Object.entries(publicPackages).map(([name, versions]) => [name, [...versions]]))),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Public advisory lookup failed: ${response.status}`);
  const advisories = await response.json();
  mkdirSync('.test-runtime', { recursive: true });
  writeFileSync('.test-runtime/security-dependency-advisories.json', JSON.stringify(advisories, null, 2));
  for (const [name, rows] of Object.entries(advisories)) {
    const paths = Object.entries(lock.packages).filter(([path]) => path.split('node_modules/').at(-1) === name).map(([path, data]) => ({ path, version: data.version, dev: data.dev === true }));
    console.log(JSON.stringify({ name, paths, advisories: rows }));
  }
} else if (process.argv[2] === 'secrets') {
  const git = (...args) => execFileSync('git', args, { maxBuffer: 128 * 1024 * 1024, windowsHide: true });
  const objects = git('rev-list', '--objects', '--all').toString().trim().split('\n').map(row => ({ hash: row.slice(0, 40), path: row.slice(41) }))
    .filter(row => /(?:\.(?:[cm]?[jt]sx?|json|md|ya?ml|toml|sql|txt)|(?:^|\/)\.env[^/]*|gitignore)$/.test(row.path));
  const batch = execFileSync('git', ['cat-file', '--batch'], { input: objects.map(row => row.hash).join('\n') + '\n', maxBuffer: 128 * 1024 * 1024, windowsHide: true });
  const patterns = [
    ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
    ['provider-token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[A-Z0-9]{16}|re_[A-Za-z0-9]{24,}|sk_(?:live|test)_[A-Za-z0-9]{20,})\b/g],
    ['credential-url', /(?:postgres(?:ql)?|mysql):\/\/[^\s'"`]+:[^\s'"`@]+@[^\s'"`]+/g],
    ['assigned-secret', /(?:AUTH_SECRET|SANITY_API_WRITE_TOKEN|RESEND_API_KEY|SEED_ADMIN_PASSWORD)\s*[:=]\s*["']?[A-Za-z0-9_+/=-]{24,}/g],
  ];
  let offset = 0; let scanned = 0; const hits = [];
  for (const row of objects) {
    const newline = batch.indexOf(10, offset); const header = batch.subarray(offset, newline).toString();
    const size = Number(header.split(' ')[2]); const content = batch.subarray(newline + 1, newline + 1 + size).toString('utf8'); offset = newline + 2 + size; scanned++;
    for (const [type, pattern] of patterns) for (const match of content.matchAll(pattern)) {
      hits.push({ path: row.path, blob: row.hash.slice(0, 12), line: content.slice(0, match.index).split('\n').length, type });
    }
  }
  console.log(JSON.stringify({ historyTextBlobs: scanned, redactedHits: hits }, null, 2));
} else throw new Error('Choose dependencies or secrets.');
