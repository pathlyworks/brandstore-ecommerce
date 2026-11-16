# Advanced Task 6: Testing Strategy, Quality Gates, and Peer Code Review

Advanced Task 6 deliverable. Date: 2026-11-16.
Repository: https://github.com/pathlyworks/brandstore-ecommerce · Pull request: **#15**
(`feature/testing-quality-gates` → `main`) · Code review: [`code_review.md`](code_review.md) ·
Deliberately broken checkout: pull request **#16** (§5).

| The brief asks for                                                                                                                                                                    | Where                                                                                                          |
| :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------- |
| Phase 2 cart tests ported to the reducer; a reducer test for every action                                                                                                             | §2.1; `web/src/state/cart.phase2.test.ts`, `cart.reducer.test.ts`, `checkout.model.test.ts`, `session.test.ts` |
| RTL tests: Button, Input, Modal (focus trap, focus return), DataTable (sorting, pagination), ProtectedRoute (redirect, return path), each checkout step's validation, MSW for the API | §2.2                                                                                                           |
| Playwright: full checkout, API 500 at submit, session expiry mid-checkout, admin denied to a shopper                                                                                  | §2.3; `web/e2e/`                                                                                               |
| axe-core inside the component and end-to-end tests                                                                                                                                    | §3                                                                                                             |
| CI gates: type-check, lint, tests with a 75% floor on src/state and src/components, Playwright, Lighthouse CI budgets                                                                 | §4; `.github/workflows/ci.yml`, `vitest.config.js`, `lighthouserc.json`                                        |
| A deliberately broken checkout makes CI fail (once)                                                                                                                                   | §5                                                                                                             |
| Written review of the peer pull request                                                                                                                                               | `code_review.md`                                                                                               |

## 1. Testing strategy

The pyramid, measured on this branch (both apps run in one `npm test`):

| Layer                   | Tool                                            |                  Files | Tests | What it proves                                                                                                   |
| :---------------------- | :---------------------------------------------- | ---------------------: | ----: | :--------------------------------------------------------------------------------------------------------------- |
| Unit (pure logic)       | Vitest                                          |                      9 |  ~110 | reducers, selectors, storage, session, validation, table and dashboard models                                    |
| Component / integration | Vitest + React Testing Library + MSW (jsdom)    |                     12 |  ~130 | what a user sees and does on a screen, with the API answered by MSW handlers that behave like the TechSphere kit |
| Story accessibility     | axe-core on every Storybook story               |                      1 |   30+ | no axe violation in any component state                                                                          |
| End-to-end              | Playwright (Chromium; Firefox and WebKit in CI) | 8 (React) + 4 (legacy) |    33 | real browser, real API kit: journeys, failures, accessibility                                                    |

Rules the tests follow (and the reason):

- **Query by role and label, assert what the user sees.** `getByRole('button', { name: 'Continue to payment' })`,
  `toHaveAccessibleDescription(/egyptian mobile number/i)`, focus with `toHaveFocus()`. A test that finds an element
  by role also fails when the element loses its accessible name. 473 role/label/text queries against 13 test-id or
  selector queries in the whole suite.
- **No real network in unit and component tests.** MSW (`web/src/test/handlers.ts`) answers every API call with the
  kit's captured data and rules; a test that needs a failure overrides one handler (`server.use(...)`).
- **End-to-end against the real API kit**, never a mock: when `VITE_API_BASE` is set (grading, the CI job that starts
  the kit) the tests use it and start no Python; otherwise Playwright starts the kit itself (`playwright.config.mjs`).
- **One reason per test name**, so a red test says what broke.

## 2. What is tested

### 2.1 Reducers (a test for every action) and the Phase 2 port

| Reducer                       | Actions                                         | Tests                                                                                                  |
| :---------------------------- | :---------------------------------------------- | :----------------------------------------------------------------------------------------------------- |
| `cartReducer`                 | add, update, remove, clear, hydrate, reprice    | `cart.reducer.test.ts` (each action, purity, same object when nothing changes)                         |
| `checkoutReducer` (new tests) | address, useSavedAddress, payment, touch, reset | `checkout.model.test.ts` (each action, saved-address detach rule, no mutation, step rules, validation) |
| `authReducer`                 | signIn, signOut, expire                         | `session.test.ts`                                                                                      |

