/**
 * React Profiler measurements on a production profiling build (Task 5: memoize only where this shows a real
 * cost). Builds with VITE_PROFILE=1 (react-dom/profiling + <Profiler> around the app), serves it, and drives
 * three interactions in Chromium with the CPU slowed down 4x (as Lighthouse's mobile profile):
 *   1. typing "laptops" into the catalog search box (one commit per keystroke);
 *   2. changing quantities in a cart of 10 lines;
 *   3. loading the admin dashboard and paging/sorting its tables.
 * Output: docs/evidence/task5/profiler.json (every commit) and a summary on stdout.
 *
 *   node web/scripts/profile.mjs    (the TechSphere API must run on :4010)
 */
import { execSync, spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const web = fileURLToPath(new URL('../', import.meta.url));
const outDir = join(web, 'dist-profile');
execSync(`npx vite build --outDir ${outDir} --emptyOutDir`, {
  cwd: web,
  env: { ...process.env, VITE_PROFILE: '1' },
  stdio: 'ignore',
});
const port = 4181;
const HOST = 'localhost'; // vite preview's default host
const server = spawn(
  join(web, '../node_modules/.bin/vite'),
  ['preview', '--outDir', outDir, '--port', String(port), '--strictPort'],
  {
    cwd: web,
    stdio: 'ignore',
  },
);
const base = `http://${HOST}:${port}`;
for (let i = 0; i < 60; i += 1) {
  try {
    if ((await fetch(base)).ok) break;
  } catch {
    /* starting */
  }
  await new Promise((r) => setTimeout(r, 500));
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const results = {};
async function session(name, run) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await run(page);
  const commits = await page.evaluate(() => window.__profile ?? []);
  const updates = commits.filter((c) => c.phase !== 'mount');
  const durations = updates.map((c) => c.actualDuration).sort((a, b) => a - b);
  const pick = (q) =>
    durations[Math.min(durations.length - 1, Math.floor(q * durations.length))] ?? 0;
  results[name] = {
    commits: commits.length,
    updates: updates.length,
    mountMs: Number((commits.find((c) => c.phase === 'mount')?.actualDuration ?? 0).toFixed(2)),
    updateMedianMs: Number(pick(0.5).toFixed(2)),
    updateP95Ms: Number(pick(0.95).toFixed(2)),
    updateMaxMs: Number((durations.at(-1) ?? 0).toFixed(2)),
    all: commits,
  };
  await context.close();
}

try {
  await session('catalog-search-typing', async (page) => {
    await page.goto(`${base}/products`);
    await page.getByRole('list', { name: 'Products' }).waitFor();
    await page.evaluate(() => (window.__profile = []));
    await page
      .getByLabel(/search/i)
      .first()
      .pressSequentially('laptops', { delay: 60 });
    await page.waitForTimeout(1200);
  });

  await session('cart-quantity-changes', async (page) => {
    await page.goto(`${base}/`);
    await page.evaluate(() => {
      const lines = Array.from({ length: 10 }, (_, i) => ({
        productId: `p-0${String(i + 10)}`,
        name: `Item ${i + 1}`,
        unitPrice: 100_000 + i,
        currency: 'EGP',
        quantity: 1,
        stock: 10,
        image: { url: '/product-placeholder.svg', alt: `Item ${i + 1}` },
      }));
      localStorage.setItem(
        'brandstore:cart',
        JSON.stringify({ version: 2, savedAt: new Date().toISOString(), lines }),
      );
    });
    await page.goto(`${base}/cart`);
    await page.getByRole('table').first().waitFor();
    await page.waitForTimeout(1500);
    await page.evaluate(() => (window.__profile = []));
    const selects = page.getByRole('combobox');
    let changed = 0;
    for (let i = 0; i < (await selects.count()) && changed < 5; i += 1) {
      const options = await selects.nth(i).locator('option').count();
      if (options < 2 || (await selects.nth(i).isDisabled())) continue;
      await selects.nth(i).selectOption({ index: 1 });
      changed += 1;
    }
    await page.waitForTimeout(500);
  });

  await session('admin-dashboard', async (page) => {
    await page.goto(`${base}/login`);
    await page.getByLabel('Email').fill('admin@techsphere.test');
    await page.getByLabel('Password').fill('Admin123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'));
    await page.evaluate(() => (window.__profile = []));
    await page.goto(`${base}/admin`);
    await page.getByRole('table', { name: 'Every order, cancelled ones included' }).waitFor();
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: 'Next' }).click();
    await page
      .getByRole('button', { name: /^Sales/ })
      .first()
      .click();
    await page.waitForTimeout(300);
  });
} finally {
  await browser.close();
  server.kill();
}

const out = join(web, '../docs/evidence/task5');
mkdirSync(out, { recursive: true });
writeFileSync(
  join(out, 'profiler.json'),
  `${JSON.stringify({ conditions: 'production profiling build, Chromium, CPU 4x slowdown, 1280x900', results }, null, 2)}\n`,
);
for (const [name, r] of Object.entries(results)) {
  console.log(name, { ...r, all: `${r.all.length} commits` });
}
