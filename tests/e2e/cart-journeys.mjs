/**
 * End-to-end journeys for Task 3: product detail, persistent cart, save for later and recently
 * viewed. Totals are compared with tests/fixtures/cart-cases.json (reference calculations in dollars).
 */
import { readFileSync } from 'node:fs';

const fixtures = JSON.parse(
  readFileSync(new URL('../fixtures/cart-cases.json', import.meta.url), 'utf8'),
);
const MONEY = /^\$\d{1,3}(,\d{3})*\.\d{2}$/;

/** Open a product page and wait until it has loaded. */
async function openProduct(page, url, id) {
  await page.goto(`${url}/product.html?id=${id}`);
  await page.waitForSelector('#product-body[aria-busy="false"]');
}

/** Add a product to the cart with a quantity typed into the stepper. */
async function addProduct(page, url, id, quantity) {
  await openProduct(page, url, id);
  await page.fill('#quantity', String(quantity));
  await page.locator('#quantity').press('Tab');
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await page.waitForSelector('.purchase__message:has-text("Added")');
}

/** Dollars shown in one totals cell ("Free" = 0). */
async function totalCell(page, key) {
  const text = await page.locator(`[data-total="${key}"]`).innerText();
  return text === 'Free' ? 0 : Number(text.replace(/[$,]/g, ''));
}

/** Compare the cart page's totals with a fixture case. */
async function expectTotals(page, fixture, expect) {
  for (const key of ['subtotal', 'shipping', 'total']) {
    const shown = await totalCell(page, key);
    expect(
      Math.abs(shown - fixture.expected[key]) <= fixtures.tolerance,
      `${fixture.name} ${key}: ${shown} vs ${fixture.expected[key]}`,
    );
  }
  expect(
    Number(await page.locator('[data-total="items"]').innerText()) === fixture.expected.itemCount,
    'item count',
  );
}

/** Ids shown in the recently viewed strip. */
async function recentIds(page) {
  return page
    .locator('#recently-viewed:not([hidden]) .recent__link')
    .evaluateAll((links) => links.map((a) => a.dataset.id));
}

/**
 * @param {{ journey: Function, expect: (ok: boolean, message: string) => void, url: string }} t
 */
