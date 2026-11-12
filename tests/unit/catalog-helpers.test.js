/** Unit tests for debounce, the latest-request runner, money, error wording and the results summary. */
import { describe, expect, it } from 'vitest';
import { debounce } from '../../src/utils/debounce.js';
import { createLatestRunner, SUPERSEDED } from '../../src/utils/latest.js';
import { formatMoney, toCents } from '../../src/utils/money.js';
import { ApiError, describeError } from '../../src/api/errors.js';
import { resultsSummary } from '../../src/components/catalog-view.js';
import { readPriceRange } from '../../src/components/filter-bar.js';

const wait = (ms) => new Promise((done) => setTimeout(done, ms));

describe('debounce', () => {
  it('calls once, with the last arguments, after calls stop', async () => {
    const calls = [];
    const fn = debounce((v) => calls.push(v), 30);
    fn('w');
    fn('wo');
    fn('wool');
    expect(calls).toEqual([]);
    await wait(60);
    expect(calls).toEqual(['wool']);
  });
  it('flush runs immediately; cancel drops the pending call', async () => {
    const calls = [];
    const fn = debounce((v) => calls.push(v), 30);
    fn('a');
    fn.flush();
    fn('b');
    fn.cancel();
    await wait(60);
    expect(calls).toEqual(['a']);
  });
});

describe('createLatestRunner', () => {
  it('aborts the older request and ignores its late answer', async () => {
    const runner = createLatestRunner();
    let firstSignal;
    const slow = runner.run((signal) => {
      firstSignal = signal;
      return wait(50).then(() => 'old');
    });
    const fast = runner.run(() => Promise.resolve('new'));
    expect(await fast).toBe('new');
    expect(await slow).toBe(SUPERSEDED);
    expect(firstSignal.aborted).toBe(true);
  });
  it('passes real errors of the newest request through', async () => {
    const runner = createLatestRunner();
    let caught = null;
    await runner
      .run(() => Promise.reject(new ApiError(500, 'INTERNAL', 'x')))
      .catch((e) => {
        caught = e;
      });
    expect(caught.status).toBe(500);
  });
});

describe('money', () => {
  it('parses dollars to integer cents without floating-point drift', () => {
    expect(toCents('19.99')).toBe(1999);
    expect(toCents('0.1')).toBe(10);
    expect(toCents('2.005')).toBe(201);
    expect(Number.isNaN(toCents('-5'))).toBe(true);
  });
  it('formats cents as currency', () => {
    expect(formatMoney(19999)).toBe('$199.99');
  });
});

describe('describeError', () => {
  it('has a specific message for 400, 404, 429, 500 and no connection', () => {
    expect(
      describeError(new ApiError(400, 'VALIDATION_ERROR', 'x', [{ field: 'minRating' }])).message,
    ).toContain('minRating');
    expect(describeError(new ApiError(404, 'NOT_FOUND', 'x')).title).toBe('Not found');
    expect(describeError(new ApiError(429, 'RATE_LIMITED', 'x', [], 5)).message).toContain(
      '5 seconds',
    );
    expect(describeError(new ApiError(503, 'X', 'x')).title).toBe(
      'Something went wrong on our side',
    );
    expect(describeError(new TypeError('Failed to fetch')).title).toBe('Could not reach the store');
  });
  it('offers reset for 400/404 and retry for 429/500', () => {
    expect(
      [400, 404, 429, 500].map((s) => describeError(new ApiError(s, 'X', 'x')).action),
    ).toEqual(['reset', 'reset', 'retry', 'retry']);
  });
});

describe('catalog helpers', () => {
  it('summarises the visible range', () => {
    expect(resultsSummary({ page: 2, limit: 6, total: 12 }, 6)).toBe('Showing 7–12 of 12 products');
    expect(resultsSummary({ page: 1, limit: 6, total: 0 }, 0)).toBe(
      'No products match your filters.',
    );
  });
  it('validates the price inputs in dollars', () => {
    const input = (value) => ({ value });
    expect(readPriceRange(input('10'), input('49.99'))).toEqual({
      change: { minPrice: 1000, maxPrice: 4999 },
    });
    expect(readPriceRange(input(''), input(''))).toEqual({
      change: { minPrice: null, maxPrice: null },
    });
    expect(readPriceRange(input('50'), input('10')).error).toContain('minimum');
    expect(readPriceRange(input('ten'), input('')).error).toContain('numbers');
  });
});
