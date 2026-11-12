/**
 * End-to-end tests: real user journeys in a real browser, against the site served over http.
 *
 *   npm run e2e                                   # Chromium, desktop and phone sizes
 *   E2E_BROWSERS=chromium,firefox,webkit npm run e2e
 *   E2E_DIST=1 npm run e2e                        # test the build output (run npm run build first)
 *   E2E_ONLY=catalog npm run e2e                  # only journeys whose name contains "catalog"
 * The "auth:" journeys run against the official TechSphere API (api/techsphere/server.py; needs Python).
 *
 * Uses the Playwright library (first time: `npx playwright install chromium`). Each journey runs
 * in a fresh page; any console error or uncaught exception fails the journey.
 */
import { chromium, firefox, webkit } from 'playwright';
import { existsSync } from 'node:fs';
import { serve } from '../../scripts/serve.mjs';
import { registerCatalogJourneys } from './catalog-journeys.mjs';
import { registerCartJourneys } from './cart-journeys.mjs';
import { auditRequest } from './request-audit.mjs';
import { registerAuthJourneys } from './auth-journeys.mjs';
import { findPython, startTechsphere } from '../support/techsphere-server.mjs';

const ENGINES = { chromium, firefox, webkit };
const engines = (process.env.E2E_BROWSERS || 'chromium').split(',');
const VIEWPORTS = { desktop: { width: 1280, height: 900 }, phone: { width: 375, height: 740 } };
// High API rate limit: the journeys send far more than 60 requests a minute from one address.
const dir = process.env.E2E_DIST ? 'dist' : '.';
const site = await serve(dir, 0, { apiRateLimit: 100000, env: {} }); // our mock on /api
// The official TechSphere API (api/techsphere/server.py) and a second copy of the site pointed at it
// with VITE_API_BASE, for the sign-in and account journeys (skipped when Python is not installed).
const techsphere = findPython() ? await startTechsphere() : null;
const tsSite = techsphere ? await serve(dir, 0, { env: { VITE_API_BASE: techsphere.url } }) : null;
const journeys = [];

/**
 * Register a journey. `size` limits it to one viewport; `allowHttpErrors` accepts the browser's
 * "Failed to load resource" console line for journeys that cause 4xx/5xx responses on purpose.
 */
function journey(name, fn, size, { allowHttpErrors = false } = {}) {
  journeys.push({ name, fn, size, allowHttpErrors });
}

/** Throw with a readable message when a condition is false. */
function expect(ok, message) {
  if (!ok) throw new Error(message);
}

/** Visible text of every element matching a selector. */
async function texts(page, selector) {
  return page.locator(selector).allInnerTexts();
}

journey('home: products and testimonials render from data, no globals leak', async (page) => {
  await page.goto(`${site.url}/`);
  expect((await page.locator('.product-card').count()) === 3, 'expected 3 product cards');
  expect((await page.locator('.testimonial').count()) === 2, 'expected 2 testimonials');
  const prices = await texts(page, '.product-card__price');
  expect(prices.join() === '$199.99,$149.99,$89.99', `prices were ${prices.join()}`);
  expect(
    await page.evaluate(() => typeof window.BrandStore === 'undefined'),
    'window.BrandStore exists',
  );
});

journey('browse: category filter shows matching products and announces the count', async (page) => {
  await page.goto(`${site.url}/`);
  await page.locator('.filter__btn', { hasText: 'Electronics' }).click();
  expect((await page.locator('.product-card:visible').count()) === 2, 'Electronics should show 2');
  expect(
    (await page.locator('#filter-status').innerText()).includes('2'),
    'status should mention 2',
  );
  await page.locator('.filter__btn', { hasText: 'All' }).click();
  expect((await page.locator('.product-card:visible').count()) === 3, 'All should show 3');
});

journey('browse: a category card link filters the product list', async (page) => {
  await page.goto(`${site.url}/`);
  await page.locator('.category-card__link[data-filter-link="Accessories"]').click();
  const pressed = page.locator('.filter__btn[aria-pressed="true"]');
  expect(
    (await pressed.innerText()).includes('Accessories'),
    'Accessories filter should be pressed',
  );
  expect((await page.locator('.product-card:visible').count()) === 1, 'Accessories should show 1');
});

journey('deals: next scrolls the strip, previous is disabled at the start', async (page) => {
  await page.goto(`${site.url}/`);
  const prev = page.locator('[data-deals-step="-1"]');
  if (!(await prev.isVisible())) return; // controls only appear when the strip overflows
  expect((await prev.getAttribute('aria-disabled')) === 'true', 'previous should start disabled');
  await page.locator('[data-deals-step="1"]').click();
  await page.waitForFunction(() => document.getElementById('deals-viewport').scrollLeft > 0);
  await page.waitForFunction(
    () =>
      document.querySelector('[data-deals-step="-1"]').getAttribute('aria-disabled') === 'false',
  );
});

