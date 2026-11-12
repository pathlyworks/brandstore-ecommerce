/** src/pages/login.js — entry module for login.html (sign in). */
import { start } from '../main.js';
import * as storage from '../utils/storage.js';
import { API_BASE_URL, API_DIALECT } from '../config.js';
import { createHttpClient } from '../api/http.js';
import { login } from '../api/auth.js';
import { validateLogin } from '../utils/validate.js';
import { createCartStore, createFlagsStore, createSessionStore } from '../state/stores.js';
import { init as nav } from '../components/nav.js';
import { mountCartBadge } from '../components/cart-badge.js';
import { mountAccountLink } from '../components/account-link.js';
import { mountAuthForm } from '../components/auth-form.js';
import { completeSignIn } from '../components/auth-session.js';

const session = createSessionStore(storage);
const flags = createFlagsStore(storage);

/** Show the notice that brought the visitor here (expired session, signed out…), then wire the form. */
function signInForm() {
  if (session.isSignedIn()) return window.location.replace('account.html');
  const notice = document.getElementById('auth-notice');
  notice.textContent = flags.get().notice;
  notice.hidden = !notice.textContent;
  flags.remember({ notice: '' }); // shown once; the return page is kept until sign-in
  const http = createHttpClient({ baseUrl: API_BASE_URL, dialect: API_DIALECT }); // no token, no 401 redirect
  mountAuthForm(document.getElementById('login-form'), {
    fields: ['email', 'password'],
    validate: validateLogin,
    busyText: 'Signing in…',
    submit: async (values) =>
      completeSignIn({ session, flags, location: window.location }, await login(http, values)),
  });
}

start([
  ['nav', nav],
  ['cart-badge', () => mountCartBadge(createCartStore(storage))],
  ['account-link', () => mountAccountLink(session)],
  ['sign-in', signInForm],
]);
