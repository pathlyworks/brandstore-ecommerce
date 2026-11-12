# Test plan (Phase 2)

## 1. Levels and tools

| Level       | Tool                                       | Runs               | What it proves                                                                                                                       |
| :---------- | :----------------------------------------- | :----------------- | :----------------------------------------------------------------------------------------------------------------------------------- |
| Unit        | Vitest (jsdom where DOM is touched)        | `npm test`         | One module in isolation; storage and clock injected                                                                                  |
| Integration | Vitest + jsdom + Mock Service Worker (MSW) | `npm test`         | Modules working together through `api/http.js` against MSW handlers that return every contract status (200, 201, 400, 401, 404, 429) |
| End-to-end  | Playwright (Chromium, Firefox, WebKit)     | `npm run e2e`      | Real user journeys in the browser against the site served over http                                                                  |
| Contract    | `scripts/contract.mjs`                     | `npm run contract` | The API still behaves as `api/openapi.json` says (status codes, error codes, body schemas)                                           |

CI (`.github/workflows/ci.yml`) runs lint, format check, unit + integration tests and the contract
check on every pull request; e2e joins CI once the first pages exist.

## 2. Highest-risk modules first

| Rank | Module                                                                  | Why it is risky                                            | Unit                                                                     | Integration                                                     | E2E                                                      |
| :--- | :---------------------------------------------------------------------- | :--------------------------------------------------------- | :----------------------------------------------------------------------- | :-------------------------------------------------------------- | :------------------------------------------------------- |
| 1    | **Cart math** (`utils/cart-math.js`, `state/cart.js`)                   | Money: a rounding or quantity bug charges the wrong amount | **Yes**: every function, table-driven                                    | **Yes**: cart store + storage persistence                       | **Yes**: add, change quantity, refresh, totals unchanged |
| 2    | **Auth** (`api/auth.js`, `api/http.js`, `state/session.js`)             | Wrong handling leaks a session or locks users out          | **Yes**: session expiry with a fake clock; signOut clears the right keys | **Yes**: token header, 401 -> sign-out, 429 lockout message     | **Yes**: sign in, refresh stays signed in, logout        |
| 3    | **Query-string building** (`utils/query-string.js`, `state/catalog.js`) | A wrong string returns wrong products or a 400             | **Yes**: build/parse, encoding, defaults                                 | **Yes**: filter change -> exact request URL seen by MSW         | **Yes**: filter, paginate, back button, shared link      |
| 4    | `utils/money.js`                                                        | Display errors erode trust                                 | Yes                                                                      | no                                                              | via cart journey                                         |
| 5    | `utils/storage.js`                                                      | Private mode / quota errors crash the app                  | Yes (throwing storage stub)                                              | via cart and session                                            | no                                                       |
| 6    | `api/orders.js` + `order-list`                                          | Cancelling the wrong order                                 | Yes (URL building)                                                       | Yes: 200, 400 `ORDER_NOT_CANCELLABLE`, 404                      | Yes: cancel a processing order                           |
| 7    | `api/addresses.js` + `address-book`                                     | 201 vs 200, losing the default address                     | Yes                                                                      | Yes: create 201, replace 200, delete 404, 400 details on fields | Yes: add and delete an address                           |
| 8    | `utils/validate.js`                                                     | Client and server disagree                                 | Yes: same cases as the contract run                                      | via forms                                                       | no                                                       |
| 9    | `api/products.js`, `state/store.js`, `utils/dom.js`, other components   | Low logic                                                  | Yes                                                                      | Yes for components (render states)                              | covered by journeys                                      |

## 3. Cases for the three high-risk areas

**Cart math (unit)**

- `lineTotal` = unitPrice x quantity in cents; no floats (e.g. 3 x 1999 = 5997, not 59.97 x 100).
- `subtotal` of [] is 0; sums many lines exactly (100 lines of 1999).
- `shippingFor(9999)` = 799, `shippingFor(10000)` = 0 (threshold is inclusive, same rule as the API).
- `clampQuantity`: 0, -1, NaN, 1.5, "3" -> 1, 1, 1, 1, 3; never above `min(stock, 10)`; stock 0 -> line removed by the cart.
- `totals` matches the API order totals for the seeded orders (o-1001..o-1003) exactly.
- Cart store: adding an existing product increments quantity; a corrupt `brandstore:cart:v1` value is ignored, not thrown.

**Auth**

