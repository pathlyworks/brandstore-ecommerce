/**
 * src/main.js
 *
 * Start-up for every page. A page entry (src/pages/*.js) imports the features it needs and passes
 * their init functions here. One failing feature is reported and skipped, so it cannot stop the
 * others. Phase 2 task 2 adds the http client and stores here (see docs/ARCHITECTURE.md).
 */

/**
 * Run each feature's init function once, in order.
 * @param {Array<[string, () => void]>} features [name, init] pairs
 * @returns {string[]} names of the features that failed to start
 */
export function start(features) {
  const failed = [];
  features.forEach(([name, init]) => {
    try {
      init();
    } catch (error) {
      failed.push(name);
      console.error(`BrandStore: "${name}" failed to start.`, error);
    }
  });
  return failed;
}
