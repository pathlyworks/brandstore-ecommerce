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
  session: 'brandstore:session:v1',
  flags: 'brandstore:flags:v1',
});

/**
 * Build the storage helpers over a way to get each Storage area. Tests pass in-memory fakes; the
 * browser version is exported below.
 * @param {(area: 'local' | 'session') => Storage | null} getArea may throw (blocked storage)
 * @returns {{ readJson: Function, writeJson: Function, remove: Function }}
 */
export function createStorage(getArea) {
  /** The Storage object for an area, or null when the browser blocks it. */
  function areaOf(area) {
    try {
      return getArea(area);
    } catch {
      return null;
    }
  }
  return {
    /** Read and parse a value; `fallback` when missing, unreadable or corrupt. Never throws. */
    readJson(area, key, fallback) {
      try {
        const text = areaOf(area)?.getItem(key);
        return text ? JSON.parse(text) : fallback;
      } catch {
        return fallback;
      }
    },
    /** Serialise and store a value; false when storage is unavailable or full. Never throws. */
    writeJson(area, key, value) {
      try {
        areaOf(area).setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    /** Delete a value. Never throws. */
    remove(area, key) {
      try {
        areaOf(area)?.removeItem(key);
      } catch {
        // nothing to do: storage is unavailable
      }
    },
  };
}

const browserStorage = createStorage((area) =>
  area === 'session' ? window.sessionStorage : window.localStorage,
);

/** Browser helpers: readJson(area, key, fallback), writeJson(area, key, value), remove(area, key). */
export const { readJson, writeJson, remove } = browserStorage;
