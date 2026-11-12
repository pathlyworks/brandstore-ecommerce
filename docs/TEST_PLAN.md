# Test plan (Phase 2)

## 1. Levels and tools

| Level       | Tool                                       | Runs               | What it proves                                                                                                                       |
| :---------- | :----------------------------------------- | :----------------- | :----------------------------------------------------------------------------------------------------------------------------------- |
| Unit        | Vitest (jsdom where DOM is touched)        | `npm test`         | One module in isolation; storage and clock injected                                                                                  |
| Integration | Vitest + jsdom + Mock Service Worker (MSW) | `npm test`         | Modules working together through `api/http.js` against MSW handlers that return every contract status (200, 201, 400, 401, 404, 429) |
| End-to-end  | Playwright (Chromium, Firefox, WebKit)     | `npm run test:e2e` | Real user journeys in the browser against Vite + the mock server                                                                     |
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

- Written and passing: `tests/unit/module-map.test.js` (21 checks). Run here with Node's built-in
  test runner through a small Vitest-compatible shim, because Vitest could not be installed in the
  build environment; `npm test` runs it with real Vitest after `npm install`.
- Contract: `npm run contract`: 45 requests, 0 problems.
- Integration and e2e tests: planned above; written together with the modules in Phase 2 task 2.
