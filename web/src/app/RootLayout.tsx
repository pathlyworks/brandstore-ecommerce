/**
 * The layout route: skip link, Navbar, the matched child route (<Outlet />) and Footer, on every page. The
 * <Suspense> around the outlet covers the lazily loaded routes (admin, checkout).
 */
import { Suspense, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { Footer, Navbar } from '../components';
import { LoadingState } from '../components/StatusMessage';
import { OfflineBanner } from '../components/OfflineBanner';
import { useAuth } from '../features/auth/AuthContext';
import { isSessionValid } from '../features/auth/session';
import { useCart } from '../features/cart/CartContext';
import { FOOTER_GROUPS, MAIN_LINKS } from './navigation';

export function RootLayout() {
  const { itemCount } = useCart();
  const { session, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // "Sign out" (AccountLayout) navigates here with state { signOut: true }: end the session now that no
  // protected screen is showing, and drop the state so Back or a refresh does not sign out again.
  const signOutRequested = (location.state as { signOut?: boolean } | null)?.signOut === true;
  useEffect(() => {
    if (!signOutRequested) return;
    signOut();
    void navigate(location.pathname + location.search, { replace: true, state: null });
  }, [signOutRequested, signOut, navigate, location.pathname, location.search]);
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
      <OfflineBanner />
      <Navbar brand="BrandStore" links={links} cartCount={itemCount} account={account} />
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto min-h-(--size-main-min) w-full max-w-(--container-page) flex-1 px-md py-lg"
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
