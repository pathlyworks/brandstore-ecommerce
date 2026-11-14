/**
 * The layout route: skip link, Navbar, the matched child route (<Outlet />) and Footer, on every page. The
 * <Suspense> around the outlet covers the lazily loaded routes (admin, checkout).
 */
import { Suspense } from 'react';
import { Outlet } from 'react-router';
import { Footer, Navbar } from '../components';
import { LoadingState } from '../components/StatusMessage';
import { useAuth } from '../features/auth/AuthContext';
import { isSessionValid } from '../features/auth/session';
import { useCart } from '../features/cart/CartContext';
import { FOOTER_GROUPS, MAIN_LINKS } from './navigation';

export function RootLayout() {
  const { itemCount } = useCart();
  const { session } = useAuth();
  const signedIn = isSessionValid(session);
  const account = signedIn
    ? { to: '/account/orders', label: 'Account' }
    : { to: '/login', label: 'Sign in' };
  // The admin link only for admins (the route checks the role again; the API checks the token).
  const links =
    signedIn && session.user.role === 'admin'
      ? [...MAIN_LINKS, { to: '/admin', label: 'Admin' }]
      : MAIN_LINKS;
  return (
    <div className="flex min-h-(--size-page-min) flex-col bg-bg font-sans text-text">
      <a
        href="#main"
        className="sr-only z-(--z-skip-link) rounded-md bg-surface p-sm font-semibold text-primary focus:not-sr-only focus:fixed focus:top-xs focus:left-xs"
      >
        Skip to main content
      </a>
      <Navbar brand="BrandStore" links={links} cartCount={itemCount} account={account} />
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-(--container-page) flex-1 px-md py-lg"
      >
        <Suspense fallback={<LoadingState label="Loading the page" />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer
        groups={FOOTER_GROUPS}
        note="© 2026 BrandStore. Prices in EGP from the TechSphere API."
      />
    </div>
  );
}
