# Changelog

## Unreleased — Phase 2, Task 6: robustness, pull request, demo, handoff (branch `feature/robustness-handoff`, PR #3)
### Added
- Checkout: "Place order" (POST /orders with the Bearer token). An empty cart, or a cart with nothing in stock, is stopped before the API with the reason; signed-out shoppers sign in and come back to the cart.
- Live-region announcements for every cart change (quantity, save for later, remove), with the new total.
- Edge-case sweep tests: `tests/unit/edge-sweep.test.js`, `tests/dom/edge-sweep-ui.test.js`, `tests/e2e/specs/robustness.spec.js`; keyboard and checkout spec `tests/e2e/specs/keyboard-checkout.spec.js`.
- CI: cross-browser smoke (Firefox, WebKit) and Lighthouse (`scripts/lighthouse.mjs`); `E2E_BROWSERS` for the Playwright specs.
- `docs/HANDOFF.md` (16 API contract gaps), demo video and recorder (`docs/demo/`, `scripts/record-demo.mjs`), README rewritten for a new developer.
### Changed
- The API address defaults to `http://localhost:4010` (the TechSphere kit) when `VITE_API_BASE` is not set; our own mock is opt-in with `VITE_API_URL=/api`.
- Product images come from the API, with a one-time fallback to the placeholder when one cannot be loaded.
- `npm run e2e` resets the API only when it can (`/__reset` may be absent on a given API).
### Fixed
- Specification rows with null values showed "null"; they are left out.
- On a short last catalog page the count started at the wrong number ("Showing 9–12" instead of "17–20"): the TechSphere page size is 8.
- An empty cart showed "$0.00" against the EGP-priced API; the price filter legend said "USD".

