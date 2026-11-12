/** Unit tests for the client-side facet counts (src/utils/facets.js). */
import { describe, expect, it } from 'vitest';
import { buildFacets, countBy, priceRange } from '../../src/utils/facets.js';

const items = [
  { id: 'a', category: 'electronics', brand: 'Pulse', price: 1000 },
  { id: 'b', category: 'electronics', brand: 'Sonique', price: 3000 },
  { id: 'c', category: 'apparel', brand: 'Pulse', price: 2000 },
];

describe('facets', () => {
  it('counts items per value', () => {
    expect(countBy(items, 'category')).toEqual({ electronics: 2, apparel: 1 });
  });
  it('counts each facet over the other active filter', () => {
    const facets = buildFacets(items, { category: 'electronics', brand: '' });
    expect(facets.brands).toEqual([
      { value: 'Pulse', count: 1 },
      { value: 'Sonique', count: 1 },
    ]);
    expect(facets.categories).toEqual([
      { value: 'apparel', count: 1 },
      { value: 'electronics', count: 2 },
    ]);
  });
  it('keeps a selected value with zero matches so it can be unselected', () => {
    const facets = buildFacets(items, { category: 'home-living', brand: '' });
    expect(facets.categories.find((o) => o.value === 'home-living')).toEqual({
      value: 'home-living',
      count: 0,
    });
  });
  it('finds the price range', () => {
    expect(priceRange(items)).toEqual({ min: 1000, max: 3000 });
    expect(priceRange([])).toBe(null);
  });
});
