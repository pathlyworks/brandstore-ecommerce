/**
 * Playwright Test configuration for the two end-to-end tests in tests/e2e/specs (npm run e2e).
 *
 * The tests run against the official TechSphere API (api/techsphere/server.py from the API kit, the
 * API the app is graded against) and the site served with VITE_API_BASE pointing at it, exactly as
 * in grading. Both servers are started here; Python 3.9+ is needed (set PYTHON if it is not on the
 * PATH as python3, or python on Windows). The server runs with --grader so each test can reset
 * its data (POST /__reset). The older journey suite (npm run e2e:journeys) is separate.
 */
import { defineConfig, devices } from '@playwright/test';

const API_PORT = Number(process.env.E2E_API_PORT || 4011);
const SITE_PORT = Number(process.env.E2E_SITE_PORT || 4173);
const PYTHON = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');

export default defineConfig({
  testDir: 'tests/e2e/specs',
  testMatch: '**/*.spec.js',
  fullyParallel: false,
  workers: 1, // one shared API: the tests reset its data, so they must not overlap
  forbidOnly: Boolean(process.env.CI),
  retries: 0, // a flaky pass would hide a real failure; fix the test instead
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${SITE_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: `${PYTHON} api/techsphere/server.py ${API_PORT} --grader`,
      url: `http://127.0.0.1:${API_PORT}/categories`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: `node scripts/serve.mjs . ${SITE_PORT}`,
      url: `http://127.0.0.1:${SITE_PORT}/catalog.html`,
      env: { VITE_API_BASE: `http://127.0.0.1:${API_PORT}` },
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
