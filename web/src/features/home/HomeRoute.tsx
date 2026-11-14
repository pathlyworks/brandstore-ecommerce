/** /: categories and the first products, two independent requests, each with its own loading and error state. */
import { Link } from 'react-router';
import { fetchCategories, fetchProducts } from '../../api/endpoints';
import { EmptyState, ErrorState, LoadingState } from '../../components/StatusMessage';
import { useApi } from '../../hooks/useApi';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { ProductGrid, ProductGridSkeleton } from '../catalog/ProductCard';

export function HomeRoute() {
  useDocumentTitle('BrandStore');
  const categories = useApi('categories', (signal) => fetchCategories(signal));
  const featured = useApi('products?sort=rating', (signal) =>
    fetchProducts({ sort: 'rating', page: 1 }, signal),
  );

  return (
    <div className="flex flex-col gap-xl">
      <section
        aria-labelledby="page-title"
        className="flex flex-col gap-sm rounded-md bg-primary-deep p-lg text-white"
      >
        <h1 id="page-title" className="text-h1 font-extrabold tracking-tight">
          Tech that works as hard as you do
        </h1>
        <p className="max-w-(--container-measure) text-lg text-text-on-dark">
          Laptops, phones, audio and smart-home gear, with clear prices and honest stock levels.
        </p>
        <p>
          <Link
            to="/products"
            className="inline-flex min-h-(--size-tap-target) items-center rounded-md bg-white px-md font-semibold text-primary-deep hover:bg-primary-soft"
          >
            Shop all products
          </Link>
        </p>
      </section>

      <section aria-labelledby="categories-title" className="flex flex-col gap-sm">
        <h2 id="categories-title" className="text-h2 font-bold text-text">
          Shop by category
        </h2>
        {categories.status === 'loading' && <LoadingState label="Loading categories" />}
        {categories.status === 'error' && (
          <ErrorState error={categories.error} onRetry={categories.retry} />
        )}
        {categories.status === 'success' &&
          (categories.data.length === 0 ? (
            <EmptyState title="No categories yet" />
          ) : (
            <ul className="flex flex-wrap gap-xs">
              {categories.data.map((category) => (
                <li key={category.id}>
                  <Link
                    to={`/products?category=${encodeURIComponent(category.id)}`}
                    className="inline-flex min-h-(--size-tap-target) items-center rounded-pill border border-border-control bg-surface px-md font-semibold text-text hover:border-primary hover:text-primary"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          ))}
      </section>

      <section aria-labelledby="featured-title" className="flex flex-col gap-sm">
        <h2 id="featured-title" className="text-h2 font-bold text-text">
          Best rated
        </h2>
        {featured.status === 'loading' && !featured.data && <ProductGridSkeleton count={4} />}
        {featured.status === 'error' && (
          <ErrorState error={featured.error} onRetry={featured.retry} />
        )}
        {featured.data &&
          (featured.data.items.length === 0 ? (
            <EmptyState title="No products yet" />
          ) : (
            <ProductGrid products={featured.data.items.slice(0, 4)} label="Best rated products" />
          ))}
      </section>
    </div>
  );
}
