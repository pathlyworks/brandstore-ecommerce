/**
 * Lighthouse on the main pages, mobile and desktop, with a summary table (CI job "lighthouse").
 *   node scripts/lighthouse.mjs http://127.0.0.1:4173 lighthouse
 * Needs network for `npx lighthouse` and a Chrome (GitHub's ubuntu runners have one). Writes one HTML
 * and one JSON report per page and form factor, plus summary.md (also added to the job summary).
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [base = 'http://127.0.0.1:4173', out = 'lighthouse'] = process.argv.slice(2);
const PAGES = {
  home: '/index.html',
  catalog: '/catalog.html',
  product: '/product.html?id=p-001',
  cart: '/cart.html',
};
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];
mkdirSync(out, { recursive: true });

const rows = [];
for (const formFactor of ['mobile', 'desktop']) {
  for (const [name, path] of Object.entries(PAGES)) {
    const file = join(out, `${name}-${formFactor}`);
    execFileSync(
      'npx',
      [
        '--yes',
        'lighthouse@12.6.1',
        base + path,
        '--quiet',
        `--only-categories=${CATEGORIES.join(',')}`,
        '--output=json',
        '--output=html',
        `--output-path=${file}`,
        '--chrome-flags=--headless=new --no-sandbox',
        ...(formFactor === 'desktop' ? ['--preset=desktop'] : []),
      ],
      { stdio: 'inherit' },
    );
    const report = JSON.parse(readFileSync(`${file}.report.json`, 'utf8'));
    const score = (c) => Math.round((report.categories[c]?.score ?? 0) * 100);
    rows.push([name, formFactor, ...CATEGORIES.map(score)]);
  }
}

const table = [
  '| Page | Form factor | Performance | Accessibility | Best practices | SEO |',
  '| :--- | :--- | ---: | ---: | ---: | ---: |',
  ...rows.map((r) => `| ${r.join(' | ')} |`),
].join('\n');
const summary = `## Lighthouse 12.6.1 (${new Date().toISOString().slice(0, 10)})\n\n${table}\n`;
writeFileSync(join(out, 'summary.md'), summary);
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
