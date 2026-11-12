/**
 * src/state/stores.js
 *
 * The side-effect layer around the pure state modules: each store reads its data from Web Storage
 * through utils/storage.js, repairs it with the module's rehydrate function (and writes the repaired
 * version back, so corrupt data is cleaned once), saves every new state, notifies subscribers, and
 * follows changes made in other tabs (the "storage" event).
 *
 *   cart   -> localStorage   brandstore:cart:v1    (survives refresh, tab close, return visits)
 *   saved  -> localStorage   brandstore:saved:v1   (separate key, same lifetime)
 *   recent -> sessionStorage brandstore:recent:v1  (this tab only)
 */
import { createStore } from './store.js';
import { cartReducer, cartSummary, EMPTY_CART, rehydrate } from './cart.js';
import { EMPTY_SAVED, rehydrateSaved } from './saved.js';
import { addRecent, rehydrateRecent } from './recent.js';
import { KEYS } from '../utils/storage.js';

/**
 * A store persisted under one key.
 * @param {{ readJson: Function, writeJson: Function }} storage utils/storage.js (or a fake)
 * @param {{ area: 'local' | 'session', key: string, empty: unknown, repair: (data: unknown) => any,
 *   win?: { addEventListener: Function } }} options
 * @returns {{ get: () => any, set: (next: any) => void, subscribe: Function }}
 */
export function createPersistedStore(storage, { area, key, empty, repair, win }) {
  const stored = storage.readJson(area, key, empty);
  const initial = repair(stored);
  if (JSON.stringify(initial) !== JSON.stringify(stored) && stored !== empty)
    storage.writeJson(area, key, initial);
  const store = createStore(initial);
  win?.addEventListener('storage', (event) => {
    if (event.key === key) store.set(repair(storage.readJson(area, key, empty)));
  });
  return {
    get: store.get,
    set(next) {
      storage.writeJson(area, key, next);
      store.set(next);
    },
    subscribe: store.subscribe,
  };
}

/**
 * The cart store: dispatch(action) runs the pure cartReducer; apply(fn, ...args) runs any pure function.
 * @param {object} storage
 * @param {object} [win] defaults to the browser window
 * @returns {object}
 */
export function createCartStore(storage, win = globalThis.window) {
  const store = createPersistedStore(storage, {
    area: 'local',
    key: KEYS.cart,
    empty: EMPTY_CART,
    repair: rehydrate,
    win,
  });
  /** Save and publish a new state (only when it really changed). */
  const commit = (next) => (next !== store.get() && store.set(next), next);
  return {
    ...store,
    summary: () => cartSummary(store.get()),
    dispatch: (action) => commit(cartReducer(store.get(), action)),
    apply: (fn, ...args) => commit(fn(store.get(), ...args)),
  };
}

/**
 * The saved-for-later store.
 * @param {object} storage
 * @param {object} [win]
 * @returns {object}
 */
export function createSavedStore(storage, win = globalThis.window) {
  return createPersistedStore(storage, {
    area: 'local',
    key: KEYS.saved,
    empty: EMPTY_SAVED,
    repair: rehydrateSaved,
    win,
  });
}

/**
 * The recently viewed store (sessionStorage), with view(product) to record a visit.
 * @param {object} storage
 * @returns {object}
 */
export function createRecentStore(storage) {
  const store = createPersistedStore(storage, {
    area: 'session',
    key: KEYS.recent,
    empty: [],
    repair: rehydrateRecent,
  });
  return { ...store, view: (product) => (store.set(addRecent(store.get(), product)), store.get()) };
}
