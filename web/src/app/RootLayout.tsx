/** The shell every route renders inside: skip link, header, main (the routes) and footer. */
import { Link, Outlet } from 'react-router';
import { useCart } from '../features/cart/CartContext';

export function RootLayout() {
  const { itemCount } = useCart();
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only">
        Skip to content
      </a>
      <header className="flex items-center justify-between gap-md p-md">
        <Link to="/">BrandStore</Link>
        <nav aria-label="Main">
          <Link to="/products">Products</Link> <Link to="/account/orders">Account</Link>{' '}
          <Link to="/cart">Cart, {itemCount} items</Link>
        </nav>
      </header>
      <main id="main" className="p-md">
        <Outlet />
      </main>
      <footer className="p-md">BrandStore</footer>
    </>
  );
}
