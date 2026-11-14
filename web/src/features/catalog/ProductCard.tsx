import type { Product } from '@shared/domain';
import { Badge, Card } from '../../components';
import { formatMoney } from '../../lib/money';

const STOCK_LABEL = {
  in_stock: { tone: 'success', text: 'In stock' },
  low: { tone: 'warning', text: 'Low stock' },
  out_of_stock: { tone: 'danger', text: 'Out of stock' },
  unknown: { tone: 'neutral', text: 'Stock unknown' },
} as const;

export function StockBadge({ status }: { status: Product['stock']['status'] }) {
  const { tone, text } = STOCK_LABEL[status];
  return <Badge tone={tone}>{text}</Badge>;
}

export function ProductCard({ product }: { product: Product }) {
  const image = product.images[0];
  return (
    <Card
      heading={product.name}
      href={`/products/${encodeURIComponent(product.id)}`}
      disabled={product.stock.status === 'out_of_stock'}
      media={
        <img
          src={image.url}
          alt={image.alt}
          loading="lazy"
          width={320}
          height={240}
          className="aspect-(--ratio-media) w-full object-cover"
        />
      }
      footer={
        <div className="flex items-center justify-between gap-xs">
          <span className="font-bold text-text">
            {formatMoney(product.price, product.currency)}
          </span>
          <StockBadge status={product.stock.status} />
        </div>
      }
    >
      <p className="text-sm text-text-muted">
        {product.brand} · {product.rating} of 5 ({product.reviewCount} reviews)
      </p>
    </Card>
  );
}

/** A product grid: one stable key per product (its id), never the index. */
export function ProductGrid({ products, label }: { products: readonly Product[]; label: string }) {
  return (
    <ul aria-label={label} className="grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-4">
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}

const BAR = 'rounded-sm bg-disabled-bg text-transparent animate-pulse motion-reduce:animate-none';

/**
 * The same box as a ProductCard while it loads: the same rows and type sizes (the placeholder words
 * are transparent), so the grid does not move when the products arrive (CLS).
 */
export function ProductCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col gap-sm rounded-md border border-border bg-surface p-md shadow-sm"
    >
      <div className={`aspect-(--ratio-media) w-full ${BAR}`} />
      <p className="text-lg font-semibold leading-snug">
        <span className={BAR}>Product name here</span>
      </p>
      <p className="text-sm">
        <span className={BAR}>Brand · 4.5 of 5 (120 reviews)</span>
      </p>
      <div className="mt-auto flex items-center justify-between gap-xs">
        <span className={`font-bold ${BAR}`}>EGP 00,000.00</span>
        <Badge loading>In stock</Badge>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul aria-hidden="true" className="grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }, (_, slot) => `skeleton-${slot}`).map((id) => (
        <li key={id}>
          <ProductCardSkeleton />
        </li>
      ))}
    </ul>
  );
}
