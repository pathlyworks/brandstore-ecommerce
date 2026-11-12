/** src/pages/not-found.js — entry module for 404.html. */
import { start } from '../main.js';
import * as storage from '../utils/storage.js';
import { createCartStore } from '../state/stores.js';
import { mountCartBadge } from '../components/cart-badge.js';
import { init as nav } from '../components/nav.js';
import { init as scrollRegions } from '../components/scroll-regions.js';

start([
  ['cart-badge', () => mountCartBadge(createCartStore(storage))],
  ['nav', nav],
  ['scroll-regions', scrollRegions],
]);
