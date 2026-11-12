/** src/pages/cart.js — entry module for cart.html (cart, saved for later, recently viewed). */
import { start } from '../main.js';
import * as storage from '../utils/storage.js';
import { createProductApi } from '../api/product-api.js';
import { createCart } from '../state/cart.js';
import { createSaved } from '../state/saved.js';
import { init as nav } from '../components/nav.js';
import { mountCartBadge } from '../components/cart-badge.js';
import { mount as mountCartView } from '../components/cart-view.js';

const cart = createCart(storage);
const saved = createSaved(storage);

start([
  ['nav', nav],
  ['cart-badge', () => mountCartBadge(cart)],
  [
    'cart',
    () =>
      mountCartView(document.getElementById('main-content'), {
        api: createProductApi(),
        cart,
        saved,
        storage,
      }),
  ],
]);
