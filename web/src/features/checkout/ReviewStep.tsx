/** /checkout/review: everything the order will contain, with links to change it, and "Place order". */
import { Link } from 'react-router';
import type { CartItem } from '@shared/domain';
import { Button, Table, type Column } from '../../components';
import { ErrorState } from '../../components/StatusMessage';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { formatMoney } from '../../lib/money';
import { useCart } from '../cart/CartContext';
import { selectChargeableLines, selectLineTotal } from '../cart/cart.selectors';
import { OrderSummary } from '../cart/OrderSummary';
import { useCheckout } from './CheckoutContext';
import { describePayment, GOVERNORATES, normalisePhone } from './checkout.model';
import { StepGuard } from './StepForm';
import { usePlaceOrder } from './usePlaceOrder';

const COLUMNS: readonly Column<CartItem>[] = [
  { id: 'name', header: 'Product', rowHeader: true, cell: (l) => l.name },
  { id: 'quantity', header: 'Quantity', align: 'end', cell: (l) => l.quantity },
  { id: 'price', header: 'Price', align: 'end', cell: (l) => formatMoney(l.unitPrice, l.currency) },
  {
    id: 'total',
    header: 'Line total',
    align: 'end',
    cell: (l) => formatMoney(selectLineTotal(l), l.currency),
  },
];

export function ReviewStep() {
  return (
    <StepGuard step="review">
      <Review />
    </StepGuard>
  );
}

function Review() {
  useDocumentTitle('Checkout: review');
  const { cart, totals } = useCart();
  const { draft } = useCheckout();
  const { phase, place } = usePlaceOrder();
  const { address, payment } = draft;
  const governorate = GOVERNORATES.find((g) => g.value === address.governorate)?.label ?? '';
  const submitting = phase.status === 'submitting';

  return (
    <section aria-labelledby="step-title" className="flex flex-col gap-md">
      <h2 id="step-title" className="text-h2 font-bold text-text">
        Review and place order
      </h2>

      <Table<CartItem>
        caption="Items in this order"
        columns={COLUMNS}
        rows={selectChargeableLines(cart)}
        getRowKey={(l) => l.productId}
      />

      <div className="grid gap-md md:grid-cols-3">
        <section
          aria-labelledby="deliver-title"
          className="rounded-md border border-border bg-surface p-md"
        >
          <h3 id="deliver-title" className="font-bold text-text">
            Delivery address
          </h3>
          <address className="mt-2xs text-text not-italic">
            {address.fullName}
            <br />
            {address.street}
            <br />
            {address.city}, {governorate} {address.postalCode}
            <br />
            {normalisePhone(address.phone)}
          </address>
          <Link
            to="/checkout/address"
            className="mt-xs inline-block font-semibold text-primary underline"
          >
            Change the address
          </Link>
        </section>
        <section
          aria-labelledby="pay-title"
          className="rounded-md border border-border bg-surface p-md"
        >
          <h3 id="pay-title" className="font-bold text-text">
            Payment
          </h3>
          <p className="mt-2xs text-text">{describePayment(payment)}</p>
          {payment.method === 'card' && <p className="text-text">{payment.nameOnCard}</p>}
          <Link
            to="/checkout/payment"
            className="mt-xs inline-block font-semibold text-primary underline"
          >
            Change the payment method
          </Link>
        </section>
        <OrderSummary totals={totals} />
      </div>

      {phase.status === 'error' && <ErrorState error={phase.error} />}
      {phase.status === 'error' && phase.error.status !== 400 && (
        <p className="text-text-muted">
          If you are not sure the order went through, “Try again” is safe: it sends the same order
          reference.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-xs">
        <Button
          type="button"
          size="md"
          loading={submitting}
          loadingLabel="Placing your order"
          onClick={() => void place()}
        >
          {phase.status === 'error'
            ? 'Try again'
            : `Place order, ${formatMoney(totals.total, totals.currency)}`}
        </Button>
        <p role="status" className="text-text-muted">
          {submitting ? 'Placing your order… Please wait, do not close this page.' : ''}
        </p>
      </div>
    </section>
  );
}
