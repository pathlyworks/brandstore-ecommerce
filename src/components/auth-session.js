/**
 * src/components/auth-session.js
 *
 * Page-level session rules shared by the sign-in, registration and account pages:
 * where to go after signing in, sending a signed-out or expired visitor to the sign-in page with a
 * clear message, signing out, and leaving the account page the moment the token expires.
 * Messages travel in sessionStorage flags (state/stores.js), never in the URL.
 */
export const NOTICES = Object.freeze({
  signInFirst: 'Please sign in to see your account.',
  expired: 'Your session has expired. Please sign in again.',
  signedOut: 'You have signed out. Your cart and saved items are still on this device.',
});

/**
 * End the session and go to the sign-in page with a notice.
 * @param {{ session: object, flags: object, location: Location }} ctx
 * @param {string} notice
 * @param {string} [returnTo]
 */
export function sendToLogin({ session, flags, location }, notice, returnTo = '') {
  session.signOut();
  flags.remember({ notice, returnTo });
  location.replace('login.html');
}

/**
 * Leave the page for sign-in when the session's expiry time comes (checked once per timer).
 * @param {{ session: object, flags: object, location: Location }} ctx
 * @param {() => number} now
 * @param {(fn: () => void, ms: number) => unknown} [setTimer]
 */
export function watchExpiry(ctx, now, setTimer = (fn, ms) => setTimeout(fn, ms)) {
  const wait = Math.min(ctx.session.get().expiresAt - now(), 2 ** 31 - 1);
  setTimer(() => sendToLogin(ctx, NOTICES.expired, 'account.html'), Math.max(0, wait));
}

/**
 * After a successful sign-in or registration: save the session and go back to where the visitor
 * was sent from (only known pages of this site), or to the account page.
 * @param {{ session: object, flags: object, location: Location }} ctx
 * @param {object} newSession
 */
export function completeSignIn({ session, flags, location }, newSession) {
  session.signIn(newSession);
  const { returnTo } = flags.take();
  location.replace(returnTo || 'account.html');
}
