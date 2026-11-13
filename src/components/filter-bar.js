/**
 * src/components/filter-bar.js
 *
 * The catalog filter panel: debounced search, category and brand (radio groups with live counts),
 * price range (in dollars, sent as cents), minimum rating, and "Clear all filters". It only reports
 * changes; the catalog state decides the new view (and resets the page to 1).
 */
import * as dom from '../utils/dom.js';
import { debounce } from '../utils/debounce.js';
import { toCents } from '../utils/money.js';
import { categoryLabel } from '../utils/format.js';

/**
 * One radio option, e.g. "Electronics (4)".
 * @param {string} name input name ("category" or "brand")
 * @param {{ value: string, label: string, count: number }} option
 * @param {boolean} checked
 * @returns {HTMLLabelElement}
 */
function radioOption(name, option, checked) {
  const input = dom.el('input', {
    className: 'filters__radio',
    attrs: { type: 'radio', name, value: option.value, checked: checked ? '' : null },
  });
  input.checked = checked;
  input.disabled = option.count === 0 && !checked;
  return dom.el('label', { className: 'filters__option' }, [
    input,
    dom.el('span', { text: option.label }),
    dom.el('span', { className: 'filters__count', text: `(${option.count})` }),
  ]);
}

/**
 * Same options as on screen: update checked state, availability and counts on the existing radios
 * instead of replacing them, so the radio being used keeps focus and nothing moves under the pointer.
 * @param {HTMLElement} container
 * @param {{ value: string, count: number }[]} items
 * @param {string} selected
 * @returns {boolean} false when the options changed and the group must be rebuilt
 */
function updateInPlace(container, items, selected) {
  const inputs = [...container.querySelectorAll('input')];
  if (inputs.length !== items.length || inputs.some((input, i) => input.value !== items[i].value)) {
    return false;
  }
  inputs.forEach((input, i) => {
    const checked = items[i].value === selected;
    if (input.checked !== checked) input.checked = checked;
    input.disabled = items[i].count === 0 && !checked;
    const count = input.parentElement.querySelector('.filters__count');
    const text = `(${items[i].count})`;
    if (count && count.textContent !== text) count.textContent = text;
  });
  return true;
}

/**
 * Rebuild a radio group: "All" plus one option per facet value. If a radio in the group had keyboard
 * focus (a shopper moving through it with the arrow keys), the new radio with the same value gets it
 * back, so focus never falls to the page body when the counts are refreshed.
 * @param {HTMLElement} container
 * @param {string} name
 * @param {{ value: string, count: number }[]} options
 * @param {string} selected
 * @param {(value: string) => string} label
 */
function renderGroup(container, name, options, selected, label) {
  const focused = container.contains(document.activeElement) ? document.activeElement.value : null;
  const total = options.reduce((sum, option) => sum + option.count, 0);
  const all = { value: '', label: 'All', count: total };
  const items = [all, ...options.map((o) => ({ ...o, label: label(o.value) }))];
  if (updateInPlace(container, items, selected)) return;
  dom.clear(container);
  items.forEach((option) =>
    container.appendChild(radioOption(name, option, option.value === selected)),
  );
  if (focused !== null) {
    const again = [...container.querySelectorAll('input')].find((i) => i.value === focused);
    (again || container.querySelector('input:checked'))?.focus();
  }
}

/**
 * Dollars text from cents ("" for none), for the price inputs.
 * @param {number | null} cents
 * @returns {string}
 */
function dollars(cents) {
  return cents === null ? '' : String(cents / 100);
}

/**
 * Read and check the price inputs. Returns the change to apply, or an error message.
 * @param {HTMLInputElement} minInput
 * @param {HTMLInputElement} maxInput
 * @returns {{ change?: { minPrice: number | null, maxPrice: number | null }, error?: string }}
 */
export function readPriceRange(minInput, maxInput) {
  const read = (input) => (input.value.trim() === '' ? null : toCents(input.value));
  const minPrice = read(minInput);
  const maxPrice = read(maxInput);
  if (Number.isNaN(minPrice) || Number.isNaN(maxPrice)) {
    return { error: 'Enter prices as numbers, for example 25 or 49.99.' };
  }
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    return { error: 'The minimum price must not be higher than the maximum.' };
  }
  return { change: { minPrice, maxPrice } };
}

/**
 * Find the panel's controls by id inside the form.
 * @param {HTMLFormElement} form
 * @returns {Record<string, HTMLElement>}
 */
function findControls(form) {
  const byId = (id) => dom.qs(`#${id}`, form);
  return {
    search: byId('catalog-search'),
    categories: byId('facet-category'),
    brands: byId('facet-brand'),
    minPrice: byId('price-min'),
    maxPrice: byId('price-max'),
    priceError: byId('price-error'),
    rating: byId('catalog-rating'),
    reset: byId('catalog-reset'),
  };
}

/**
 * Listen to every control and report changes.
 * @param {HTMLFormElement} form
 * @param {Record<string, HTMLElement>} c controls
 * @param {{ onChange: Function, onReset: () => void, debounceMs: number }} deps
 * @returns {{ search: { flush: () => void, cancel: () => void } }}
 */
function bindEvents(form, c, { onChange, onReset, debounceMs }) {
  const search = debounce((q) => onChange({ q: q.trim() }, { replace: true }), debounceMs);
  c.search.addEventListener('input', () => search(c.search.value));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    search(c.search.value);
    search.flush();
  });
  form.addEventListener('change', (event) => {
    const { name, value } = event.target;
    if (name === 'category' || name === 'brand') onChange({ [name]: value });
    if (name === 'minRating') onChange({ minRating: value ? Number(value) : null });
    if (name === 'minPrice' || name === 'maxPrice') {
      const result = readPriceRange(c.minPrice, c.maxPrice);
      c.priceError.textContent = result.error || '';
      c.minPrice.setAttribute('aria-invalid', String(Boolean(result.error)));
      c.maxPrice.setAttribute('aria-invalid', String(Boolean(result.error)));
      if (result.change) onChange(result.change);
    }
  });
  c.reset.addEventListener('click', () => {
    search.cancel();
    onReset();
  });
  return { search };
}

/**
 * @param {HTMLFormElement} form the filter panel
 * @param {{ onChange: (change: object, options?: { replace?: boolean }) => void,
 *   onReset: () => void, debounceMs: number }} deps
 * @returns {{ render: (query: object, facets: object | null) => void, unmount: () => void }}
 */
export function mount(form, deps) {
  const c = findControls(form);
  const { search } = bindEvents(form, c, deps);
  return {
    render(query, facets) {
      if (document.activeElement !== c.search) c.search.value = query.q;
      if (document.activeElement !== c.minPrice) c.minPrice.value = dollars(query.minPrice);
      if (document.activeElement !== c.maxPrice) c.maxPrice.value = dollars(query.maxPrice);
      c.rating.value = query.minRating === null ? '' : String(query.minRating);
      if (document.activeElement !== c.minPrice && document.activeElement !== c.maxPrice) {
        c.priceError.textContent = '';
      }
      if (!facets) return;
      renderGroup(c.categories, 'category', facets.categories, query.category, categoryLabel);
      renderGroup(c.brands, 'brand', facets.brands, query.brand, (v) => v);
    },
    unmount: () => search.cancel(),
  };
}
