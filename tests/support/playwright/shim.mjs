/**
 * tests/support/playwright/shim.mjs — the part of @playwright/test the specs in tests/e2e/specs use
 * (test, test.beforeEach, expect with the web-first assertions, defineConfig, devices), on top of
 * the Playwright library, for running the specs where @playwright/test is not installed
 * (npm run e2e:local). CI runs them with the real runner (npm run e2e). Assertions retry until
 * the expect timeout, and single-element assertions are strict like the real ones.
 */
import { devices } from 'playwright';

export { devices };
export const defineConfig = (config) => config;

export const registry = { tests: [], beforeEach: [], timeout: 5000 };

export function test(name, fn) {
  registry.tests.push({ name, fn });
}
test.beforeEach = (fn) => registry.beforeEach.push(fn);
test.describe = (name, fn) => fn();

const norm = (s) =>
  String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim();
const fits = (text, want, partial) =>
  want instanceof RegExp
    ? want.test(text)
    : partial
      ? text.includes(norm(want))
      : text === norm(want);

/** Retry `probe` (returns [pass, message]) until it passes or the timeout ends. */
async function poll(probe, negate) {
  const end = Date.now() + registry.timeout;
  let message;
  for (;;) {
    let pass = false;
    try {
      [pass, message] = await probe();
    } catch (error) {
      message = String(error.message || error);
    }
    if (pass !== negate) return;
    if (Date.now() > end) throw new Error(`expect${negate ? '.not' : ''}: ${message}`);
    await new Promise((r) => setTimeout(r, 100));
  }
}

const isPage = (v) => v && typeof v.goto === 'function' && typeof v.url === 'function';
const isLocator = (v) =>
  v && typeof v.allTextContents === 'function' && typeof v.count === 'function';

/** Strict: exactly one element, or a "strict mode violation". */
async function single(locator) {
  const n = await locator.count();
  if (n !== 1) throw new Error(`strict mode violation: ${locator} resolved to ${n} elements`);
  return locator;
}

function locatorAssertions(locator, negate) {
  return {
    toBeVisible: () =>
      poll(async () => {
        const n = await locator.count();
        if (n > 1) throw new Error(`strict mode violation: ${locator} resolved to ${n} elements`);
        return [n === 1 && (await locator.isVisible()), `${locator} is not visible`];
      }, negate),
    toHaveCount: (count) =>
      poll(async () => {
        const n = await locator.count();
        return [n === count, `${locator} has ${n} elements, expected ${count}`];
      }, negate),
    toHaveText: (want) =>
      poll(async () => {
        if (Array.isArray(want)) {
          const texts = (await locator.allTextContents()).map(norm);
          const ok = texts.length === want.length && texts.every((t, i) => fits(t, want[i]));
          return [
            ok,
            `${locator} texts ${JSON.stringify(texts)} != ${JSON.stringify(want.map(String))}`,
          ];
        }
        const text = norm(await (await single(locator)).textContent());
        return [fits(text, want), `${locator} text "${text}" != "${want}"`];
      }, negate),
    toContainText: (want) =>
      poll(async () => {
        const text = norm(await (await single(locator)).textContent());
        return [fits(text, want, true), `${locator} text "${text}" does not contain "${want}"`];
      }, negate),
  };
}

function pageAssertions(page, negate) {
  return {
    toHaveURL: (want) =>
      poll(async () => {
        const url = page.url();
        return [want instanceof RegExp ? want.test(url) : url === want, `URL ${url} != ${want}`];
      }, negate),
  };
}

function valueAssertions(actual) {
  const fail = (message) => {
    throw new Error(message);
  };
  return {
    toBe: (e) => Object.is(actual, e) || fail(`${actual} !== ${e}`),
    toMatch: (re) => re.test(actual) || fail(`"${actual}" does not match ${re}`),
    toEqual: (e) =>
      JSON.stringify(actual) === JSON.stringify(e) ||
      fail(`${JSON.stringify(actual)} != ${JSON.stringify(e)}`),
    toBeTruthy: () => Boolean(actual) || fail(`${actual} is not truthy`),
  };
}

export function expect(actual) {
  if (isPage(actual))
    return { ...pageAssertions(actual, false), not: pageAssertions(actual, true) };
  if (isLocator(actual))
    return { ...locatorAssertions(actual, false), not: locatorAssertions(actual, true) };
  return valueAssertions(actual);
}
