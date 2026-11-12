/**
 * npm run e2e:prove — shows that each end-to-end test fails when the feature it protects breaks.
 *
 * For each sabotage below it copies the project to a temporary folder, makes one small change to
 * the app code (the kind of bug a careless edit would cause), runs only the test that protects
 * that feature, and expects it to FAIL. The working copy is never touched. The run passes only if
 * every sabotaged run fails (and the untouched run of each test passes).
 *
 *   npm run e2e:prove                       # with the real runner (npx playwright test)
 *   E2E_RUNNER=local npm run e2e:prove      # with the stand-in runner (no @playwright/test needed)
 */
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve('.');
const TEST_1 = 'filter the catalog by category and add a product to the cart';
const TEST_2 = 'sign in (wrong password first) and view the orders';

/** One bug per entry: which test must catch it, and the exact edit that causes it. */
export const SABOTAGES = [
  {
    test: TEST_1,
    bug: 'the category filter is not sent to the API',
    file: 'src/utils/query-string.js',
    find: 'export function toApiQuery(query) {\n  return buildQuery(query);',
    replace:
      "export function toApiQuery(query) {\n  return buildQuery({ ...query, category: '' });",
  },
  {
    test: TEST_1,
    bug: '"Add to cart" does not change the cart',
    file: 'src/state/cart.js',
    find: '  if (!canAdd(cart, product, quantity).ok) return cart;',
    replace: '  if (cart) return cart;',
  },
  {
    test: TEST_2,
    bug: 'a wrong password is reported with a vague message',
    file: 'src/components/auth-form.js',
    find: "'The email or password is incorrect. Check them and try again.'",
    replace: "'Something went wrong.'",
  },
  {
    test: TEST_2,
    bug: 'account requests are sent without the Bearer token',
    file: 'src/api/http.js',
    find: '          ...(token ? { Authorization: `Bearer ${token}` } : {}),\n',
    replace: '',
  },
];

let run = 0;

/** Run one test (by name) in `dir`, on its own ports so no earlier server is reused; true when it passed. */
function runTest(dir, name) {
  run += 1;
  const env = {
    ...process.env,
    E2E_API_PORT: String(4300 + run * 2),
    E2E_SITE_PORT: String(4301 + run * 2),
  };
  const local = process.env.E2E_RUNNER === 'local';
  const [cmd, args] = local
    ? [
        'node',
        [
          '--import',
          './tests/support/playwright/use-hook.mjs',
          'tests/support/playwright/run.mjs',
          name,
        ],
      ]
    : ['npx', ['playwright', 'test', '--grep', name.replace(/[()]/g, '\\$&')]];
  const result = spawnSync(cmd, args, {
    cwd: dir,
    env,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  return { passed: result.status === 0, output: `${result.stdout}${result.stderr}` };
}

/** A throw-away copy of the project (node_modules linked, not copied). */
function copyProject() {
  const dir = mkdtempSync(join(tmpdir(), 'e2e-prove-'));
  cpSync(ROOT, dir, {
    recursive: true,
    filter: (src) =>
      !/[\\/](node_modules|\.git|dist|test-results|playwright-report)([\\/]|$)/.test(
        src.slice(ROOT.length),
      ),
  });
  symlinkSync(join(ROOT, 'node_modules'), join(dir, 'node_modules'), 'junction');
  return dir;
}

let ok = true;
for (const name of [TEST_1, TEST_2]) {
  const clean = runTest(ROOT, name);
  console.log(`${clean.passed ? 'PASS' : 'FAIL'}  unchanged app: "${name}" passes`);
  ok &&= clean.passed;
}
for (const s of SABOTAGES) {
  const dir = copyProject();
  try {
    const path = join(dir, s.file);
    const source = readFileSync(path, 'utf8');
    if (!source.includes(s.find)) throw new Error(`${s.file} no longer contains the code to break`);
    writeFileSync(path, source.replace(s.find, s.replace));
    const result = runTest(dir, s.test);
    const caught = !result.passed;
    ok &&= caught;
    console.log(
      `${caught ? 'PASS' : 'FAIL'}  bug "${s.bug}" (${s.file}) -> "${s.test}" ${caught ? 'fails, as it should' : 'still passes'}`,
    );
    const reason = result.output
      .split('\n')
      .find((line) => /expect|Error|strict mode|Timed out/.test(line));
    if (caught && reason) console.log(`        ${reason.trim().slice(0, 160)}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
console.log(
  ok ? '\nEvery sabotage was caught.' : '\nA sabotage was NOT caught (or a clean run failed).',
);
process.exit(ok ? 0 : 1);
