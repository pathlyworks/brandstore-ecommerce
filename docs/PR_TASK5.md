# Pull request: Automated tests (unit, integration, e2e) and CI

**Branch:** `feature/automated-tests-ci` → `main` · **Task:** Phase 2, Task 5 · Details: [`task_5_testing.md`](../task_5_testing.md)

## What this adds

- **Unit tests (Vitest), edge cases first:** zero, negative and non-numeric quantities, quantities above the stock and the
  per-line limit, floating-point totals (`0.1 + 0.2`, `3 × 1.10`), the price-string parser (`"EGP 33,999"`, `"1.005"`),
  currency formatting, awkward query strings, and storage that is missing, blocked, full or corrupted
  (`tests/unit/edge-cases.test.js`, 32 new tests; 174 unit tests in total).
- **Integration tests in jsdom with Mock Service Worker:** the real catalog and cart modules rendered into the real
  `catalog.html` / `cart.html`, against handlers for 200, empty, 401, 429 and 500 (and 404 for the cart).
  Assertions use roles, accessible names and visible text only (`tests/dom/`).
- **Two Playwright end-to-end tests** against the official TechSphere API: filter the catalog and add an item to the
  cart; sign in with a wrong password first, then view the orders (`tests/e2e/specs/`, `playwright.config.mjs`).
- **Coverage gate:** at least 80% of lines in `src/state` and in `src/utils` (`npm run test:coverage`).
- **CI on every pull request** (`.github/workflows/ci.yml`): lint/format/build/contract, unit + integration with
  coverage, and end-to-end.

## Demonstration: each e2e test fails when its feature is broken

`npm run e2e:prove` copies the project to a temporary folder, introduces one bug, runs only the test that protects
that feature, and expects it to fail. The working copy is never changed. Output of the run for this PR, made with
the stand-in runner because `@playwright/test` cannot be installed in the authoring environment
(`E2E_RUNNER=local npm run e2e:prove`):

```
PASS  unchanged app: "filter the catalog by category and add a product to the cart" passes
PASS  unchanged app: "sign in (wrong password first) and view the orders" passes
PASS  bug "the category filter is not sent to the API" (src/utils/query-string.js) -> "filter the catalog by category and add a product to the cart" fails, as it should
        expect: getByText('Showing 1–6 of 6 products') is not visible
PASS  bug ""Add to cart" does not change the cart" (src/state/cart.js) -> "filter the catalog by category and add a product to the cart" fails, as it should
        expect: getByRole('link', { name: 'Cart, 1 item' }) is not visible
PASS  bug "a wrong password is reported with a vague message" (src/components/auth-form.js) -> "sign in (wrong password first) and view the orders" fails, as it should
        expect: getByRole('alert').filter({ hasText: 'The email or password is incorrect' }) is not visible
PASS  bug "account requests are sent without the Bearer token" (src/api/http.js) -> "sign in (wrong password first) and view the orders" fails, as it should
        expect: getByText('Signed in as Test Student (student@techsphere.test).') is not visible

Every sabotage was caught.
```

To see one by hand: in `src/state/cart.js` change the first line of `addToCart` to `if (cart) return cart;` and run
`npm run e2e`. The catalog test fails at `getByRole('link', { name: 'Cart, 1 item' })`. Revert the change and it passes.

## Coverage (honest number)

Measured locally with Node's coverage (unit + API integration tests; the jsdom tests are not included):
**`src/state` 99.87% (748/749 lines), `src/utils` 95.22% (796/836 lines)**. The lowest file is `utils/dom.js` at 56.76%,
which needs a DOM; `tests/dom/dom-utils.test.js` covers it under Vitest. The CI job prints Vitest's own V8 numbers
in its summary and fails below 80%.

## Bugs the tests found and this PR fixes

- A catalog 401 said "Could not reach the store"; it now says "Please sign in again".
- The cart stayed silent when its price check failed (401/429/500); it now says the prices could not be checked.
- `validateQuantity(null)` was treated as 0; it is now "not a number".
- TechSphere category slugs ("smart-home") were shown raw; they are now readable labels.

## How it was checked before opening the PR

| Check                                                                         | Result            |
| :---------------------------------------------------------------------------- | :---------------- |
| Unit + API integration (`npm run test:node`, the same files on Node's runner) | 209 / 209         |
| jsdom + MSW files in real Chromium (`npm run test:browser`)                   | 17 / 17           |
| The two e2e specs (`npm run e2e:local`)                                       | 2 / 2             |
| Sabotage run (`npm run e2e:prove`)                                            | 4 / 4 bugs caught |
| Journey suite (`npm run e2e:journeys`)                                        | 71 / 71           |
| Lint, Prettier, build, contract, QA scripts                                   | clean             |

**Note for reviewers:** the authoring environment had no network access for packages, so this PR's CI run is the
first run with the real Vitest, jsdom, MSW, `@vitest/coverage-v8` and `@playwright/test`. Please look at the CI
results before merging.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_012ipYanQuc7m6qRW4Whdpdk
