import { defineConfig } from 'vite';
import { createApp } from './mock-server/server.mjs';

/**
 * Dev server only. The mock API is mounted on /api/* inside Vite, so `npm run dev` serves the site
 * and the API from one origin, the same as `npm run start` and the Netlify function.
 */
function mockApi() {
  return {
    name: 'brandstore-mock-api',
    configureServer(server) {
      const api = createApp({ rateLimitMax: 60 });
      server.middlewares.use('/api', (req, res) => api.handle(req, res));
    },
  };
}

export default defineConfig({ plugins: [mockApi()] });
