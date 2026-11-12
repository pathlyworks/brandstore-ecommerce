/**
 * Unit tests for save-for-later and recently viewed (pure), the storage helpers, and the persisted
 * stores, including corrupted stored data. Storage is an in-memory fake injected through
 * createStorage, so no browser is needed.
 */
import { describe, expect, it } from 'vitest';
import { PRODUCTS } from '../../mock-server/data.mjs';
import { createStorage, KEYS } from '../../src/utils/storage.js';
import { addToCart, EMPTY_CART, rehydrate, toLine } from '../../src/state/cart.js';
import {
  EMPTY_SAVED,
  moveToCart,
  moveToSaved,
  rehydrateSaved,
  removeSaved,
  saveItem,
} from '../../src/state/saved.js';
import { addRecent, rehydrateRecent, RECENT_LIMIT } from '../../src/state/recent.js';
import { createCartStore, createRecentStore, createSavedStore } from '../../src/state/stores.js';

const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

/** An in-memory Storage; `throws` imitates private mode or a full quota. */
function fakeArea({ throws = false } = {}) {
  const data = new Map();
  return {
    data,
    getItem: (k) => {
      if (throws) throw new Error('SecurityError');
      return data.has(k) ? data.get(k) : null;
    },
    setItem: (k, v) => {
      if (throws) throw new Error('QuotaExceededError');
      data.set(k, String(v));
    },
    removeItem: (k) => data.delete(k),
  };
}

/** Storage helpers over two fake areas, plus a fake window for the storage event. */
function fakeBrowser(options) {
  const areas = { local: fakeArea(options), session: fakeArea(options) };
  const win = { addEventListener: () => {} };
  return { areas, win, storage: createStorage((area) => areas[area]) };
}

describe('save for later (pure)', () => {
  it('moves a line to the saved list and back, keeping the quantity', () => {
    const cart = addToCart(EMPTY_CART, byId.smartwatch, 2);
    const parked = moveToSaved({ cart, saved: EMPTY_SAVED }, 'smartwatch');
    expect([parked.cart.lines.length, parked.saved.items[0].quantity]).toEqual([0, 2]);
    const back = moveToCart(parked, 'smartwatch');
    expect([back.cart.lines[0].quantity, back.saved.items.length, back.reason]).toEqual([2, 0, '']);
  });
  it('refuses to move an out-of-stock item to the cart and says why', () => {
    const saved = saveItem(EMPTY_SAVED, toLine(byId['usb-c-hub'], 1));
    const result = moveToCart({ cart: EMPTY_CART, saved }, 'usb-c-hub');
    expect([result.reason.startsWith('Out of stock'), result.saved === saved]).toEqual([
      true,
      true,
    ]);
  });
  it('has no duplicates and can remove items', () => {
    const twice = saveItem(
      saveItem(EMPTY_SAVED, toLine(byId.smartwatch, 1)),
      toLine(byId.smartwatch, 3),
    );
    expect([twice.items.length, twice.items[0].quantity]).toEqual([1, 3]);
    expect(removeSaved(twice, 'smartwatch').items).toEqual([]);
  });
});

describe('recently viewed (pure)', () => {
  it('puts the newest first without duplicates', () => {
    const list = ['a', 'b', 'a'].reduce(
      (acc, id) => addRecent(acc, { ...byId.smartwatch, id }),
      [],
    );
    expect(list.map((p) => p.id)).toEqual(['a', 'b']);
  });
  it(`keeps at most ${RECENT_LIMIT}`, () => {
    const list = PRODUCTS.reduce((acc, p) => addRecent(acc, p), []);
    expect([list.length, list[0].id]).toEqual([RECENT_LIMIT, PRODUCTS[PRODUCTS.length - 1].id]);
  });
});

describe('corrupted stored data is repaired, never fatal', () => {
  const good = toLine(byId.smartwatch, 2);
  it('cart: drops broken lines, merges duplicates, fixes image/currency, accepts numeric strings, re-clamps', () => {
    const data = {
      lines: [
        { ...good, quantity: '3' },
        { ...good, quantity: 9 },
        {
          ...good,
          productId: 'x',
          name: 'X',
          image: null,
          currency: 'dollars',
          quantity: 50,
          stock: 4,
        },
        { productId: 'no-price', name: 'N', quantity: 1, stock: 1 },
        { ...good, productId: 'neg', unitPrice: -5 },
        { ...good, productId: 'zero', quantity: 0 },
        'garbage',
        null,
      ],
    };
    const { lines } = rehydrate(data);
    expect(lines.map((l) => [l.productId, l.quantity])).toEqual([
      ['smartwatch', 3],
      ['x', 4],
    ]);
    expect([lines[1].currency, lines[1].image.url]).toEqual([
      'USD',
      '/assets/product-placeholder.svg',
    ]);
  });
  it('cart, saved, recent: wrong types become empty', () => {
    for (const bad of [null, 42, 'text', [], { lines: 'x' }, { items: {} }]) {
      expect(rehydrate(bad)).toEqual({ lines: [] });
      expect(rehydrateSaved(bad)).toEqual({ items: [] });
    }
    expect(rehydrateRecent({ not: 'an array' })).toEqual([]);
    expect(
      rehydrateRecent([
        { id: 'a' },
        { id: 'b', name: 'B', price: 1, image: { url: '/b.svg' } },
      ]).map((p) => p.id),
    ).toEqual(['b']);
  });
  it('a store loading corrupt JSON starts empty; repaired data is written back once', () => {
    const { areas, win, storage } = fakeBrowser();
    areas.local.setItem(KEYS.cart, '{not json');
    expect(createCartStore(storage, win).get()).toEqual(EMPTY_CART);
    areas.local.setItem(KEYS.cart, JSON.stringify({ lines: [good, 'junk'] }));
    createCartStore(storage, win);
    expect(JSON.parse(areas.local.data.get(KEYS.cart)).lines.length).toBe(1);
  });
  it('blocked or full storage never throws: the stores work in memory', () => {
    const { win, storage } = fakeBrowser({ throws: true });
    const cart = createCartStore(storage, win);
    cart.apply(addToCart, byId.smartwatch, 1);
    expect([storage.readJson('local', 'k', 'fallback'), cart.get().lines.length]).toEqual([
      'fallback',
      1,
    ]);
  });
});

describe('persistence as specified', () => {
  it('cart -> localStorage, rehydrated by a new store (refresh / return visit)', () => {
    const { areas, win, storage } = fakeBrowser();
    createCartStore(storage, win).dispatch({ type: 'add', product: byId.smartwatch, quantity: 2 });
    const again = createCartStore(storage, win);
    expect([
      again.get().lines[0].quantity,
      again.summary().total,
      areas.local.data.has(KEYS.cart),
    ]).toEqual([2, 29998, true]);
  });
  it('saved -> localStorage under its own key; clearing the cart keeps it', () => {
    const { areas, win, storage } = fakeBrowser();
    createSavedStore(storage, win).set(saveItem(EMPTY_SAVED, toLine(byId.smartwatch, 1)));
    createCartStore(storage, win).dispatch({ type: 'clear' });
    expect([
      createSavedStore(storage, win).get().items.length,
      areas.local.data.has(KEYS.saved),
    ]).toEqual([1, true]);
  });
  it('recent -> sessionStorage only', () => {
    const { areas, storage } = fakeBrowser();
    createRecentStore(storage).view(byId.smartwatch);
    expect([areas.session.data.has(KEYS.recent), areas.local.data.size]).toEqual([true, 0]);
    expect(createRecentStore(storage).get()[0].id).toBe('smartwatch');
  });
});
