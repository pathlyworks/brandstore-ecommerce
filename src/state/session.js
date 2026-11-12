/**
 * src/state/session.js
 *
 * Signed-in state. Token, expiry and user are kept in sessionStorage ("brandstore:session:v1"): they survive a refresh, end when the tab closes, and are removed on logout or on any 401.
 */
import { notImplemented } from '../utils/not-implemented.js';

/**
 * { token(), user(), isSignedIn(), signIn(session), signOut() }
 * @param {typeof import("../utils/storage.js")} storage
 * @param {() => number} now clock, injected for expiry tests
 * @returns {object}
 */
export function createSession(storage, now) {
  return notImplemented('state/session.createSession');
}
