/**
 * End-to-end journeys for the catalog (catalog.html) and product page (product.html), run by
 * tests/e2e/run.mjs against the site + mock API on one origin. Expected results come from
 * tests/fixtures/catalog-cases.json, which was computed independently of the mock server.
 */
import { readFileSync } from 'node:fs';

const fixtures = JSON.parse(
  readFileSync(new URL('../fixtures/catalog-cases.json', import.meta.url), 'utf8'),
);

/** Expected ids for a named fixture case. */
function expectedIds(name) {
  const found = fixtures.cases.find((c) => c.name === name);
  if (!found) throw new Error(`no fixture "${name}"`);
  return found.expect.ids;
}

/** Ids of the product cards on screen, once loading has finished. */
async function shownIds(page) {
  await page.waitForSelector('#catalog-results[aria-busy="false"]');
  return page
    .getByRole('region', { name: 'Products' })
    .getByRole('article')
    .evaluateAll((cards) => cards.map((c) => c.closest('[data-id]')?.dataset.id).filter(Boolean));
}

/** The catalog's status line (role="status"). */
const status = (page) => page.getByRole('region', { name: 'Products' }).getByRole('status');

/** A radio in one of the filter groups, by the start of its label ("Electronics" for "Electronics (4)"). */
const facet = (page, group, label) =>
  page
    .getByRole('group', { name: group })
    .getByRole('radio', { name: new RegExp(`^${label} \\(`) });

/** Wait until the visible cards equal the fixture, or fail with both lists. */
async function expectFixture(page, name, check) {
  const want = expectedIds(name);
  await page
    .waitForFunction(
      (ids) => {
        const list = document.getElementById('catalog-results');
        const got = [...list.querySelectorAll('.product-card[data-id]')].map((c) => c.dataset.id);
        return list.getAttribute('aria-busy') === 'false' && got.join() === ids.join();
      },
      want,
      { timeout: 5000 },
    )
    .catch(async () => {
      check(
        false,
        `"${name}": expected ${want.join(',')}, got ${(await shownIds(page)).join(',')}`,
      );
    });
}

/** The page URL's query parameters as an object. */
function params(page) {
  return Object.fromEntries(new URL(page.url()).searchParams);
}

/**
 * @param {{ journey: Function, expect: (ok: boolean, message: string) => void, url: string }} t
 */
