/**
 * src/utils/storage.js
 *
 * The only module that touches Web Storage. JSON in and out, and it never throws: private mode,
 * disabled storage, a full quota or corrupt JSON all fall back quietly, so the app keeps working
 * in memory. Keys are versioned (e.g. "brandstore:cart:v1"): if the stored shape ever changes, the
 * key changes and old data is ignored instead of breaking the page.
 */

export const KEYS = Object.freeze({
  cart: 'brandstore:cart:v1',
  saved: 'brandstore:saved:v1',
  recent: 'brandstore:recent:v1',
});

/**
 * The Storage object for an area, or null when the browser blocks it.
 * @param {'local' | 'session'} area
 * @returns {Storage | null}
 */
function areaOf(area) {
  try {
    return area === 'session' ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Read and parse a value. Never throws.
 * @template T
 * @param {'local' | 'session'} area
 * @param {string} key
 * @param {T} fallback returned when missing, unreadable or corrupt
 * @returns {T}
 */
export function readJson(area, key, fallback) {
  try {
    const text = areaOf(area)?.getItem(key);
    return text ? JSON.parse(text) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Serialise and store a value. Never throws.
 * @param {'local' | 'session'} area
 * @param {string} key
 * @param {unknown} value
 * @returns {boolean} false when storage is unavailable or full
 */
export function writeJson(area, key, value) {
  try {
    areaOf(area).setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete a value. Never throws.
 * @param {'local' | 'session'} area
 * @param {string} key
 */
export function remove(area, key) {
  try {
    areaOf(area)?.removeItem(key);
  } catch {
    // nothing to do: storage is unavailable
  }
}
