/** Sign-in form (controlled, 401 message), the guarded nested /account routes and the orders table. */
import { expect, test } from '@playwright/test';

const ACCOUNT = { email: 'student@techsphere.test', password: 'Passw0rd!' };

test('sign in, see the orders, page through them, sign out', async ({ page }) => {
  await page.goto('/account/orders');
  await expect(page).toHaveURL(/\/login\?next=/);

  await page.getByLabel('Email').fill(ACCOUNT.email);
  await page.getByLabel('Password').fill('wrong-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toHaveText(/email or password is not right/i);

  await page.getByLabel('Password').fill(ACCOUNT.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/account\/orders$/);
  const table = page.getByRole('table', { name: 'Your orders' });
  await expect(table.getByRole('rowheader')).toHaveCount(5);

  await page.getByRole('button', { name: 'Older orders' }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(table.getByRole('rowheader').first()).toBeVisible();

  await page
    .getByRole('navigation', { name: 'Account sections' })
    .getByRole('link', { name: 'Addresses' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Your addresses' })).toBeVisible();

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login/);
});
