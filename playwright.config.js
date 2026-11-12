import { defineConfig, devices } from '@playwright/test';

// End-to-end tests drive the real app (Vite) against the mock API, in three engines.
export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL: 'http://127.0.0.1:5173' },
  webServer: [
    { command: 'npm run mock', url: 'http://127.0.0.1:4010/products', reuseExistingServer: true },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5173',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: true,
    },
  ],
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['iPhone 13'] } },
  ],
});
