/**
 * web/vite.config.mts — the React app (wave 0 skeleton, task_1_architecture.md §3). The legacy site keeps the root
 * vite.config.js until cutover. Run with `npm run web:dev` (vite web). An .mts file is loaded as an ES module: the
 * root package.json has no "type": "module", and the Tailwind and React plugins are ES modules.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({ plugins: [react(), tailwindcss()] });
