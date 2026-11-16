/**
 * Advanced Task 5 in a real browser against the TechSphere API: the dashboard's numbers against a reference
 * calculation made here from the API's own responses, sales never called profit, the Search dialog's focus
 * trap and focus return, the toast live region, and a visited page opening offline (service worker).
 */
import { expect, test } from '@playwright/test';
import { ADMIN, API_URL, resetApi, signIn } from './support';

test.beforeEach(async ({ request }) => resetApi(request));

test('dashboard numbers match a reference calculation from the API', async ({ page, request }) => {
  const login = await request.post(`${API_URL}/auth/login`, { data: ADMIN });
  const { token } = (await login.json()) as { token: string };
  const orders = (await (
    await request.get(`${API_URL}/account/orders?offset=0&limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  ).json()) as { items: { total: number; status: string }[] };
  const counted = orders.items.filter((o) => o.status !== 'cancelled');
  const sales = counted.reduce((sum, o) => sum + o.total, 0);
  const egp = (n: number) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EGP' }).format(n);

  await signIn(page, '/admin', ADMIN);
  const card = (label: string) =>
    page.locator('dt', { hasText: label }).locator('xpath=following-sibling::dd[1]');
  await expect(card('Sales')).toHaveText(egp(sales));
  await expect(card('Orders')).toHaveText(String(orders.items.length));
  await expect(card('Average order value')).toHaveText(
    egp(Math.round((sales / counted.length) * 100) / 100),
  );
  const categories = page.getByRole('table', { name: 'Sales, orders and stock by category' });
  await expect(categories.getByRole('row').last()).toContainText(egp(sales));
  await expect(page.locator('body')).not.toContainText(/profit|margin/i);
});

test('the Search dialog traps focus and gives it back on Escape', async ({ page }) => {
  await page.goto('/products');
  const trigger = page.getByRole('button', { name: 'Search' });
  await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Search products' });
  await expect(dialog.getByLabel('Product name')).toBeFocused();
  for (let i = 0; i < 6; i += 1) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role=dialog]'))).toBe(
      true,
    );
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('adding to the cart is announced in the live region', async ({ page }) => {
  await page.goto('/products/p-003');
  const live = page.locator('[aria-live="polite"]');
  await expect(live).toBeEmpty();
  await page.getByRole('button', { name: /add to cart/i }).click();
  await expect(live).toContainText(/Added 1 × .+ to the cart\./);
});

test.describe('offline', () => {
  test.use({ serviceWorkers: 'allow' });

  test('a visited product page opens offline, with a banner', async ({ page, context }) => {
    await page.goto('/products/p-001');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.waitForFunction(
      async () => (await navigator.serviceWorker.getRegistrations()).length > 0,
    );
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/You are offline/)).toBeVisible();
    await context.setOffline(false);
  });
});
