/**
 * tests/support/browser/vitest.js — the part of Vitest's API the tests in tests/dom/ use, for running
 * them in a real browser with no installed packages (npm run test:browser). `npm test` runs the same
 * files with real Vitest in jsdom. describe/it/hooks are collected first, then run() executes them.
 */
const root = { name: '', tests: [], children: [], hooks: emptyHooks(), parent: null };
let current = root;

function emptyHooks() {
  return { beforeAll: [], afterAll: [], beforeEach: [], afterEach: [] };
}

export function describe(name, fn) {
  const suite = { name, tests: [], children: [], hooks: emptyHooks(), parent: current };
  current.children.push(suite);
  current = suite;
  fn();
  current = suite.parent;
}

export function it(name, fn) {
  current.tests.push({ name, fn });
}
export const test = it;

export const beforeAll = (fn) => current.hooks.beforeAll.push(fn);
export const afterAll = (fn) => current.hooks.afterAll.push(fn);
export const beforeEach = (fn) => current.hooks.beforeEach.push(fn);
export const afterEach = (fn) => current.hooks.afterEach.push(fn);

/** Hooks of a kind from the outermost suite inwards. */
function chain(suite, kind) {
  const list = [];
  for (let s = suite; s; s = s.parent) list.unshift(...s.hooks[kind]);
  return list;
}

async function runSuite(suite, prefix, results) {
  const name = [prefix, suite.name].filter(Boolean).join(' > ');
  for (const hook of suite.hooks.beforeAll) await hook();
  for (const t of suite.tests) {
    const full = [name, t.name].filter(Boolean).join(' > ');
    try {
      for (const hook of chain(suite, 'beforeEach')) await hook();
      await t.fn();
      results.push({ name: full, ok: true });
    } catch (error) {
      results.push({ name: full, ok: false, error: String(error?.stack || error) });
    } finally {
      for (const hook of chain(suite, 'afterEach').reverse()) await hook();
    }
  }
  for (const child of suite.children) await runSuite(child, name, results);
  for (const hook of suite.hooks.afterAll) await hook();
}

/** Run everything collected so far. */
export async function run() {
  const results = [];
  await runSuite(root, '', results);
  return results;
}

function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => deepEqual(a[k], b[k]));
}

const show = (v) => {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
};

function check(pass, message) {
  if (!pass) throw new Error(message);
}

export function expect(actual) {
  const tests = {
    toBe: (e) => [Object.is(actual, e), `expected ${show(actual)} to be ${show(e)}`],
    toEqual: (e) => [deepEqual(actual, e), `expected ${show(actual)} to equal ${show(e)}`],
    toContain: (p) => [actual.includes(p), `expected ${show(actual)} to contain ${show(p)}`],
    toBeTruthy: () => [Boolean(actual), `expected ${show(actual)} to be truthy`],
    toMatch: (re) => [re.test(actual), `expected ${show(actual)} to match ${re}`],
    toThrow: () => {
      try {
        actual();
        return [false, 'expected a throw'];
      } catch {
        return [true, 'expected no throw'];
      }
    },
  };
  const yes = {};
  const not = {};
  for (const [name, fn] of Object.entries(tests)) {
    yes[name] = (...args) => {
      const [pass, message] = fn(...args);
      check(pass, message);
    };
    not[name] = (...args) => {
      const [pass, message] = fn(...args);
      check(!pass, `not: ${message}`);
    };
  }
  return { ...yes, not };
}
