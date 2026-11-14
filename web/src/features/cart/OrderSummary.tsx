/** Subtotal, shipping and total from the cart selectors (cart page and checkout review). */
import type { CartTotals } from '@shared/domain';
import { formatMoney } from '../../lib/money';

export function OrderSummary({
  totals,
  heading = 'Order summary',
}: {
  totals: CartTotals;
  heading?: string;
}) {
  const money = (cents: number) => formatMoney(cents, totals.currency);
  return (
    <section
      aria-labelledby="summary-title"
      className="w-full max-w-(--size-totals) rounded-md border border-border bg-surface p-md"
    >
      <h2 id="summary-title" className="text-lg font-bold text-text">
        {heading}
      </h2>
      <dl className="mt-xs grid grid-cols-2 gap-y-2xs text-text">
        <dt>Items</dt>
        <dd className="text-right">{totals.itemCount}</dd>
        <dt>Subtotal</dt>
        <dd className="text-right">{money(totals.subtotal)}</dd>
        <dt>Shipping</dt>
        <dd className="text-right">
          {totals.shipping === 0
            ? totals.subtotal === 0
              ? money(0)
              : 'Free'
            : money(totals.shipping)}
        </dd>
        <dt className="border-t border-border pt-2xs font-bold">Total</dt>
        <dd className="border-t border-border pt-2xs text-right font-bold">
          {money(totals.total)}
        </dd>
      </dl>
      {totals.freeShippingRemaining > 0 && (
        <p className="mt-xs text-sm text-text-muted">
          Add {money(totals.freeShippingRemaining)} more for free shipping.
        </p>
      )}
    </section>
  );
}
