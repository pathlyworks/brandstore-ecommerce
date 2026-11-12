/**
 * Netlify Function: serves the BrandStore mock API on /api/* of the deployed site, so the catalog
 * talks to a same-origin API (allowed by the Content-Security-Policy `default-src 'self'`).
 * State lives in memory per function instance; it is a demo API, not a database.
 */
import { createFetchHandler } from '../../mock-server/fetch-adapter.mjs';

const handle = createFetchHandler({ prefix: '/api', rateLimitMax: 60 });

export default async (request, context) => handle(request, context?.ip);

export const config = { path: '/api/*' };
