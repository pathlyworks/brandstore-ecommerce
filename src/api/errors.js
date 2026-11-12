/**
 * src/api/errors.js
 *
 * The single error type every api/ function rejects with, and the shopper-facing message for each
 * status (400, 404, 429, 500, network).
 */

/**
 * Normalised API failure. `status` 0 means the network failed or the request timed out.
 */
export class ApiError extends Error {
  /**
   * @param {number} status HTTP status (0 = network)
   * @param {string} code error.code from the body, e.g. "VALIDATION_ERROR"
   * @param {string} message human-readable message from the body
   * @param {{ field: string, message: string }[]} [details] field errors for 400s
   * @param {number | null} [retryAfter] seconds, from the Retry-After header on 429
   */
  constructor(status, code, message, details = [], retryAfter = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.retryAfter = retryAfter;
  }
}

/** Shopper-facing wording per status; `action` is "retry" or "reset" (the filters are the problem). */
const MESSAGES = {
  400: (error) => {
    const fields = (error.details || []).map((d) => d.field).join(', ');
    return {
      title: 'Some filters are not valid',
      message: fields
        ? `The store could not use these filters: ${fields}. Clear the filters and try again.`
        : 'The store could not use these filters. Clear the filters and try again.',
      action: 'reset',
    };
  },
  404: () => ({
    title: 'Not found',
    message: 'We could not find what you were looking for. It may have been removed.',
    action: 'reset',
  }),
  429: (error) => ({
    title: 'Too many requests',
    message: `You are browsing faster than the store can keep up. Wait ${
      error.retryAfter ? `${error.retryAfter} seconds` : 'a moment'
    }, then try again.`,
    action: 'retry',
  }),
  500: () => ({
    title: 'Something went wrong on our side',
    message: 'The store could not load products right now. Please try again.',
    action: 'retry',
  }),
  0: () => ({
    title: 'Could not reach the store',
    message: 'Check your internet connection, then try again.',
    action: 'retry',
  }),
};

/**
 * What to tell the shopper for a failed request (400, 404, 429, 5xx, or no connection).
 * @param {unknown} error
 * @returns {{ status: number, title: string, message: string, action: 'retry' | 'reset' }}
 */
export function describeError(error) {
  const status = error instanceof ApiError ? error.status : 0;
  const key = status >= 500 ? 500 : MESSAGES[status] ? status : 0;
  return { status, ...MESSAGES[key](error) };
}
