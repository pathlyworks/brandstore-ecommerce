/**
 * The checkout end to end in jsdom, against MSW handlers that behave like the TechSphere API:
 * guards, per-step validation, input that survives a refresh and Back, one POST /orders however fast the
 * clicks, the same idempotency key on a retry, the confirmation route and the cleared cart.
 */
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/render';
import { api, apiState, server } from '../../test/server';
import { cartLine, signInForTest, storeCart } from '../../test/session';
import { DRAFT_KEY } from './checkout.storage';

async function fillAddress(user = userEvent.setup()) {
  await user.type(await screen.findByLabelText('Full name'), 'Mona Adel');
  await user.type(screen.getByLabelText('Mobile number'), '010 1234 5678');
  await user.type(screen.getByLabelText('Street and building'), '12 Tahrir Street');
  await user.type(screen.getByLabelText('City or district'), 'Dokki');
  await user.selectOptions(screen.getByLabelText('Governorate'), 'giza');
}

async function fillPayment(user = userEvent.setup()) {
  await user.click(await screen.findByRole('radio', { name: /^test card/i }));
  await user.selectOptions(screen.getByRole('combobox', { name: 'Test card' }), 'visa-4242');
  await user.type(screen.getByLabelText('Name on card'), 'Mona Adel');
}

const progress = () => screen.getByRole('navigation', { name: 'Checkout progress' });

describe('checkout guards', () => {
  it('sends a signed-out shopper to sign in, then back to the checkout', async () => {
    storeCart([cartLine()]);
    const { router } = renderApp('/checkout');
    await screen.findByRole('heading', { level: 1, name: 'Sign in' });
    expect(router.state.location.search).toBe('?next=%2Fcheckout');
  });

  it('stops on an empty cart', async () => {
    signInForTest();
    renderApp('/checkout/address');
    expect(
      await screen.findByRole('heading', { name: 'There is nothing to check out' }),
    ).toBeInTheDocument();
  });
});

