/**
 * The routing map end to end in jsdom: the layout route around every page, nested account routes, the 404,
 * and the loading, empty and error states of the data routes (MSW serves the captured API responses).
 */
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { api, server } from '../test/server';
import { renderApp } from '../test/render';
import { SHOPPER } from '../test/fixtures';

describe('layout route', () => {
  it('wraps every page in the navbar and the footer', async () => {
    renderApp('/compare');
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Compare products' }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', {
        name: 'Compare',
      }),
    ).toHaveAttribute('aria-current', 'page');
  });

  it('renders the 404 route for an unknown URL, inside the layout', async () => {
    renderApp('/no/such/page');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });
});

describe('/products', () => {
  it('shows a skeleton, then 8 products with stable keys', async () => {
    renderApp('/products');
    expect(screen.getByRole('status')).toHaveTextContent(/loading products/i);
    const list = await screen.findByRole('list', { name: 'Products' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(8);
    expect(screen.getByRole('status')).toHaveTextContent('24 products');
  });

  it('filters with a controlled form whose values live in the URL', async () => {
    const { router } = renderApp('/products');
    await screen.findByRole('list', { name: 'Products' });
    await userEvent.selectOptions(screen.getByLabelText('Category'), 'Audio');
    await waitFor(() => expect(router.state.location.search).toBe('?category=audio'));
    const list = await screen.findByRole('list', { name: 'Products' });
    await waitFor(() =>
      within(list)
        .getAllByRole('heading')
        .forEach((heading) => expect(heading).toHaveTextContent(/audio/i)),
    );
    expect(screen.getByLabelText('Category')).toHaveValue('audio');
  });

  it('debounces the search box into the URL and shows the empty state', async () => {
    const { router } = renderApp('/products');
    await screen.findByRole('list', { name: 'Products' });
    await userEvent.type(screen.getByLabelText('Search'), 'zzzz');
    await waitFor(() => expect(router.state.location.search).toBe('?search=zzzz'));
    expect(
      await screen.findByRole('heading', { name: 'No products match these filters' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Clear the filters' }));
    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(screen.getByLabelText('Search')).toHaveValue('');
  });

  it('shows the error state with a retry that works', async () => {
    server.use(
      http.get(
        api('/products'),
        () =>
          HttpResponse.json(
            { error: 'Forced failure' },
            { status: 429, headers: { 'Retry-After': '2' } },
          ),
        { once: true },
      ),
    );
    renderApp('/products');
    expect(await screen.findByRole('alert')).toHaveTextContent(/too many requests/i);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('list', { name: 'Products' })).toBeInTheDocument();
  });
});

describe('/products/:id', () => {
  it('adds the chosen quantity to the cart (header badge updates)', async () => {
    renderApp('/products/p-001');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Nova Laptops 1' }),
    ).toBeInTheDocument();
    const quantity = screen.getByLabelText('Quantity');
    await userEvent.clear(quantity);
    await userEvent.type(quantity, '2');
    await userEvent.click(screen.getByRole('button', { name: 'Add to cart' }));
    expect(screen.getByRole('link', { name: 'Cart, 2 items' })).toBeInTheDocument();
  });

  it('validates the quantity', async () => {
    renderApp('/products/p-001');
    const quantity = await screen.findByLabelText('Quantity');
    await userEvent.clear(quantity);
    await userEvent.type(quantity, '0');
    expect(quantity).toHaveAccessibleDescription(/at least 1/i);
    expect(screen.getByRole('button', { name: 'Add to cart' })).toBeDisabled();
  });

  it('says "not found" for an id the API does not have', async () => {
    renderApp('/products/p-999');
    expect(await screen.findByRole('heading', { name: 'Product not found' })).toBeInTheDocument();
  });
});

describe('/cart', () => {
  it('is empty, then lists what was added, and empties after confirming', async () => {
    renderApp('/products/p-001');
    await userEvent.click(await screen.findByRole('button', { name: 'Add to cart' }));
    await userEvent.click(screen.getByRole('link', { name: 'Cart, 1 item' }));
    expect(await screen.findByRole('rowheader', { name: 'Nova Laptops 1' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Empty the cart' }));
    const dialog = screen.getByRole('dialog', { name: 'Empty the cart?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Empty the cart' }));
    expect(screen.getByRole('heading', { name: 'Your cart is empty' })).toBeInTheDocument();
  });
});

describe('/login and the nested /account routes', () => {
  it('sends a signed-out shopper from /account to /login and back after signing in', async () => {
    const { router } = renderApp('/account');
    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('?next=%2Faccount%2Forders');

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(/enter your email/i);

    await userEvent.type(screen.getByLabelText('Email'), SHOPPER.email);
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/email or password is not right/i);

    await userEvent.type(screen.getByLabelText('Password'), SHOPPER.password);
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('table', { name: 'Your orders' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/account/orders');
    await waitFor(() => expect(screen.getAllByRole('rowheader')).toHaveLength(5));
    const sections = screen.getByRole('navigation', { name: 'Account sections' });
    expect(within(sections).getByRole('link', { name: 'Orders' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Older orders' }));
    await waitFor(() => expect(screen.getAllByRole('rowheader')).toHaveLength(4));
  });
});