**Phase 2 cart tests ported** (`cart.phase2.test.ts`): the vanilla site's `tests/unit/cart.test.js` cases run through
the reducer and selectors: the same 12-product catalog, the 8 reference totals computed with Python's Decimal
(`tests/fixtures/cart-cases.json`), the shipping rule, quantity bounds (0 removes, stock cap, limit of 10, adding 0
refused, 2.7 → 2), out of stock, purity, and "the badge and the page use one summary". The file's header lists what
changed in the port and why (actions instead of functions; "refused" asserted as "same state").

**The port found a bug.** The header badge counted out-of-stock units (3) while the order summary counted 2. The
badge (`selectItemCount`) now counts only what can be bought, as in Phase 2.

### 2.2 Components and screens (React Testing Library, MSW)

| Subject                           | Test file                              | Cases                                                                                                                                                                                                                                                                                                                                                                    |
| :-------------------------------- | :------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button                            | `components.test.tsx`                  | ignores clicks while loading but stays focusable                                                                                                                                                                                                                                                                                                                         |
| Input                             | `components.test.tsx`                  | error linked to the field (`aria-describedby`), `aria-invalid`                                                                                                                                                                                                                                                                                                           |
| Modal                             | `components.test.tsx`, `a11y.test.tsx` | focus moves in; **Tab and Shift+Tab stay inside**; **focus returns** to the trigger on Escape and on a button inside; the Search dialog                                                                                                                                                                                                                                  |
| DataTable                         | `components.test.tsx`, `a11y.test.tsx` | sorting with `aria-sort` (click and Enter), **paging** (Previous/Next, "Rows 4–6 of 7", back to page 1 on a new sort), loading/error/empty states, focusable scroll region                                                                                                                                                                                               |
| ProtectedRoute (new file)         | `ProtectedRoute.test.tsx`              | signed out → `/login?next=/account/orders?page=2` (replace, not push); session running out on screen → `reason=expired`; shopper at `/admin` → "Access denied" with no redirect; admin gets in                                                                                                                                                                           |
| Checkout, step by step (new file) | `checkout.steps.test.tsx`              | address: empty form (5 problems, focused summary, every field invalid), wrong values (one-word name, foreign number, short street, 4-digit postal code); payment: nothing chosen, test card without card and with digits in the name, wallet without an Egyptian number; review: **API 500 at submit** (error shown, nothing lost, "Try again" places exactly one order) |
| Checkout journey                  | `checkout.test.tsx`                    | refresh and Back at every step, one POST however fast the clicks, same idempotency key on retry                                                                                                                                                                                                                                                                          |
| Auth                              | `auth.test.tsx`                        | return path, register, 403 page, token refused mid-checkout, expiry warning, sign-out in another tab                                                                                                                                                                                                                                                                     |

### 2.3 End to end (Playwright, real API kit)

| Journey                                                                                                                                          | Spec                     |
| :----------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------- |
| Full checkout with reloads and Back at every step, exactly one order                                                                             | `checkout.spec.ts`       |
| **API 500 at "Place order"**: error shown, cart and choices kept, "Try again" places the order, and both requests carry the same idempotency key | `checkout.spec.ts` (new) |
| **Session expiry mid-checkout**: the API refuses the token at submit; sign in again, back to the review, the order goes through                  | `auth.spec.ts`           |
| **Admin access denied to a shopper**: 403 page, and the admin chunk is never downloaded                                                          | `auth.spec.ts`           |
| Accessibility of every key route (§3)                                                                                                            | `a11y.spec.ts` (new)     |
| Catalog, product, cart, orders, routing, offline                                                                                                 | the other specs          |

## 3. axe-core inside the suites

- **Component level:** `web/src/stories/stories.test.tsx` renders every Storybook story and runs `axe.run` on it;
  any violation fails the test.
