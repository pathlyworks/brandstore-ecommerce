/**
 * src/utils/storage.js
 *
 * Safe wrapper around localStorage and sessionStorage: JSON, versioned keys, try/catch (private mode, quota, disabled storage).
 */
import { notImplemented } from './not-implemented.js';

/** @template T */

/**
 * Never throws.
 * @param {"local" | "session"} area
 * @param {string} key e.g. "brandstore:cart:v1"
 * @param {T} fallback returned when missing or corrupt
 * @returns {T}
 */
export function readJson(area, key, fallback) {
  return notImplemented('utils/storage.readJson');
}

/**
 * false when storage is unavailable or full.
 * @param {"local" | "session"} area
 * @param {string} key
 * @param {unknown} value
 * @returns {boolean}
 */
export function writeJson(area, key, value) {
  return notImplemented('utils/storage.writeJson');
}

/**
 * Never throws.
 * @param {"local" | "session"} area
 * @param {string} key
 * @returns {void}
 */
export function remove(area, key) {
  return notImplemented('utils/storage.remove');
}
