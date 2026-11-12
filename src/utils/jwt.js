/**
 * src/utils/jwt.js
 *
 * Reads the payload of a JSON Web Token (header.payload.signature, base64url) so the app can know
 * when the token EXPIRES and show who is signed in. It does not and cannot verify the signature:
 * only the server can decide whether a token is valid. The token itself is never logged or put in a URL.
 */

/**
 * Decode base64url text (no padding) to a string.
 * @param {string} part
 * @returns {string}
 */
function base64UrlDecode(part) {
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * The payload of a JWT, or null when the token is not a readable JWT.
 * @param {string} token
 * @returns {Record<string, any> | null}
 */
export function decodeJwtPayload(token) {
  const parts = typeof token === 'string' ? token.split('.') : [];
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    return payload && typeof payload === 'object' ? payload : null;
  } catch {
    return null;
  }
}

/**
 * When the token expires, in ms since 1970: the JWT `exp` claim (seconds) if present, otherwise
 * `now + expiresIn` seconds (APIs that send expiresIn), otherwise one hour from now.
 * @param {string} token
 * @param {number} now ms since 1970 (injected: this module has no clock)
 * @param {number} [expiresIn] seconds
 * @returns {number}
 */
export function expiryOf(token, now, expiresIn) {
  const exp = decodeJwtPayload(token)?.exp;
  if (Number.isFinite(exp)) return exp * 1000;
  return now + (Number.isFinite(expiresIn) ? expiresIn : 3600) * 1000;
}
