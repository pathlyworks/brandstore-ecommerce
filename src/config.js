/**
 * src/config.js
 *
 * Runtime configuration.
 */

/** Base URL of the API. Set VITE_API_URL in .env.local; defaults to the local mock server. */
export const API_BASE_URL = import.meta.env?.VITE_API_URL ?? 'http://127.0.0.1:4010';
