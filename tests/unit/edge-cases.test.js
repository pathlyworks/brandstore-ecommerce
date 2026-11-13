/**
 * Edge cases for the riskiest pure logic (Phase 2, Task 5). The happy paths live in cart.test.js,
 * query-string.test.js and saved-recent-storage.test.js; this file collects what usually breaks:
 * zero and negative quantities, quantities above the stock, floating-point totals, the price-string
 * parser, currency formatting, the query-string builder with awkward input, and storage that is
 * missing, blocked, full or corrupted.
 */
import { describe, expect, it } from 'vitest';
import { addToCart, EMPTY_CART, rehydrate, updateQuantity } from '../../src/state/cart.js';
import { MAX_PER_LINE, shippingFor, totals, validateQuantity } from '../../src/utils/cart-math.js';
import { formatMoney, toCents } from '../../src/utils/money.js';
import { priceToCents } from '../../src/api/techsphere.js';
import { buildQuery, CATALOG_DEFAULTS, parseCatalogQuery } from '../../src/utils/query-string.js';
import { createStorage, KEYS } from '../../src/utils/storage.js';
import { createCartStore } from '../../src/state/stores.js';
import { categoryLabel, ratingText, stockText } from '../../src/utils/format.js';

/** A product with a price in cents. */
const product = (id, price, stock = 50) => ({ id, name: id, price, currency: 'USD', stock });

/** An in-memory Storage area; `mode` imitates blocked storage or a full quota. */
function area(entries = {}, mode = 'ok') {
  const data = new Map(Object.entries(entries));
  return {
    data,
    getItem(key) {
      if (mode === 'blocked') throw new Error('SecurityError');
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      if (mode !== 'ok') throw new Error('QuotaExceededError');
      data.set(key, String(value));
    },
    removeItem(key) {
      if (mode === 'blocked') throw new Error('SecurityError');
      data.delete(key);
    },
  };
}

describe('zero, negative and invalid quantities', () => {
  it('validateQuantity turns 0, negatives and fractions below 1 into 1 and says why', () => {
    for (const requested of [0, -1, -100, 0.4, '0']) {
      expect(validateQuantity(requested, 5)).toEqual({
        quantity: 1,
        status: 'min',
        message: 'The smallest quantity is 1.',
      });
    }
  });

  it('text, empty input, NaN and Infinity are invalid, not silently 0', () => {
    for (const requested of ['', '  ', 'abc', NaN, Infinity, undefined, null]) {
      expect(validateQuantity(requested, 5).status).toBe('invalid');
      expect(validateQuantity(requested, 5).quantity).toBe(1);
    }
  });

  it('fractions are rounded down to whole items', () => {
    expect(validateQuantity(2.9, 5)).toEqual({ quantity: 2, status: 'ok', message: '' });
    expect(validateQuantity('3', 5)).toEqual({ quantity: 3, status: 'ok', message: '' });
  });

  it('adding 0 or a negative quantity leaves the cart unchanged', () => {
    expect(addToCart(EMPTY_CART, product('a', 1000), 0)).toBe(EMPTY_CART);
    expect(addToCart(EMPTY_CART, product('a', 1000), -3)).toBe(EMPTY_CART);
  });

  it('updating a line to 0 or a negative quantity removes it', () => {
    const cart = addToCart(EMPTY_CART, product('a', 1000), 2);
    expect(updateQuantity(cart, 'a', 0).lines).toEqual([]);
    expect(updateQuantity(cart, 'a', -1).lines).toEqual([]);
  });
});

