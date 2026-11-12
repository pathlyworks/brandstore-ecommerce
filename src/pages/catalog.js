/** src/pages/catalog.js — entry module for catalog.html (search, filter, sort and paginate). */
import { start } from '../main.js';
import * as storage from '../utils/storage.js';
import { createCartStore } from '../state/stores.js';
import { mountCartBadge } from '../components/cart-badge.js';
import { API_BASE_URL, SEARCH_DEBOUNCE_MS } from '../config.js';
import { createHttpClient } from '../api/http.js';
import { createCatalogState } from '../state/catalog.js';
import { init as nav } from '../components/nav.js';
import { mount as mountCatalog } from '../components/catalog-view.js';

/** Create the API client and URL-backed state, then mount the catalog. */
function catalog() {
  const root = document.getElementById('main-content');
  mountCatalog(root, {
    http: createHttpClient({ baseUrl: API_BASE_URL }),
    state: createCatalogState(window.location, window.history),
    debounceMs: SEARCH_DEBOUNCE_MS,
  });
}

start([
  ['cart-badge', () => mountCartBadge(createCartStore(storage))],
  ['nav', nav],
  ['catalog', catalog],
]);