journey(
  'newsletter: invalid address shows an error, valid one shows success only',
  async (page) => {
    await page.goto(`${site.url}/`);
    const input = page.locator('#newsletter-email');
    await input.fill('name@example');
    await input.press('Enter');
    await page.waitForFunction(
      () => document.getElementById('newsletter-error').textContent !== '',
    );
    expect((await input.getAttribute('aria-invalid')) === 'true', 'field should be aria-invalid');
    await input.fill('name@example.com');
    await input.press('Enter');
    await page.waitForTimeout(300); // longer than the error re-announce delay (Task 4 regression)
    expect((await page.locator('#newsletter-success').innerText()) !== '', 'no success message');
    expect((await page.locator('#newsletter-error').innerText()) === '', 'stale error came back');
  },
);

journey('keyboard: first Tab is the skip link and it moves focus to main', async (page) => {
  await page.goto(`${site.url}/`);
  await page.keyboard.press('Tab');
  expect(
    await page.evaluate(() => document.activeElement.classList.contains('skip-link')),
    'skip link not first',
  );
  await page.keyboard.press('Enter');
  expect(
    await page.evaluate(() => document.activeElement.id === 'main-content'),
    'focus not on main',
  );
});

journey(
  'phone menu: opens, closes on Escape and returns focus to the button',
  async (page) => {
    await page.goto(`${site.url}/`);
    const toggle = page.locator('.nav__toggle');
    await toggle.click();
    expect((await toggle.getAttribute('aria-expanded')) === 'true', 'menu did not open');
    await page.keyboard.press('Escape');
    expect((await toggle.getAttribute('aria-expanded')) === 'false', 'Escape did not close');
    expect(
      await page.evaluate(() => document.activeElement.classList.contains('nav__toggle')),
      'focus lost',
    );
  },
  'phone',
);

journey('comparison: table renders and "highlight differences" toggles', async (page) => {
  await page.goto(`${site.url}/comparison.html`);
  expect((await page.locator('.comparison-table tbody tr').count()) > 0, 'no table rows');
  const button = page.locator('#highlight-diff-btn');
  await button.click();
  expect((await button.getAttribute('aria-pressed')) === 'true', 'button not pressed');
  expect(
    (await page.locator('.comparison-table__row--diff').count()) > 0,
    'no row was highlighted',
  );
  await button.click();
  expect(
    (await page.locator('.comparison-table__row--diff').count()) === 0,
    'highlight did not turn off',
  );
});

journey('not found: unknown address gets the 404 page with one h1', async (page) => {
  const response = await page.goto(`${site.url}/no-such-page`);
  expect(response.status() === 404, `status ${response.status()}`);
  expect((await page.locator('h1').count()) === 1, 'expected one h1');
});

registerCatalogJourneys({ journey, expect, url: site.url });
registerCartJourneys({ journey, expect, url: site.url });
if (techsphere) registerAuthJourneys({ journey, expect, url: tsSite.url, api: techsphere });
else console.log('Python 3.9+ not found: the TechSphere sign-in journeys are skipped.');

let failures = 0;
let runs = 0;
const apiRequests = []; // every /api request from every journey, checked against the spec at the end
for (const name of engines) {
  const engine = ENGINES[name];
  const options =
    name === 'chromium' && existsSync('/usr/bin/google-chrome') && process.env.CI !== 'true'
      ? { executablePath: '/usr/bin/google-chrome' }
      : {};
  const browser = await engine.launch(options);
  for (const [sizeName, viewport] of Object.entries(VIEWPORTS)) {
    const only = process.env.E2E_ONLY || '';
    for (const j of journeys.filter(
      (x) => (!x.size || x.size === sizeName) && x.name.includes(only),
    )) {
      const context = await browser.newContext({ viewport }); // fresh storage for every journey
      const page = await context.newPage();
      context.on(
        'request',
        (r) =>
          new URL(r.url()).pathname.startsWith('/api/') &&
          apiRequests.push({ method: r.method(), url: r.url(), headers: r.headers() }),
      );
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      page.on('console', (m) => {
        const text = m.text();
        const expected =
          text.includes('404') || (j.allowHttpErrors && text.startsWith('Failed to load resource'));
        if (m.type() === 'error' && !expected) errors.push(text);
      });
      runs += 1;
      try {
        await j.fn(page);
        expect(errors.length === 0, `console errors: ${errors.join(' | ')}`);
        console.log(`PASS  ${name} ${sizeName.padEnd(7)} ${j.name}`);
      } catch (error) {
        failures += 1;
        console.log(`FAIL  ${name} ${sizeName.padEnd(7)} ${j.name}\n      ${error.message}`);
      }
      await context.close();
    }
  }
  await browser.close();
}
site.close();
tsSite?.close();
techsphere?.stop();
const audit = apiRequests.flatMap(auditRequest);
const distinct = [...new Set(audit)];
console.log(
  `\nAPI requests checked against api/openapi.json: ${apiRequests.length}, problems: ${audit.length}`,
);
distinct.slice(0, 20).forEach((p) => console.log(`  - ${p}`));
console.log(`\n${runs - failures} of ${runs} journey runs passed (${engines.join(', ')})`);
if (audit.length) failures += 1; // a request that breaks the spec fails the whole run
process.exit(failures ? 1 : 0);
