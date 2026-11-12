/**
 * src/api/errors.js
 *
 * The single error type every api/ function rejects with.
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
