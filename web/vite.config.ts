/**
 * web/vite.config.ts — the React app. The legacy site keeps the root vite.config.js until cutover.
 * `@shared` is the repository's src/types (the TypeScript types checked against the captured API responses),
 * and `@observed` the captured responses themselves (used as MSW fixtures in tests and stories).
 */
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const at = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@shared': at('../src/types'),
      '@observed': at('../docs/migration/observed'),
    },
  },
  server: { port: 5173 },
  preview: { port: 4174 },
});
