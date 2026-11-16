/**
 * Lab measurements for Advanced Task 5: Lighthouse on the production build, always under the same conditions.
 *
 *   node web/scripts/measure.mjs <dist-dir> <label> [--runs 3] [--port 4180]
 *
 * Conditions (identical for the "before" and "after" runs; written into every result file):
 * - the production build (`vite build`) served by `vite preview` on 127.0.0.1, the TechSphere API kit on :4010;
 * - Lighthouse (version from node_modules) with its default mobile profile: emulated Moto G Power, simulated
 *   throttling (150 ms RTT, 1.6 Mbps down, 4x CPU slowdown), the same Chromium build;
 * - pages /, /products, /products/p-001, /cart, /login; `runs` runs per page, the median performance run is kept.
 * Output: docs/evidence/task5/lighthouse/<label>/<page>.json (full LHR) and summary.json.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const [distArg, label] = args;
if (!distArg || !label)
  throw new Error('usage: measure.mjs <dist-dir> <label> [--runs N] [--port P]');
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i > -1 ? Number(args[i + 1]) : fallback;
};
const runs = opt('runs', 3);
const port = opt('port', 4180);
const repo = fileURLToPath(new URL('../../', import.meta.url));
const out = join(repo, 'docs/evidence/task5/lighthouse', label);
mkdirSync(out, { recursive: true });

// A server left on this port from an earlier run would be measured instead of <dist-dir>: refuse.
try {
  await fetch(`http://127.0.0.1:${port}`);
  throw new Error(`port ${port} is already in use; stop that server first`);
} catch (error) {
  if (String(error).includes('already in use')) throw error;
}

const PAGES = {
  home: '/',
  products: '/products',
  product: '/products/p-001',
  cart: '/cart',
  login: '/login',
};

// vite itself (not through npx), so server.kill() below stops the server and frees the port.
const server = spawn(
  join(repo, 'node_modules/.bin/vite'),
  [
    'preview',
    '--outDir',
    resolve(distArg),
    '--port',
    String(port),
    '--strictPort',
    '--host',
    '127.0.0.1',
  ],
  { cwd: join(repo, 'web'), stdio: 'ignore' },
);
const base = `http://127.0.0.1:${port}`;
for (let i = 0; i < 60; i += 1) {
  try {
    if ((await fetch(base)).ok) break;
  } catch {
    /* not up yet */
  }
  await new Promise((r) => setTimeout(r, 500));
}

const chrome = await chromeLauncher.launch({
  chromePath: process.env.CHROME_PATH ?? chromium.executablePath(),
  chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'],
});
const summary = { label, conditions: {}, pages: {} };
try {
  for (const [name, path] of Object.entries(PAGES)) {
    const results = [];
    for (let i = 0; i < runs; i += 1) {
      const r = await lighthouse(`${base}${path}`, {
        port: chrome.port,
        output: 'json',
        logLevel: 'error',
      });
      results.push(r.lhr);
    }
    results.sort((a, b) => a.categories.performance.score - b.categories.performance.score);
    const lhr = results[Math.floor(results.length / 2)];
    writeFileSync(join(out, `${name}.json`), JSON.stringify(lhr));
    const audit = (id) => lhr.audits[id]?.numericValue;
    summary.conditions = {
      lighthouse: lhr.lighthouseVersion,
      formFactor: lhr.configSettings.formFactor,
      throttlingMethod: lhr.configSettings.throttlingMethod,
      throttling: lhr.configSettings.throttling,
      screen: lhr.configSettings.screenEmulation,
      userAgent: lhr.environment.hostUserAgent,
      runsPerPage: runs,
      kept: 'median performance score',
    };
    summary.pages[name] = {
      path,
      performance: Math.round(lhr.categories.performance.score * 100),
      accessibility: Math.round(lhr.categories.accessibility.score * 100),
      bestPractices: Math.round(lhr.categories['best-practices'].score * 100),
      seo: Math.round(lhr.categories.seo.score * 100),
      LCP_ms: Math.round(audit('largest-contentful-paint')),
      CLS: Number(audit('cumulative-layout-shift').toFixed(3)),
      TBT_ms: Math.round(audit('total-blocking-time')),
      FCP_ms: Math.round(audit('first-contentful-paint')),
      scriptBytes: lhr.audits['resource-summary']?.details?.items?.find(
        (x) => x.resourceType === 'script',
      )?.transferSize,
    };
    console.log(name, summary.pages[name]);
  }
} finally {
  await chrome.kill();
  server.kill();
}
writeFileSync(join(out, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
