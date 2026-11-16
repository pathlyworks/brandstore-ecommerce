import { describe, expect, it } from 'vitest';
import { pageOf, sortRows } from './table.model';

const rows = [
  { id: 'a', n: 3, t: 'pear' },
  { id: 'b', n: 1, t: 'apple' },
  { id: 'c', n: 3, t: 'fig' },
  { id: 'd', n: 2, t: 'Banana' },
];

describe('sortRows<Row>', () => {
  it('sorts numbers as numbers, both ways, and is stable for ties', () => {
    expect(sortRows(rows, (r) => r.n, 'ascending').map((r) => r.id)).toEqual(['b', 'd', 'a', 'c']);
    expect(sortRows(rows, (r) => r.n, 'descending').map((r) => r.id)).toEqual(['a', 'c', 'd', 'b']);
  });

  it('sorts text with localeCompare (case does not split the list)', () => {
    expect(sortRows(rows, (r) => r.t, 'ascending').map((r) => r.t)).toEqual([
      'apple',
      'Banana',
      'fig',
      'pear',
    ]);
  });

  it('does not change the input', () => {
    const copy = [...rows];
    sortRows(rows, (r) => r.n, 'ascending');
    expect(rows).toEqual(copy);
  });
});

describe('pageOf<Row>', () => {
  const nine = Array.from({ length: 9 }, (_, i) => i + 1);

  it('splits into pages and reports the visible range', () => {
    expect(pageOf(nine, 1, 5)).toMatchObject({
      rows: [1, 2, 3, 4, 5],
      page: 1,
      pages: 2,
      from: 1,
      to: 5,
    });
    expect(pageOf(nine, 2, 5)).toMatchObject({ rows: [6, 7, 8, 9], page: 2, from: 6, to: 9 });
  });

  it('clamps a page out of range and handles no rows', () => {
    expect(pageOf(nine, 7, 5).page).toBe(2);
    expect(pageOf(nine, 0, 5).page).toBe(1);
    expect(pageOf([], 1, 5)).toMatchObject({ rows: [], page: 1, pages: 1, from: 0, to: 0 });
  });

  it('shows everything without a page size', () => {
    expect(pageOf(nine, 3)).toMatchObject({ rows: nine, pages: 1, from: 1, to: 9 });
  });
});
