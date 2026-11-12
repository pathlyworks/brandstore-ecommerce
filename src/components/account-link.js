/**
 * src/components/account-link.js
 *
 * The account link in the main navigation: "Sign in" (login.html) when signed out, "Account"
 * (account.html) when signed in.
 */
import * as dom from '../utils/dom.js';

/**
 * @param {{ isSignedIn: () => boolean }} session store from state/stores.js
 */
export function mountAccountLink(session) {
  const link = dom.qs('[data-account-link]');
  if (!link) return;
  const signedIn = session.isSignedIn();
  link.textContent = signedIn ? 'Account' : 'Sign in';
  link.setAttribute('href', signedIn ? 'account.html' : 'login.html');
}
