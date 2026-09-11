// Public design acceptance: isolated production build, no live database or mail.
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, symlinkSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from '@playwright/test';

const root = process.cwd();
const baseline = process.argv.includes('--baseline');
const fontArg = process.argv.indexOf('--font-css');
const fontCss = fontArg < 0 ? '' : readFileSync(process.argv[fontArg + 1], 'utf8');
assert.ok(fontCss, 'Supply --font-css with local CSS containing the actual Barlow/Roboto Condensed fonts as data URLs. See docs/PUBLIC-DESIGN.md.');
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
const renderOnly = process.argv.includes('--render-only');
const stage = renderOnly ? realpathSync(process.argv[process.argv.indexOf('--render-only') + 1]) : mkdtempSync(resolve('.test-runtime/public-source-'));
assert.ok(stage.startsWith(realpathSync('.test-runtime') + sep), 'Use an isolated SEO source copy');
const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', windowsHide: true }).split('\0').filter(Boolean);
if (!baseline) files.push('app/public.css', 'components/layout/MobileActions.tsx', 'tests/public-site/verify.mjs', 'tests/public-site/fonts.mjs');
const changed = new Set(execFileSync('git', ['diff', '--name-only', 'HEAD', '-z'], { encoding: 'utf8', windowsHide: true }).split('\0'));
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
  if (baseline && changed.has(file)) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(target, execFileSync('git', ['show', `HEAD:${file}`], { windowsHide: true }));
  } else copyFileSync(resolve(root, file), target);
}
for (const directory of renderOnly ? [] : ['node_modules', 'public']) {
  symlinkSync(resolve(root, directory), resolve(stage, directory), 'junction');
}
console.log(`Public ${baseline ? 'baseline' : 'updated'} source copy: ${stage}`);
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
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await context.route('https://www.google.com/maps**', route => route.fulfill({ contentType: 'text/html', body: '<html><body style="margin:0;background:#d9d9d2;color:#5c5c55;font:14px sans-serif;display:grid;place-content:center;height:100vh;text-align:center"><div>Map paused for isolated preview<br><small>No external map connection</small></div></body></html>' }));
  const metrics = [];
  for (const [path, canonical] of [['/', `${origin}/`], ['/contact', `${origin}/contact`]]) {
    const response = await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
    assert.equal(response.status(), 200);
    assert.equal(await page.locator('link[rel="canonical"]').count(), 1);
    // Next serializes a root canonical without a trailing slash; compare URLs.
    assert.equal(new URL(await page.locator('link[rel="canonical"]').getAttribute('href')).href, canonical);
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'index, follow');
    assert.ok(await page.title());
    assert.ok(await page.locator('meta[name="description"]').getAttribute('content'));
    assert.ok(await page.locator('meta[property="og:title"]').getAttribute('content'));
    assert.ok(await page.locator('meta[name="twitter:card"]').getAttribute('content'));
    const structuredData = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
    assert.equal(structuredData['@type'], 'Store');
    for (const field of ['offers', 'price', 'priceRange', 'aggregateRating']) assert.equal(structuredData[field], undefined);
    await page.addStyleTag({ content: fontCss + '\nhtml { --font-barlow: "Barlow" !important; --font-roboto-condensed: "Roboto Condensed" !important; }' });
    await page.evaluate(() => document.fonts.ready);
    for (const width of [360, 390, 430, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
      // Exercise lazy images before capture, then restore the first viewport.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 700) {
          window.scrollTo({ top: y, behavior: 'instant' });
          await new Promise(done => setTimeout(done, 40));
        }
        window.scrollTo({ top: 0, behavior: 'instant' });
      });
      await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0));
      await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} overflow at ${width}`);
      const overflow = await page.locator('body').evaluate(el => [...el.querySelectorAll('h1,h2,h3,p,a,button,figure,video')].filter(node => { const box = node.getBoundingClientRect(); return box.width > 0 && (box.right > innerWidth + 1 || box.left < -1); }).map(node => node.textContent?.slice(0, 60)));
      assert.deepEqual(overflow, [], `${path} clipped content at ${width}`);
      metrics.push({ path, width, height: await page.evaluate(() => document.body.scrollHeight), visitTop: path === '/' ? await page.locator('#visit').evaluate(el => el.offsetTop) : null });
      if ([390, 768, 1440].includes(width)) {
        await page.screenshot({ path: resolve(stage, `${baseline ? 'before' : 'after'}-${path === '/' ? 'home' : 'contact'}-${width}.png`), fullPage: true });
        await page.screenshot({ path: resolve(stage, `${baseline ? 'before' : 'after'}-${path === '/' ? 'home' : 'contact'}-${width}-viewport.png`) });
      }
      if (!baseline) {
        const quick = page.getByRole('navigation', { name: 'Quick store actions' });
        if (width < 768) {
          await quick.waitFor({ state: 'visible' });
          assert.equal(await quick.locator('a').count(), 2);
          assert.match(await quick.locator('a').first().getAttribute('href'), /^https:\/\/www.google.com\/maps\/dir\//);
          assert.equal(await quick.locator('a').last().getAttribute('href'), 'tel:+12193805149');
          const menu = page.getByRole('button', { name: 'Open navigation menu' });
          await menu.click();
          assert.equal(await quick.isVisible(), false, 'Quick actions hide while menu is open');
          await page.keyboard.press('Escape');
          assert.equal(await menu.getAttribute('aria-expanded'), 'false');
          assert.equal(await menu.evaluate(el => el === document.activeElement), true);
          await page.locator('footer').scrollIntoViewIfNeeded();
          await quick.waitFor({ state: 'hidden' });
          await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        } else assert.equal(await quick.isVisible(), false);
      }
    }
    if (!baseline && path === '/') {
      await page.setViewportSize({ width: 1440, height: 900 });
      for (const selector of ['.retail-hero', '#shop', '#visit', '#about', '#demos']) {
        await page.locator(selector).screenshot({ path: resolve(stage, `detail-${selector.replace(/[.#]/g, '')}-1440.png`) });
      }
      assert.equal(await page.locator('.hero-actions a').first().textContent(), 'Get Directions');
      assert.equal(await page.locator('#shop h3').count(), 8);
      const faq = page.locator('#faq button').nth(1);
      await faq.click(); assert.equal(await faq.getAttribute('aria-expanded'), 'true');
      await page.keyboard.press('Enter'); assert.equal(await faq.getAttribute('aria-expanded'), 'false');
      const video = page.locator('video');
      for (const attr of ['controls', 'playsinline', 'poster']) assert.notEqual(await video.getAttribute(attr), null);
      assert.equal(await video.getAttribute('autoplay'), null);
      assert.equal(await video.getAttribute('preload'), 'none');
      await video.evaluate(el => el.load());
      await page.waitForFunction(() => document.querySelector('video').readyState >= 1);
      console.log('Video dimensions:', await video.evaluate(el => [el.videoWidth, el.videoHeight]));
    }
    if (!baseline && path === '/contact') {
      // Native validity only: do not invoke the server action or send an inquiry.
      assert.equal(await page.locator('form').evaluate(form => form.checkValidity()), false);
      for (const id of ['contact-name', 'contact-email', 'contact-phone', 'contact-subject', 'contact-message']) assert.ok(await page.locator(`label[for="${id}"]`).count());
      await page.setViewportSize({ width: 390, height: 900 });
      await page.locator('#contact-name').focus();
      assert.equal(await page.getByRole('navigation', { name: 'Quick store actions' }).isVisible(), false, 'Quick actions hide while typing');
    }
    // Every public anchor still has a destination; no network requests to map,
    // phone, social or wholesale destinations are made by this check.
    const links = await page.locator('a[href]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
    for (const href of new Set(links)) {
      assert.ok(href && href !== '#', 'No placeholder link');
      if (href.startsWith('/#') && path === '/') assert.equal(await page.locator(`[id="${href.slice(2)}"]`).count(), 1, href);
    }
    console.log(`PASS ${path}: unique ${canonical}, index/follow, social metadata, Store JSON-LD; 390/768/1440px`);
  }
  const sitemapResponse = await fetch(`${base}/sitemap.xml`);
  assert.equal(sitemapResponse.status, 200);
  const xml = await sitemapResponse.text();
  assert.deepEqual([...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]), [`${origin}/`, `${origin}/contact`]);
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
    assert.equal(await page.locator('.mobile-actions').count(), 0, `No retail action bar on ${path}`);
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
  assert.deepEqual(pageErrors, [], 'No browser runtime errors');
  const { writeFileSync } = await import('node:fs');
  writeFileSync(resolve(stage, 'public-metrics.json'), JSON.stringify(metrics, null, 2));
  console.log('PASS public links, assets, navigation, FAQ, video, contact validity and mobile-action boundaries.');
  console.log(JSON.stringify(metrics));
} finally {
  if (browser) await browser.close();
  server.kill();
  await Promise.race([new Promise(resolveExit => server.once('exit', resolveExit)), delay(5_000)]);
}