describe('multi-step checkout', () => {
  it('validates each step, keeps input across refresh and Back, places one order and confirms it', async () => {
    signInForTest();
    storeCart([cartLine({ quantity: 2 })]);
    const user = userEvent.setup();
    let view = renderApp('/checkout');

    // The index opens the first incomplete step; the progress indicator marks it.
    await screen.findByRole('heading', { level: 2, name: 'Delivery address' });
    expect(view.router.state.location.pathname).toBe('/checkout/address');
    expect(within(progress()).getByText(/step 1 of 3, current step/i)).toBeInTheDocument();

    // Per-step validation blocks progress: errors in a focused summary and on each field.
    await user.click(screen.getByRole('button', { name: 'Continue to payment' }));
    const summary = await screen.findByRole('alert');
    expect(summary).toHaveFocus();
    expect(summary).toHaveTextContent('Fix 5 problems to continue');
    expect(screen.getByLabelText('Mobile number')).toHaveAttribute('aria-invalid', 'true');
    expect(view.router.state.location.pathname).toBe('/checkout/address');

    // Skipping ahead by URL is sent back to the incomplete step.
    await view.router.navigate('/checkout/review');
    await waitFor(() => expect(view.router.state.location.pathname).toBe('/checkout/address'));
    expect(await screen.findByText('Complete "Delivery address" first.')).toBeInTheDocument();

    await fillAddress(user);
    await user.type(screen.getByLabelText('Mobile number'), '9'); // now 12 digits: invalid again
    expect(screen.getByLabelText('Mobile number')).toHaveAccessibleDescription(
      /egyptian mobile number/i,
    );
    await user.type(screen.getByLabelText('Mobile number'), '{Backspace}');
    await user.click(screen.getByRole('button', { name: 'Continue to payment' }));
    await screen.findByRole('heading', { level: 2, name: 'Payment method' });

    // Refresh on the payment step: same step, same input (sessionStorage), nothing lost.
    await user.click(await screen.findByRole('radio', { name: /^mobile wallet/i }));
    await user.type(screen.getByLabelText('Wallet mobile number'), '0111');
    view.unmount();
    view = renderApp('/checkout/payment');
    expect(await screen.findByRole('radio', { name: /^mobile wallet/i })).toBeChecked();
    expect(screen.getByLabelText('Wallet mobile number')).toHaveValue('0111');

    // Open the address step from the progress indicator, then browser Back: both steps kept their input.
    await user.click(within(progress()).getByRole('link', { name: /delivery address/i }));
    await screen.findByRole('heading', { level: 2, name: 'Delivery address' });
    expect(screen.getByLabelText('Full name')).toHaveValue('Mona Adel');
    expect(screen.getByLabelText('Governorate')).toHaveValue('giza');
    await view.router.navigate(-1);
    await screen.findByRole('heading', { level: 2, name: 'Payment method' });
    expect(screen.getByLabelText('Wallet mobile number')).toHaveValue('0111');

    // The wallet number is incomplete: blocked. Switch to a test card instead.
    await user.click(await screen.findByRole('button', { name: 'Continue to review' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/egyptian mobile number/i);
    await fillPayment(user);
    await user.click(screen.getByRole('button', { name: 'Continue to review' }));

    // Review: lines, address, payment and the totals from the selectors.
    await screen.findByRole('heading', { level: 2, name: 'Review and place order' });
    expect(screen.getByRole('rowheader', { name: 'Nova Laptops 1' })).toBeInTheDocument();
    expect(screen.getByText('Visa test card ending 4242')).toBeInTheDocument();
    const place = screen.getByRole('button', { name: /place order, egp\s?65,998\.00/i });

    // A double click places ONE order.
    await user.dblClick(place);
    await screen.findByRole('heading', { level: 1, name: 'Thank you, your order is placed' });
    expect(apiState.placed).toHaveLength(1);
    expect(apiState.placed[0]).toMatchObject({
      items: [{ productId: 'p-001', qty: 2 }],
      shipping: { fullName: 'Mona Adel', phone: '01012345678', city: 'Dokki', governorate: 'giza' },
      payment: { method: 'card' },
    });
    expect(typeof (apiState.placed[0] as { idempotencyKey?: unknown }).idempotencyKey).toBe(
      'string',
    );

    // Confirmation route with the API's order number; the cart and the draft are cleared.
    expect(view.router.state.location.pathname).toBe('/checkout/confirmation/TS-1001');
    expect(screen.getByTestId('order-number')).toHaveTextContent('TS-1001');
    expect(screen.getByRole('link', { name: 'Cart, 0 items' })).toBeInTheDocument();
    expect(window.sessionStorage.getItem(DRAFT_KEY)).toBeNull();

    // A refresh of the confirmation shows the same order.
    view.unmount();
    view = renderApp('/checkout/confirmation/TS-1001');
    expect(await screen.findByTestId('order-number')).toHaveTextContent('TS-1001');
    expect(screen.getByText(/EGP\s?65,998\.00/)).toBeInTheDocument();

    // Going back into the checkout cannot place it again: the cart is empty and the order is linked.
    await view.router.navigate('/checkout/review');
    expect(await screen.findByRole('link', { name: 'order TS-1001' })).toBeInTheDocument();
    expect(apiState.placed).toHaveLength(1);
  });

  it('ignores a second click while the order is being placed, and retries with the same key', async () => {
    signInForTest();
    storeCart([cartLine()]);
    const keys: string[] = [];
    let calls = 0;
    server.use(
      http.post(api('/orders'), async ({ request }) => {
        calls += 1;
        keys.push(((await request.json()) as { idempotencyKey: string }).idempotencyKey);
        await delay(50);
        if (calls === 1) return HttpResponse.error(); // outcome unknown for the client
        return HttpResponse.json(
          { id: 'o-200', number: 'TS-2000', status: 'processing' },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    renderApp('/checkout/address');
    await fillAddress(user);
    await user.click(screen.getByRole('button', { name: 'Continue to payment' }));
    await fillPayment(user);
    await user.click(screen.getByRole('button', { name: 'Continue to review' }));

    const place = await screen.findByRole('button', { name: /place order/i });
    await user.click(place);
    await user.click(place); // busy: ignored
    await user.keyboard('{Enter}'); // focus is on the busy button: ignored
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not reach the store/i);
    expect(calls).toBe(1);

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByTestId('order-number')).toHaveTextContent('TS-2000');
    expect(calls).toBe(2);
    expect(keys[1]).toBe(keys[0]);
  });
});
