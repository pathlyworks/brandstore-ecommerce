/**
 * /checkout/confirmation/:number: the order number the API returned (POST /orders → { id, number, status }).
 * The details come from this tab's record of the order (sessionStorage), so a refresh shows the same page;
 * opened anywhere else, the number from the URL is still shown, with a link to the order history.
 */
import { Link, useParams } from 'react-router';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { formatMoney } from '../../lib/money';
import { loadPlacedOrders } from './checkout.storage';

export function ConfirmationRoute() {
  const { number = '' } = useParams();
  useDocumentTitle(`Order ${number} placed`);
  const order = loadPlacedOrders().find((o) => o.number === number);

  return (
    <section
      aria-labelledby="page-title"
      className="flex max-w-(--container-measure) flex-col gap-md"
    >
      <h1 id="page-title" className="text-h1 font-extrabold tracking-tight text-text">
        Thank you, your order is placed
      </h1>
      <p className="text-lg text-text">
        Your order number is{' '}
        <strong className="text-2xl font-extrabold text-primary-deep" data-testid="order-number">
          {number}
        </strong>
      </p>
      {order ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-md gap-y-2xs rounded-md border border-border bg-surface p-md text-text">
          <dt className="font-semibold">Status</dt>
          <dd>{order.status}</dd>
          <dt className="font-semibold">Items</dt>
          <dd>{order.itemCount}</dd>
          <dt className="font-semibold">Total</dt>
          <dd>{formatMoney(order.total, order.currency)}</dd>
          <dt className="font-semibold">Deliver to</dt>
          <dd>{order.deliverTo}</dd>
          <dt className="font-semibold">Payment</dt>
          <dd>{order.payment}</dd>
        </dl>
      ) : (
        <p className="text-text-muted">
          The details of this order were placed in another tab or session.
        </p>
      )}
      <p className="flex flex-wrap gap-md">
        <Link to="/account/orders" className="font-semibold text-primary underline">
          See your orders
        </Link>
        <Link to="/products" className="font-semibold text-primary underline">
          Continue shopping
        </Link>
      </p>
    </section>
  );
}
