/**
 * /admin against the MSW mock (which computes the summary like the API kit): the KPI cards, the category
 * table, the monthly table, the paged orders table, and the wording (sales, never profit or margin).
 */
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/render';
import { api, server } from '../../test/server';
import { signInForTest } from '../../test/session';

const kpi = async (label: string) => {
  const term = await screen.findByText(label, { selector: 'dt' });
  return term.nextElementSibling as HTMLElement;
};

describe('/admin dashboard', () => {
  it('shows sales, orders, average order value and stock from the API', async () => {
    signInForTest({ role: 'admin' });
    renderApp('/admin');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Store dashboard' }),
    ).toBeInTheDocument();
    await waitFor(async () => expect(await kpi('Sales')).toHaveTextContent('EGP 20,093.00'));
    expect(await kpi('Orders')).toHaveTextContent('9');
    await waitFor(async () =>
      expect(await kpi('Average order value')).toHaveTextContent('EGP 2,870.43'),
    );
    expect(await kpi('Out of stock')).toHaveTextContent('5');
    expect(document.body).not.toHaveTextContent(/profit|margin/i);
  });

  it('lists the categories by sales and adds them up to the summary', async () => {
    signInForTest({ role: 'admin' });
    renderApp('/admin');
    const table = await screen.findByRole('table', { name: 'Sales, orders and stock by category' });
    await waitFor(() => expect(within(table).getAllByRole('row')).toHaveLength(6)); // header, 4, total
    const rows = within(table).getAllByRole('row');
    expect(rows[1]).toHaveTextContent(/^Laptops.*EGP 8,697\.00/);
    expect(rows[5]).toHaveTextContent(/All categories\s*24\s*5\s*7\s*7\s*EGP 20,093\.00/);
    expect(
      screen.getByText(/Category and month figures add up to the summary's sales/),
    ).toBeInTheDocument();
  });

  it('shows the month table and the orders five at a time', async () => {
    const user = userEvent.setup();
    signInForTest({ role: 'admin' });
    renderApp('/admin');
    const months = await screen.findByRole('table', { name: 'Sales and orders per month' });
    await waitFor(() => expect(within(months).getByText('Aug 2026')).toBeInTheDocument());
    const orders = screen.getByRole('table', { name: 'Every order, cancelled ones included' });
    await waitFor(() => expect(within(orders).getAllByRole('row')).toHaveLength(6));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(within(orders).getAllByRole('row')).toHaveLength(5);
  });

  it('keeps the totals when the orders cannot be loaded, and offers a retry', async () => {
    server.use(
      http.get(api('/account/orders'), () => HttpResponse.json({ error: 'Boom' }, { status: 500 })),
    );
    signInForTest({ role: 'admin' });
    renderApp('/admin');
    await waitFor(async () => expect(await kpi('Sales')).toHaveTextContent('EGP 20,093.00'));
    expect(
      await screen.findByText('Categories, months and orders could not be loaded.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