- **End to end:** `web/e2e/a11y.spec.ts` injects axe-core into the real page and runs the WCAG 2.0/2.1 A and AA rules on
  `/`, `/products`, `/products/p-001`, `/cart`, `/login`, `/register` (signed out), `/cart`, `/checkout/address`
  (also with its error summary showing) and `/account/orders` (shopper) and `/admin` (admin). The test fails on any
  serious or critical violation and prints the others. Result on this branch: **0 violations of any impact** on all
  key routes (measured with Playwright locally and in CI).

## 4. Quality gates in CI

Every pull request runs `.github/workflows/ci.yml`; a red job blocks the merge.

| Gate                                 | Job                                                     | Fails when                                                                                                                                         |
| :----------------------------------- | :------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------- |
| Type-check                           | `lint` (root `tsc`), `web` (`tsc -p web`)               | any type error (strict, `exactOptionalPropertyTypes`, no `any`)                                                                                    |
| Lint and format                      | `lint`, `web`                                           | any ESLint error, Prettier difference, or a colour outside the design tokens                                                                       |
| Unit + component tests with coverage | `test`: `npm run test:coverage`                         | a test fails, or line coverage is below **75% on `web/src/state` and on `web/src/components`** (and 80% on the legacy `src/state` and `src/utils`) |
| End to end                           | `e2e` (Chromium), `cross-browser` (Firefox, WebKit)     | a Playwright spec fails, including the axe spec                                                                                                    |
| Build                                | `lint`, `web`                                           | the legacy build, the Vite build or the Storybook build fails; the admin chunk ships to shoppers                                                   |
| Lighthouse CI budgets                | `lighthouse`: `lhci autorun --config=lighthouserc.json` | a budget is missed (below)                                                                                                                         |

**Coverage, measured** (`npm run test:coverage`, v8, lines): `web/src/state` **98.1%**, `web/src/components`
**97.3%**; legacy `src/state` and `src/utils` above 80%. The floors are in `vitest.config.js` (`thresholds`), so the
command itself fails below them; the grader-style run with thresholds off reports the same numbers.

**Lighthouse CI budgets for the React app** (`lighthouserc.json`; mobile profile, median of 3 runs per page, pages
`/`, `/products`, `/products/p-001`, `/cart`, `/login`), every assertion at level `error`:

| Budget                   | Limit           |
| :----------------------- | :-------------- |
| Performance score        | ≥ 0.90          |
| Accessibility score      | ≥ 0.95          |
| Best practices, SEO      | ≥ 0.90          |
| Largest Contentful Paint | ≤ 3,500 ms      |
| Cumulative Layout Shift  | ≤ 0.1           |
| Total Blocking Time      | ≤ 300 ms        |
| JavaScript transferred   | ≤ 160,000 bytes |
| All bytes transferred    | ≤ 400,000 bytes |

Enforced, not just reported: a local run passed all 5 pages × 3 runs; the same results checked against a copy with
an impossible budget (TBT ≤ 1 ms, performance 1.0) exited with status 1 ("Assertion failed"), which fails the CI job.
The legacy site keeps its own budgets (`lighthouserc.legacy.json`).

## 5. A deliberately broken checkout fails CI (demonstrated once)

Pull request **#16** (`demo/broken-checkout`, not merged) changes one character in the checkout's money logic:
free shipping from 100.00 becomes free shipping only _above_ 100.00 (`<` → `<=` in `shippingFor`), the kind of slip
that charges real customers. CI on that pull request is red: the unit/component job fails on the shipping-rule tests
(Phase 2 port and selectors), and the run is linked from the pull request. It was closed without merging.

## 6. How to run

```bash
npm install
npm test                      # both apps, every unit and component test
npm run test:coverage         # the same with the coverage floors
npm run e2e                   # Playwright (starts the API kit when VITE_API_BASE is not set)
npx lhci autorun --config=lighthouserc.json   # after building web/ and serving it on :4174
```

## 7. Peer code review

The written review is in [`code_review.md`](code_review.md).
