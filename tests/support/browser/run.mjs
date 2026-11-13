/**
 * npm run test:browser — runs the jsdom test files in tests/dom/ in real Chromium (Playwright
 * library) with the small Vitest and MSW stand-ins in this folder, so they can be checked where
 * Vitest, jsdom and MSW are not installed. CI runs the same files with the real tools (npm test).
 * Any request that reaches the network instead of a mock handler fails the run.
 */
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.css': 'text/css',
};
const leaked = [];

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(req.url.split('?')[0]);
  const file = resolve(join(ROOT, path));
  if (path.startsWith('/api/') || !file.startsWith(ROOT + sep)) {
    leaked.push(`${req.method} ${req.url}`);
    res.writeHead(599).end();
    return;
  }
  try {
    const body = await readFile(file);
    res
      .writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' })
      .end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;

const only = process.argv[2];
const files = (await readdir(join(ROOT, 'tests/dom')))
  .filter((f) => f.endsWith('.test.js') && (!only || f.includes(only)))
  .sort();
const browser = await chromium.launch();
let failed = 0;
let passed = 0;
for (const f of files) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${origin}/tests/support/browser/harness.html?file=/tests/dom/${f}`);
  const report = await page
    .waitForFunction(() => window.__report, null, { timeout: 60000 })
    .then((h) => h.jsonValue());
  console.log(`\n${f}`);
  for (const r of report.results) {
    console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.name}`);
    if (!r.ok) console.log(`        ${r.error.split('\n').slice(0, 6).join('\n        ')}`);
    r.ok ? passed++ : failed++;
  }
  for (const u of report.unhandled) (console.log(`  UNHANDLED ${u}`), failed++);
  for (const e of errors) (console.log(`  PAGE ERROR ${e}`), failed++);
  await page.close();
}
await browser.close();
server.close();
for (const l of leaked) (console.log(`REAL NETWORK REQUEST ${l}`), failed++);
console.log(`\n${passed} passed, ${failed} failed (${files.length} files, Chromium)`);
process.exit(failed ? 1 : 0);
