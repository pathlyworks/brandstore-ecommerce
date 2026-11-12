/**
 * src/components/account-view.js
 *
 * The protected account page: greeting, orders (paged, with cancel), saved addresses (edit, delete)
 * and "Sign out". Every request goes through the http client the page created with the session's
 * token, so each one carries `Authorization: Bearer …`. Account data lives only in memory here: it is
 * never written to storage, and signing out (or an expired session) leaves the page.
 */
import * as dom from '../utils/dom.js';
import {
  cancelOrder,
  deleteAddress,
  listAddresses,
  listOrders,
  updateAddress,
} from '../api/account.js';
import { describeError } from '../api/errors.js';
import { renderOrders } from './order-list.js';
import { renderAddresses } from './address-book.js';
import * as pagination from './pagination.js';

export const ORDERS_PER_PAGE = 5;

/**
 * Explain a failed account request (a 401 never gets here: the page has already left for sign-in).
 * @param {any} error
 * @returns {string}
 */
export function accountErrorText(error) {
  if (error?.status === 409 || error?.code === 'ORDER_NOT_CANCELLABLE') {
    return `This order can no longer be cancelled (${error.message}). The list has been refreshed.`;
  }
  if (error?.status === 404) return 'That item no longer exists. The list has been refreshed.';
  const info = describeError(error);
  return `${info.title}. ${info.message}`;
}

/**
 * Orders: load a page, render, cancel.
 * @param {HTMLElement} root
 * @param {object} http
 * @param {(text: string) => void} say
 * @returns {{ load: (page?: number) => Promise<void> }}
 */
function createOrders(root, http, say) {
  const list = dom.qs('#orders-list', root);
  let page = 1;
  const pages = pagination.mount(dom.qs('#orders-pagination', root), { onPage: (n) => load(n) });
  /** Load and show one page of orders. */
  async function load(n = page) {
    page = n;
    list.setAttribute('aria-busy', 'true');
    try {
      const { data, meta } = await listOrders(http, { page, limit: ORDERS_PER_PAGE });
      renderOrders(list, data, cancel);
      pages.render(meta);
    } catch (error) {
      say(accountErrorText(error));
    }
    list.setAttribute('aria-busy', 'false');
  }
  /** Cancel one order, then reload the page of orders. */
  async function cancel(order) {
    try {
      const updated = await cancelOrder(http, order.id);
      say(`Order ${updated.id} is cancelled.`);
    } catch (error) {
      say(accountErrorText(error));
    }
    await load();
  }
  return { load };
}

/**
 * Addresses: load, edit (PUT), delete (DELETE).
 * @param {HTMLElement} root
 * @param {object} http
 * @param {(text: string) => void} say
 * @returns {{ load: () => Promise<void> }}
 */
function createAddresses(root, http, say) {
  const list = dom.qs('#addresses-list', root);
  let addresses = [];
  const ctx = {
    editingId: null,
    onEdit: (address) => draw(address.id),
    onClose: () => draw(null),
    async onSave(address) {
      const saved = await updateAddress(http, address);
      addresses = addresses.map((a) => (a.id === saved.id ? saved : a));
      say(`Address saved: ${[saved.street, saved.city].filter(Boolean).join(', ')}.`);
      draw(null);
    },
    async onDelete(address) {
      try {
        await deleteAddress(http, address.id);
        say('Address deleted.');
      } catch (error) {
        say(accountErrorText(error));
      }
      await load();
    },
  };
  /** Re-render with one address (or none) in edit mode. */
  const draw = (editingId) => renderAddresses(list, addresses, { ...ctx, editingId });
  /** Load the addresses from the API. */
  async function load() {
    try {
      addresses = await listAddresses(http);
      draw(null);
    } catch (error) {
      say(accountErrorText(error));
    }
  }
  return { load };
}

/**
 * @param {HTMLElement} root the account page's <main>
 * @param {{ http: object, user: { email: string, name: string }, onSignOut: () => void }} deps
 * @returns {{ refresh: () => Promise<void> }}
 */
export function mount(root, { http, user, onSignOut }) {
  const message = dom.qs('#account-message', root);
  const say = (text) => (message.textContent = text);
  dom.qs('#account-greeting', root).textContent =
    `Signed in as ${user.name || user.email}${user.name ? ` (${user.email})` : ''}.`;
  dom.qs('#sign-out', root).addEventListener('click', onSignOut);
  const orders = createOrders(root, http, say);
  const addresses = createAddresses(root, http, say);
  const refresh = () => Promise.all([orders.load(1), addresses.load()]).then(() => undefined);
  refresh();
  return { refresh };
}