## Unreleased — Phase 2, Task 5: automated testing and CI (branch `feature/automated-tests-ci`)
### Revision after grading
- End-to-end tests use the API given in `VITE_API_BASE` (the grader's) and start Python only when it is not set.
- `tests/unit/state-guards.test.js`: free and out-of-stock cart lines, a valid stored session, storage events for other keys.
- Journey suite queries by role, label and text instead of CSS ids and classes.
- `docs/SECURITY.md`: section 1 is titled "Token storage".
### Added
- `tests/unit/edge-cases.test.js`: zero/negative/invalid quantities, above stock and limit, floating-point totals, price-string parser, currency formatting, awkward query strings, missing/blocked/full/corrupted storage.
- `tests/dom/`: catalog and cart rendered in jsdom against Mock Service Worker (200, empty, 401, 429, 500, 404), asserting on roles, names and text; `utils/dom.js` tests.
- Playwright Test: `playwright.config.mjs` and two specs (filter the catalog and add to cart; sign in with a wrong password first and view orders) against the TechSphere API; `npm run e2e:prove` breaks four features and checks the tests fail.
- Coverage thresholds (80% of lines in `src/state` and `src/utils`), `scripts/coverage-summary.mjs`.
- CI: three jobs (lint/format/build/contract; unit + integration with coverage; end-to-end) on every pull request.
- Stand-ins for machines without the packages: `test:browser`, `e2e:local`, `coverage:node`.
### Changed
- `npm run e2e` runs Playwright Test; the journey suite moved to `npm run e2e:journeys`.
### Fixed
- A 401 on the catalog said "Could not reach the store"; it now says "Please sign in again".
- The cart now says when prices could not be re-checked (401, 429, 5xx, network) instead of staying silent.
- `validateQuantity(null)` is "not a number" rather than quantity 0.
- TechSphere category slugs are shown as readable labels.

## Unreleased — Phase 2, Task 4: login, account area, web security (branch `feature/auth-account-security`)
### Added
- `login.html`, `register.html`: accessible forms (labels, `aria-invalid`, error summary with focus), client-side validation, distinct 401 (wrong credentials) and 400 (already registered / invalid) messages.
- `account.html`: order history (paged, mixed API date formats normalised, cancel with 409 handling) and address book (edit, delete), all with `Authorization: Bearer`; sign out clears the session but keeps the cart.
- Session in sessionStorage (`state/session.js` pure, `createSessionStore`), JWT `exp` read by `utils/jwt.js`; expiry and any 401 send the shopper to sign-in with a message and back afterwards (`components/auth-session.js`).
- "Sign in" / "Account" link in the menu on every page.
- The official TechSphere API kit in `api/techsphere/`; `VITE_API_BASE` is injected by `npm run start`/`preview` and the build; `src/api/techsphere.js` translates auth, orders and addresses.
- `docs/SECURITY.md`: token storage trade-off, XSS, CORS, CSRF, proposed CSP.
- Tests: auth unit tests, account integration tests (our mock and TechSphere), 8 auth e2e journeys against TechSphere, including a credential-leak check.
### Changed
- CSP adds `connect-src 'self'`, `font-src 'self'`, `upgrade-insecure-requests`.
- Private pages are `noindex`, out of the sitemap and disallowed in `robots.txt`.
- ESLint forbids `console.log/info/warn` in `src/`.
### Removed
- Task 1 stubs (`api/orders.js`, `api/addresses.js`, `components/login-form.js`, `utils/not-implemented.js`), replaced by `api/account.js` and the components above.

## Unreleased — Phase 2, Task 3, revision 3 (official API)
### Changed
- The API address comes from `VITE_API_BASE` (the official TechSphere API, used for grading); without it the app keeps using our mock on `/api` (`VITE_API_URL` still works).
- New `src/api/techsphere.js`: translates catalog queries, list and product bodies (string prices, `stock_status`, `reviews_count`, specs) and `{ error }` bodies, used by both the fetch client and the Axios module; `X-Client-Id` is not sent to that API (its CORS rules would block the request).
- Tests: `tests/unit/techsphere.test.js` (10 tests).
### Fixed
- `npm run dev` could not start: `vite.config.js` imports `mock-server/server.mjs`, whose top-level `await` is a build error when Vite bundles the config as CommonJS. The mock's start-up now uses `.then()`.

## Unreleased — Phase 2, Task 3, revision 2 (after review)
### Changed
- Pure state modules (`state/cart.js`, `saved.js`, `recent.js`) contain no storage, DOM or network; persistence moved to `state/stores.js`; ESLint enforces it. Added `cartReducer` and `cartSummary` (shared by the menu badge and the cart page).
- Quantity bounds: `validateQuantity` corrects 0, above-stock and above-limit requests and the reason is shown next to the stepper; setting a cart line to 0 removes it.
- Stored data is repaired on load (bad entries dropped, duplicates merged, defaults for image/currency) and written back.
- Spec declares `X-Client-Id` and the mock-only test headers; the e2e run audits every `/api` request against the spec.
- Tests run in Node (`environment: 'node'`); new `npm run test:node` runs them with no installed packages.

## Unreleased — Phase 2, Task 3: product detail, cart, save for later (branch `feature/product-detail-cart-save-for-later`)
### Added
- Product page: image gallery, specs table, stock status, quantity stepper limited by stock, add to cart, save for later, recently viewed strip; out-of-stock products cannot be added and say why.
- `cart.html`: cart lines, totals (free shipping from $100.00, else $7.99), clear cart, saved-for-later list (move to cart / remove), recently viewed; "Cart (n)" in the menu on every page.
- Cart and saved list as pure functions over state objects (destructuring + spread), persisted in localStorage and rehydrated with validation; recently viewed in sessionStorage (no duplicates, max 6).
- `src/api/product-api.js`: the one Axios module, with request and response interceptors (Axios 1.19.0 vendored by `npm run vendor`).
- API: product detail now has a 3-image gallery and real specs.
- Tests: cart fixture totals, pure-function and storage unit tests, Axios unit and integration tests, 8 cart e2e journeys.
### Changed
- Home page product prices use the shared `formatMoney`.

## Unreleased — Phase 2, Task 2: catalog (branch `feature/catalog-search-filter-sort`)
### Added
- `catalog.html`: live catalog from `GET /products` with debounced search, category/brand/price/rating filters with client-side facet counts, sorting, pagination, loading/empty/error states with retry, and the whole view in the URL (reload, share, Back/Forward).
- `product.html`: one product from `GET /products/{id}` with a "Product not found" state.
- Superseded requests are aborted (`AbortController`) and late answers ignored (`src/utils/latest.js`).
- API: `brand` field and filter, `minRating` filter, 500 documented; mock test headers `X-Mock-Status` / `X-Mock-Delay`; API served on `/api` by `npm run start`, Vite and a Netlify Function.
- Tests: fixtures (`tests/fixtures/catalog-cases.json`), unit tests for query strings, facets, debounce, http, state and errors; integration tests against the mock and the Netlify function; 9 catalog/product e2e journeys.
- `task_2_catalog.md` (deliverable), new short `README.md`.
### Fixed
- Invisible "Clear all filters" button (dark-background outline style), 44 px tap target for short nav links, long product names overflowing at 200% text, heading order on the product error box.

## Unreleased — Phase 2, Task 1, revision 3
### Changed
- `README.md` rewritten as a short report with the required sections first: Endpoint Table, Storage Strategy, QA Matrix, Deviations List.
- Removed the last classic script (`src/boot.js`); pages load only one ES module each. The mobile-menu CSS uses `@media (scripting: enabled)`.

## Unreleased — Phase 2, Task 1, revision 2 (after review)
### Changed
- All site JavaScript moved from 11 classic scripts on a `window.BrandStore` global to ES modules in `src/` (one module entry per page in `src/pages/`); `js/` removed. The site is now served over http (`npm run start` / `npm run dev`).
- `README.md` is now the Phase 2 report (endpoint table, QA matrix, deviations list, site-today-vs-planned); the Phase 1 README moved to `docs/phase1/README.md`.
- QA scripts load the site over http (`qa/serve.js`); `qa/js-rules.js` now checks ES modules, globals and function length.
### Added
- npm scripts `build` (copy + verify into `dist/`), `e2e` (9 Playwright journeys), `start`, `preview`, `qa`.
- Unit tests for the email rules, `start()` and the content data.
- Netlify builds with `npm run build` and publishes `dist/` (with `_headers`).

## Unreleased — Phase 2, Task 1: API contract review and application plan (branch `feature/api-contract-and-app-plan`)
### Added
- `api/openapi.json` (8 operations) and a zero-dependency mock server (`npm run mock`).
- `npm run contract`: 45 requests covering 200, 201, 400, 401, 404, 429; writes the endpoint table, request log and a Postman collection to `docs/api/`; 0 problems.
- `src/` module layout (api, components, state, utils; 31 documented stubs) with ESLint-enforced boundaries.
- Storage strategy, architecture, test plan and branch convention docs; `package.json` scripts; ESLint 10 and Prettier 3 config; GitHub Actions CI.
### Fixed
- Six lint findings in the Phase 1 QA scripts (dead variables, `let` -> `const`, needless escape).

## v1.0.1 — 2026-11-12 (Task 5 revision after review)
### Fixed
- `404.html` was missing Open Graph and Twitter tags; every page now has a unique title, meta description, Open Graph tags and one `h1`.
- `qa/preflight.js` now applies the title/description/Open Graph/h1 rules to all three pages (163 checks).
- `scripts/set-site-url.js` also updates `404.html`.
### Changed
- `LAUNCH_REPORT.md`/`.pdf` restructured with named sections: Endpoint Table, SEO Summary, Deviations List, QA Matrix, Lighthouse and axe Results.
- README deliverables table points to the launch report, release tag and changelog.

## v1.0.0 — 2026-11-12 (Task 5 release candidate)
### Added
- `404.html`, `robots.txt`, `sitemap.xml`, `favicon.svg`, `apple-touch-icon.png`, `og-image.png` (1200x630), `.nojekyll`.
- Unique title, meta description, Open Graph and Twitter tags and one `h1` on every page (404 included); canonical on the indexable pages.
- `netlify.toml` with security headers and a same-origin Content-Security-Policy.
- `scripts/set-site-url.js` to replace the placeholder host with the deployed URL.
- QA scripts: `qa/preflight.js` (accessibility/SEO audit), `qa/headers.js`, `qa/matrix.js` (browser x viewport).
- `LAUNCH_REPORT.md` / `.pdf` and `docs/RUNBOOK.md`.
### Fixed
- Header/nav links clipped at 200% text size (now wrap).
- 404 page in-page anchors pointed at sections that do not exist on it.
### Known limitations
- Live URL, Lighthouse, axe, screen-reader, Firefox/Safari results are pending (see `docs/RUNBOOK.md`).

## v0.4.0 — Task 4: JavaScript interactivity, data-driven sections, form validation (fixed stale-error bug).
## v0.3.0 — Task 3: visual polish, interaction states, motion, keyboard/focus work.
## v0.2.0 — Task 2: layout architecture (Grid/Flexbox, responsive images).
## v0.1.0 — Task 1: build plan.
