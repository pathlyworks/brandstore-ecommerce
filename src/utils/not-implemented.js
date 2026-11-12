/**
 * src/utils/not-implemented.js
 *
 * Placeholder thrown by every planned function until it is built (Phase 2, task 2). Lets the module map compile and lint today.
 */

/**
 * @param {string} name fully qualified function name, e.g. "utils/money.add"
 * @returns {never}
 */
export function notImplemented(name) {
  throw new Error(`${name} is planned but not implemented yet`);
}
