import { defineConfig } from 'vitest/config';

// Unit tests (tests/unit) and API integration tests (tests/integration) run in Node: the modules under
// test are pure or take their browser dependencies (storage, fetch, Axios adapter) as arguments.
// The UI integration tests (tests/dom) opt into jsdom with a `// @vitest-environment jsdom` comment
// and use Mock Service Worker for the API. Playwright owns tests/e2e.
//
// Coverage (npm run test:coverage) is measured on src/state and src/utils, the riskiest pure logic,
// and the run fails below 80% of lines in either folder.
export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'tests/unit/**/*.test.js',
      'tests/integration/**/*.test.js',
      'tests/dom/**/*.test.js',
    ],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/state/**/*.js', 'src/utils/**/*.js'],
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: 'coverage',
      thresholds: {
        lines: 80,
        statements: 80,
        'src/state/**/*.js': { lines: 80 },
        'src/utils/**/*.js': { lines: 80 },
      },
    },
  },
});
