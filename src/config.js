/**
 * src/config.js
 *
 * Runtime configuration.
 */

const env = import.meta.env ?? {};

/**
 * Base URL of the API.
 * - VITE_API_BASE: the official TechSphere API (the API kit's `python server.py`, and the grader, which gives
 *   the address in VITE_API_BASE). Requests and responses are translated by src/api/techsphere.js.
 * - otherwise our own mock: the site and the API share one origin (`npm run start`, `npm run dev` and the
 *   Netlify function all serve it on /api); VITE_API_URL points it elsewhere.
 */
export const API_BASE_URL = env.VITE_API_BASE ?? env.VITE_API_URL ?? '/api';

/** Which API format the app talks to: 'techsphere' (VITE_API_BASE) or 'brandstore' (our mock). */
export const API_DIALECT = env.VITE_API_BASE ? 'techsphere' : 'brandstore';

/** Wait after the last keystroke before searching. */
export const SEARCH_DEBOUNCE_MS = 300;
