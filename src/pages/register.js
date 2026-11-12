/** src/pages/register.js — entry module for register.html (create an account). */
import { start } from '../main.js';
import * as storage from '../utils/storage.js';
import { API_BASE_URL, API_DIALECT } from '../config.js';
import { createHttpClient } from '../api/http.js';
import { register } from '../api/auth.js';
import { validateRegister } from '../utils/validate.js';
import { createCartStore, createFlagsStore, createSessionStore } from '../state/stores.js';
import { init as nav } from '../components/nav.js';
import { mountCartBadge } from '../components/cart-badge.js';
import { mountAccountLink } from '../components/account-link.js';
import { mountAuthForm } from '../components/auth-form.js';
import { completeSignIn } from '../components/auth-session.js';

const session = createSessionStore(storage);
const flags = createFlagsStore(storage);

/** Wire the registration form (already signed in: go to the account page). */
function registerForm() {
  if (session.isSignedIn()) return window.location.replace('account.html');
  const http = createHttpClient({ baseUrl: API_BASE_URL, dialect: API_DIALECT });
  mountAuthForm(document.getElementById('register-form'), {
    fields: ['name', 'email', 'password', 'confirm'],
    validate: validateRegister,
    busyText: 'Creating account…',
    submit: async (values) =>
      completeSignIn({ session, flags, location: window.location }, await register(http, values)),
  });
}

start([
  ['nav', nav],
  ['cart-badge', () => mountCartBadge(createCartStore(storage))],
  ['account-link', () => mountAccountLink(session)],
  ['register', registerForm],
]);
