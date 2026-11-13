/**
 * End-to-end journeys for Task 4 (sign-in, registration, protected account, expiry, sign-out), run
 * against the OFFICIAL TechSphere API (api/techsphere/server.py with its /__log and /__control endpoints),
 * with the site pointed at it through VITE_API_BASE, exactly as when the app is graded.
 */

const STUDENT = { email: 'student@techsphere.test', password: 'Passw0rd!' };

/** A TechSphere-shaped token (payload { sub, role, exp }) expiring at `expSeconds`. */
function tokenWithExp(expSeconds) {
  const payload = Buffer.from(
    JSON.stringify({ sub: STUDENT.email, role: 'shopper', exp: expSeconds }),
  ).toString('base64url');
  return `eyJhbGciOiJub25lIn0.${payload}.mock`;
}

/** Sign in through the form and wait for the account page. */
async function signIn(page, url) {
  await page.goto(`${url}/login.html`);
  await page.fill('#login-email', STUDENT.email);
  await page.fill('#login-password', STUDENT.password);
  await page.click('#login-form button[type="submit"]');
  await page.waitForURL(/account\.html/);
  await page.waitForSelector('#orders-list[aria-busy="false"]');
}

/** Store a session directly (to test expiry without waiting an hour). */
async function storeSession(page, url, token, expiresAt) {
  await page.goto(`${url}/login.html`);
  await page.evaluate(
    ([t, e]) =>
      sessionStorage.setItem(
        'brandstore:session:v1',
        JSON.stringify({
          token: t,
          expiresAt: e,
          user: { email: 'student@techsphere.test', name: 'Test Student', role: 'shopper' },
        }),
      ),
    [token, expiresAt],
  );
}

/**
 * @param {{ journey: Function, expect: Function, url: string, api: object }} t
 *   url: the site served with VITE_API_BASE; api: { url, reset, log, control } of the TechSphere server
 */
