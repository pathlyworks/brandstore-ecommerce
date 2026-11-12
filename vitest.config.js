import { defineConfig } from 'vitest/config';

// Unit and integration tests run in Node: the modules under test are pure or take their browser
// dependencies (storage, fetch, Axios adapter) as arguments, so no DOM is needed. A test that does
// need one can opt in with a `// @vitest-environment jsdom` comment. Playwright owns tests/e2e.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.js', 'tests/integration/**/*.test.js'],
    restoreMocks: true,
  },
});
