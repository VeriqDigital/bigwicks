// Repository-only SEO acceptance: no private env files, credentials or services.
import assert from 'node:assert/strict';
import { publicPaths, assertPublicPage } from './assertions.mjs';
import { spawn, execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, symlinkSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from '@playwright/test';

const root = process.cwd();
const origin = 'https://www.example.test';
const env = {};
for (const key of ['SystemRoot', 'WINDIR', 'ComSpec', 'PATH', 'PATHEXT', 'TEMP', 'TMP', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE']) {
  if (process.env[key]) env[key] = process.env[key];
}
Object.assign(env, {
  NODE_ENV: 'production',
  NODE_OPTIONS: `--require "${resolve('tests/security/isolation.cjs').replaceAll('\\', '/')}"`,
  DATABASE_URL: 'postgresql://fictional:fictional@127.0.0.1:1/seo_no_database',
  AUTH_SECRET: randomBytes(32).toString('base64'), AUTH_URL: origin, AUTH_TRUST_HOST: 'true',
  NEXT_PUBLIC_SITE_URL: origin, NEXT_PUBLIC_SANITY_PROJECT_ID: '', NEXT_PUBLIC_SANITY_DATASET: '',
  NEXT_TELEMETRY_DISABLED: '1', CHECKPOINT_DISABLE: '1', DO_NOT_TRACK: '1',
  NEXT_FONT_GOOGLE_MOCKED_RESPONSES: resolve('tests/security/font-responses.cjs'),
});
mkdirSync('.test-runtime', { recursive: true });
const renderOnly = process.argv[2] === '--render-only';
const stage = renderOnly ? realpathSync(process.argv[3]) : mkdtempSync(resolve('.test-runtime/seo-source-'));
assert.ok(stage.startsWith(realpathSync('.test-runtime') + sep), 'Use an isolated SEO source copy');
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8', windowsHide: true }).split('\0').filter(Boolean);
for (const file of files) {
  if (/(^|\/)\.env(?:\.|$)/.test(file) || file.startsWith('public/')) continue;
  const target = resolve(stage, file);
  if (renderOnly) {
    if (/^(app\/|components\/|config\/|lib\/|sanity\/|prisma\/|auth\.|[^/]*config\.|package(?:-lock)?\.json$)/.test(file)) {
      assert.ok(readFileSync(resolve(root, file)).equals(readFileSync(target)), `Build input changed: ${file}`);
    }
    continue;
  }
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(resolve(root, file), target);
}
for (const directory of renderOnly ? [] : ['node_modules', 'public']) {
  symlinkSync(resolve(root, directory), resolve(stage, directory), 'junction');
}
console.log(`SEO source copy: ${stage}`);
async function run(args, overrides = {}) {
  console.log(`node ${args.join(' ')}`);
  await new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, args, { cwd: stage, env: { ...env, ...overrides }, stdio: 'inherit', windowsHide: true });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolveRun() : reject(new Error(`Check exited ${code}`)));
  });
}
if (!renderOnly) {
  await run(['node_modules/prisma/build/index.js', 'generate']);
  await run(['node_modules/vitest/vitest.mjs', 'run', 'tests/unit/seo.test.ts'], { NODE_ENV: 'test' });
  await run(['node_modules/eslint/bin/eslint.js']);
  await run(['node_modules/next/dist/bin/next', 'typegen']);
  await run(['node_modules/typescript/bin/tsc', '--noEmit', '--incremental', 'false']);
  await run(['node_modules/next/dist/bin/next', 'build']);
}

const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '0'], {
  cwd: stage, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
});
let browser;
try {
  const base = await new Promise((resolveBase, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('SEO server startup timeout')), 30_000);
    server.once('error', error => { clearTimeout(timer); reject(error); });
    server.once('exit', code => { clearTimeout(timer); reject(new Error(`SEO server exited ${code}`)); });
    server.stdout.on('data', chunk => {
      output += chunk.toString();
      const address = output.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
      if (address && output.includes('Ready')) { clearTimeout(timer); resolveBase(address); }
    });
    server.stderr.on('data', chunk => process.stderr.write(chunk));
  });
  browser = await chromium.launch({ headless: true, proxy: { server: 'http://127.0.0.1:9', bypass: 'localhost,127.0.0.1' } });
  const context = await browser.newContext();
  await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
  const page = await context.newPage();
  const seen = { titles: new Set(), descriptions: new Set() };
  const seoReport = [];
  for (const path of publicPaths) {
    const canonical = new URL(path, origin).href;
    const response = await page.goto(base + path, { waitUntil: 'networkidle' });
    assert.equal(response.status(), 200);
    seoReport.push(await assertPublicPage(page, path, origin, seen));
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} overflow at ${width}`);
      await page.screenshot({ path: resolve(stage, `seo-${path === '/' ? 'home' : path.slice(1)}-${width}.png`), fullPage: true });
    }
    console.log(`PASS ${path}: unique ${canonical}, index/follow, social metadata, Store JSON-LD; 390/768/1440px`);
  }
  const sitemapResponse = await fetch(`${base}/sitemap.xml`);
  assert.equal(sitemapResponse.status, 200);
  const xml = await sitemapResponse.text();
  assert.deepEqual([...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]), publicPaths.map(path => new URL(path, origin).href));
  assert.doesNotMatch(xml, /lastmod|changefreq|priority|price|customer|catalogKey/i);
  const robotsResponse = await fetch(`${base}/robots.txt`);
  assert.equal(robotsResponse.status, 200);
  const robots = await robotsResponse.text();
  assert.ok(robots.includes(`Sitemap: ${origin}/sitemap.xml`));
  assert.ok(robots.includes('Allow: /\n'));
  for (const path of ['/admin', '/portal', '/account', '/api/auth/', '/setup-account', '/reset-password', '/forgot-password', '/studio']) {
    assert.ok(robots.includes(`Disallow: ${path}\n`));
  }
  for (const [path, target] of [['/about', '/#about'], ['/services', '/#shop']]) {
    const response = await fetch(`${base}${path}`, { redirect: 'manual' });
    assert.equal(response.status, 308);
    assert.equal(response.headers.get('location'), target);
  }
  for (const path of ['/login', '/setup-account', '/reset-password', '/forgot-password', '/account', '/portal', '/portal/confirmation/SEO-FICTIONAL', '/admin', '/admin/pricing', '/admin/customers', '/admin/orders', '/studio', '/studio/structure']) {
    await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
    assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex/);
    assert.equal(await page.locator('.mobile-actions').count(), 0);
    if (!['/login', '/setup-account', '/reset-password', '/forgot-password'].includes(path)) {
      assert.equal(new URL(page.url()).pathname, '/login');
    }
  }
  for (const path of ['/setup-account', '/reset-password', '/forgot-password']) {
    const response = await fetch(`${base}${path}`);
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    assert.match(response.headers.get('cache-control'), /private.*no-store/);
  }
  console.log('PASS sitemap, robots, redirects, anonymous protected/utility noindex and token headers. No remote services used.');
} finally {
  if (browser) await browser.close();
  server.kill();
  await Promise.race([new Promise(resolveExit => server.once('exit', resolveExit)), delay(5_000)]);
}
