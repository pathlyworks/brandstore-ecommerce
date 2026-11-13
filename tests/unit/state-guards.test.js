/**
 * Guards around stored state that no other test pinned down. Each test fails when the rule it names is broken:
 * - a stored cart line may be free (price 0) or out of stock (stock 0); only negative numbers are corrupt;
 * - a valid stored session comes back as it was (not as signed out);
 * - a store follows a change made in another tab only for its own key.
 */
import { describe, expect, it } from 'vitest';
import { sanitizeLine } from '../../src/state/cart.js';
import { rehydrateSession, SIGNED_OUT } from '../../src/state/session.js';
import { createPersistedStore } from '../../src/state/stores.js';

const LINE = {
  productId: 'p-001',
  name: 'Nova Laptop 14',
  unitPrice: 3399900,
  quantity: 1,
  stock: 5,
  currency: 'EGP',
};

describe('sanitizeLine: limits of a stored line', () => {
  it('keeps a free line (price 0) and an out-of-stock line (stock 0)', () => {
    expect(sanitizeLine({ ...LINE, unitPrice: 0 })?.unitPrice).toBe(0);
    expect(sanitizeLine({ ...LINE, stock: 0 })?.stock).toBe(0);
  });

  it('drops negative prices and negative stock', () => {
    expect(sanitizeLine({ ...LINE, unitPrice: -1 })).toBe(null);
    expect(sanitizeLine({ ...LINE, stock: -1 })).toBe(null);
  });
});

describe('rehydrateSession: a valid stored session survives a refresh', () => {
  it('returns the stored token, expiry and user', () => {
    const stored = {
      token: 'header.payload.signature',
      expiresAt: 1_900_000_000_000,
      user: { email: 'student@techsphere.test', name: 'Test Student', role: 'shopper' },
    };
    expect(rehydrateSession(stored)).toEqual(stored);
  });

  it('treats anything that is not an object as signed out', () => {
    expect(rehydrateSession('header.payload.signature')).toEqual(SIGNED_OUT);
    expect(rehydrateSession(null)).toEqual(SIGNED_OUT);
  });
});

describe('createPersistedStore: changes from other tabs', () => {
  /** In-memory storage with the readJson/writeJson shape of utils/storage.js, and a fake window. */
  function setup() {
    const data = { 'local:cart': { n: 1 }, 'local:other': { n: 99 } };
    const storage = {
      readJson: (area, key, empty) => data[`${area}:${key}`] ?? empty,
      writeJson: (area, key, value) => {
        data[`${area}:${key}`] = value;
      },
    };
    let onStorage = () => {};
    const win = {
      addEventListener: (type, fn) => {
        if (type === 'storage') onStorage = fn;
      },
    };
    const store = createPersistedStore(storage, {
      area: 'local',
      key: 'cart',
      empty: {},
      repair: (value) => value,
      win,
    });
    return { data, store, fire: (key) => onStorage({ key }) };
  }

  it('reloads when another tab changes its own key', () => {
    const { data, store, fire } = setup();
    data['local:cart'] = { n: 2 };
    fire('cart');
    expect(store.get()).toEqual({ n: 2 });
  });

  it('ignores changes to other keys', () => {
    const { store, fire } = setup();
    fire('other');
    expect(store.get()).toEqual({ n: 1 });
  });
});
