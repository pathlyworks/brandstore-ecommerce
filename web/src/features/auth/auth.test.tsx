/**
 * Protected routes and session handling, through the real routing map and providers (MSW plays the API):
 * no protected screen without a valid session, back to the intended destination after sign-in or register,
 * one re-authentication path for every 401, the cart kept across sign-in and sign-out, and session expiry
 * during checkout with its recovery.
 */
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/render';
import { api, apiState, server } from '../../test/server';
import { cartLine, signInForTest, storeCart } from '../../test/session';
import { ADMIN, SHOPPER } from '../../test/fixtures';
import { CART_STORAGE_KEY } from '../cart/cart.storage';
import { DRAFT_KEY } from '../checkout/checkout.storage';
import { SIGN_OUT_SIGNAL_KEY } from './session';

async function signInWith(user: UserEvent, account = SHOPPER) {
  await user.type(await screen.findByLabelText('Email'), account.email);
  await user.type(screen.getByLabelText('Password'), account.password);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
}

const search = (router: ReturnType<typeof renderApp>['router']) =>
  Object.fromEntries(new URLSearchParams(router.state.location.search));

describe('ProtectedRoute', () => {
  it.each(['/account/orders', '/account/addresses', '/checkout/address', '/admin'])(
    '%s without a session goes to sign-in with the destination in ?next',
    async (path) => {
      storeCart([cartLine()]);
      const { router } = renderApp(path);
      await screen.findByRole('heading', { level: 1, name: 'Sign in' });
      expect(router.state.location.pathname).toBe('/login');
      expect(search(router)).toEqual({ next: path });
    },
  );

  it('treats an expired stored session as no session', async () => {
    signInForTest({ ttlSeconds: -60 });
    const { router } = renderApp('/account/orders');
    await screen.findByRole('heading', { level: 1, name: 'Sign in' });
    expect(router.state.location.pathname).toBe('/login');
  });

  it('returns to the exact destination (path and query) after signing in', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/account/orders?page=2');
    await signInWith(user);
    await screen.findByRole('table', { name: 'Your orders' });
    expect(router.state.location.pathname + router.state.location.search).toBe(
      '/account/orders?page=2',
    );
    expect(await screen.findByText('Page 2 of 2')).toBeInTheDocument();
  });

  it('returns to the destination after registering, and shows the API’s errors on the right field', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/account/orders');
    await user.click(await screen.findByRole('link', { name: 'Create an account' }));
    await screen.findByRole('heading', { level: 1, name: 'Create an account' });
    expect(search(router)).toEqual({ next: '/account/orders' });

    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(/at least 8 characters/i);

    await user.type(screen.getByLabelText('Name'), 'Nour Hassan');
    await user.type(screen.getByLabelText('Email'), SHOPPER.email);
    await user.type(screen.getByLabelText('Password'), 'Secret123!');
    await user.type(screen.getByLabelText('Password again'), 'Secret123!');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText(/already exists/i)).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Email'));
    await user.type(screen.getByLabelText('Email'), 'nour@example.test');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    await screen.findByRole('table', { name: 'Your orders' });
    expect(router.state.location.pathname).toBe('/account/orders');
  });

  it('shows a shopper a 403 page at /admin, without requesting the admin API', async () => {
    let adminCalls = 0;
    server.use(
      http.get(api('/admin/summary'), () => {
        adminCalls += 1;
        return HttpResponse.json({ error: 'Forbidden' }, { status: 403 });
      }),
    );
    signInForTest();
    renderApp('/admin');
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Access denied: this area is for administrators',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
    expect(adminCalls).toBe(0);
  });

  it('lets an admin in (lazily loaded screen) and links to it in the header', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/admin');
    await signInWith(user, ADMIN);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Admin summary' }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/^EGP\s25,491\.00$/)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/admin');
    expect(
      within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Admin' }),
    ).toBeInTheDocument();
  });
});

