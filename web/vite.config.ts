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

/**
 * Environment-based configuration (Task 7). The app reads its API address from VITE_API_BASE only
 * (src/config.ts). The one default, for development, is the API kit's local server, and it lives here, in the
 * build configuration, not in application code: CI, grading and the deployed builds set VITE_API_BASE.
 * Every variable is listed in web/.env.example.
 */
const DEV_API_BASE = 'http://localhost:4010';

export default defineConfig({
  // "/" normally; "/brandstore-ecommerce/" for the GitHub Pages preview (.github/workflows/pages.yml).
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss()],
  define: { 'import.meta.env.VITE_API_DEV_DEFAULT': JSON.stringify(DEV_API_BASE) },
  resolve: {
    alias: {
      // VITE_PROFILE=1 builds with React's profiling build, so <Profiler> reports real timings in a
      // production bundle (web/scripts/profile.mjs, Task 5). Normal builds are unaffected.
      ...(process.env.VITE_PROFILE === '1' ? { 'react-dom/client': 'react-dom/profiling' } : {}),
      '@shared': at('../src/types'),
      '@observed': at('../docs/migration/observed'),
    },
  },
  // The manifest lets scripts/check-bundles.mjs prove that the admin chunk is not part of what shoppers load.
  build: {
    manifest: true,
    rollupOptions: {
      output: {
        // React, React DOM and React Router change only when we upgrade them: a chunk of their own keeps
        // its hashed name (and the browser's cached copy) across our deploys (Task 5 caching strategy).
        manualChunks(id) {
          if (/node_modules\/(react|react-dom|react-router|scheduler)\//.test(id)) return 'vendor';
          return undefined;
        },
      },
    },
  },
  server: { port: 5173 },
  preview: { port: 4174 },
});
