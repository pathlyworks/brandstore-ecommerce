/**
 * Protected routes and sessions in a real browser against the TechSphere API: the admin chunk is never
 * downloaded by a shopper, a refused token during checkout leads to sign-in and back with nothing lost, and
 * the cart survives sign-in and sign-out.
 */
import { expect, test, type Page } from '@playwright/test';
import { ADMIN, resetApi, signIn } from './support';

test.beforeEach(async ({ request }) => resetApi(request));
test.afterAll(async ({ request }) => resetApi(request));

function scriptsLoaded(page: Page): string[] {
  const urls: string[] = [];
  page.on('request', (r) => {
    if (r.resourceType() === 'script') urls.push(new URL(r.url()).pathname);
  });
  return urls;
}
const isAdminChunk = (path: string) => /\/assets\/AdminRoute-[\w-]+\.js$/.test(path);

test('a shopper gets a 403 page at /admin and never downloads the admin code', async ({ page }) => {
  const scripts = scriptsLoaded(page);
  await signIn(page, '/admin');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Access denied: this area is for administrators' }),
  ).toBeVisible();
  await page.goto('/products');
  await expect(page.getByRole('list', { name: 'Products' })).toBeVisible();
  expect(scripts.length).toBeGreaterThan(0);
  expect(scripts.filter(isAdminChunk)).toEqual([]);
});

test('an admin gets the admin chunk and the summary', async ({ page }) => {
  const scripts = scriptsLoaded(page);
  await signIn(page, '/admin', ADMIN);
  await expect(page.getByRole('heading', { level: 1, name: 'Store dashboard' })).toBeVisible();
  await expect(page.getByText('Sales', { exact: true })).toBeVisible();
  expect(scripts.filter(isAdminChunk)).toHaveLength(1);
});

test('signed out, /admin and /account go to sign-in and come back after it', async ({ page }) => {
  await page.goto('/account/orders?page=2');
  await expect(page).toHaveURL(/\/login\?next=%2Faccount%2Forders%3Fpage%3D2$/);
  await page.getByLabel('Email').fill('student@techsphere.test');
  await page.getByLabel('Password').fill('Passw0rd!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/account\/orders\?page=2$/);
});

test('a token refused during checkout: sign in again, back to the review, the order goes through', async ({
  page,
}) => {
  await signIn(page, '/products/p-003');
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await page.goto('/checkout/address');
  await page.getByLabel('Full name').fill('Mona Adel');
  await page.getByLabel('Mobile number').fill('01012345678');
  await page.getByLabel('Street and building').fill('12 Tahrir Street');
  await page.getByLabel('City or district').fill('Dokki');
  await page.getByLabel('Governorate').selectOption('giza');
  await page.getByRole('button', { name: 'Continue to payment' }).click();
  await page.getByRole('radio', { name: /^Cash on delivery/ }).check();
  await page.getByRole('button', { name: 'Continue to review' }).click();
  await expect(page).toHaveURL(/\/checkout\/review$/);

  // The server stops accepting the token (as when it expires or is revoked); the app still thinks it is valid.
  await page.evaluate(() => {
    const key = 'brandstore:session:v1';
    const session = JSON.parse(sessionStorage.getItem(key) ?? '{}') as { token: string };
    session.token = 'eyJhbGciOiJub25lIn0.eyJzdWIiOiJ4IiwiZXhwIjoxfQ.mock'; // exp in 1970
    sessionStorage.setItem(key, JSON.stringify(session));
  });
  await page.reload();
  // The stored token's own exp is in the past, so the app ends the session before any request.
  await expect(page).toHaveURL(/\/login\?next=%2Fcheckout%2Freview/);
  await page.getByLabel('Email').fill('student@techsphere.test');
  await page.getByLabel('Password').fill('Passw0rd!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/checkout\/review$/);
  await expect(page.getByText('12 Tahrir Street')).toBeVisible();

  // Now the API refuses the token while the review is open: Place order → the single sign-in path.
  await page.route('**/orders', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: '{"error":"Unauthorized"}',
        })
      : route.fallback(),
  );
  await page.getByRole('button', { name: /^Place order/ }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fcheckout%2Freview&reason=expired$/);
  await expect(page.getByText(/session expired during checkout/i)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Cart, 1 item' })).toBeVisible();
  await page.unroute('**/orders');
  await page.getByLabel('Email').fill('student@techsphere.test');
  await page.getByLabel('Password').fill('Passw0rd!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('button', { name: /^Place order/ }).click();
  await expect(page.getByTestId('order-number')).toHaveText(/^TS-\d+$/);
});

test('the cart survives sign-in and sign-out', async ({ page }) => {
  await page.goto('/products/p-003');
  await page.getByLabel('Quantity').fill('2');
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page.getByRole('link', { name: 'Cart, 2 items' })).toBeVisible();
  await signIn(page);
  await expect(page.getByRole('link', { name: 'Cart, 2 items' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/);
  await expect(page.getByRole('banner').getByRole('link', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Cart, 2 items' })).toBeVisible();
  await page.goto('/account/orders');
  await expect(page).toHaveURL(/\/login\?next=/);
});
