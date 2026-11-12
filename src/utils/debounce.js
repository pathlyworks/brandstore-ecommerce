/**
 * src/utils/debounce.js
 *
 * Delay a function until calls stop for `wait` ms (used by the catalog search box).
 */

/**
 * @template {(...args: any[]) => void} F
 * @param {F} fn
 * @param {number} wait milliseconds
 * @returns {F & { cancel: () => void, flush: () => void }}
 */
export function debounce(fn, wait) {
  let timer = null;
  let lastArgs = [];
  /** Remember the latest arguments and restart the timer. */
  function debounced(...args) {
    lastArgs = args;
    clearTimeout(timer);
    timer = setTimeout(run, wait);
  }
  /** Call fn with the latest arguments. */
  function run() {
    timer = null;
    fn(...lastArgs);
  }
  debounced.cancel = () => {
    clearTimeout(timer);
    timer = null;
  };
  debounced.flush = () => {
    if (timer !== null) {
      clearTimeout(timer);
      run();
    }
  };
  return debounced;
}
