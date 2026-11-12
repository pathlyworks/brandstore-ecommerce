/**
 * src/state/catalog.js
 *
 * The catalog view (search, filters, sort, page). The URL query string is the source of truth:
 * every change is written to the URL (shareable, survives reload) and Back/Forward restore the
 * previous view. Nothing is written to Web Storage.
 */
import { createStore } from './store.js';
import { applyChange, parseCatalogQuery, toUrlQuery } from '../utils/query-string.js';

/**
 * @param {Location} location
 * @param {History} history
 * @param {Window} [win] for the popstate listener
 * @returns {{ get: () => import('../utils/query-string.js').CatalogQuery,
 *   update: (change: object, options?: { replace?: boolean }) => void,
 *   reset: () => void, onChange: (fn: (q: object) => void) => () => void, destroy: () => void }}
 */
export function createCatalogState(location, history, win = window) {
  const store = createStore(parseCatalogQuery(location.search));

  /** Write the view to the URL, then notify listeners. */
  function commit(next, replace) {
    const url = `${location.pathname}${toUrlQuery(next)}${location.hash}`;
    history[replace ? 'replaceState' : 'pushState'](null, '', url);
    store.set(next);
  }

  /** Back/Forward: read the URL again. */
  function onPopState() {
    store.set(parseCatalogQuery(location.search));
  }
  win.addEventListener('popstate', onPopState);

  return {
    get: store.get,
    update(change, { replace = false } = {}) {
      const next = applyChange(store.get(), change);
      if (toUrlQuery(next) !== toUrlQuery(store.get())) commit(next, replace);
    },
    reset() {
      commit(parseCatalogQuery(''), false);
    },
    onChange: store.subscribe,
    destroy: () => win.removeEventListener('popstate', onPopState),
  };
}
