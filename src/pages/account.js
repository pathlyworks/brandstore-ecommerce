/** src/pages/account.js — entry module for account.html (protected: orders, addresses, sign out). */
import { start } from '../main.js';
import * as storage from '../utils/storage.js';
import { API_BASE_URL, API_DIALECT } from '../config.js';
import { createHttpClient } from '../api/http.js';
import { createCartStore, createFlagsStore, createSessionStore } from '../state/stores.js';
import { init as nav } from '../components/nav.js';
import { mountCartBadge } from '../components/cart-badge.js';
import { mountAccountLink } from '../components/account-link.js';
import { mount as mountAccount } from '../components/account-view.js';
import { NOTICES, sendToLogin, watchExpiry } from '../components/auth-session.js';

const session = createSessionStore(storage);
const ctx = { session, flags: createFlagsStore(storage), location: window.location };

/** Guard the page, then mount it with an http client that sends the token and handles 401. */
function account() {
  if (!session.isSignedIn()) {
    return sendToLogin(
      ctx,
      session.isExpired() ? NOTICES.expired : NOTICES.signInFirst,
      'account.html',
    );
  }
  const http = createHttpClient({
    baseUrl: API_BASE_URL,
    dialect: API_DIALECT,
    getToken: session.token, // sent as "Authorization: Bearer …" (a header, never the URL)
    onUnauthorized: () => sendToLogin(ctx, NOTICES.expired, 'account.html'), // expired or rejected token
  });
  watchExpiry(ctx, () => Date.now());
  mountAccount(document.getElementById('main-content'), {
    http,
    user: session.user(),
    onSignOut: () => sendToLogin(ctx, NOTICES.signedOut),
  });
}

start([
  ['nav', nav],
  ['cart-badge', () => mountCartBadge(createCartStore(storage))],
  ['account-link', () => mountAccountLink(session)],
  ['account', account],
]);
