/**
 * End-to-end test 2: sign in, first with a wrong password, then view the order history.
 * Real browser, real pages, real TechSphere API (see playwright.config.mjs).
 */
import { expect, test } from '@playwright/test';
import { ACCOUNT, resetApi } from './env.js';

test.beforeEach(async ({ request }) => resetApi(request));

test('sign in (wrong password first) and view the orders', async ({ page }) => {
  // The account page needs a session: it sends a signed-out visitor to sign in.
  await page.goto('/account.html');
  await expect(page).toHaveURL(/\/login\.html$/);
  await expect(page.getByText('Please sign in to see your account.')).toBeVisible();

  const email = page.getByRole('textbox', { name: 'Email' });
  const password = page.getByLabel('Password', { exact: true });
  const signIn = page.getByRole('button', { name: 'Sign in' });

  // Wrong password: one clear message, still on the sign-in page, not signed in.
  await email.fill(ACCOUNT.email);
  await password.fill('not-the-password');
  await signIn.click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'The email or password is incorrect' }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/login\.html$/);
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();

  // Right password: the account page with the first page of orders.
  await password.fill(ACCOUNT.password);
  await signIn.click();
  await expect(page).toHaveURL(/\/account\.html$/);
  await expect(page.getByText(`Signed in as ${ACCOUNT.name} (${ACCOUNT.email}).`)).toBeVisible();
  const orders = page.getByRole('region', { name: 'Your orders' });
  const orderIds = orders.getByText(/^Order o-\d+$/);
  await expect(orderIds).toHaveText([
    'Order o-001',
    'Order o-002',
    'Order o-003',
    'Order o-004',
    'Order o-005',
  ]);
  await expect(orders.getByText('Placed 1 Aug 2026').first()).toBeVisible();
  await expect(orders.getByText('EGP 2,499.00')).toBeVisible();

  // Next page: the remaining four orders.
  await page
    .getByRole('navigation', { name: 'Order pages' })
    .getByRole('button', { name: /Next/ })
    .click();
  await expect(orderIds).toHaveText(['Order o-006', 'Order o-007', 'Order o-008', 'Order o-009']);
});