describe('one re-authentication path for every 401', () => {
  it('a refused token sends the shopper to sign in (reason: expired) and back', async () => {
    signInForTest();
    apiState.rejectTokens = true; // the server no longer accepts the token
    const user = userEvent.setup();
    const { router } = renderApp('/account/orders');
    expect(await screen.findByText(/your session expired\. sign in again/i)).toBeInTheDocument();
    expect(search(router)).toEqual({ next: '/account/orders', reason: 'expired' });

    apiState.rejectTokens = false;
    await signInWith(user);
    await screen.findByRole('table', { name: 'Your orders' });
    expect(router.state.location.pathname).toBe('/account/orders');
  });

  it('a session whose time runs out ends on its own and redirects', async () => {
    signInForTest({ ttlSeconds: 3 });
    const { router } = renderApp('/account/orders');
    await screen.findByRole('table', { name: 'Your orders' });
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'), { timeout: 5000 });
    expect(search(router)).toEqual({ next: '/account/orders', reason: 'expired' });
  }, 10_000);

  it('signing out in another tab signs out here too', async () => {
    signInForTest();
    const { router } = renderApp('/account/orders');
    await screen.findByRole('table', { name: 'Your orders' });
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: SIGN_OUT_SIGNAL_KEY, newValue: String(Date.now()) }),
      );
    });
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  });
});

describe('the cart across sign-in and sign-out', () => {
  it('keeps the cart when signing in and when signing out; sign-out removes the checkout draft', async () => {
    storeCart([cartLine({ quantity: 2 })]);
    const user = userEvent.setup();
    const { router } = renderApp('/login');
    expect(await screen.findByRole('link', { name: 'Cart, 2 items' })).toBeInTheDocument();
    await signInWith(user);
    await screen.findByRole('table', { name: 'Your orders' });
    expect(screen.getByRole('link', { name: 'Cart, 2 items' })).toBeInTheDocument();

    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ version: 1 }));
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(
      within(screen.getByRole('banner')).getByRole('link', { name: 'Sign in' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cart, 2 items' })).toBeInTheDocument();
    expect(window.localStorage.getItem(CART_STORAGE_KEY)).toContain('"quantity":2');
    expect(window.sessionStorage.getItem(DRAFT_KEY)).toBeNull();
  });
});

describe('session expiry during checkout', () => {
  async function toReview(user: UserEvent) {
    await user.type(await screen.findByLabelText('Full name'), 'Mona Adel');
    await user.type(screen.getByLabelText('Mobile number'), '01012345678');
    await user.type(screen.getByLabelText('Street and building'), '12 Tahrir Street');
    await user.type(screen.getByLabelText('City or district'), 'Dokki');
    await user.selectOptions(screen.getByLabelText('Governorate'), 'giza');
    await user.click(screen.getByRole('button', { name: 'Continue to payment' }));
    await user.click(await screen.findByRole('radio', { name: /^cash on delivery/i }));
    await user.click(screen.getByRole('button', { name: 'Continue to review' }));
    return screen.findByRole('button', { name: /^place order/i });
  }

  it('says so clearly, and after signing in again the order goes through with nothing lost', async () => {
    signInForTest();
    storeCart([cartLine({ quantity: 2 })]);
    const user = userEvent.setup();
    const { router } = renderApp('/checkout/address');
    const place = await toReview(user);

    apiState.rejectTokens = true;
    await user.click(place);
    expect(await screen.findByText(/your session expired during checkout/i)).toBeInTheDocument();
    expect(search(router)).toEqual({ next: '/checkout/review', reason: 'expired' });
    expect(apiState.placed).toHaveLength(0);
    expect(screen.getByRole('link', { name: 'Cart, 2 items' })).toBeInTheDocument();

    apiState.rejectTokens = false;
    await signInWith(user);
    await screen.findByRole('heading', { level: 2, name: 'Review and place order' });
    expect(screen.getByText('Cash on delivery')).toBeInTheDocument();
    expect(screen.getByText(/12 Tahrir Street/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^place order/i }));
    expect(await screen.findByTestId('order-number')).toHaveTextContent('TS-1001');
    expect(apiState.placed).toHaveLength(1);
  });

  it('warns when the session has less than five minutes left', async () => {
    signInForTest({ ttlSeconds: 120 });
    storeCart([cartLine()]);
    renderApp('/checkout/address');
    expect(await screen.findByText(/your session ends in about 2 minutes/i)).toBeInTheDocument();
  });
});
