/**
 * src/utils/latest.js
 *
 * Race-condition guard for "only the newest request counts". Each run() aborts the previous run's
 * AbortController (so the browser cancels the superseded fetch) and, as a second line of defence,
 * drops any result that arrives after a newer run started.
 */

/** Marker returned for a run that was superseded; callers ignore it. */
export const SUPERSEDED = Symbol('superseded');

/**
 * @returns {{ run: <T>(task: (signal: AbortSignal) => Promise<T>) => Promise<T | typeof SUPERSEDED>,
 *   abort: () => void }}
 */
export function createLatestRunner() {
  let controller = null;
  let generation = 0;
  return {
    async run(task) {
      controller?.abort();
      controller = new AbortController();
      const mine = ++generation;
      try {
        const result = await task(controller.signal);
        return mine === generation ? result : SUPERSEDED;
      } catch (error) {
        if (mine !== generation || error?.name === 'AbortError') return SUPERSEDED;
        throw error;
      }
    },
    abort() {
      controller?.abort();
      generation += 1;
    },
  };
}
