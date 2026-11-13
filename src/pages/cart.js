/** src/pages/cart.js — entry module for cart.html (cart, saved for later, recently viewed). */
import { start } from '../main.js';
import * as storage from '../utils/storage.js';
import { API_BASE_URL, API_DIALECT } from '../config.js';
import { createHttpClient } from '../api/http.js';
import { createProductApi } from '../api/product-api.js';
import {
  createCartStore,
  createFlagsStore,
  createRecentStore,
  createSavedStore,
  createSessionStore,
} from '../state/stores.js';
import { init as nav } from '../components/nav.js';
import { mountCartBadge } from '../components/cart-badge.js';
import { mountAccountLink } from '../components/account-link.js';
import { mount as mountCartView } from '../components/cart-view.js';
import { mountCheckout } from '../components/checkout.js';

const cart = createCartStore(storage);
const saved = createSavedStore(storage);
const recent = createRecentStore(storage);
const session = createSessionStore(storage);
const message = document.getElementById('cart-message');

start([
  ['nav', nav],
  ['cart-badge', () => mountCartBadge(cart)],
  ['account-link', () => mountAccountLink(session)],
  [
    'cart',
    () =>
      mountCartView(document.getElementById('main-content'), {
        api: createProductApi(),
        cart,
        saved,
        recent,
      }),
  ],
  [
    'checkout',
    () =>
      mountCheckout(document.getElementById('cart-totals'), {
        cart,
        session,
        flags: createFlagsStore(storage),
        location: window.location,
        say: (text) => (message.textContent = text),
        createHttp: (onUnauthorized) =>
          createHttpClient({
            baseUrl: API_BASE_URL,
            dialect: API_DIALECT,
            getToken: session.token, // "Authorization: Bearer …", never in the URL
            onUnauthorized,
          }),
      }),
  ],
]);
