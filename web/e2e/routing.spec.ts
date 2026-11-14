/**
 * The React app (web/) in a real browser against the TechSphere API: the layout route, nested routes, the 404
 * route and the browser history. Started by the root playwright.config.mjs (project "web-chromium").
 */
import { expect, test } from '@playwright/test';

test('the layout route frames every page and the 404 route catches unknown URLs', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/tech that works/i);
  await expect(
    page.getByRole('list', { name: 'Best rated products' }).getByRole('listitem'),
  ).toHaveCount(4);
  await expect(page.getByRole('link', { name: 'Audio' }).first()).toBeVisible();

  await page.goto('/no/such/page');
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByRole('contentinfo')).toBeVisible();
});

test('links, nested account routes and Back work without a page load', async ({ page }) => {
  await page.goto('/');
  const navigation = page.getByRole('navigation', { name: 'Main' });
  await navigation.getByRole('link', { name: 'Products' }).click();
  await expect(page).toHaveURL(/\/products$/);
  await expect(navigation.getByRole('link', { name: 'Products' })).toHaveAttribute(
    'aria-current',
    'page',
  );

  await page.goto('/account');
  await expect(page).toHaveURL(/\/login\?next=%2Faccount$/);
  // The guard's redirect replaced /account in the history, so Back skips it and returns to /products.
  await page.goBack();
  await expect(page).toHaveURL(/\/products$/);
  await page.goBack();
  await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/);
});
