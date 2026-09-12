import assert from 'node:assert/strict';

// Deliberately independent of the implementation's sitemap list.
export const publicPaths = ['/', '/contact', '/fireworks-near-new-buffalo-mi', '/wholesale'];

export async function assertPublicPage(page, path, origin, seen) {
  const canonical = new URL(path, origin).href;
  assert.equal(await page.locator('h1').count(), 1);
  assert.equal(await page.locator('link[rel="canonical"]').count(), 1);
  assert.equal(new URL(await page.locator('link[rel="canonical"]').getAttribute('href')).href, canonical);
  assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'index, follow');
  const title = await page.title();
  const description = await page.locator('meta[name="description"]').getAttribute('content');
  assert.ok(title && description);
  assert.ok(!seen.titles.has(title), `Unique title: ${path}`);
  assert.ok(!seen.descriptions.has(description), `Unique description: ${path}`);
  seen.titles.add(title); seen.descriptions.add(description);
  for (const [selector, expected] of [
    ['meta[property="og:title"]', title], ['meta[property="og:description"]', description],
    ['meta[name="twitter:title"]', title], ['meta[name="twitter:description"]', description],
    ['meta[name="twitter:card"]', 'summary_large_image'],
  ]) assert.equal(await page.locator(selector).getAttribute('content'), expected);
  assert.equal(new URL(await page.locator('meta[property="og:url"]').getAttribute('content')).href, canonical);
  for (const selector of ['meta[property="og:image"]', 'meta[name="twitter:image"]']) {
    const image = new URL(await page.locator(selector).first().getAttribute('content'));
    assert.equal(image.origin, origin);
    assert.equal(image.pathname, '/images/store/big-wicks-storefront-front.jpg');
  }
  const raw = await page.locator('script[type="application/ld+json"]').allTextContents();
  const entities = raw.flatMap(text => { const data = JSON.parse(text); return data['@graph'] ?? [data]; });
  const store = entities.filter(item => item['@type'] === 'Store');
  assert.equal(store.length, 1);
  assert.equal(store[0]['@id'], `${origin}/#store`);
  assert.equal(store[0].name, 'Big Wicks Fireworks LLC');
  assert.equal(store[0].address.streetAddress, '10351 IN-39');
  assert.equal(store[0].openingHours.length, 7);
  for (const field of ['url', 'image', 'logo']) assert.equal(new URL(store[0][field]).origin, origin);
  assert.doesNotMatch(raw.join(''), /"(?:aggregateRating|review|price|priceRange|offers|geo|award|SearchAction|ProductPrice|customerId|catalogKey)"/i);
  assert.doesNotMatch(raw.join(''), /localhost|vercel\.app/);
  if (path === '/') {
    const site = entities.find(item => item['@type'] === 'WebSite');
    assert.equal(site?.name, 'Big Wicks Fireworks');
    assert.equal(site?.url, `${origin}/`);
    for (const href of ['/contact', '/wholesale', '/fireworks-near-new-buffalo-mi']) assert.ok(await page.locator(`a[href="${href}"]`).count());
  }
  if (['/wholesale', '/fireworks-near-new-buffalo-mi'].includes(path)) {
    assert.equal(entities.find(item => item['@type'] === 'WebPage')?.url, canonical);
    const breadcrumbs = entities.find(item => item['@type'] === 'BreadcrumbList')?.itemListElement;
    assert.deepEqual(breadcrumbs.map(item => item.item), [`${origin}/`, canonical]);
    assert.equal(await page.locator('[aria-current="page"]').textContent(), breadcrumbs[1].name);
    const html = await page.content();
    assert.doesNotMatch(html, /ProductPrice|catalogKey|customerId|tierId|unitCost|orderItems|pricingTier/i);
    assert.doesNotMatch(await page.locator('main').innerText(), /\$\d+|\d+%/);
    for (const href of ['/', '/contact']) assert.ok(await page.locator(`main a[href="${href}"]`).count());
    const faq = page.locator('.landing-faq summary').first();
    await faq.focus(); await page.keyboard.press('Enter');
    assert.equal(await faq.evaluate(el => el.parentElement.open), true);
    await page.keyboard.press('Enter');
    assert.equal(await faq.evaluate(el => el.parentElement.open), false);
  }
  assert.equal(await page.locator('nav[aria-label="Main navigation"] a').filter({ hasText: /^Wholesale$/ }).getAttribute('href'), '/wholesale');
  if (path === '/wholesale') {
    for (const link of await page.getByRole('link', { name: 'Existing Customer Sign In', exact: true }).all()) assert.equal(await link.getAttribute('href'), '/account');
    assert.equal(await page.getByRole('link', { name: 'Existing Customer Sign In', exact: true }).count(), 2);
    assert.equal(await page.locator('.mobile-actions').count(), 0);
  }
  if (path === '/fireworks-near-new-buffalo-mi') {
    assert.ok((await page.locator('main').innerText()).includes('3 miles south of downtown New Buffalo, Michigan'));
    assert.ok((await page.locator('main').innerText()).includes('10351 IN-39, La Porte, IN 46350'));
    for (const href of ['/#shop', '#visit']) assert.ok(await page.locator(`main a[href="${href}"]`).count());
    assert.equal(await page.locator('#visit iframe').getAttribute('src'), 'https://www.google.com/maps?q=10351+IN-39%2C+La+Porte%2C+IN+46350&output=embed');
  }
  return { path, title, description, canonical };
}
