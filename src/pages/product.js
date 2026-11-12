/** src/pages/product.js — entry module for product.html (one product from GET /products/{id}). */
import { start } from '../main.js';
import { API_BASE_URL } from '../config.js';
import { createHttpClient } from '../api/http.js';
import { init as nav } from '../components/nav.js';
import { mount as mountProduct } from '../components/product-detail.js';

/** Read ?id= and mount the product view. */
function product() {
  const id = new URLSearchParams(window.location.search).get('id') || '';
  mountProduct(document.getElementById('main-content'), {
    http: createHttpClient({ baseUrl: API_BASE_URL }),
    id,
  });
}

start([
  ['nav', nav],
  ['product', product],
]);
