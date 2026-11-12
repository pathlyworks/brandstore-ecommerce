/**
 * A small subset of Vitest's API on top of Node's built-in test runner, so the same test files run
 * with zero installed packages:  npm run test:node
 * Only what the tests use: describe, it, beforeAll, afterAll, afterEach and expect(...).toBe /
 * toEqual / toContain / toThrow. `npm test` runs the same files with real Vitest.
 */
import { after, afterEach, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

export { describe, it, afterEach };
export const beforeAll = before;
export const afterAll = after;

/**
 * @param {unknown} actual
 * @returns {{ toBe: Function, toEqual: Function, toContain: Function, toThrow: Function }}
 */
export function expect(actual) {
  return {
    toBe: (expected) => assert.strictEqual(actual, expected),
    toEqual: (expected) => assert.deepStrictEqual(actual, expected),
    toContain: (part) =>
      assert.ok(
        actual.includes(part),
        `${JSON.stringify(actual)} does not contain ${JSON.stringify(part)}`,
      ),
    toThrow: (pattern) => assert.throws(actual, pattern),
  };
}
