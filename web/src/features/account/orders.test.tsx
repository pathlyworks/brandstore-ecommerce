/** Order history from GET /account/orders with the PATCH cancel action behind a confirmation dialog. */
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/render';
import { api, apiState, server } from '../../test/server';
import { signInForTest } from '../../test/session';

const row = (id: string) =>
  screen.getByRole('rowheader', { name: id }).closest('tr') as HTMLElement;

describe('order history', () => {
  it('cancels a processing order after confirming, and only processing orders offer it', async () => {
    signInForTest();
    const user = userEvent.setup();
    renderApp('/account/orders');
    await screen.findByRole('rowheader', { name: 'o-001' });
    expect(within(row('o-002')).queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument(); // shipped

    await user.click(within(row('o-001')).getByRole('button', { name: 'Cancel order o-001' }));
    const dialog = screen.getByRole('dialog', { name: 'Cancel order o-001?' });
    await user.click(within(dialog).getByRole('button', { name: 'Keep the order' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(apiState.orders[0]?.status).toBe('processing');

    await user.click(within(row('o-001')).getByRole('button', { name: 'Cancel order o-001' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel the order' }),
    );
    await waitFor(() => expect(within(row('o-001')).getByText('cancelled')).toBeInTheDocument());
    expect(within(row('o-001')).queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Order o-001 is cancelled.');
    expect(apiState.orders[0]?.status).toBe('cancelled');
  });

  it('explains a 409 (shipped meanwhile) and reloads the list', async () => {
    signInForTest();
    const user = userEvent.setup();
    renderApp('/account/orders');
    await screen.findByRole('rowheader', { name: 'o-005' });
    server.use(
      http.patch(api('/account/orders/:id/cancel'), () => {
        const order = apiState.orders.find((o) => o.id === 'o-005');
        if (order) order.status = 'shipped';
        return HttpResponse.json({ error: 'Order is shipped' }, { status: 409 });
      }),
    );
    await user.click(within(row('o-005')).getByRole('button', { name: 'Cancel order o-005' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel the order' }),
    );
    expect(
      await screen.findByText(/could not be cancelled: order is shipped/i),
    ).toBeInTheDocument();
    await waitFor(() => expect(within(row('o-005')).getByText('shipped')).toBeInTheDocument());
  });

  it('keeps the dialog open with the message when the request fails', async () => {
    signInForTest();
    const user = userEvent.setup();
    renderApp('/account/orders');
    await screen.findByRole('rowheader', { name: 'o-001' });
    server.use(
      http.patch(api('/account/orders/:id/cancel'), () =>
        HttpResponse.json({ error: 'Down' }, { status: 503 }),
      ),
    );
    await user.click(within(row('o-001')).getByRole('button', { name: 'Cancel order o-001' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel the order' }),
    );
    expect(
      await within(screen.getByRole('dialog')).findByText(/try again in a moment/i),
    ).toBeInTheDocument();
  });
});
