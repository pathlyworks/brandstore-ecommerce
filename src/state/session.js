/**
 * src/state/session.js
 *
 * The signed-in session as PURE functions (no DOM, storage, network or clock: `now` is passed in).
 * Persistence is in state/stores.js: sessionStorage "brandstore:session:v1" (survives a refresh, ends
 * when the tab closes; removed on logout, on expiry and on any 401). See docs/SECURITY.md for why.
 *
 * Session shape: { token, expiresAt (ms), user: { email, name, role } }.
 */
export const SIGNED_OUT = Object.freeze({ token: null, expiresAt: 0, user: null });

/**
 * Is this session usable at `now`? (Expired or empty sessions are not.)
 * @param {{ token: string | null, expiresAt: number }} session
 * @param {number} now
 * @returns {boolean}
 */
export function isActive({ token, expiresAt }, now) {
  return Boolean(token) && Number.isFinite(expiresAt) && expiresAt > now;
}

/**
 * Rebuild a session from stored data that may be corrupt; anything odd means signed out.
 * @param {unknown} data
 * @returns {object}
 */
export function rehydrateSession(data) {
  const { token, expiresAt, user } = data && typeof data === 'object' ? data : {};
  if (
    typeof token !== 'string' ||
    !token ||
    !Number.isFinite(expiresAt) ||
    !user ||
    typeof user !== 'object'
  ) {
    return SIGNED_OUT;
  }
  return {
    token,
    expiresAt,
    user: {
      email: String(user.email ?? ''),
      name: String(user.name ?? ''),
      role: String(user.role ?? 'shopper'),
    },
  };
}

/** One-visit messages and the page to return to after signing in (sessionStorage "brandstore:flags:v1"). */
export const NO_FLAGS = Object.freeze({ notice: '', returnTo: '' });

/** Pages a sign-in may return to (never an outside address: no open redirect). */
const SAFE_RETURN = /^(account|cart|catalog|index|product)\.html(\?id=[\w-]+)?$/;

/**
 * Remember why the shopper was sent to the sign-in page and where to go back to.
 * @param {object} flags
 * @param {{ notice?: string, returnTo?: string }} change
 * @returns {{ notice: string, returnTo: string }}
 */
export function withFlags(flags, { notice = flags.notice, returnTo = flags.returnTo }) {
  return {
    ...flags,
    notice: String(notice || ''),
    returnTo: SAFE_RETURN.test(returnTo || '') ? returnTo : '',
  };
}

/**
 * Repair stored flags.
 * @param {unknown} data
 * @returns {{ notice: string, returnTo: string }}
 */
export function rehydrateFlags(data) {
  return data && typeof data === 'object' ? withFlags(NO_FLAGS, data) : NO_FLAGS;
}
