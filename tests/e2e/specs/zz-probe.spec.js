/** TEMPORARY: isolate the Firefox page crash in CI (removed after). */
import { expect, test } from '@playwright/test';

const alive = async (page) => {
  await page.waitForTimeout(2500);
  expect(await page.evaluate(() => document.title)).toContain('BrandStore');
};

test('probe A: mouse click on the Audio radio', async ({ page }) => {
  await page.goto('/catalog.html');
  await expect(page.getByText('Showing 1–8 of 24 products')).toBeVisible();
  await page.getByRole('radio', { name: /^Audio/ }).click();
  await alive(page);
});

test('probe B: hover the Audio radio only', async ({ page }) => {
  await page.goto('/catalog.html');
  await expect(page.getByText('Showing 1–8 of 24 products')).toBeVisible();
  await page.getByRole('radio', { name: /^Audio/ }).hover();
  await alive(page);
});

test('probe C: filter through the URL, no click', async ({ page }) => {
  await page.goto('/catalog.html?category=audio');
  await expect(page.getByText('Showing 1–6 of 6 products')).toBeVisible();
  await alive(page);
});

test('probe D: mouse click on the sort select option', async ({ page }) => {
  await page.goto('/catalog.html');
  await expect(page.getByText('Showing 1–8 of 24 products')).toBeVisible();
  await page.getByLabel('Sort by').selectOption('price_desc');
  await alive(page);
});

test('probe E: keyboard Space on the Audio radio', async ({ page }) => {
  await page.goto('/catalog.html');
  await expect(page.getByText('Showing 1–8 of 24 products')).toBeVisible();
  await page.getByRole('radio', { name: /^Audio/ }).focus();
  await page.keyboard.press('Space');
  await alive(page);
});