- Unit: `createSession` with an injected clock: signed in until `expiresAt`, signed out after; `signOut` removes session and flags but keeps cart and saved keys.
- Integration (MSW): requests to `/account/*` carry `Authorization: Bearer <token>`; a 401 calls `onUnauthorized` exactly once and clears the session; login 400 maps `details` to field errors; 401 shows "Email or password is incorrect"; 429 `TOO_MANY_LOGIN_ATTEMPTS` shows the Retry-After seconds and disables the button.
- E2E: sign in with the demo account, refresh (still signed in), open the orders page, sign out (account pages redirect to login; cart still there).

**Query-string building**

- Unit: `buildQuery({ category: 'electronics', q: '', page: 1 })` -> `?category=electronics&page=1` (empty dropped, keys sorted); spaces, `&`, `#` and non-ASCII are encoded; `parseCatalogQuery('?limit=500&sort=cheapest')` falls back to defaults (never sends a request the API would 400); round trip `parse(build(x))` equals `x`.
- Integration: changing the category resets `page` to 1; MSW asserts the exact URL; a 400 response renders its `details`.
- E2E: filter + page 2 + Back restores the previous results; opening a copied URL shows the same results.

## 4. End-to-end journeys (Playwright)

1. Browse: filter by category, sort by price, go to page 2, open a product.
2. Cart: add two products, change a quantity, save one for later, refresh, totals unchanged.
3. Account: sign in, list orders, cancel the processing order, see it marked cancelled.
4. Addresses: add an address, set it as default, delete it.
5. Errors: wrong password, then rate-limited sign-in message; expired session redirects to login.

## 5. Exit criteria for each feature branch

Lint, format check, unit and integration tests green; contract check 0 problems; new code in the
three high-risk areas has at least 90% line coverage (`vitest run --coverage`, added with the first
real tests); each journey above passes in Chromium before merge and in all three engines before release.

## 6. Status today (2026-11-12)

| Level       | What exists                                                                  | Result here                                                                                                                                                         |
| :---------- | :--------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unit        | `tests/unit/`: module map (21), email rules (11), `start()` (2), content (3) | 37 passed, run with Node's test runner through a small Vitest-compatible shim (Vitest could not be installed in the build environment; `npm test` uses real Vitest) |
| Integration | planned (section 3); written with the API modules in task 2                  | not run                                                                                                                                                             |
| End-to-end  | `tests/e2e/run.mjs`: 9 journeys over the live features (Playwright library)  | 17 of 17 runs passed in Chromium at 1280x900 and 375x740; Firefox and WebKit not installed here (`E2E_BROWSERS=chromium,firefox,webkit npm run e2e`)                |
| Contract    | `npm run contract`                                                           | 45 requests, 0 problems                                                                                                                                             |

The e2e runner was checked to fail when a feature is broken: removing the product filter from the
home page made 4 of 17 runs fail.

### Update after Phase 2, Task 2 (catalog)

- Unit: 71 tests (query strings, facets, debounce, latest-request runner, money, error wording, http client with a fake `fetch`, URL-backed catalog state, plus the Task 1 tests).
- Integration: 22 tests: the real `api/` modules against the real mock server (every case in `tests/fixtures/catalog-cases.json`, each error status, abort) and the Netlify function. These replace MSW for now (MSW could not be installed in the build environment).
- End-to-end: 18 journeys, 34 runs in Chromium at desktop and phone size, all passing; the catalog journeys check results against the same fixtures, the debounce (one request per burst), aborting of superseded requests, URL reload/Back/Forward, and every loading/empty/error state.

### Update after Phase 2, Task 3 (product detail, cart, save for later)

- Unit: 100 tests. New: cart pure functions (inputs deep-frozen, so any mutation would throw), totals against `tests/fixtures/cart-cases.json` (8 reference calculations in dollars, tolerance $0.005), shipping rule edges (9999 / 10000 cents), quantity clamping, out-of-stock refusal, save-for-later moves, recently viewed dedupe and cap, storage wrapper (blocked storage, corrupt JSON), persisted stores (rehydrate in a new store), and the Axios module's interceptors.
- Integration: 25 tests (adds the Axios module against the real mock server).
- End-to-end: 26 journeys, 50 runs in Chromium, all passing. The cart journeys check fixture totals in the browser, refresh and return-visit persistence, save for later both ways, recently viewed (dedupe, cap of 6, not shared with a new tab), the out-of-stock explanation, a stale stored price corrected from the API, and one price format on every page. Changing the shipping fee to $8.00 makes the totals journey fail (checked).
