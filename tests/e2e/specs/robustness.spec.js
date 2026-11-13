/**
 * End-to-end evidence for the Task 6 edge-case sweep, in a real browser against the TechSphere API.
 * Failures the kit's data does not contain on its own (a 429, null specs) are produced with
 * page.route, so these tests need no grader-only controls and also run against an API given in
 * VITE_API_BASE. Test names start with "edge N" to match the sweep table in task_6_handoff.md.
 */
import { expect, test } from '@playwright/test';
import { API_URL, resetApi } from './env.js';

const PLACEHOLDER = '/assets/product-placeholder.svg';

test.beforeEach(async ({ request }) => resetApi(request));

test('edge 1: a product whose image is missing (API 404) shows the placeholder, not a broken image', async ({
  page,
}) => {
  await page.goto('/product.html?id=p-010');
  const image = page.getByRole('img', { name: 'Pulse Phones 10' }).first();
  await expect(image).toHaveAttribute('src', PLACEHOLDER);
  await expect(image).toHaveJSProperty('complete', true);
  expect(await image.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0);
});

test('edge 2: null specification fields are left out, never shown as "null"', async ({ page }) => {
  await page.route(`${API_URL}/products/p-002`, async (route) => {
    const response = await route.fetch();
    const product = await response.json();
    await route.fulfill({
      response,
      json: { ...product, specs: { warranty: null, weight: null } },
    });
  });
  await page.goto('/product.html?id=p-002');
  await expect(page.getByText('No specifications are listed for this product.')).toBeVisible();
  await expect(page.getByRole('main')).not.toContainText('null');
});

test('edge 3: a 429 on the catalog explains itself, and "Try again" recovers', async ({ page }) => {
  let limited = true;
  await page.route(`${API_URL}/products?**`, (route) =>
    limited
      ? route.fulfill({ status: 429, json: { error: 'Too many requests' } })
      : route.fallback(),
  );
  await page.route(`${API_URL}/products`, (route) =>
    limited
      ? route.fulfill({ status: 429, json: { error: 'Too many requests' } })
      : route.fallback(),
  );
  await page.goto('/catalog.html');
  const results = page.getByRole('region', { name: 'Products' });
  const alert = results.getByRole('alert');
  await expect(alert.getByRole('heading', { name: 'Too many requests' })).toBeVisible();
  await expect(alert).toContainText('Wait a moment, then try again.');
  limited = false;
  await alert.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText('Showing 1–8 of 24 products')).toBeVisible();
});

test('edge 4: "Place order" on an empty cart explains itself and sends no request', async ({
  page,
}) => {
  const orders = [];
  page.on('request', (r) => r.url().endsWith('/orders') && orders.push(r.method()));
  await page.goto('/cart.html');
  await expect(page.getByText('Your cart is empty.')).toBeVisible();
  const placeOrder = page.getByRole('button', { name: 'Place order' });
  await expect(placeOrder).toHaveAttribute('aria-disabled', 'true');
  await placeOrder.focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('status').filter({ hasText: 'Your cart is empty. Add a product' }),
  ).toHaveText('Your cart is empty. Add a product before you check out.');
  expect(orders).toEqual([]);
});

test('edge 5: a page past the end (?page=9, the API pages by 8) moves to the last page', async ({
  page,
}) => {
  await page.goto('/catalog.html?page=9');
  await expect(page.getByText('Showing 17–24 of 24 products')).toBeVisible();
  await expect(page).toHaveURL(/[?&]page=3(&|$)/);
  await expect(page.getByRole('region', { name: 'Products' }).getByRole('link')).toHaveCount(8);
});
