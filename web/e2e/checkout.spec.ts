/**
 * Cart → multi-step checkout → POST /orders → confirmation, against the TechSphere API, with a reload and
 * browser Back at every step; then the order history's cancel action (PATCH) with its confirmation.
 */
import { expect, test } from '@playwright/test';
import { resetApi, signIn } from './support';

test.beforeEach(async ({ request }) => resetApi(request));
test.afterAll(async ({ request }) => resetApi(request));

test('checkout survives reloads and Back at every step and places exactly one order', async ({
  page,
}) => {
  await signIn(page, '/products/p-003');
  await page.getByLabel('Quantity').fill('2');
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await page.getByRole('link', { name: 'Cart, 2 items' }).click();
  await page.getByRole('link', { name: 'Go to checkout' }).click();

  // Step 1: blocked when empty; filled; survives a reload.
  await expect(page).toHaveURL(/\/checkout\/address$/);
  await page.getByRole('button', { name: 'Continue to payment' }).click();
  await expect(page.getByRole('alert')).toBeFocused();
  await expect(page).toHaveURL(/\/checkout\/address$/);
  await page.getByLabel('Full name').fill('Mona Adel');
  await page.getByLabel('Mobile number').fill('010 1234 5678');
  await page.getByRole('radio', { name: /90th Street, Cairo/ }).check(); // a saved address from the API
  await expect(page.getByLabel('Street and building')).toHaveValue('90th Street');
  await page.getByLabel('Governorate').selectOption('cairo');
  await page.reload();
  await expect(page.getByLabel('Full name')).toHaveValue('Mona Adel');
  await expect(page.getByLabel('City or district')).toHaveValue('Cairo');
  await page.getByRole('button', { name: 'Continue to payment' }).click();

  // Step 2: Back returns to step 1 with its input; Forward and a reload keep step 2's input.
  await expect(page).toHaveURL(/\/checkout\/payment$/);
  await page.getByRole('radio', { name: /^Cash on delivery/ }).check();
  await page.goBack();
  await expect(page).toHaveURL(/\/checkout\/address$/);
  await expect(page.getByLabel('Mobile number')).toHaveValue('010 1234 5678');
  await page.goForward();
  await page.reload();
  await expect(page.getByRole('radio', { name: /^Cash on delivery/ })).toBeChecked();
  await page.getByRole('button', { name: 'Continue to review' }).click();

  // Step 3: reload keeps everything; a double click places one order.
  await expect(page).toHaveURL(/\/checkout\/review$/);
  await page.reload();
  await expect(page.getByText('Cash on delivery')).toBeVisible();
  const orders: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && new URL(r.url()).pathname === '/orders') orders.push(r.url());
  });
  await page.getByRole('button', { name: /^Place order/ }).dblclick();

  await expect(page).toHaveURL(/\/checkout\/confirmation\/TS-\d+$/);
  await expect(page.getByTestId('order-number')).toHaveText(/^TS-\d+$/);
  expect(orders).toHaveLength(1);
  await expect(page.getByRole('link', { name: 'Cart, 0 items' })).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('order-number')).toHaveText(/^TS-\d+$/);

  // Back into the checkout: nothing to submit again.
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'There is nothing to check out' })).toBeVisible();
  expect(orders).toHaveLength(1);
});

test('cancel a processing order from the order history', async ({ page }) => {
  await signIn(page);
  const table = page.getByRole('table', { name: 'Your orders' });
  const cancel = table.getByRole('button', { name: /^Cancel order / }).first();
  const label = (await cancel.getAttribute('aria-label')) ?? '';
  const id = label.replace('Cancel order ', '');
  await cancel.click();
  const dialog = page.getByRole('dialog', { name: `Cancel order ${id}?` });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel the order' }).click();
  await expect(page.getByText(`Order ${id} is cancelled.`)).toBeVisible();
  const row = table
    .getByRole('row')
    .filter({ has: page.getByRole('rowheader', { name: id, exact: true }) });
  await expect(row.getByText('cancelled')).toBeVisible();
  await page.reload();
  await expect(row.getByText('cancelled')).toBeVisible(); // the API kept it
});
