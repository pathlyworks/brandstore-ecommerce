/**
 * Accessibility evidence for Task 5: axe-core (WCAG 2.0/2.1 A and AA rules) on every page, signed out, plus
 * /account/orders signed in as the shopper and /admin as the admin, at 375 px and 1280 px, on a running build of the app.
 *
 *   node web/scripts/a11y-scan.mjs <base-url> <label>     (the TechSphere API must run on :4010)
 *
 * Output: docs/evidence/task5/axe/<label>.json (violations by page, width, rule and impact).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const [base, label] = process.argv.slice(2);
if (!base || !label) throw new Error('usage: a11y-scan.mjs <base-url> <label>');
const axeSource = readFileSync(
  createRequire(import.meta.url).resolve('axe-core/axe.min.js'),
  'utf8',
);
const PAGES = [
  '/',
  '/products',
  '/products/p-001',
  '/cart',
  '/login',
  '/register',
  '/account/orders',
  '/admin',
];
const ACCOUNTS = {
  '/account/orders': ['student@techsphere.test', 'Passw0rd!'],
  '/admin': ['admin@techsphere.test', 'Admin123!'],
};
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const report = { label, base, tags: TAGS, axe: null, pages: {} };
const totals = { critical: 0, serious: 0, moderate: 0, minor: 0 };
for (const width of [375, 1280]) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  for (const path of PAGES) {
    const account = ACCOUNTS[path];
    if (account) {
      await page.evaluate(() => {
        sessionStorage.clear();
        localStorage.clear();
      });
      await page.goto(`${base}/login?next=${encodeURIComponent(path)}`);
      await page.getByLabel('Email').fill(account[0]);
      await page.getByLabel('Password').fill(account[1]);
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL((url) => url.pathname === path);
    } else {
      await page.goto(`${base}${path}`);
    }
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.addScriptTag({ content: axeSource });
    const result = await page.evaluate(
      (tags) => window.axe.run(document, { runOnly: { type: 'tag', values: tags } }),
      TAGS,
    );
    report.axe = result.testEngine.version;
    const violations = result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.map((n) => n.target.join(' ')).slice(0, 5),
    }));
    for (const v of result.violations) totals[v.impact ?? 'minor'] += v.nodes.length;
    report.pages[`${path} @${width}`] = { violations, passes: result.passes.length };
    console.log(
      `${path} @${width}: ${violations.length ? violations.map((v) => `${v.impact} ${v.id}`).join(', ') : 'no violations'}`,
    );
  }
  await context.close();
}
await browser.close();
report.totals = totals;
const out = join(fileURLToPath(new URL('../../', import.meta.url)), 'docs/evidence/task5/axe');
mkdirSync(out, { recursive: true });
writeFileSync(join(out, `${label}.json`), `${JSON.stringify(report, null, 2)}\n`);
console.log('totals (nodes):', totals);
