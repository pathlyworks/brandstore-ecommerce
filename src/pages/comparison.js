/** src/pages/comparison.js — entry module for comparison.html. */
import { start } from '../main.js';
import * as storage from '../utils/storage.js';
import { createCartStore } from '../state/stores.js';
import { mountCartBadge } from '../components/cart-badge.js';
import { init as nav } from '../components/nav.js';
import { init as scrollRegions } from '../components/scroll-regions.js';
import { init as comparisonTable } from '../components/comparison-table.js';

start([
  ['cart-badge', () => mountCartBadge(createCartStore(storage))],
  ['nav', nav],
  ['scroll-regions', scrollRegions],
  ['comparison-table', comparisonTable],
]);