describe('quantities above the stock and above the per-line limit', () => {
  it('exactly the stock is allowed; one more is reduced to the stock', () => {
    expect(validateQuantity(3, 3).status).toBe('ok');
    expect(validateQuantity(4, 3)).toEqual({
      quantity: 3,
      status: 'stock',
      message: 'Only 3 in stock.',
    });
  });

  it(`the limit is ${MAX_PER_LINE} even when more are in stock`, () => {
    expect(validateQuantity(MAX_PER_LINE, 50).status).toBe('ok');
    expect(validateQuantity(MAX_PER_LINE + 1, 50)).toEqual({
      quantity: MAX_PER_LINE,
      status: 'limit',
      message: `The limit is ${MAX_PER_LINE} per item.`,
    });
  });

  it('stock 0 is out of stock whatever is asked for', () => {
    for (const requested of [1, 0, 99]) expect(validateQuantity(requested, 0).status).toBe('out');
    expect(addToCart(EMPTY_CART, product('gone', 1000, 0), 1)).toBe(EMPTY_CART);
  });

  it('repeated adds never pass the stock', () => {
    let cart = EMPTY_CART;
    for (let i = 0; i < 5; i += 1) cart = addToCart(cart, product('lamp', 2500, 3), 2);
    expect(cart.lines[0].quantity).toBe(3);
  });

  it('a stored line above the stock is clamped when the cart is loaded', () => {
    const stored = {
      lines: [{ productId: 'lamp', name: 'Lamp', unitPrice: 2500, quantity: 99, stock: 3 }],
    };
    expect(rehydrate(stored).lines[0].quantity).toBe(3);
  });
});

describe('floating-point totals: money is integer cents, so sums are exact', () => {
  it('0.10 + 0.20 is exactly 0.30 (the float sum is 0.30000000000000004)', () => {
    expect(0.1 + 0.2 === 0.3).toBe(false);
    expect(toCents('0.10') + toCents('0.20')).toBe(30);
    const cart = [product('a', toCents('0.10')), product('b', toCents('0.20'))].reduce(
      (c, p) => addToCart(c, p, 1),
      EMPTY_CART,
    );
    expect(totals(cart.lines).subtotal).toBe(30);
  });

  it('3 × $1.10 + $0.10 + $0.20 = $3.60, plus $7.99 shipping = $11.59 (float: 3.6000000000000005)', () => {
    expect(1.1 * 3 + 0.1 + 0.2).toBe(3.6000000000000005);
    let cart = addToCart(EMPTY_CART, product('a', 110), 3);
    cart = addToCart(cart, product('b', 10), 1);
    cart = addToCart(cart, product('c', 20), 1);
    const t = totals(cart.lines);
    expect([t.subtotal, t.shipping, t.total]).toEqual([360, 799, 1159]);
    expect(formatMoney(t.total)).toBe('$11.59');
  });

  it(`${MAX_PER_LINE} × $33.33 is exactly $333.30`, () => {
    const cart = addToCart(EMPTY_CART, product('a', 3333), MAX_PER_LINE);
    expect(totals(cart.lines).subtotal).toBe(33330);
    expect(formatMoney(totals(cart.lines).total)).toBe('$333.30');
  });

  it('the free-shipping threshold is exact at $99.99 / $100.00', () => {
    expect(shippingFor(9999)).toBe(799);
    expect(shippingFor(10000)).toBe(0);
    expect(totals([]).total).toBe(0);
  });
});

describe('price-string parser', () => {
  it('toCents parses decimal strings without float error and rounds half up', () => {
    expect(toCents('19.99')).toBe(1999);
    expect(toCents('1.005')).toBe(101); // 1.005 * 100 in floating point is 100.49999999999999
    expect(toCents('1.004')).toBe(100);
    expect(toCents('0')).toBe(0);
    expect(toCents(' 7 ')).toBe(700);
    expect(toCents('2.5')).toBe(250);
  });

  it('toCents rejects anything that is not a plain amount', () => {
    for (const bad of ['', 'abc', '-1', '1,000', '$5', '1.2.3', null, undefined]) {
      expect(Number.isNaN(toCents(bad))).toBe(true);
    }
  });

  it('priceToCents reads TechSphere price strings with currency and thousands separators', () => {
    expect(priceToCents('EGP 33,999')).toBe(3399900);
    expect(priceToCents('1,299.50')).toBe(129950);
    expect(priceToCents(32999)).toBe(3299900);
    expect(priceToCents(0.29)).toBe(29); // 0.29 * 100 = 28.999999999999996 before rounding
  });

  it('priceToCents gives NaN, never 0, for a missing or unreadable price', () => {
    for (const bad of ['', 'free', null, undefined, NaN]) {
      expect(Number.isNaN(priceToCents(bad))).toBe(true);
    }
  });
});

