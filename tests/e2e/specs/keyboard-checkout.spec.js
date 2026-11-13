/**
 * Keyboard and accessibility pass over the catalog and the cart, ending in the happy path: a keyboard-only
 * shopper filters, opens a product, adds it, changes the quantity (announced in the live region), signs
 * in and places the order. Real browser, TechSphere API.
 */
import { expect, test } from '@playwright/test';
import { ACCOUNT, resetApi } from './env.js';

test.beforeEach(async ({ request }) => resetApi(request));

/**
 * The accessible names of the controls reached by pressing Tab from the top of the page.
 * @param {import('@playwright/test').Page} page
 * @param {number} presses
 */
async function tabOrder(page, presses) {
  const names = [];
  for (let i = 0; i < presses; i += 1) {
    await page.keyboard.press('Tab');
    names.push(
      await page.evaluate(() => {
        const el = document.activeElement;
        const label =
          el?.labels?.[0]?.textContent || el?.getAttribute('aria-label') || el?.textContent;
        return `${el?.tagName.toLowerCase()}:${(label || '').replace(/\s+/g, ' ').trim()}`;
      }),
    );
  }
  return names;
}

test('keyboard: the skip link, filters, products and cart controls are all in the tab order', async ({
  page,
  browserName,
}) => {
  test.skip(browserName === 'webkit', 'WebKit skips links on Tab unless the OS setting is on');
  await page.goto('/catalog.html');
  await expect(page.getByText('Showing 1–8 of 24 products')).toBeVisible();
  const catalog = await tabOrder(page, 30);
  expect(catalog[0]).toBe('a:Skip to main content');
  for (const control of [
    'input:Search products',
    'select:Sort by',
    'a:Nova Laptops 1',
    'button:Next page',
  ]) {
    expect(catalog).toContain(control);
  }
  // Each radio group (category, brand) is one tab stop; the arrow keys move inside it.
  expect(catalog.filter((n) => n === 'input:All(24)').length).toBe(2);
  await page.getByRole('radio', { name: /^All/ }).first().focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('radio', { name: /^Audio/ })).toBeChecked();
  await expect(page).toHaveURL(/[?&]category=audio(&|$)/);
  // The counts are re-rendered after the new results; focus must stay on the radio, not fall to <body>.
  await expect(page.getByText('Showing 1–6 of 6 products')).toBeVisible();
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('radio', { name: /^Audio/ })).toBeFocused();
});

test('keyboard only: filter, add to cart, change quantity (announced), sign in and place the order', async ({
  page,
}) => {
  await page.goto('/catalog.html');
  await expect(page.getByText('Showing 1–8 of 24 products')).toBeVisible();

  // Filter with the keyboard: focus the radio group and choose "Audio" with the arrow keys / Space.
  await page.getByRole('radio', { name: /^Audio/ }).focus();
  await page.keyboard.press('Space');
  await expect(page.getByText('Showing 1–6 of 6 products')).toBeVisible();

  // Open the first product with Enter, add it with Enter.
  await page.getByRole('region', { name: 'Products' }).getByRole('link').first().focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Orbit Audio 3' })).toBeVisible();
  await page.getByRole('button', { name: 'Add to cart' }).focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('status').filter({ hasText: 'Added 1 × Orbit Audio 3' }),
  ).toBeVisible();

  // Cart: increase the quantity from the keyboard; the live region announces it with the total.
  await page.goto('/cart.html');
  await page.getByRole('button', { name: 'Increase quantity of Orbit Audio 3' }).focus();
  await page.keyboard.press('Enter');
  const live = page.locator('#cart-message');
  await expect(live).toHaveAttribute('role', 'status');
  await expect(live).toHaveText(
    /^Quantity of Orbit Audio 3 is now 2\. Cart total: EGP\s4,998\.00 for 2 items\.$/,
  );
  // Focus stays on the button that was pressed, after the re-render.
  await expect(
    page.getByRole('button', { name: 'Increase quantity of Orbit Audio 3' }),
  ).toBeFocused();

  // Place order while signed out: sign in first, then back to the cart.
  await page.getByRole('button', { name: 'Place order' }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/login\.html$/);
  await expect(
    page.getByText('Please sign in to place your order. Your cart is kept.'),
  ).toBeVisible();
  await page.getByRole('textbox', { name: 'Email' }).focus();
  await page.keyboard.type(ACCOUNT.email);
  await page.keyboard.press('Tab');
  await page.keyboard.type(ACCOUNT.password);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/cart\.html$/);

  await page.getByRole('button', { name: 'Place order' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status').filter({ hasText: 'Thank you!' })).toHaveText(
    /^Thank you! Order TS-\d+ is placed and is processing\. You can follow it on your account page\.$/,
  );
  await expect(page.getByText('Your cart is empty.')).toBeVisible();
});