export function registerCatalogJourneys({ journey, expect, url }) {
  journey(
    'catalog: default view and pagination match the fixtures; page change moves focus',
    async (page) => {
      await page.goto(`${url}/catalog.html`);
      await expectFixture(page, 'default view, page 1', expect);
      expect((await status(page).innerText()) === 'Showing 1–6 of 12 products', 'status text');
      await page.getByRole('button', { name: 'Next page' }).click();
      await expectFixture(page, 'default view, page 2', expect);
      expect(params(page).page === '2', 'page=2 in the URL');
      expect(
        await page.evaluate(() => document.activeElement.id === 'results-heading'),
        'focus on results heading',
      );
    },
  );

  journey(
    'catalog: category, brand and sort compose, and a filter change resets the page',
    async (page) => {
      await page.goto(`${url}/catalog.html?page=2`);
      await facet(page, 'Category', 'Electronics').check();
      await expectFixture(page, 'category', expect);
      expect(
        params(page).page === undefined && params(page).category === 'electronics',
        'page reset to 1',
      );
      await facet(page, 'Brand', 'Pulse').check();
      await expectFixture(page, 'category + brand', expect);
      const pulse = page
        .getByRole('group', { name: 'Brand' })
        .getByRole('radio', { name: 'Pulse (2)' });
      expect((await pulse.count()) === 1, 'brand facet count: Pulse (2)');
    },
  );

  journey('catalog: the view survives reload and Back/Forward through the URL', async (page) => {
    await page.goto(`${url}/catalog.html?brand=Northline&sort=price_desc`);
    await expectFixture(page, 'brand + sort by price high to low', expect);
    await page.reload();
    await expectFixture(page, 'brand + sort by price high to low', expect);
    expect(
      (await page.getByRole('combobox', { name: 'Sort by' }).inputValue()) === 'price_desc',
      'sort control restored',
    );
    expect(await facet(page, 'Brand', 'Northline').isChecked(), 'brand radio restored');
    await facet(page, 'Category', 'Apparel').check();
    await page.waitForURL(/category=apparel/);
    await page.goBack();
    await expectFixture(page, 'brand + sort by price high to low', expect);
    await page.goForward();
    await page.waitForURL(/category=apparel/);
  });

  journey(
    'catalog: price range (dollars to cents) and rating filters; invalid range is refused',
    async (page) => {
      await page.goto(`${url}/catalog.html?sort=price_asc`);
      const min = page.getByRole('textbox', { name: 'Min' });
      const max = page.getByRole('textbox', { name: 'Max' });
      await min.fill('30');
      await max.fill('80');
      await max.press('Tab');
      await expectFixture(page, 'price range in cents', expect);
      expect(params(page).minPrice === '3000' && params(page).maxPrice === '8000', 'cents in URL');
      await min.fill('90');
      await min.press('Tab');
      expect(
        (await page.getByRole('group', { name: 'Price' }).getByRole('alert').innerText()).includes(
          'minimum',
        ),
        'range error shown',
      );
      expect(params(page).minPrice === '3000', 'invalid range not applied');
      await page.goto(`${url}/catalog.html?minRating=4.6&sort=rating_desc`);
      await expectFixture(page, 'minimum rating + top rated', expect);
    },
  );

  journey('catalog: search is debounced (one request for a burst of typing)', async (page) => {
    const searches = [];
    page.on(
      'request',
      (r) =>
        r.url().includes('/api/products?') && r.url().includes('limit=6') && searches.push(r.url()),
    );
    await page.goto(`${url}/catalog.html`);
    await shownIds(page);
    searches.length = 0;
    await page
      .getByRole('searchbox', { name: 'Search products' })
      .pressSequentially('wool', { delay: 60 });
    await expectFixture(page, 'search', expect);
    expect(
      searches.length === 1 && searches[0].includes('q=wool'),
      `requests: ${searches.join(' ')}`,
    );
    expect(params(page).q === 'wool', 'q in the URL');
  });

  journey(
    'catalog: a slow, superseded request is aborted and never overwrites the newer view',
    async (page) => {
      const aborted = [];
      page.on(
        'requestfailed',
        (r) => r.url().includes('category=electronics') && aborted.push(r.failure()?.errorText),
      );
      await page.route(/\/api\/products\?.*category=electronics.*limit=6/, async (route) => {
        await new Promise((done) => setTimeout(done, 1500));
        await route.continue().catch(() => {});
      });
      await page.goto(`${url}/catalog.html`);
      await shownIds(page);
      await facet(page, 'Category', 'Electronics').check();
      await facet(page, 'Category', 'Apparel').check(); // while electronics is still loading
      await expectFixture(page, 'another category', expect);
      await page.waitForTimeout(2000); // longer than the slow response: it must not replace the view
      await expectFixture(page, 'another category', expect);
      expect(params(page).category === 'apparel', 'URL has the newer view');
      expect(aborted.length >= 1, 'the superseded request was cancelled');
    },
  );

  journey('catalog: empty state offers "Clear all filters"', async (page) => {
    await page.goto(`${url}/catalog.html?q=zzz`);
    await page.waitForSelector('.catalog__empty:not([hidden])');
    expect((await status(page).innerText()).includes('No products'), 'empty status');
    await page
      .getByRole('region', { name: 'Products' })
      .getByRole('button', { name: 'Clear all filters' })
      .click();
    await expectFixture(page, 'default view, page 1', expect);
    expect(new URL(page.url()).search === '', 'URL cleared');
  });

  journey(
    'catalog: loading, 400, 404, 429 and 500 states are shown with the right action',
    async (page) => {
      await page.goto(`${url}/catalog.html#demo`);
      await shownIds(page);
      await page.getByRole('button', { name: 'Slow response (3 s)' }).click();
      await page.waitForSelector('#catalog-results[aria-busy="true"] .product-card--placeholder');
      expect((await status(page).innerText()) === 'Loading products…', 'loading status');
      await shownIds(page);
      const cases = [
        ['500 server error', 'Error 500', 'Try again'],
        ['404 not found', 'Error 404', 'Clear all filters'],
        ['400 bad request', 'Error 400', 'Clear all filters'],
        ['429 too many requests', 'Error 429', 'Try again in'],
      ];
      const errorBox = page.getByRole('region', { name: 'Products' }).getByRole('alert');
      for (const [button, code, action] of cases) {
        await page.getByRole('button', { name: button }).click();
        await page.waitForSelector('#catalog-error:not([hidden])');
        const box = await errorBox.innerText();
        expect(box.includes(code) && box.includes(action), `${button}: ${box}`);
      }
      expect(
        await errorBox.getByRole('button').isDisabled(),
        '429 retry disabled during countdown',
      );
      await page.getByRole('button', { name: '500 server error' }).click();
      await page.waitForSelector('#catalog-error[data-status="500"]');
      await errorBox.getByRole('button', { name: 'Try again' }).click();
      await expectFixture(page, 'default view, page 1', expect);
      expect(await errorBox.isHidden(), 'error cleared after retry');
    },
    'desktop',
    { allowHttpErrors: true },
  );

  journey(
    'product page: a card opens its product; an unknown id shows "Product not found"',
    async (page) => {
      await page.goto(`${url}/catalog.html`);
      await shownIds(page);
      await page
        .getByRole('region', { name: 'Products' })
        .getByRole('heading', { level: 3 })
        .getByRole('link')
        .first()
        .click();
      await page.waitForFunction(
        () => document.getElementById('product-heading').textContent === 'Wireless Headphones Pro',
      );
      expect((await page.title()) === 'Wireless Headphones Pro — BrandStore', 'document title');
      await page.goto(`${url}/product.html?id=no-such-product`);
      await page.waitForSelector('#product-error:not([hidden])');
      expect((await page.locator('h1').innerText()) === 'Product not found', '404 heading');
    },
    undefined,
    { allowHttpErrors: true },
  );
}
