/**
 * Task 6: each checkout step's validation on its own, through the screen as a shopper meets it (labels, roles,
 * the error summary), with MSW answering the API. checkout.test.tsx keeps the journey across the steps.
 */
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/render';
import { api, apiState, server } from '../../test/server';
import { cartLine, signInForTest, storeCart } from '../../test/session';
import { DRAFT_KEY } from '../../state/checkout.storage';

function startAt(path: string, draft?: object) {
  signInForTest();
  storeCart([cartLine({ quantity: 1 })]);
  if (draft) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  return renderApp(path);
}

const ADDRESS = {
  fullName: 'Mona Adel',
  phone: '01012345678',
  street: '12 Tahrir Street',
  city: 'Dokki',
  governorate: 'giza',
  postalCode: '',
};

async function draftFor(step: 'payment' | 'review') {
  // The draft the app itself writes, after a real address step (so the test follows the stored format).
  const user = userEvent.setup();
  const view = startAt('/checkout/address');
  await user.type(await screen.findByLabelText('Full name'), ADDRESS.fullName);
  await user.type(screen.getByLabelText('Mobile number'), ADDRESS.phone);
  await user.type(screen.getByLabelText('Street and building'), ADDRESS.street);
  await user.type(screen.getByLabelText('City or district'), ADDRESS.city);
  await user.selectOptions(screen.getByLabelText('Governorate'), ADDRESS.governorate);
  await user.click(screen.getByRole('button', { name: 'Continue to payment' }));
  await screen.findByRole('heading', { level: 2, name: 'Payment method' });
  if (step === 'review') {
    await user.click(screen.getByRole('radio', { name: /^test card/i }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Test card' }), 'visa-4242');
    await user.type(screen.getByLabelText('Name on card'), 'Mona Adel');
    await user.click(screen.getByRole('button', { name: 'Continue to review' }));
    await screen.findByRole('heading', { level: 2, name: 'Review and place order' });
  }
  const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? '{}') as object;
  view.unmount();
  return draft;
}

describe('step 1, delivery address', () => {
  it('an empty form lists every problem, focuses the summary and marks each field', async () => {
    const user = userEvent.setup();
    const view = startAt('/checkout/address');
    await user.click(await screen.findByRole('button', { name: 'Continue to payment' }));
    const summary = await screen.findByRole('alert');
    expect(summary).toHaveFocus();
    expect(summary).toHaveTextContent('Fix 5 problems to continue');
    for (const label of [
      'Full name',
      'Mobile number',
      'Street and building',
      'City or district',
      'Governorate',
    ]) {
      expect(screen.getByLabelText(label)).toHaveAttribute('aria-invalid', 'true');
    }
    expect(screen.getByLabelText('Full name')).toHaveAccessibleDescription(
      /full name of the person/i,
    );
    expect(view.router.state.location.pathname).toBe('/checkout/address');
  });

  it('explains wrong values: one-word name, foreign mobile number, short street, 4-digit postal code', async () => {
    const user = userEvent.setup();
    startAt('/checkout/address');
    await user.type(await screen.findByLabelText('Full name'), 'Mona');
    await user.type(screen.getByLabelText('Mobile number'), '+44 7700 900123');
    await user.type(screen.getByLabelText('Street and building'), '12');
    await user.type(screen.getByLabelText('Postal code (optional)'), '1234');
    await user.click(screen.getByRole('button', { name: 'Continue to payment' }));
    await screen.findByRole('alert');
    expect(screen.getByLabelText('Full name')).toHaveAccessibleDescription(
      /first and a last name/i,
    );
    expect(screen.getByLabelText('Mobile number')).toHaveAccessibleDescription(
      /egyptian mobile number/i,
    );
    expect(screen.getByLabelText('Street and building')).toHaveAccessibleDescription(
      /building number/i,
    );
    expect(screen.getByLabelText('Postal code (optional)')).toHaveAccessibleDescription(
      /5 digits/i,
    );
  });

  it('a valid address continues to payment', async () => {
    await draftFor('payment');
    expect(sessionStorage.getItem(DRAFT_KEY)).toContain('Mona Adel');
  });
});

describe('step 2, payment method', () => {
  it('nothing chosen: says to choose how to pay', async () => {
    const draft = await draftFor('payment');
    const user = userEvent.setup();
    startAt('/checkout/payment', draft);
    await user.click(await screen.findByRole('button', { name: 'Continue to review' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/choose how you will pay/i);
  });

  it('test card: needs a card and a name written in letters', async () => {
    const draft = await draftFor('payment');
    const user = userEvent.setup();
    startAt('/checkout/payment', draft);
    await user.click(await screen.findByRole('radio', { name: /^test card/i }));
    await user.type(screen.getByLabelText('Name on card'), 'M0na 4del');
    await user.click(screen.getByRole('button', { name: 'Continue to review' }));
    await screen.findByRole('alert');
    expect(screen.getByRole('combobox', { name: 'Test card' })).toHaveAccessibleDescription(
      /choose a test card/i,
    );
    expect(screen.getByLabelText('Name on card')).toHaveAccessibleDescription(/letters only/i);
  });

  it('mobile wallet: needs an Egyptian mobile number', async () => {
    const draft = await draftFor('payment');
    const user = userEvent.setup();
    startAt('/checkout/payment', draft);
    await user.click(await screen.findByRole('radio', { name: /^mobile wallet/i }));
    await user.type(screen.getByLabelText('Wallet mobile number'), '0111');
    await user.click(screen.getByRole('button', { name: 'Continue to review' }));
    await screen.findByRole('alert');
    expect(screen.getByLabelText('Wallet mobile number')).toHaveAccessibleDescription(
      /egyptian mobile number/i,
    );
  });
});

describe('step 3, review and place the order', () => {
  it('an API 500 at submit: the error is shown, nothing is lost, and "Try again" places one order', async () => {
    const draft = await draftFor('review');
    const before = apiState.placed.length;
    let failures = 1;
    server.use(
      http.post(api('/orders'), () => {
        if (failures-- > 0) return HttpResponse.json({ error: 'Internal error' }, { status: 500 });
        return undefined; // then the normal handler places the order
      }),
    );
    const user = userEvent.setup();
    const view = startAt('/checkout/review', draft);
    await user.click(await screen.findByRole('button', { name: /^place order/i }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(view.router.state.location.pathname).toBe('/checkout/review');
    expect(apiState.placed.length).toBe(before);
    expect(screen.getByText(/“Try again” is safe/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() =>
      expect(view.router.state.location.pathname).toMatch(/^\/checkout\/confirmation/),
    );
    expect(apiState.placed.length).toBe(before + 1);
  });
});
