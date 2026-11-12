/**
 * src/config.js
 *
 * Runtime configuration.
 */

/**
 * Base URL of the API. The site and the API share one origin: `npm run start`, `npm run dev` and the
 * Netlify function all serve the API on /api. Set VITE_API_URL (Vite only) to point elsewhere.
 */
export const API_BASE_URL = import.meta.env?.VITE_API_URL ?? '/api';

/** Wait after the last keystroke before searching. */
export const SEARCH_DEBOUNCE_MS = 300;