export function registerAuthJourneys({ journey, expect, url, api }) {
  const opts = { allowHttpErrors: true };

  journey(
    'auth: forms are labelled and validated before anything is sent',
    async (page) => {
      await api.reset();
      await page.goto(`${url}/login.html`);
      for (const name of ['Email', 'Password']) {
        expect((await page.getByLabel(name, { exact: true }).count()) === 1, `${name} has a label`);
      }
      await page.click('#login-form button[type="submit"]');
      const summary = page.getByRole('form', { name: 'Sign in' }).getByRole('alert').first();
      expect(await summary.isVisible(), 'error summary shown');
      expect(
        await page.evaluate(() => document.activeElement.classList.contains('form-summary')),
        'focus on the summary',
      );
      expect(
        (await page.getAttribute('#login-email', 'aria-invalid')) === 'true',
        'email marked invalid',
      );
      expect(
        (await page.locator('#login-email-error').innerText()).length > 0,
        'email error text (linked by aria-describedby)',
      );
      expect(
        (await page.getAttribute('#login-email', 'aria-describedby')).includes('login-email-error'),
        'described by its error',
      );
      expect(
        (await api.log()).filter((r) => r.path.startsWith('/auth')).length === 0,
        'no request for an invalid form',
      );
    },
    undefined,
    opts,
  );

  journey(
    'auth: wrong credentials (401) show one clear message; the right ones open the account',
    async (page) => {
      await api.reset();
      await page.goto(`${url}/login.html`);
      await page.fill('#login-email', STUDENT.email);
      await page.fill('#login-password', 'not-the-password');
      await page.click('#login-form button[type="submit"]');
      await page.getByRole('alert').filter({ hasText: 'email or password is incorrect' }).waitFor();
      expect(
        (await page
          .getByRole('alert')
          .filter({ hasText: 'email or password is incorrect' })
          .count()) === 1,
        '401 message',
      );
      await page.fill('#login-password', STUDENT.password);
      await page.click('#login-form button[type="submit"]');
      await page.waitForURL(/account\.html/);
      expect(await page.getByText(/Signed in as Test Student/).isVisible(), 'greeting');
    },
    undefined,
    opts,
  );

  journey(
    'auth: registration validates, shows "already registered" (400) on the email field, then signs in (201)',
    async (page) => {
      await api.reset();
      await page.goto(`${url}/register.html`);
      await page.fill('#reg-name', 'New Shopper');
      await page.fill('#reg-email', STUDENT.email);
      await page.fill('#reg-password', 'short');
      await page.fill('#reg-confirm', 'other');
      await page.click('#register-form button[type="submit"]');
      expect(
        (await page.getByText('Use at least 8 characters.', { exact: true }).count()) === 2, // summary link + field message
        'password rule',
      );
      expect(
        (await page.getByText('The two passwords do not match.', { exact: true }).count()) === 2, // summary link + field message
        'confirmation rule',
      );
      await page.fill('#reg-password', 'LongEnough1');
      await page.fill('#reg-confirm', 'LongEnough1');
      await page.click('#register-form button[type="submit"]');
      await page.waitForSelector('#reg-email-error:has-text("already registered")');
      await page.fill('#reg-email', 'new.shopper@techsphere.test');
      await page.click('#register-form button[type="submit"]');
      await page.waitForURL(/account\.html/);
      expect(
        await page.getByText(/Signed in as .*new\.shopper@techsphere\.test/).isVisible(),
        'signed in as the new account',
      );
    },
    undefined,
    opts,
  );

  journey(
    'auth: account requests carry the Bearer token; orders page, cancel (200 and 409), addresses PUT and DELETE',
    async (page) => {
      await api.reset();
      await signIn(page, url);
      const orderIds = page.getByRole('region', { name: 'Your orders' }).getByText(/^Order o-\d+$/);
      expect((await orderIds.count()) === 5, '5 orders on page 1');
      await page.getByRole('button', { name: 'Page 2' }).click();
      await page.waitForFunction(
        () => document.querySelectorAll('#orders-list .order').length === 4,
      );
      await page.getByRole('button', { name: 'Page 1' }).click();
      await page.waitForSelector('[aria-label="Cancel order o-001"]');
      await page.getByRole('button', { name: 'Cancel order o-001' }).click();
      await page.waitForSelector('#account-message:has-text("o-001 is cancelled")');
      await api.control({ fail: { path: '/account/orders/o-005/cancel', status: 409, times: 1 } });
      await page.getByRole('button', { name: 'Cancel order o-005' }).click();
      await page.waitForSelector('#account-message:has-text("can no longer be cancelled")');
      await page.getByRole('button', { name: 'Edit address: 90th Street, Cairo' }).click();
      await page.fill('#addr-a-1-city', '');
      await page.click('#addresses-list button[type="submit"]');
      expect(
        (await page.getByText('Enter the city.', { exact: true }).count()) === 2, // summary link + field message
        'city required',
      );
      await page.fill('#addr-a-1-city', 'New Cairo');
      await page.click('#addresses-list button[type="submit"]');
      await page.waitForSelector('#addresses-list:has-text("90th Street, New Cairo")');
      await page.getByRole('button', { name: 'Delete address: Pyramids Rd, Giza' }).click();
      await page.waitForFunction(
        () => !document.getElementById('addresses-list').textContent.includes('Pyramids'),
      );
      const log = await api.log();
      const account = log.filter((r) => r.path.startsWith('/account'));
      expect(
        account.length >= 8 && account.every((r) => r.auth),
        `every account request has Authorization (${account.length})`,
      );
      const put = log.find((r) => r.method === 'PUT');
      expect(
        JSON.stringify(put.body) === '{"city":"New Cairo","street":"90th Street"}',
        `PUT body ${JSON.stringify(put.body)}`,
      );
      expect(
        log.some((r) => r.method === 'DELETE' && r.path === '/account/addresses/a-2'),
        'DELETE sent',
      );
    },
    'desktop',
    opts,
  );

  journey(
    'auth: an expired session sends you to sign-in with a clear message, then back to the account',
    async (page) => {
      await api.reset();
      await storeSession(
        page,
        url,
        tokenWithExp(Math.floor(Date.now() / 1000) - 60),
        Date.now() - 60000,
      );
      await page.goto(`${url}/account.html`);
      await page.waitForURL(/login\.html/);
      expect(
        (await page.getByRole('status').filter({ hasText: /\S/ }).first().innerText()) ===
          'Your session has expired. Please sign in again.',
        'expired notice',
      );
      expect(
        (await api.log()).filter((r) => r.path.startsWith('/account')).length === 0,
        'no request with an expired token',
      );
      await page.fill('#login-email', STUDENT.email);
      await page.fill('#login-password', STUDENT.password);
      await page.click('#login-form button[type="submit"]');
      await page.waitForURL(/account\.html/);
    },
    undefined,
    opts,
  );

  journey(
    'auth: a token the server rejects (401) or one that expires while the page is open also redirects',
    async (page) => {
      await api.reset();
      await storeSession(
        page,
        url,
        tokenWithExp(Math.floor(Date.now() / 1000) - 60),
        Date.now() + 3600000,
      ); // server says expired
      await page.goto(`${url}/account.html`);
      await page.waitForURL(/login\.html/);
      expect(
        (await page.getByRole('status').filter({ hasText: /\S/ }).first().innerText()).includes(
          'expired',
        ),
        'notice after a 401',
      );
      expect(
        await page.evaluate(() => sessionStorage.getItem('brandstore:session:v1') === null),
        'session removed after 401',
      );
      await storeSession(
        page,
        url,
        tokenWithExp(Math.floor(Date.now() / 1000) + 2),
        Date.now() + 2000,
      ); // expires in 2 s
      await page.goto(`${url}/account.html`);
      await page.waitForSelector('#account-greeting:has-text("Test Student")');
      await page.waitForURL(/login\.html/, { timeout: 6000 });
      expect(
        (await page.getByRole('status').filter({ hasText: /\S/ }).first().innerText()).includes(
          'expired',
        ),
        'notice after the timer',
      );
    },
    undefined,
    opts,
  );

  journey(
    'auth: sign-out clears the session and account data but keeps the cart and saved items',
    async (page) => {
      await api.reset();
      await page.goto(`${url}/login.html`);
      await page.evaluate(() => {
        const line = {
          productId: 'p-001',
          name: 'Nova Laptops 1',
          unitPrice: 3299900,
          currency: 'EGP',
          quantity: 2,
          stock: 25,
          image: { url: '/assets/product-placeholder.svg', alt: '' },
        };
        localStorage.setItem('brandstore:cart:v1', JSON.stringify({ lines: [line] }));
        localStorage.setItem(
          'brandstore:saved:v1',
          JSON.stringify({ items: [{ ...line, productId: 'p-003', quantity: 1 }] }),
        );
      });
      await signIn(page, url);
      await page.getByRole('button', { name: 'Sign out' }).click();
      await page.waitForURL(/login\.html/);
      expect(
        (await page.getByRole('status').filter({ hasText: /\S/ }).first().innerText()).includes(
          'signed out',
        ),
        'signed-out notice',
      );
      const stored = await page.evaluate(() => [
        sessionStorage.getItem('brandstore:session:v1'),
        localStorage.getItem('brandstore:cart:v1'),
        localStorage.getItem('brandstore:saved:v1'),
      ]);
      expect(
        stored[0] === null && stored[1].includes('p-001') && stored[2].includes('p-003'),
        'session gone, cart and saved kept',
      );
      expect(
        (await page.locator('[data-cart-link]').textContent()) === 'Cart (2)',
        'cart badge still 2',
      );
      expect(
        (await page.locator('[data-account-link]').textContent()) === 'Sign in',
        'nav shows Sign in',
      );
      await page.goto(`${url}/account.html`);
      await page.waitForURL(/login\.html/);
      expect(
        (await page.getByRole('status').filter({ hasText: /\S/ }).first().innerText()) ===
          'Please sign in to see your account.',
        'account is protected again',
      );
    },
    undefined,
    opts,
  );

  journey(
    'auth: the token and password never appear in a URL, a query string or the console',
    async (page) => {
      await api.reset();
      const urls = [];
      const consoleLines = [];
      page.on('request', (r) => urls.push(r.url()));
      page.on('framenavigated', (f) => urls.push(f.url()));
      page.on('console', (m) => consoleLines.push(m.text()));
      await signIn(page, url);
      await page.reload();
      await page.waitForSelector('#orders-list[aria-busy="false"]');
      const token = await page.evaluate(
        () => JSON.parse(sessionStorage.getItem('brandstore:session:v1')).token,
      );
      const everything = [...urls, ...consoleLines].join('\n');
      expect(
        !everything.includes(token) &&
          !everything.includes(STUDENT.password) &&
          !/[?&](token|password)=/i.test(everything),
        'secret leaked',
      );
      const serverSide = JSON.stringify((await api.log()).map((r) => [r.path, r.query]));
      expect(
        !serverSide.includes(token.split('.')[1]) && !serverSide.includes(STUDENT.password),
        'secret in the API log of paths/queries',
      );
    },
    undefined,
    opts,
  );
}
