/**
 * A small subset of Vitest's API on top of Node's built-in test runner, so the same test files run
 * with zero installed packages:  npm run test:node
 * Only what the tests use: describe, it, beforeAll, afterAll, beforeEach, afterEach and expect(...)
 * with toBe / toEqual / toContain / toThrow / toMatch / toBeGreaterThanOrEqual / toBeLessThan and
 * `.not`. `npm test` runs the same files with real Vitest.
 */
import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

export { describe, it, afterEach, beforeEach };
export const beforeAll = before;
export const afterAll = after;

/**
 * The positive matchers.
 * @param {any} actual
 * @returns {Record<string, Function>}
 */
function matchers(actual) {
  return {
    toBe: (expected) => assert.strictEqual(actual, expected),
    toEqual: (expected) => assert.deepStrictEqual(actual, expected),
    toContain: (part) =>
      assert.ok(
        actual.includes(part),
        `${JSON.stringify(actual)} does not contain ${JSON.stringify(part)}`,
      ),
    toThrow: (pattern) => (pattern ? assert.throws(actual, pattern) : assert.throws(actual)),
    toMatch: (pattern) => assert.match(actual, pattern),
    toBeGreaterThanOrEqual: (n) => assert.ok(actual >= n, `${actual} < ${n}`),
    toBeLessThan: (n) => assert.ok(actual < n, `${actual} >= ${n}`),
  };
}

/**
 * @param {unknown} actual
 * @returns {Record<string, Function> & { not: Record<string, Function> }}
 */
export function expect(actual) {
  const yes = matchers(actual);
  const not = {
    toBe: (expected) => assert.notStrictEqual(actual, expected),
    toEqual: (expected) => assert.notDeepStrictEqual(actual, expected),
    toContain: (part) => assert.ok(!actual.includes(part), `contains ${JSON.stringify(part)}`),
    toThrow: () => assert.doesNotThrow(actual),
    toMatch: (pattern) => assert.doesNotMatch(actual, pattern),
  };
  return { ...yes, not };
}
