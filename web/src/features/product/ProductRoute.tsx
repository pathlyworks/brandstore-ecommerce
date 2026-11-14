/**
 * /products/:id: the product, with Tabs (overview, specifications as a Table<Spec>), a controlled quantity
 * and "Add to cart". A 404 shows "not found" inside the page; other errors offer a retry.
 */
import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import type { Product, Spec } from '@shared/domain';
import { fetchProduct } from '../../api/endpoints';
import { Button, Input, Table, Tabs, type Column } from '../../components';
import { EmptyState, ErrorState, LoadingState } from '../../components/StatusMessage';
import { useApi } from '../../hooks/useApi';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { formatMoney } from '../../lib/money';
import { StockBadge } from '../catalog/ProductCard';
import { clampQuantity, MAX_PER_LINE } from '../cart/cart.reducer';
import { useCart } from '../cart/CartContext';

const SPEC_COLUMNS: readonly Column<Spec>[] = [
  { id: 'label', header: 'Specification', cell: (spec) => spec.label, rowHeader: true },
  { id: 'value', header: 'Value', cell: (spec) => spec.value },
];

type ProductTab = 'overview' | 'specs';

export function ProductRoute() {
  const { id = '' } = useParams();
  const product = useApi(`product/${id}`, (signal) => fetchProduct(id, signal));
  useDocumentTitle(product.data?.name ?? 'Product');

  if (product.status === 'error') {
    return product.error.code === 'NOT_FOUND' ? (
      <EmptyState title="Product not found">
        <p>
          It may have been removed.{' '}
          <Link to="/products" className="font-semibold text-primary underline">
            Browse the products
          </Link>
        </p>
      </EmptyState>
    ) : (
      <ErrorState error={product.error} onRetry={product.retry} />
    );
  }
  if (!product.data) return <LoadingState label="Loading the product" />;
  // key: a new product starts with a fresh quantity and tab (no state carried over from the previous id).
  return <ProductDetails key={product.data.id} product={product.data} />;
}

function ProductDetails({ product }: { product: Product }) {
  const { cart, dispatch } = useCart();
  const [quantity, setQuantity] = useState('1');
  const [tab, setTab] = useState<ProductTab>('overview');
  const [message, setMessage] = useState('');

  const inCart = cart.lines.find((line) => line.productId === product.id)?.quantity ?? 0;
  const room = clampQuantity(product.stock.available - inCart, MAX_PER_LINE - inCart);
  const wanted = Number(quantity);
  const error =
    room === 0
      ? undefined
      : !Number.isInteger(wanted) || wanted < 1
        ? 'Enter a whole number of at least 1.'
        : wanted > room
          ? `You can add up to ${room}.`
          : undefined;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (error || room === 0) return;
    dispatch({ type: 'add', product, quantity: wanted });
    setMessage(`Added ${wanted} × ${product.name} to the cart.`);
    setQuantity('1');
  }

  const image = product.images[0];
  return (
    <article aria-labelledby="page-title" className="grid gap-lg lg:grid-cols-2">
      <img
        src={image.url}
        alt={image.alt}
        width={640}
        height={480}
        className="aspect-(--ratio-media) w-full rounded-md bg-surface object-cover"
      />
      <div className="flex flex-col gap-sm">
        <p className="text-sm font-semibold tracking-wide text-text-muted uppercase">
          {product.brand}
        </p>
        <h1 id="page-title" className="text-h1 font-extrabold tracking-tight text-text">
          {product.name}
        </h1>
        <p className="text-2xl font-bold text-text">
          {formatMoney(product.price, product.currency)}
        </p>
        <StockBadge status={product.stock.status} />

        <form onSubmit={onSubmit} noValidate className="flex flex-wrap items-end gap-sm">
          <Input
            label="Quantity"
            name="quantity"
            type="number"
            inputMode="numeric"
            min={1}
            max={Math.max(1, room)}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            error={error}
            disabled={room === 0}
            hint={inCart > 0 ? `${inCart} already in your cart.` : undefined}
            className="w-(--size-thumb)"
          />
          <Button type="submit" disabled={room === 0 || Boolean(error)}>
            {product.stock.status === 'out_of_stock'
              ? 'Out of stock'
              : room === 0
                ? 'Cart limit reached'
                : 'Add to cart'}
          </Button>
        </form>
        <p role="status" className="text-success">
          {message}
        </p>

        <Tabs<ProductTab>
          label="Product information"
          value={tab}
          onChange={setTab}
          tabs={[
            {
              id: 'overview',
              label: 'Overview',
              panel: (
                <p className="text-text">
                  Rated {product.rating} of 5 from {product.reviewCount} reviews.
                </p>
              ),
            },
            {
              id: 'specs',
              label: 'Specifications',
              panel: (
                <Table<Spec>
                  caption={`${product.name} specifications`}
                  columns={SPEC_COLUMNS}
                  rows={product.specs}
                  getRowKey={(spec) => spec.label}
                  emptyMessage="No specifications listed."
                />
              ),
            },
          ]}
        />
      </div>
    </article>
  );
}
