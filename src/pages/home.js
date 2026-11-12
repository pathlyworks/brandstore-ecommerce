/**
 * src/pages/home.js — entry module for index.html (the landing page).
 * Order matters: products and filter buttons are rendered before the filter wires them up.
 */
import { start } from '../main.js';
import * as storage from '../utils/storage.js';
import { createCart } from '../state/cart.js';
import { mountCartBadge } from '../components/cart-badge.js';
import { init as renderCatalog } from '../components/catalog-render.js';
import { init as productFilter } from '../components/product-filter.js';
import { init as nav } from '../components/nav.js';
import { init as newsletter } from '../components/newsletter.js';
import { init as deals } from '../components/deals.js';
import { init as scrollRegions } from '../components/scroll-regions.js';

start([
  ['cart-badge', () => mountCartBadge(createCart(storage))],
  ['catalog-render', renderCatalog],
  ['product-filter', productFilter],
  ['nav', nav],
  ['newsletter', newsletter],
  ['deals', deals],
  ['scroll-regions', scrollRegions],
]);
