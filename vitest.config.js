import { defineConfig } from 'vitest/config';

// One Vitest run for both apps (`npm test`, `npm run test:coverage`):
// - "legacy": the vanilla JS site. Unit tests (tests/unit) and API integration tests (tests/integration) run in
//   Node; the UI integration tests (tests/dom) opt into jsdom with a `// @vitest-environment jsdom` comment and use
//   Mock Service Worker for the API. Playwright owns tests/e2e.
// - "web": the React app (web/vitest.config.ts: jsdom, React Testing Library, MSW, axe-core on every story).
//
// Coverage gate (Task 6): the run fails below these line floors. The brief's floor is 75% on src/state and
// src/components (the React app's state layer and shared components); the legacy site keeps its own 80% floor
// on src/state and src/utils.
export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'legacy',
          environment: 'node',
          include: [
            'tests/unit/**/*.test.js',
            'tests/integration/**/*.test.js',
            'tests/dom/**/*.test.js',
          ],
        },
      },
      'web/vitest.config.ts',
    ],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: [
        'src/state/**/*.js',
        'src/utils/**/*.js',
        'web/src/state/**/*.{ts,tsx}',
        'web/src/components/**/*.{ts,tsx}',
      ],
      exclude: ['**/*.test.*', '**/*.stories.*', '**/index.ts'],
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: 'coverage',
      thresholds: {
        'src/state/**/*.js': { lines: 80 },
        'src/utils/**/*.js': { lines: 80 },
        'web/src/state/**': { lines: 75, statements: 75 },
        'web/src/components/**': { lines: 75, statements: 75 },
      },
    },
  },
});
