/** Unit tests for the static catalogue in src/state/content.js (what the home page renders). */
import { describe, expect, it } from 'vitest';
import { products, testimonials } from '../../src/state/content.js';

describe('content', () => {
  it('has 3 products with the prices shown on the site and in the API seed data', () => {
    expect(products.map((p) => [p.id, p.price])).toEqual([
      ['headphones-pro', 199.99],
      ['smartwatch', 149.99],
      ['leather-backpack', 89.99],
    ]);
  });

  it('gives every product a unique id, a category and image alt text', () => {
    expect(new Set(products.map((p) => p.id)).size).toBe(products.length);
    for (const p of products) {
      expect(typeof p.category).toBe('string');
      expect(p.image.alt.length > 0).toBe(true);
    }
  });

  it('has 2 testimonials', () => {
    expect(testimonials.length).toBe(2);
  });
});
