/**
 * Vitest for the React app: React Testing Library in jsdom, MSW for the API (fixtures are the captured
 * TechSphere responses), and an axe-core run over every Storybook story (src/stories.a11y.test.tsx).
 */
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}'],
      setupFiles: ['src/test/setup.ts'],
      restoreMocks: true,
      css: false,
    },
  }),
);
