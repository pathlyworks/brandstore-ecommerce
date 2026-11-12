/**
 * src/state/store.js
 *
 * Tiny observable store used by the state modules: get, set, subscribe.
 */

/**
 * Synchronous pub/sub; subscribe returns an unsubscribe function.
 * @template T
 * @param {T} initial
 * @returns {{ get: () => T, set: (next: T) => void, subscribe: (fn: (s: T) => void) => () => void }}
 */
export function createStore(initial) {
  let state = initial;
  const listeners = new Set();
  return {
    get: () => state,
    set(next) {
      state = next;
      listeners.forEach((fn) => fn(state));
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
