/**
 * Storybook for the core components (src/components/*.stories.tsx). It builds with the app's own Vite config,
 * so Tailwind and the brand tokens are the same. The accessibility addon runs axe on every story in the
 * "Accessibility" panel; src/stories/stories.a11y.test.tsx runs the same axe checks on every story in CI.
 */
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-docs'],
  framework: { name: '@storybook/react-vite', options: {} },
  core: { disableTelemetry: true },
};

export default config;
