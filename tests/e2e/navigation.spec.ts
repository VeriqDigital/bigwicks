import { expect, test, type Page } from "@playwright/test";
import { footerLinks, navigation, siteConfig } from "../../config/site";

const sections = [...new Set([...navigation, ...footerLinks, siteConfig.announcement]
  .map(link => link.href).filter(href => href.startsWith("/#")))];

async function headerLink(page: Page, href: string) {
  const menu = page.getByRole("button", { name: "Open navigation menu" });
  const mobile = await menu.isVisible();
  if (mobile) await menu.click();
  const links = mobile ? page.locator("#mobile-navigation-menu") : page.getByRole("navigation", { name: "Main navigation" });
  await links.locator(`a[href="${href}"]`).click();
  await expect(page.locator("#mobile-navigation-menu")).toHaveCount(0);
}

async function expectSection(page: Page, href: string) {
  await expect(page).toHaveURL(new RegExp(`/${href.slice(1)}$`));
  // Check the settled viewport, not just a correct URL or an existing ID.
  // Never scroll the target into view from the test: navigation must do that.
  await expect.poll(async () => page.locator(href.slice(1)).evaluate(async element => {
    await new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done())));
    const target = element.getBoundingClientRect();
    const header = document.querySelector("header")!.getBoundingClientRect();
    return target.top >= header.bottom - 1 && target.top <= header.bottom + 100
      && Math.min(target.bottom, innerHeight) - target.top >= 100;
  }), { message: `${href} should arrive visibly below the sticky navigation` }).toBe(true);
}

for (const width of [390, 768, 1440]) {
  test(`cross-page homepage sections arrive below the sticky navigation at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    for (const href of sections) {
      const from = href === "/#shop" ? "/contact" : href === "/#visit" ? "/wholesale" : "/fireworks-near-new-buffalo-mi";
      await page.goto(from);
      if (navigation.some(link => link.href === href)) await headerLink(page, href);
      else await page.locator(`footer a[href="${href}"]`).click();
      await expectSection(page, href);
      if (href === "/#shop" || href === "/#visit") await page.screenshot({ path: testInfo.outputPath(`${href.slice(2)}-${width}.png`) });
    }
  });

  test(`same-page sections and ordinary route navigation work at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    for (const href of ["/#shop", "/#deals", "/#visit"]) {
      await headerLink(page, href);
      await expectSection(page, href);
    }
    await headerLink(page, "/contact");
    await expect(page).toHaveURL(/\/contact$/);
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
  });

  test(`Back and Forward restore ordinary and fragment destinations at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/contact");
    // Use a footer link so mobile menu expansion/closure does not move the
    // document while the browser records the position to restore.
    const wholesale = page.locator('footer a[href="/wholesale"]');
    await wholesale.scrollIntoViewIfNeeded();
    const previousScroll = await page.evaluate(() => scrollY);
    expect(previousScroll).toBeGreaterThan(0);
    await wholesale.click();
    await expect(page).toHaveURL(/\/wholesale$/);
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    await page.goBack();
    await expect(page).toHaveURL(/\/contact$/);
    await expect.poll(() => page.evaluate(y => Math.abs(scrollY - y), previousScroll)).toBeLessThanOrEqual(2);
    await page.goForward();
    await expect(page).toHaveURL(/\/wholesale$/);
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    await headerLink(page, "/#visit");
    await expectSection(page, "/#visit");
    await page.goBack();
    await expect(page).toHaveURL(/\/wholesale$/);
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    await page.goForward();
    await expectSection(page, "/#visit");
  });
}

test("homepage section navigation preserves reduced-motion behavior", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/contact");
  await headerLink(page, "/#shop");
  await expectSection(page, "/#shop");
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("auto");
});