describe('currency formatting', () => {
  it('formats cents in the given currency', () => {
    expect(formatMoney(0)).toBe('$0.00');
    expect(formatMoney(5)).toBe('$0.05');
    expect(formatMoney(199990)).toBe('$1,999.90');
    expect(formatMoney(3399900, 'EGP').replace(/\s/g, ' ')).toBe('EGP 33,999.00');
  });

  it('respects the locale', () => {
    expect(formatMoney(129950, 'EUR', 'de-DE').replace(/\s/g, ' ')).toBe('1.299,50 €');
  });
});

describe('query-string builder with awkward input', () => {
  it('drops null, undefined and empty values but keeps 0', () => {
    expect(buildQuery({ q: '', brand: null, minPrice: 0, page: undefined })).toBe('?minPrice=0');
  });

  it('encodes characters that would break the URL', () => {
    expect(buildQuery({ q: 'a&b=c #1' })).toBe('?q=a%26b%3Dc+%231');
  });

  it('ignores unknown, repeated and malicious parameters when reading a URL', () => {
    const query = parseCatalogQuery('?page=-4&limit=9999&sort=evil&q=%3Cscript%3E&foo=bar');
    expect([query.page, query.limit, query.sort]).toEqual([
      1,
      CATALOG_DEFAULTS.limit,
      CATALOG_DEFAULTS.sort,
    ]);
    expect(query.q).toBe('<script>');
    expect('foo' in query).toBe(false);
  });
});

describe('storage utility: missing, blocked, full or corrupted data never throws', () => {
  const local = (entries, mode) => createStorage(() => area(entries, mode));

  it('a missing key returns the fallback', () => {
    expect(local({}).readJson('local', 'nothing', 'fallback')).toBe('fallback');
  });

  it('corrupted JSON returns the fallback', () => {
    for (const text of ['{not json', 'undefined', '[1,2', '\u0000']) {
      expect(local({ k: text }).readJson('local', 'k', 'fallback')).toBe('fallback');
    }
  });

  it('no localStorage at all (the browser throws when it is touched) returns the fallback', () => {
    const storage = createStorage(() => {
      throw new Error('SecurityError: access denied');
    });
    expect(storage.readJson('local', KEYS.cart, null)).toBe(null);
    expect(storage.writeJson('local', KEYS.cart, { lines: [] })).toBe(false);
    expect(() => storage.remove('local', KEYS.cart)).not.toThrow();
  });

  it('a full or blocked storage area reports false instead of throwing', () => {
    expect(local({}, 'full').writeJson('local', 'k', 1)).toBe(false);
    expect(local({}, 'blocked').readJson('local', 'k', 'fallback')).toBe('fallback');
    expect(() => local({}, 'blocked').remove('local', 'k')).not.toThrow();
  });

  it('the cart store starts empty from corrupted, wrong-shaped or missing data', () => {
    const noWindow = { addEventListener() {} };
    for (const stored of [
      '{broken',
      '"a string"',
      '{"lines":"nope"}',
      '{"lines":[{"bad":true}]}',
      null,
    ]) {
      const entries = stored === null ? {} : { [KEYS.cart]: stored };
      const store = createCartStore(local(entries), noWindow);
      expect(store.get().lines).toEqual([]);
    }
  });

  it('the cart keeps working in memory when storage is blocked', () => {
    const store = createCartStore(local({}, 'blocked'), { addEventListener() {} });
    store.apply(addToCart, product('a', 1000), 2);
    expect(store.get().lines[0].quantity).toBe(2);
  });
});

describe('display text for ratings, stock and categories', () => {
  it('rating text has a visible and a spoken form, with grouped review counts', () => {
    expect(ratingText(4, 1240)).toEqual({
      text: '★ 4.0 (1,240)',
      label: 'Rated 4.0 out of 5 from 1,240 reviews',
    });
  });

  it('stock text: out of stock at 0 or below, a warning up to 5, nothing above', () => {
    expect([stockText(0), stockText(-2), stockText(5), stockText(6)]).toEqual([
      'Out of stock',
      'Out of stock',
      'Only 5 left',
      '',
    ]);
  });

  it('category labels, with unknown slugs made readable', () => {
    expect(categoryLabel('home-living')).toBe('Home & Living');
    expect(categoryLabel('smart-home')).toBe('Smart Home');
    expect(categoryLabel('garden-tools')).toBe('Garden tools');
    expect(categoryLabel('')).toBe('');
  });
});
