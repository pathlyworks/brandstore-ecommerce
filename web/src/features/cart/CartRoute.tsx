/**
 * /cart: the lines as a Table<CartItem> keyed by product id, a controlled quantity per line, remove, and
 * "Empty the cart" behind a confirmation Modal. Empty cart: a message and a link back to the products.
 */
import { useState } from 'react';
import { Link } from 'react-router';
import type { CartItem } from '@shared/domain';
import { Button, Modal, Select, Table, type Column, type SelectOption } from '../../components';
import { EmptyState } from '../../components/StatusMessage';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { formatMoney } from '../../lib/money';
import { MAX_PER_LINE } from './cart.reducer';
import { useCart } from './CartContext';

type QuantityValue = `${number}`;

function quantityOptions(line: CartItem): SelectOption<QuantityValue>[] {
  const most = Math.max(line.quantity, Math.min(line.stock, MAX_PER_LINE));
  return Array.from({ length: most }, (_, i) => i + 1).map((n) => ({
    value: `${n}`,
    label: String(n),
  }));
}

export function CartRoute() {
  useDocumentTitle('Your cart');
  const { cart, itemCount, subtotal, currency, dispatch } = useCart();
  const [confirming, setConfirming] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const columns: readonly Column<CartItem>[] = [
    {
      id: 'product',
      header: 'Product',
      rowHeader: true,
      sortValue: (line) => line.name,
      cell: (line) => (
        <Link
          to={`/products/${encodeURIComponent(line.productId)}`}
          className="font-semibold text-primary underline"
        >
          {line.name}
        </Link>
      ),
    },
    {
      id: 'price',
      header: 'Price',
      align: 'end',
      sortValue: (line) => line.unitPrice,
      cell: (line) => formatMoney(line.unitPrice, line.currency),
    },
    {
      id: 'quantity',
      header: 'Quantity',
      cell: (line) => (
        <Select<QuantityValue>
          label={`Quantity of ${line.name}`}
          hideLabel
          options={quantityOptions(line)}
          value={`${line.quantity}`}
          onChange={(value) => {
            dispatch({ type: 'setQuantity', productId: line.productId, quantity: Number(value) });
            setAnnouncement(`${line.name}: quantity ${value}.`);
          }}
        />
      ),
    },
    {
      id: 'total',
      header: 'Line total',
      align: 'end',
      sortValue: (line) => line.unitPrice * line.quantity,
      cell: (line) => formatMoney(line.unitPrice * line.quantity, line.currency),
    },
    {
      id: 'remove',
      header: 'Remove',
      cell: (line) => (
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Remove ${line.name}`}
          onClick={() => {
            dispatch({ type: 'remove', productId: line.productId });
            setAnnouncement(`${line.name} removed from the cart.`);
          }}
        >
          Remove
        </Button>
      ),
    },
  ];

  return (
    <section aria-labelledby="page-title" className="flex flex-col gap-lg">
      <h1 id="page-title" className="text-h1 font-extrabold tracking-tight text-text">
        Your cart
      </h1>
      <p role="status" className="sr-only">
        {announcement}
      </p>

      {cart.lines.length === 0 ? (
        <EmptyState title="Your cart is empty">
          <Link to="/products" className="font-semibold text-primary underline">
            Browse the products
          </Link>
        </EmptyState>
      ) : (
        <>
          <Table<CartItem>
            caption={`Your cart, ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
            columns={columns}
            rows={cart.lines}
            getRowKey={(line) => line.productId}
          />
          <div className="flex flex-wrap items-center justify-between gap-sm">
            <p className="text-xl font-bold text-text">
              Subtotal: {formatMoney(subtotal, currency)}
            </p>
            <div className="flex gap-xs">
              <Button variant="secondary" onClick={() => setConfirming(true)}>
                Empty the cart
              </Button>
              <Link
                to="/checkout"
                className="inline-flex min-h-(--size-tap-target) items-center rounded-md bg-primary px-md font-semibold text-white hover:bg-primary-hover"
              >
                Go to checkout
              </Link>
            </div>
          </div>
        </>
      )}

      <Modal
        open={confirming}
        title="Empty the cart?"
        onClose={() => setConfirming(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Keep the items
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                dispatch({ type: 'clear' });
                setConfirming(false);
                setAnnouncement('The cart is empty.');
              }}
            >
              Empty the cart
            </Button>
          </>
        }
      >
        <p>This removes all {itemCount} items. You cannot undo it.</p>
      </Modal>
    </section>
  );
}
