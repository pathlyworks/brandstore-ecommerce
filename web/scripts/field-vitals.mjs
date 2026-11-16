/**
 * Web Vitals from the web-vitals library (src/app/vitals.ts) as the app logs them on the deployed preview:
 * the production build served by `vite preview`, opened in Chromium, with real clicks and key presses so
 * INP has interactions to measure. Every "[web-vitals] …" console line is kept.
 *
 *   node web/scripts/field-vitals.mjs <base-url> [label]   (the TechSphere API must run on :4010)
 *
 * These are field-style measurements from our own sessions on one machine, not data from real shoppers:
 * see the Task 5 report for how they differ from Lighthouse's lab numbers and from real-user field data.
 * Output: docs/evidence/task5/web-vitals/<label>.json
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';

const [base, label = 'preview'] = process.argv.slice(2);
if (!base) throw new Error('usage: field-vitals.mjs <base-url> [label]');
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const profiles = {
  'phone (Pixel 7 emulation, no throttling)': { ...devices['Pixel 7'] },
  'desktop (1280x900, no throttling)': { viewport: { width: 1280, height: 900 } },
};
const report = { label, base, sessions: {} };

for (const [name, options] of Object.entries(profiles)) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const lines = [];
  page.on('console', (m) => m.text().startsWith('[web-vitals]') && lines.push(m.text()));
  const reports = [];
  const collect = async () =>
    reports.push(...(await page.evaluate(() => window.__webVitals ?? [])));

  // 1. Catalog: filter by category (a click and a select), then sort.
  await page.goto(`${base}/products`);
  await page.getByRole('list', { name: 'Products' }).waitFor();
  await page.getByLabel('Category').selectOption('audio');
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Search' }).first().click();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await collect();

  // 2. Product page: add to cart (click), then open the Overview/Specs tabs with the keyboard.
  await page.goto(`${base}/products/p-003`);
  await page.getByRole('button', { name: /add to cart/i }).click();
  await page.waitForTimeout(300);
  await page.getByRole('tab').first().focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);
  await collect();

  // 3. Cart: change the quantity.
  await page.goto(`${base}/cart`);
  await page.getByRole('table').first().waitFor();
  await page.getByRole('combobox').first().selectOption({ index: 1 });
  await page.waitForTimeout(500);
  await collect();

  // Hide the page so the library reports final CLS and INP values for the last page.
  await page.goto('about:blank');
  report.sessions[name] = { reports, console: lines };
  await context.close();
}
await browser.close();

const summary = {};
for (const [name, s] of Object.entries(report.sessions)) {
  summary[name] = {};
  for (const r of s.reports) {
    const key = `${r.path} ${r.name}`;
    summary[name][key] = r; // the last report per page and metric is its final value
  }
}
report.final = summary;
const out = join(
  fileURLToPath(new URL('../../', import.meta.url)),
  'docs/evidence/task5/web-vitals',
);
mkdirSync(out, { recursive: true });
writeFileSync(join(out, `${label}.json`), `${JSON.stringify(report, null, 2)}\n`);
for (const [name, rows] of Object.entries(summary)) {
  console.log(name);
  for (const r of Object.values(rows))
    console.log(
      `  ${r.path.padEnd(16)} ${r.name.padEnd(4)} ${String(r.value).padStart(6)} ${r.rating}`,
    );
}
