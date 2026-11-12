/**
 * src/components/order-list.js
 *
 * "Your orders" on account.html: date, status, items, total and a "Cancel order" button for orders
 * the API marks as cancellable. A refused cancel (409 in the TechSphere API, 400 ORDER_NOT_CANCELLABLE
 * in the BrandStore mock) is explained and the list is reloaded.
 */
import * as dom from '../utils/dom.js';
import { formatMoney } from '../utils/money.js';
import { formatOrderDate } from '../utils/dates.js';

const STATUS_TEXT = {
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

/**
 * "2 items: p-001 × 1, p-002 × 1" (names when the API gives them).
 * @param {{ productId: string, name: string | null, quantity: number }[]} items
 * @returns {string}
 */
export function itemsText(items) {
  const count = items.reduce((sum, { quantity }) => sum + quantity, 0);
  const list = items
    .map(({ productId, name, quantity }) => `${name || productId} × ${quantity}`)
    .join(', ');
  return `${count} ${count === 1 ? 'item' : 'items'}${list ? `: ${list}` : ''}`;
}

/**
 * One order row.
 * @param {object} order app-shape order (api/account.js)
 * @param {(order: object) => void} onCancel
 * @returns {HTMLLIElement}
 */
function orderItem(order, onCancel) {
  const cancel = dom.el('button', {
    className: 'link-button',
    text: 'Cancel order',
    attrs: { type: 'button', 'aria-label': `Cancel order ${order.id}` },
    dataset: { focusKey: `cancel-${order.id}` },
  });
  cancel.addEventListener('click', () => onCancel(order));
  return dom.el('li', { className: 'order', dataset: { id: order.id } }, [
    dom.el('p', { className: 'order__id', text: `Order ${order.id}` }),
    dom.el('p', { className: 'order__date', text: `Placed ${formatOrderDate(order.createdAt)}` }),
    dom.el('p', {
      className: `order__status order__status--${order.status}`,
      text: STATUS_TEXT[order.status] || order.status,
    }),
    dom.el('p', { className: 'order__items', text: itemsText(order.items) }),
    dom.el('p', { className: 'order__total', text: formatMoney(order.total, order.currency) }),
    order.cancellable ? cancel : '',
  ]);
}

/**
 * Render the orders (or the empty message).
 * @param {HTMLUListElement} list
 * @param {object[]} orders
 * @param {(order: object) => void} onCancel
 */
export function renderOrders(list, orders, onCancel) {
  dom.clear(list);
  if (!orders.length)
    list.appendChild(
      dom.el('li', { className: 'order order--empty', text: 'You have no orders yet.' }),
    );
  orders.forEach((order) => list.appendChild(orderItem(order, onCancel)));
}
