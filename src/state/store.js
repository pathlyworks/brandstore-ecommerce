/**
 * src/state/store.js
 *
 * Tiny observable store used by every state module: get, set, subscribe.
 */
import { notImplemented } from '../utils/not-implemented.js';

/** @template T */

/**
 * Synchronous pub/sub; subscribe returns an unsubscribe function.
 * @param {T} initial
 * @returns {{ get: () => T, set: (next: T) => void, subscribe: (fn: (s: T) => void) => () => void }}
 */
export function createStore(initial) {
  return notImplemented('state/store.createStore');
}
