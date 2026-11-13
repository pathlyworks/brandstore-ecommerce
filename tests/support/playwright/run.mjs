/**
 * npm run e2e:local — runs the Playwright Test specs (tests/e2e/specs) with the stand-in in
 * shim.mjs on top of the Playwright library, for machines where @playwright/test is not installed.
 * It reads playwright.config.mjs like the real runner: starts the web servers, uses baseURL and the
 * first project's device. CI uses the real runner (npm run e2e).
 *   npm run e2e:local -- "wrong password"     # only tests whose name contains the text
 */
import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, request as apiRequest } from 'playwright';
import { registry, Skip } from './shim.mjs';

const { default: config } = await import(pathToFileURL(resolve('playwright.config.mjs')).href);
registry.timeout = config.expect?.timeout ?? 5000;
const only = process.argv[2] || '';

const up = (url) =>
  fetch(url).then(
    (r) => r.ok,
    () => false,
  );
const children = [];
for (const server of [].concat(config.webServer || [])) {
  if (server.reuseExistingServer && (await up(server.url))) continue;
  const child = spawn(server.command, {
    shell: true,
    stdio: 'ignore',
    env: { ...process.env, ...server.env },
    detached: true,
  });
  children.push(child);
  const end = Date.now() + (server.timeout || 30000);
  while (!(await up(server.url))) {
    if (Date.now() > end) throw new Error(`web server did not start: ${server.command}`);
    await new Promise((r) => setTimeout(r, 200));
  }
}
const stopServers = () =>
  children.forEach((c) => {
    try {
      process.kill(-c.pid);
    } catch {
      /* already gone */
    }
  });

const files = (await readdir(resolve(config.testDir), { recursive: true }))
  .filter((f) => f.endsWith('.spec.js'))
  .sort();
const { defaultBrowserType, ...device } = config.projects?.[0]?.use || {};
void defaultBrowserType;
const browser = await chromium.launch();
let failed = 0;
let passed = 0;
for (const file of files) {
  registry.tests.length = 0;
  registry.beforeEach.length = 0;
  await import(pathToFileURL(join(resolve(config.testDir), file)).href);
  const hooks = [...registry.beforeEach];
  for (const t of [...registry.tests]) {
    if (!t.name.includes(only)) continue;
    const context = await browser.newContext({ ...device, baseURL: config.use.baseURL });
    const page = await context.newPage();
    const request = await apiRequest.newContext({ baseURL: config.use.baseURL });
    const started = Date.now();
    try {
      const fixtures = { page, request, browserName: 'chromium' };
      for (const hook of hooks) await hook(fixtures);
      await t.fn(fixtures);
      passed += 1;
      console.log(`  ✓ ${file} › ${t.name} (${Date.now() - started} ms)`);
    } catch (error) {
      if (error instanceof Skip) {
        console.log(`  - ${file} › ${t.name} (skipped: ${error.message})`);
        continue;
      }
      failed += 1;
      console.log(
        `  ✘ ${file} › ${t.name}\n      ${String(error.message).split('\n').slice(0, 4).join('\n      ')}`,
      );
    }
    await request.dispose();
    await context.close();
  }
}
await browser.close();
stopServers();
console.log(`\n  ${passed} passed, ${failed} failed (stand-in for @playwright/test, Chromium)`);
process.exit(failed ? 1 : 0);
