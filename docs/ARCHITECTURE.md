# Architecture: ES module layout (Phase 2)

The Phase 2 app lives in `src/` as native ES modules (served by Vite in development). The Phase 1
static site (`index.html`, `css/`, `js/`) keeps working unchanged until its pages are migrated.

## 1. Folders and what each one owns

| Folder            | Owns                                                                                                        | May import                 | Must not                                     |
| :---------------- | :---------------------------------------------------------------------------------------------------------- | :------------------------- | :------------------------------------------- |
| `src/utils/`      | Pure helpers: money in cents, cart math, query strings, validation, storage wrapper, DOM helper             | nothing from the app       | call `fetch`; read app state                 |
| `src/api/`        | Talking to the REST API: one fetch wrapper (`http.js`), one file per resource, `ApiError`                   | `utils/`                   | touch the DOM or state; store anything       |
| `src/state/`      | What the app remembers: cart, saved items, session, catalog filters; persistence through `utils/storage.js` | `utils/`                   | call the API (results are passed in)         |
| `src/components/` | Rendering and user events for one piece of UI; each exports `mount(root, deps)` and returns `unmount`       | `api/`, `state/`, `utils/` | import `main.js` or reach outside its `root` |
| `src/main.js`     | Composition root: creates the http client and stores, mounts components, connects 401 to sign-out           | everything                 | contain business logic                       |

Dependency direction: `main.js -> components -> (api, state) -> utils`. Nothing points upward.

## 2. Enforced, not just written down

`eslint.config.mjs` turns the table into lint errors (`npm run lint`):

- `no-restricted-imports` per folder: e.g. a file in `src/utils/` that imports `../state/cart.js`
  fails with "utils/ is the bottom layer".
- `no-restricted-globals`: `fetch` is allowed only in `src/api/http.js`; `localStorage` and
  `sessionStorage` only in `src/utils/storage.js`.

Checked on 2026-11-12 by adding two probe files that break the rules: lint reported all 4 violations
(restricted import x2, `localStorage`, `fetch`), then the probes were removed.

## 3. Module map (every file exists today as a documented stub)

Each planned function has its JSDoc signature and throws "planned but not implemented" until it is
built, so the boundaries can be reviewed, linted and imported before feature code is written.
`tests/unit/module-map.test.js` fails if a planned export goes missing.

| Module                  | Exports                                                           | Calls                                     | Risk                                     |
| :---------------------- | :---------------------------------------------------------------- | :---------------------------------------- | :--------------------------------------- |
| `utils/cart-math.js`    | `lineTotal`, `subtotal`, `shippingFor`, `totals`, `clampQuantity` | none                                      | **High** (money)                         |
| `utils/query-string.js` | `buildQuery`, `parseCatalogQuery`                                 | none                                      | **High** (wrong results / 400s)          |
| `utils/money.js`        | `toCents`, `formatMoney`                                          | `Intl.NumberFormat`                       | Medium                                   |
| `utils/storage.js`      | `readJson`, `writeJson`, `remove`                                 | Web Storage                               | Medium (private mode, quota)             |
| `utils/validate.js`     | `validateLogin`, `validateAddress`                                | none                                      | Medium                                   |
| `utils/dom.js`          | `el`                                                              | DOM                                       | Low                                      |
| `api/http.js`           | `createHttpClient`                                                | `fetch`, `ApiError`                       | **High** (auth header, 401/429 handling) |
| `api/endpoints.js`      | `ENDPOINTS`                                                       | none                                      | Low (tested against the spec)            |
| `api/errors.js`         | `ApiError`                                                        | none                                      | Low                                      |
| `api/products.js`       | `listProducts`, `getProduct`                                      | `http`, `query-string`                    | Medium                                   |
| `api/auth.js`           | `login`                                                           | `http`                                    | **High**                                 |
| `api/orders.js`         | `listOrders`, `cancelOrder`                                       | `http`                                    | Medium                                   |
| `api/addresses.js`      | `listAddresses`, `saveAddress`, `deleteAddress`                   | `http`                                    | Medium                                   |
| `state/store.js`        | `createStore`                                                     | none                                      | Low                                      |
| `state/cart.js`         | `createCart`                                                      | `cart-math`, `storage`                    | **High**                                 |
| `state/saved.js`        | `createSaved`                                                     | `storage`                                 | Medium                                   |
| `state/session.js`      | `createSession`                                                   | `storage`                                 | **High** (auth)                          |
| `state/catalog.js`      | `createCatalogState`                                              | `query-string`, `history`                 | Medium                                   |
| `components/*.js` (10)  | `mount`                                                           | stores and API functions passed in `deps` | Medium                                   |

Components: `product-list`, `filter-bar`, `pagination`, `product-detail`, `cart-panel`,
`saved-list`, `login-form`, `order-list`, `address-book`, `status-message`.

## 4. Key flows

- **Browse:** `filter-bar` -> `state/catalog.update()` -> URL changes -> `main.js` calls
  `api/products.listProducts(query)` -> `product-list` and `pagination` render `data` and `meta`.
- **Sign in:** `login-form` -> `utils/validate` -> `api/auth.login` -> `state/session.signIn` ->
  redirect to the `returnTo` flag (sessionStorage) or the account page.
- **Any 401:** `api/http.js` calls `onUnauthorized` -> `state/session.signOut()` -> login form
  with a "session expired" message. Cart and saved items are kept.
- **429:** `ApiError.retryAfter` -> `status-message` shows "Try again in N s"; buttons for that
  action are disabled until then. No automatic retry (avoids making the limit worse).
- **Cancel order:** shown only when `cancellable` is true; a 400 `ORDER_NOT_CANCELLABLE` refreshes
  the list (status changed on the server).

## 5. Money and ids

All prices are integer cents end to end (API and client); formatting happens only in
`utils/money.formatMoney`. Product ids are slugs; address ids are chosen by the client (slug of
the label plus a short random suffix), which makes `PUT /account/addresses/{id}` safe to retry.
