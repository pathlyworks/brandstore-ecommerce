# Changelog

## Unreleased — Phase 2, Task 3, revision 3 (official API)
### Changed
- The API address comes from `VITE_API_BASE` (the official TechSphere API, used for grading); without it the app keeps using our mock on `/api` (`VITE_API_URL` still works).
- New `src/api/techsphere.js`: translates catalog queries, list and product bodies (string prices, `stock_status`, `reviews_count`, specs) and `{ error }` bodies, used by both the fetch client and the Axios module; `X-Client-Id` is not sent to that API (its CORS rules would block the request).
- Tests: `tests/unit/techsphere.test.js` (10 tests).

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
