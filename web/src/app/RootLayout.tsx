/** The layout route: skip link, Navbar, the matched child route (<Outlet />) and Footer, on every page. */
import { Outlet } from 'react-router';
import { Footer, Navbar } from '../components';
import { useAuth } from '../features/auth/AuthContext';
import { useCart } from '../features/cart/CartContext';
import { FOOTER_GROUPS, MAIN_LINKS } from './navigation';

export function RootLayout() {
  const { itemCount } = useCart();
  const { session } = useAuth();
  const account = session
    ? { to: '/account/orders', label: 'Account' }
    : { to: '/login', label: 'Sign in' };
  return (
    <div className="flex min-h-(--size-page-min) flex-col bg-bg font-sans text-text">
      <a
        href="#main"
        className="sr-only z-(--z-skip-link) rounded-md bg-surface p-sm font-semibold text-primary focus:not-sr-only focus:fixed focus:top-xs focus:left-xs"
      >
        Skip to main content
      </a>
      <Navbar brand="BrandStore" links={MAIN_LINKS} cartCount={itemCount} account={account} />
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-(--container-page) flex-1 px-md py-lg"
      >
        <Outlet />
      </main>
      <Footer
        groups={FOOTER_GROUPS}
        note="© 2026 BrandStore. Prices in EGP from the TechSphere API."
      />
    </div>
  );
}
