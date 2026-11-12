/** src/pages/product.js — entry module for product.html (detail, add to cart, save for later). */
import { start } from '../main.js';
import * as storage from '../utils/storage.js';
import { createProductApi } from '../api/product-api.js';
import {
  createCartStore,
  createRecentStore,
  createSavedStore,
  createSessionStore,
} from '../state/stores.js';
import { init as nav } from '../components/nav.js';
import { mountCartBadge } from '../components/cart-badge.js';
import { mountAccountLink } from '../components/account-link.js';
import { mount as mountProduct } from '../components/product-detail.js';

const cart = createCartStore(storage);
const saved = createSavedStore(storage);
const recent = createRecentStore(storage);

/** Read ?id= and mount the product view. */
function product() {
  const id = new URLSearchParams(window.location.search).get('id') || '';
  mountProduct(document.getElementById('main-content'), {
    api: createProductApi(),
    id,
    cart,
    saved,
    recent,
  });
}

start([
  ['nav', nav],
  ['cart-badge', () => mountCartBadge(cart)],
  ['account-link', () => mountAccountLink(createSessionStore(storage))],
  ['product', product],
]);
