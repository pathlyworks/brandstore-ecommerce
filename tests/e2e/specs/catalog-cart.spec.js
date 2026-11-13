/**
 * End-to-end test 1: a shopper filters the catalog and adds a product to the cart.
 * Real browser, real pages, real TechSphere API (see playwright.config.mjs).
 */
import { expect, test } from '@playwright/test';
import { resetApi } from './env.js';

test.beforeEach(async ({ request }) => resetApi(request));

test('filter the catalog by category and add a product to the cart', async ({ page }) => {
  await page.goto('/catalog.html');
  const results = page.getByRole('region', { name: 'Products' });
  await expect(page.getByText('Showing 1–8 of 24 products')).toBeVisible();

  // Filter: only Audio products, and the filter is in the URL (shareable, survives reload).
  await page.getByRole('radio', { name: /^Audio/ }).check();
  await expect(page).toHaveURL(/[?&]category=audio(&|$)/);
  await expect(page.getByText('Showing 1–6 of 6 products')).toBeVisible();
  const products = results.getByRole('link');
  await expect(products).toHaveCount(6);
  // A web-first assertion, not allTextContents(): in Playwright's Firefox, allTextContents() on a role
  // locator crashes the page process (isolated in CI on PR #3; evaluateAll and CSS locators are fine).
  await expect(products).toHaveText(Array(6).fill(/Audio/));

  // Open the first product and add it to the cart.
  await products.first().click();
  await expect(page.getByRole('heading', { level: 1, name: 'Orbit Audio 3' })).toBeVisible();
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page.getByText('Added 1 × Orbit Audio 3 to your cart.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Cart, 1 item' })).toBeVisible();

  // The cart page shows the line and the right total, and keeps it after a reload.
  await page.getByRole('link', { name: 'View cart' }).click();
  await expect(page).toHaveURL(/\/cart\.html$/);
  const lines = page.getByRole('region', { name: 'Items in your cart' });
  const total = page
    .getByRole('complementary', { name: 'Order summary' })
    .locator('dt', { hasText: /^Total$/ })
    .locator('xpath=following-sibling::dd[1]');
  for (let visit = 0; visit < 2; visit += 1) {
    await expect(lines.getByRole('link', { name: 'Orbit Audio 3' })).toBeVisible();
    await expect(total).toHaveText('EGP 2,499.00');
    await page.reload();
  }
});
