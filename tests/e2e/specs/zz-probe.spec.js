/** TEMPORARY: isolate the Firefox page crash in CI (removed after). */
import { expect, test } from '@playwright/test';

const alive = async (page) => {
  await page.waitForTimeout(2500);
  expect(await page.evaluate(() => document.title)).toContain('BrandStore');
};

test('probe F: check() the Audio radio', async ({ page }) => {
  await page.goto('/catalog.html');
  await expect(page.getByText('Showing 1–8 of 24 products')).toBeVisible();
  await page.getByRole('radio', { name: /^Audio/ }).check();
  await alive(page);
});

test('probe G: allTextContents of the result links, no filter', async ({ page }) => {
  await page.goto('/catalog.html');
  await expect(page.getByText('Showing 1–8 of 24 products')).toBeVisible();
  const links = page.getByRole('region', { name: 'Products' }).getByRole('link');
  await expect(links).toHaveCount(8);
  console.log(await links.allTextContents());
  await alive(page);
});

test('probe H: textContent via evaluateAll', async ({ page }) => {
  await page.goto('/catalog.html');
  await expect(page.getByText('Showing 1–8 of 24 products')).toBeVisible();
  const links = page.getByRole('region', { name: 'Products' }).getByRole('link');
  console.log(await links.evaluateAll((els) => els.map((e) => e.textContent)));
  await alive(page);
});

test('probe I: allTextContents on a CSS locator', async ({ page }) => {
  await page.goto('/catalog.html');
  await expect(page.getByText('Showing 1–8 of 24 products')).toBeVisible();
  console.log(await page.locator('#catalog-results a').allTextContents());
  await alive(page);
});
