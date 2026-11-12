/** Unit tests for src/utils/query-string.js (HIGH RISK: wrong strings mean wrong results or 400s). */
import { describe, expect, it } from 'vitest';
import {
  applyChange,
  buildQuery,
  CATALOG_DEFAULTS,
  parseCatalogQuery,
  toApiQuery,
  toUrlQuery,
} from '../../src/utils/query-string.js';

describe('buildQuery', () => {
  it('drops empty values and sorts keys', () => {
    expect(buildQuery({ page: 1, category: 'electronics', q: '', brand: null })).toBe(
      '?category=electronics&page=1',
    );
  });
  it('encodes spaces, & and non-ASCII', () => {
    expect(buildQuery({ q: 'socks & café' })).toBe('?q=socks+%26+caf%C3%A9');
  });
  it('returns "" when nothing is left', () => {
    expect(buildQuery({ q: '', brand: undefined })).toBe('');
  });
});

describe('parseCatalogQuery', () => {
  it('reads every supported parameter', () => {
    const q = parseCatalogQuery(
      '?q=wool&category=apparel&brand=Northline&minPrice=1000&maxPrice=5000&minRating=4.5&sort=price_asc&page=2',
    );
    expect(q).toEqual({
      q: 'wool',
      category: 'apparel',
      brand: 'Northline',
      minPrice: 1000,
      maxPrice: 5000,
      minRating: 4.5,
      sort: 'price_asc',
      page: 2,
      limit: 6,
    });
  });
  it('replaces invalid values with defaults instead of sending a request the API would reject', () => {
    const q = parseCatalogQuery(
      '?page=0&limit=500&sort=cheapest&minRating=9&minPrice=abc&category=<x>',
    );
    expect(q).toEqual({ ...CATALOG_DEFAULTS });
  });
  it('swaps a reversed price range', () => {
    const q = parseCatalogQuery('?minPrice=9000&maxPrice=1000');
    expect([q.minPrice, q.maxPrice]).toEqual([1000, 9000]);
  });
  it('round-trips through the URL form', () => {
    const view = { ...CATALOG_DEFAULTS, q: 'lamp', brand: 'Hearth', minRating: 4, page: 3 };
    expect(parseCatalogQuery(toUrlQuery(view))).toEqual(view);
  });
});

describe('toUrlQuery / toApiQuery', () => {
  it('keeps default page and limit out of the page URL but always sends them to the API', () => {
    expect(toUrlQuery({ ...CATALOG_DEFAULTS, category: 'apparel' })).toBe('?category=apparel');
    expect(toApiQuery({ ...CATALOG_DEFAULTS, category: 'apparel' })).toBe(
      '?category=apparel&limit=6&page=1',
    );
  });
});

describe('applyChange', () => {
  const onPage3 = { ...CATALOG_DEFAULTS, category: 'apparel', page: 3 };
  it('resets to page 1 when a filter changes', () => {
    expect(applyChange(onPage3, { brand: 'Northline' }).page).toBe(1);
  });
  it('resets to page 1 when the sort changes', () => {
    expect(applyChange(onPage3, { sort: 'price_desc' }).page).toBe(1);
  });
  it('keeps the filters when only the page changes', () => {
    expect(applyChange(onPage3, { page: 2 })).toEqual({ ...onPage3, page: 2 });
  });
  it('does not reset the page when a filter is set to the value it already has', () => {
    expect(applyChange(onPage3, { category: 'apparel' }).page).toBe(3);
  });
});
