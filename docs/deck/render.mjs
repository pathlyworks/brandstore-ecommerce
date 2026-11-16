/**
 * Renders the executive deck (docs/deck/deck.html, 1280 × 720 slides) to executive_presentation.pdf at the
 * repository root, and a PNG of each slide into docs/deck/png/ for review:
 *
 *   node docs/deck/render.mjs
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { chromium } from 'playwright';

const here = fileURLToPath(new URL('.', import.meta.url));
const repo = join(here, '../..');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(pathToFileURL(join(here, 'deck.html')).href);
await page.evaluate(() => document.fonts.ready);
await page.pdf({
  path: join(repo, 'executive_presentation.pdf'),
  width: '1280px',
  height: '720px',
  printBackground: true,
  preferCSSPageSize: true,
});
if (process.argv.includes('--png')) {
  const out = join(here, 'png');
  mkdirSync(out, { recursive: true });
  const slides = await page.locator('section.slide').all();
  for (const [i, slide] of slides.entries()) {
    await slide.screenshot({ path: join(out, `slide-${String(i + 1).padStart(2, '0')}.png`) });
  }
}
await browser.close();
console.log('executive_presentation.pdf written');
