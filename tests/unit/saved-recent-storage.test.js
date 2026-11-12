/** Unit tests for save-for-later, recently viewed, the storage wrapper and the persisted stores. */
import { afterEach, describe, expect, it } from 'vitest';
import { PRODUCTS } from '../../mock-server/data.mjs';
import * as storage from '../../src/utils/storage.js';
import { addToCart, createCart, EMPTY_CART, toLine } from '../../src/state/cart.js';
import {
  EMPTY_SAVED,
  moveToCart,
  moveToSaved,
  removeSaved,
  saveItem,
  createSaved,
} from '../../src/state/saved.js';
import { addRecent, readRecent, recordView, RECENT_LIMIT } from '../../src/state/recent.js';

const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

/** An in-memory Storage, optionally one that throws like private mode or a full quota. */
function fakeStorage({ throws = false } = {}) {
  const data = new Map();
  return {
    getItem: (k) => {
      if (throws) throw new Error('SecurityError');
      return data.has(k) ? data.get(k) : null;
    },
    setItem: (k, v) => {
      if (throws) throw new Error('QuotaExceededError');
      data.set(k, String(v));
    },
    removeItem: (k) => data.delete(k),
    data,
  };
}

/** Install a fake window with localStorage, sessionStorage and event listeners. */
function fakeWindow(options) {
  const win = {
    localStorage: fakeStorage(options),
    sessionStorage: fakeStorage(options),
    listeners: {},
  };
  win.addEventListener = (type, fn) => (win.listeners[type] = fn);
  globalThis.window = win;
  return win;
}

afterEach(() => {
  delete globalThis.window;
});

describe('save for later', () => {
  it('moves a line from the cart to the saved list and back, keeping the quantity', () => {
    const cart = addToCart(EMPTY_CART, byId.smartwatch, 2);
    const parked = moveToSaved({ cart, saved: EMPTY_SAVED }, 'smartwatch');
    expect([parked.cart.lines.length, parked.saved.items[0].quantity]).toEqual([0, 2]);
    const back = moveToCart(parked, 'smartwatch');
    expect([back.cart.lines[0].quantity, back.saved.items.length, back.reason]).toEqual([2, 0, '']);
  });
  it('refuses to move an out-of-stock item to the cart and says why', () => {
    const saved = saveItem(EMPTY_SAVED, toLine(byId['usb-c-hub'], 1));
    const result = moveToCart({ cart: EMPTY_CART, saved }, 'usb-c-hub');
    expect(result.reason).toContain('Out of stock');
    expect(result.saved).toBe(saved);
  });
  it('has no duplicates and can remove items', () => {
    const once = saveItem(EMPTY_SAVED, toLine(byId.smartwatch, 1));
    const twice = saveItem(once, toLine(byId.smartwatch, 3));
    expect([twice.items.length, twice.items[0].quantity]).toEqual([1, 3]);
    expect(removeSaved(twice, 'smartwatch').items).toEqual([]);
  });
});

describe('recently viewed', () => {
  it('puts the newest first without duplicates', () => {
    const list = ['a', 'b', 'a'].reduce(
      (acc, id) => addRecent(acc, { ...byId.smartwatch, id }),
      [],
    );
    expect(list.map((p) => p.id)).toEqual(['a', 'b']);
  });
  it(`keeps at most ${RECENT_LIMIT}`, () => {
    const list = PRODUCTS.reduce((acc, p) => addRecent(acc, p), []);
    expect(list.length).toBe(RECENT_LIMIT);
    expect(list[0].id).toBe(PRODUCTS[PRODUCTS.length - 1].id);
  });
  it('is stored in sessionStorage', () => {
    const win = fakeWindow();
    recordView(storage, byId.smartwatch);
    expect(win.sessionStorage.data.has(storage.KEYS.recent)).toBe(true);
    expect(win.localStorage.data.size).toBe(0);
    expect(readRecent(storage)[0].id).toBe('smartwatch');
  });
});

describe('storage wrapper and persisted stores', () => {
  it('never throws when storage is blocked or full', () => {
    fakeWindow({ throws: true });
    expect(storage.readJson('local', 'x', 'fallback')).toBe('fallback');
    expect(storage.writeJson('local', 'x', 1)).toBe(false);
  });
  it('ignores corrupt JSON', () => {
    const win = fakeWindow();
    win.localStorage.setItem(storage.KEYS.cart, '{not json');
    expect(storage.readJson('local', storage.KEYS.cart, EMPTY_CART)).toBe(EMPTY_CART);
  });
  it('the cart persists to localStorage and rehydrates in a new store (refresh / return visit)', () => {
    const win = fakeWindow();
    const cart = createCart(storage, win);
    cart.apply(addToCart, byId.smartwatch, 2);
    const again = createCart(storage, win);
    expect(again.get().lines[0].quantity).toBe(2);
    expect(again.totals().total).toBe(29998);
  });
  it('the saved list persists separately from the cart', () => {
    const win = fakeWindow();
    createSaved(storage, win).set(saveItem(EMPTY_SAVED, toLine(byId.smartwatch, 1)));
    createCart(storage, win).apply(() => ({ lines: [] }));
    expect(createSaved(storage, win).get().items.length).toBe(1);
    expect(win.localStorage.data.has(storage.KEYS.saved)).toBe(true);
  });
});
