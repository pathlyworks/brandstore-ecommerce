/**
 * src/utils/facets.js
 *
 * Client-side facet counts for the filter panel, computed with array methods (filter, reduce, map).
 * Each facet is counted over the products that match every *other* active filter, so the numbers
 * show what you would get by choosing that option.
 */

/**
 * Count items per value of `key`.
 * @param {object[]} items
 * @param {string} key
 * @returns {Record<string, number>}
 */
export function countBy(items, key) {
  return items.reduce((counts, item) => {
    counts[item[key]] = (counts[item[key]] || 0) + 1;
    return counts;
  }, {});
}

/**
 * Options for one facet, sorted by label, with the selected value kept even when its count is 0.
 * @param {object[]} items products matching the other filters
 * @param {string} key product field, e.g. "category"
 * @param {string} selected currently selected value ("" = all)
 * @returns {{ value: string, count: number }[]}
 */
export function facetOptions(items, key, selected) {
  const counts = countBy(items, key);
  if (selected && !(selected in counts)) counts[selected] = 0;
  return Object.keys(counts)
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, count: counts[value] }));
}

/**
 * Category and brand facets for the current selection.
 * @param {object[]} items products matching search, price and rating (not category or brand)
 * @param {{ category: string, brand: string }} state
 * @returns {{ total: number, categories: { value: string, count: number }[], brands: { value: string, count: number }[] }}
 */
export function buildFacets(items, state) {
  const inBrand = items.filter((p) => !state.brand || p.brand === state.brand);
  const inCategory = items.filter((p) => !state.category || p.category === state.category);
  return {
    total: items.length,
    categories: facetOptions(inBrand, 'category', state.category),
    brands: facetOptions(inCategory, 'brand', state.brand),
  };
}

/**
 * Lowest and highest price (cents) among the items, or null when there are none.
 * @param {{ price: number }[]} items
 * @returns {{ min: number, max: number } | null}
 */
export function priceRange(items) {
  if (!items.length) return null;
  return items
    .map((p) => p.price)
    .reduce(
      (range, price) => ({ min: Math.min(range.min, price), max: Math.max(range.max, price) }),
      {
        min: Infinity,
        max: -Infinity,
      },
    );
}
