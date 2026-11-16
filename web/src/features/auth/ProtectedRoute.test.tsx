/**
 * ProtectedRoute on its own, in a small router (Task 6): who gets in, who is redirected where, and that the
 * redirect carries the exact return path (path and query) that sign-in uses to bring the user back.
 */
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '../../state/AuthContext';
import { signInForTest } from '../../test/session';
import { loginPathFor, ProtectedRoute } from './ProtectedRoute';

function LoginProbe() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  return (
    <main>
      <h1>Sign in</h1>
      <p>next: {params.get('next')}</p>
      <p>reason: {params.get('reason') ?? 'none'}</p>
    </main>
  );
}

function renderAt(path: string, role?: 'admin') {
  const router = createMemoryRouter(
    [
      {
        path: '/account/orders',
        element: (
          <ProtectedRoute>
            <h1>Your orders</h1>
          </ProtectedRoute>
        ),
      },
      {
        path: '/admin',
        element: (
          <ProtectedRoute role={role ?? 'admin'}>
            <h1>Store dashboard</h1>
          </ProtectedRoute>
        ),
      },
      { path: '/login', element: <LoginProbe /> },
    ],
    { initialEntries: [path] },
  );
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
  return router;
}

describe('ProtectedRoute', () => {
  it('signed out: redirects to sign-in with the path and query to return to', async () => {
    const router = renderAt('/account/orders?page=2');
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByText('next: /account/orders?page=2')).toBeInTheDocument();
    expect(screen.getByText('reason: none')).toBeInTheDocument();
    // replace, not push: Back does not return to a page that only redirects again
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('a session that runs out while the screen is open: redirects with reason=expired', async () => {
    signInForTest({ ttlSeconds: 1 });
    renderAt('/account/orders');
    expect(await screen.findByRole('heading', { name: 'Your orders' })).toBeInTheDocument();
    expect(await screen.findByText('reason: expired', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText('next: /account/orders')).toBeInTheDocument();
  });

  it('signed in: shows the protected screen', async () => {
    signInForTest();
    renderAt('/account/orders');
    expect(await screen.findByRole('heading', { name: 'Your orders' })).toBeInTheDocument();
  });

  it('a shopper at an admin route: access denied, no redirect, a link to their orders', async () => {
    signInForTest({ role: 'shopper' });
    const router = renderAt('/admin');
    expect(await screen.findByRole('heading', { name: /access denied/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Store dashboard' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to your orders' })).toHaveAttribute(
      'href',
      '/account/orders',
    );
    expect(router.state.location.pathname).toBe('/admin');
  });

  it('an admin at an admin route gets in', async () => {
    signInForTest({ role: 'admin' });
    renderAt('/admin');
    expect(await screen.findByRole('heading', { name: 'Store dashboard' })).toBeInTheDocument();
  });

  it('loginPathFor encodes the return path', () => {
    expect(loginPathFor('/checkout/review?x=1&y=2', true)).toBe(
      '/login?next=%2Fcheckout%2Freview%3Fx%3D1%26y%3D2&reason=expired',
    );
  });
});
