import { defineConfig } from 'vitest/config';

// Unit and integration tests run in jsdom; Playwright owns tests/e2e.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.js', 'tests/integration/**/*.test.js'],
    restoreMocks: true,
  },
});