export function registerCartJourneys({ journey, expect, url }) {
  journey(
    'cart: detail page has a gallery, specs table, stock status and a stepper limited by stock',
    async (page) => {
      await openProduct(page, url, 'desk-lamp');
      expect(
        (await page.locator('.purchase__stock').innerText()) === 'Only 3 left in stock',
        'stock status',
      );
      await page.getByRole('button', { name: /Show image 2 of 3/ }).click();
      expect(
        (await page.locator('.gallery__main').getAttribute('src')).includes('gallery-side'),
        'gallery switched',
      );
      expect((await page.locator('.specs tbody tr').count()) >= 4, 'specs table rows');
      await page.fill('#quantity', '99');
      await page.locator('#quantity').press('Tab');
      expect((await page.inputValue('#quantity')) === '3', 'quantity clamped to stock');
      expect(
        await page.getByRole('button', { name: 'Increase quantity' }).isDisabled(),
        '+ disabled at the limit',
      );
    },
  );

  journey('cart: an out-of-stock product cannot be added and explains why', async (page) => {
    await openProduct(page, url, 'usb-c-hub');
    const add = page.getByRole('button', { name: 'Add to cart' });
    expect(await add.isDisabled(), 'Add to cart disabled');
    expect(
      (await add.getAttribute('aria-describedby')) === 'stock-note',
      'button points at the reason',
    );
    expect(
      (await page.locator('#stock-note').innerText()).includes('out of stock'),
      'reason shown',
    );
    await page.getByRole('button', { name: 'Save for later' }).click();
    await page.goto(`${url}/cart.html`);
    const move = page.getByRole('button', { name: 'Move USB-C 7-in-1 Hub to the cart' });
    expect(await move.isDisabled(), 'Move to cart disabled for the saved item');
    expect(
      (await page.locator('.saved-item .cart-line__warning').innerText()).includes('Out of stock'),
      'saved item explains',
    );
  });

  journey(
    'cart: totals match the fixture reference calculations (below and above free shipping)',
    async (page) => {
      for (const name of ['just below the $100 threshold', 'just above the $100 threshold']) {
        const fixture = fixtures.cases.find((c) => c.name === name);
        await page.goto(`${url}/cart.html`);
        await page.evaluate(() => localStorage.clear());
        for (const { productId, quantity } of fixture.lines)
          await addProduct(page, url, productId, quantity);
        await page.goto(`${url}/cart.html`);
        await page.waitForSelector('.cart-line');
        await expectTotals(page, fixture, expect);
      }
    },
  );

  journey(
    'cart: survives refresh and a return visit; quantity changes update the totals',
    async (page) => {
      const fixture = fixtures.cases.find((c) => c.name === 'two lines, one with quantity 2');
      for (const { productId, quantity } of fixture.lines)
        await addProduct(page, url, productId, quantity);
      await page.goto(`${url}/cart.html`);
      await expectTotals(page, fixture, expect);
      await page.reload();
      await expectTotals(page, fixture, expect);
      const later = await page.context().newPage(); // a return visit in a new tab of the same browser
      await later.goto(`${url}/cart.html`);
      await expectTotals(later, fixture, expect);
      expect(
        (await later.locator('[data-cart-link]').textContent()) === 'Cart (3)',
        'badge on return visit',
      );
      await later
        .getByRole('button', { name: 'Increase quantity of Wireless Headphones Pro' })
        .click();
      expect(Math.abs((await totalCell(later, 'total')) - 699.96) < 0.005, 'total after +1');
      await later.close();
    },
  );

  journey(
    'cart: save for later and move back to the cart; lists persist separately',
    async (page) => {
      await addProduct(page, url, 'smartwatch', 2);
      await page.goto(`${url}/cart.html`);
      await page.getByRole('button', { name: 'Save Ergonomic Smartwatch for later' }).click();
      expect(
        (await page.locator('.cart-line').count()) === 0 &&
          (await page.locator('.saved-item').count()) === 1,
        'moved to saved',
      );
      await page.reload();
      expect(
        (await page.locator('#saved-count').innerText()) === '(1)',
        'saved list survives refresh',
      );
      await page.getByRole('button', { name: 'Move Ergonomic Smartwatch to the cart' }).click();
      expect((await page.locator('.cart-line input').inputValue()) === '2', 'quantity kept');
      await page.getByRole('button', { name: 'Clear cart' }).click();
      await page.reload();
      expect((await page.locator('.cart-line').count()) === 0, 'cart cleared');
    },
  );

  journey(
    'cart: recently viewed is deduplicated, capped at 6, and only lives in this tab',
    async (page) => {
      for (const id of ['smartwatch', 'merino-tee', 'smartwatch']) await openProduct(page, url, id);
      expect(
        (await recentIds(page)).join() === 'merino-tee',
        `strip on product page: ${await recentIds(page)}`,
      );
      for (const id of [
        'headphones-pro',
        'wool-socks',
        'desk-lamp',
        'linen-throw',
        'card-wallet',
        'rain-shell',
      ]) {
        await openProduct(page, url, id);
      }
      await page.goto(`${url}/cart.html`);
      const ids = await recentIds(page);
      expect(
        ids.length === 6 && ids[0] === 'rain-shell' && new Set(ids).size === 6,
        `cart strip: ${ids}`,
      );
      const other = await page.context().newPage(); // a new tab: sessionStorage is per tab
      await other.goto(`${url}/cart.html`);
      expect(await other.locator('#recently-viewed').isHidden(), 'not shared with a new tab');
      await other.close();
    },
  );

  journey('cart: a stale stored price is corrected from the API and announced', async (page) => {
    await page.goto(`${url}/cart.html`);
    await page.evaluate(() => {
      const line = {
        productId: 'smartwatch',
        name: 'Ergonomic Smartwatch',
        unitPrice: 100,
        currency: 'USD',
        quantity: 1,
        stock: 25,
        image: { url: '/assets/smartwatch-800.svg', alt: '' },
      };
      localStorage.setItem('brandstore:cart:v1', JSON.stringify({ lines: [line] }));
    });
    await page.reload();
    await page.waitForSelector('#cart-message:has-text("is now")');
    expect(
      (await page.locator('#cart-message').innerText()).includes('now $149.99 (was $1.00)'),
      'message',
    );
    expect(
      Math.abs((await totalCell(page, 'total')) - 149.99) < 0.005, // free shipping from $100
      'total uses the current price',
    );
  });

  journey('cart: every price on catalog, product and cart pages uses one format', async (page) => {
    await addProduct(page, url, 'headphones-pro', 1);
    const texts = [];
    for (const path of ['/catalog.html', '/product.html?id=leather-backpack', '/cart.html', '/']) {
      await page.goto(`${url}${path}`);
      await page.waitForTimeout(500);
      const selector =
        '.product-card__price > span, .product-card__price:not(:has(span)), .product-detail__price, .recent__price, .cart-line__total, [data-total="subtotal"], [data-total="total"]';
      texts.push(...(await page.locator(selector).allInnerTexts()));
    }
    const bad = texts.filter((t) => !MONEY.test(t.trim()));
    expect(
      texts.length > 10 && bad.length === 0,
      `${texts.length} prices, not in $1,234.56 format: ${bad.join(' | ')}`,
    );
  });

  journey(
    'cart: quantity bounds — 0, above the stock and above the limit are corrected and explained',
    async (page) => {
      await openProduct(page, url, 'desk-lamp');
      const hint = page.locator('#quantity-hint');
      for (const [typed, shown, message] of [
        ['0', '1', 'The smallest quantity is 1.'],
        ['99', '3', 'Only 3 in stock.'],
      ]) {
        await page.fill('#quantity', typed);
        await page.locator('#quantity').press('Tab');
        expect(
          (await page.inputValue('#quantity')) === shown && (await hint.innerText()) === message,
          `${typed}: ${await hint.innerText()}`,
        );
      }
      await openProduct(page, url, 'headphones-pro');
      await page.fill('#quantity', '25');
      await page.locator('#quantity').press('Tab');
      expect((await page.inputValue('#quantity')) === '10', 'limit 10');
      expect((await hint.innerText()) === 'The limit is 10 per item.', 'limit message');
      await page.getByRole('button', { name: 'Add to cart' }).click();
      await page.goto(`${url}/cart.html`);
      await page.fill('#qty-headphones-pro', '0');
      await page.locator('#qty-headphones-pro').press('Tab');
      await page.waitForSelector('#cart-empty:not([hidden])');
      expect(
        (await page.locator('[data-cart-link]').textContent()) === 'Cart (0)',
        'typing 0 removed the line',
      );
    },
  );

  journey(
    'cart: the menu badge always equals the page (items) — including an out-of-stock line',
    async (page) => {
      await addProduct(page, url, 'smartwatch', 2);
      await page.goto(`${url}/cart.html`);
      await page.evaluate(() => {
        const cart = JSON.parse(localStorage.getItem('brandstore:cart:v1'));
        cart.lines.push({
          productId: 'usb-c-hub',
          name: 'USB-C 7-in-1 Hub',
          unitPrice: 3999,
          currency: 'USD',
          quantity: 1,
          stock: 5,
          image: { url: '/assets/product-placeholder.svg', alt: '' },
        });
        localStorage.setItem('brandstore:cart:v1', JSON.stringify(cart));
      });
      await page.reload();
      await page.waitForSelector('.cart-line__warning'); // the API says the hub is out of stock now
      const badge = (await page.locator('[data-cart-link]').textContent()).match(/\d+/)[0];
      const items = await page.locator('[data-total="items"]').innerText();
      expect(badge === items && items === '2', `badge ${badge} vs page ${items}`);
      await page.getByRole('button', { name: 'Increase quantity of Ergonomic Smartwatch' }).click();
      const badge2 = (await page.locator('[data-cart-link]').textContent()).match(/\d+/)[0];
      expect(
        badge2 === (await page.locator('[data-total="items"]').innerText()) && badge2 === '3',
        'badge follows the page',
      );
    },
  );

  journey(
    'cart: corrupted cart, saved and recently viewed data never breaks a page',
    async (page) => {
      await page.goto(`${url}/cart.html`);
      const line = {
        productId: 'smartwatch',
        name: 'Ergonomic Smartwatch',
        unitPrice: 14999,
        currency: 'USD',
        quantity: 2,
        stock: 25,
        image: { url: '/assets/smartwatch-800.svg', alt: '' },
      };
      await page.evaluate((good) => {
        localStorage.setItem(
          'brandstore:cart:v1',
          JSON.stringify({ lines: [good, { productId: 'x' }, 'junk', { ...good, image: null }] }),
        );
        localStorage.setItem('brandstore:saved:v1', '{not json');
        sessionStorage.setItem('brandstore:recent:v1', JSON.stringify([{ id: 'broken' }, 7]));
      }, line);
      for (const path of ['/cart.html', '/product.html?id=smartwatch', '/catalog.html', '/']) {
        await page.goto(`${url}${path}`);
        await page.waitForTimeout(400);
        expect(
          (await page.locator('[data-cart-link]').textContent()) === 'Cart (2)',
          `${path}: badge`,
        );
      }
      await page.goto(`${url}/cart.html`);
      expect(
        (await page.locator('.cart-line').count()) === 1 &&
          (await page.locator('.saved-item').count()) === 0,
        'repaired lists',
      );
      const stored = await page.evaluate(
        () => JSON.parse(localStorage.getItem('brandstore:cart:v1')).lines.length,
      );
      expect(stored === 1, 'repaired cart written back');
    },
  );
}
