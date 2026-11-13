/**
 * src/config.js
 *
 * Runtime configuration.
 */

const env = import.meta.env ?? {};

/**
 * Base URL of the API, read as the API kit's README asks:
 * - VITE_API_BASE: the official TechSphere API. When the app is graded the address is given here.
 * - otherwise http://localhost:4010, where the API kit's server runs (`python server.py`).
 * - VITE_API_URL (only when VITE_API_BASE is not set): our own BrandStore mock instead, e.g. `/api`, the same
 *   origin as the site (`npm run start`, `npm run dev` and the Netlify function all serve it there). The QA
 *   scripts, the journey suite and the Netlify deploy use it; it needs no Python.
 * TechSphere requests and responses are translated by src/api/techsphere.js.
 */
export const TECHSPHERE_DEFAULT = 'http://localhost:4010';

const ownMock = !env.VITE_API_BASE && Boolean(env.VITE_API_URL);

export const API_BASE_URL = env.VITE_API_BASE ?? (ownMock ? env.VITE_API_URL : TECHSPHERE_DEFAULT);

/** Which API format the app talks to: 'techsphere' (the default) or 'brandstore' (our mock, VITE_API_URL). */
export const API_DIALECT = ownMock ? 'brandstore' : 'techsphere';

/** The currency an empty cart shows its zero totals in (the TechSphere API prices in EGP). */
export const DEFAULT_CURRENCY = API_DIALECT === 'techsphere' ? 'EGP' : 'USD';

/** Wait after the last keystroke before searching. */
export const SEARCH_DEBOUNCE_MS = 300;
