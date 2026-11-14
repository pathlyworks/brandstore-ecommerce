/** Catalog filters in the URL, product page, cart in localStorage, and emptying it through the dialog. */
import { expect, test } from '@playwright/test';

test('filter, add to cart, keep it across a reload, then empty it', async ({ page }) => {
  await page.goto('/products');
  const products = page.getByRole('list', { name: 'Products' });
  await expect(products.getByRole('listitem')).toHaveCount(8);

  await page.getByLabel('Category').selectOption('audio');
  await expect(page).toHaveURL(/category=audio/);
  await expect(products.getByRole('heading').first()).toHaveText(/audio/i);

  await page.getByLabel('Search').fill('zzzz-nothing');
  await expect(
    page.getByRole('heading', { name: 'No products match these filters' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Clear the filters' }).click();
  await expect(page).toHaveURL(/\/products$/);

  await page.goto('/products/p-001');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nova Laptops 1');
  await page.getByLabel('Quantity').fill('2');
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page.getByRole('link', { name: 'Cart, 2 items' })).toBeVisible();

  await page.reload();
  await page.getByRole('link', { name: 'Cart, 2 items' }).click();
  await expect(page.getByRole('rowheader', { name: 'Nova Laptops 1' })).toBeVisible();

  await page.getByRole('button', { name: 'Empty the cart' }).click();
  const dialog = page.getByRole('dialog', { name: 'Empty the cart?' });
  await expect(dialog.getByRole('button', { name: 'Keep the items' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Empty the cart' }).click();
  await expect(page.getByRole('heading', { name: 'Your cart is empty' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Cart, 0 items' })).toBeVisible();
});

test('an unknown product says so inside the page', async ({ page }) => {
  await page.goto('/products/p-999');
  await expect(page.getByRole('heading', { name: 'Product not found' })).toBeVisible();
});
