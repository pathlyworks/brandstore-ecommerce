/**
 * Playwright Test configuration for the two end-to-end tests in tests/e2e/specs (npm run e2e).
 *
 * The tests run against the official TechSphere API and the site served with VITE_API_BASE pointing at it.
 * - VITE_API_BASE set (grading, or a CI job that runs the API itself): that API is used and only the site
 *   is started here. The grading machine has Node.js only, no Python.
 * - VITE_API_BASE not set (local runs, our CI): the API kit's server is started too
 *   (api/techsphere/server.py; Python 3.9+, set PYTHON if it is not on the PATH as python3, or python on
 *   Windows) with --grader, so each test can reset its data (POST /__reset).
 * Two apps, each in its own projects:
 * - "chromium" (etc.): the legacy pages, tests/e2e/specs/*.spec.js, served on SITE_PORT;
 * - "web-chromium" (etc.): the React app, web/e2e/*.spec.ts, built with VITE_API_BASE and served by
 *   `vite preview` on WEB_PORT (it falls back to index.html, so the client routes and the 404 route work).
 * E2E_APPS=legacy or E2E_APPS=web runs one of them. The older journey suite (npm run e2e:journeys) is separate.
 */
import { defineConfig, devices } from '@playwright/test';

const API_PORT = Number(process.env.E2E_API_PORT || 4011);
const GIVEN_API = process.env.VITE_API_BASE; // the API is already running (grading)
const API_URL = GIVEN_API || `http://127.0.0.1:${API_PORT}`;
const SITE_PORT = Number(process.env.E2E_SITE_PORT || 4173);
// Chromium by default (the grading machine and most laptops have it). The cross-browser smoke test in CI
// runs the same specs with E2E_BROWSERS=firefox or webkit (or "all").
const DEVICE = { chromium: 'Desktop Chrome', firefox: 'Desktop Firefox', webkit: 'Desktop Safari' };
const BROWSERS = (process.env.E2E_BROWSERS || 'chromium')
  .split(',')
  .flatMap((b) => (b.trim() === 'all' ? Object.keys(DEVICE) : [b.trim()]))
  .filter((b) => b in DEVICE);
const WEB_PORT = Number(process.env.E2E_WEB_PORT || 4174);
const APPS = (process.env.E2E_APPS || 'legacy,web').split(',').map((a) => a.trim());
const PYTHON = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');

export default defineConfig({
  fullyParallel: false,
  workers: 1, // one shared API: the tests reset its data, so they must not overlap
  forbidOnly: Boolean(process.env.CI),
  retries: 0, // a flaky pass would hide a real failure; fix the test instead
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    ...(APPS.includes('legacy')
      ? BROWSERS.map((name) => ({
          name,
          testDir: 'tests/e2e/specs',
          testMatch: '**/*.spec.js',
          use: { ...devices[DEVICE[name]], baseURL: `http://127.0.0.1:${SITE_PORT}` },
        }))
      : []),
    ...(APPS.includes('web')
      ? BROWSERS.map((name) => ({
          name: `web-${name}`,
          testDir: 'web/e2e',
          testMatch: '**/*.spec.ts',
          use: { ...devices[DEVICE[name]], baseURL: `http://127.0.0.1:${WEB_PORT}` },
        }))
      : []),
  ],
  webServer: [
    ...(GIVEN_API
      ? []
      : [
          {
            command: `${PYTHON} api/techsphere/server.py ${API_PORT} --grader`,
            url: `${API_URL}/categories`,
            reuseExistingServer: !process.env.CI,
            timeout: 30_000,
          },
        ]),
    ...(APPS.includes('legacy')
      ? [
          {
            command: `node scripts/serve.mjs . ${SITE_PORT}`,
            url: `http://127.0.0.1:${SITE_PORT}/catalog.html`,
            env: { VITE_API_BASE: API_URL },
            reuseExistingServer: !process.env.CI,
            timeout: 30_000,
          },
        ]
      : []),
    ...(APPS.includes('web')
      ? [
          {
            // VITE_API_BASE is read at build time (import.meta.env), so the build comes first.
            command: `npm run build -w web && npm run preview -w web -- --host 127.0.0.1 --port ${WEB_PORT} --strictPort`,
            url: `http://127.0.0.1:${WEB_PORT}/`,
            env: { VITE_API_BASE: API_URL },
            reuseExistingServer: !process.env.CI,
            timeout: 180_000,
          },
        ]
      : []),
  ],
});
