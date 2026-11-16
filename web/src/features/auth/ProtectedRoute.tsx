/**
 * ProtectedRoute: no protected screen renders without a valid session (present and not expired, checked at
 * render time, not only when the timer fires). Without one, it redirects to the single sign-in path,
 * /login?next=<the full URL asked for>, adding reason=expired when the session ran out or the API refused it.
 * With `role`, a signed-in user without that role gets a 403 page, and the guarded element (for /admin, a
 * lazily loaded chunk) is never rendered, so its code is never downloaded.
 */
import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import type { User } from '@shared/domain';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAuth } from './AuthContext';
import { isSessionValid } from './session';

export function loginPathFor(next: string, expired: boolean): string {
  const params = new URLSearchParams({ next });
  if (expired) params.set('reason', 'expired');
  return `/login?${params.toString()}`;
}

export function ProtectedRoute({ role, children }: { role?: User['role']; children: ReactNode }) {
  const { session, ended } = useAuth();
  const location = useLocation();
  if (!isSessionValid(session)) {
    const expired = ended === 'expired' || session !== null;
    return <Navigate to={loginPathFor(location.pathname + location.search, expired)} replace />;
  }
  if (role && session.user.role !== role) return <Forbidden />;
  return children;
}

function Forbidden() {
  useDocumentTitle('Not allowed');
  return (
    <section aria-labelledby="page-title" className="flex flex-col gap-sm">
      <h1 id="page-title" className="text-h1 font-extrabold tracking-tight text-text">
        Access denied: this area is for administrators
      </h1>
      <p className="text-text-muted">
        You are signed in with a shopper account, which cannot open it.{' '}
        <Link to="/account/orders" className="font-semibold text-primary underline">
          Go to your orders
        </Link>
      </p>
    </section>
  );
}
