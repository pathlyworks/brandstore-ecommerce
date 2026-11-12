# BrandStore

A storefront built in plain HTML, CSS and ES-module JavaScript against a REST API (OpenAPI spec in
`api/openapi.json`, mock server in `mock-server/`). No framework; Vite is used only as a dev server.

## Current task: Phase 2, Task 3 — Product detail, persistent cart, save for later

**Deliverable document: [`task_3_cart.md`](task_3_cart.md)** (what was built, cart pure functions, totals with
fixture check, what survives refresh/tab close, out-of-stock behaviour, Axios vs fetch, QA matrix, deviations list).
Branch: `feature/product-detail-cart-save-for-later`.

## Run it

```bash
npm install
npm run start            # site + mock API on http://127.0.0.1:8080 (catalog: /catalog.html)
npm run dev              # the same through Vite
```

Open `catalog.html#demo` for buttons that make the next request fail (400, 404, 429, 500) or load slowly.

## What the site does today

| Page | Features |
| :--- | :--- |
| `index.html` | Hero, categories, 3 featured products with filter buttons, launch-offers strip, testimonials, newsletter form |
| `catalog.html` | **Live catalog from the API:** debounced search; category, brand, price and rating filters with counts; sort; pagination; loading, empty and error states with retry; every view in the URL |
| `product.html?id=…` | **Product detail:** gallery, specs table, stock status, quantity stepper, add to cart, save for later, recently viewed strip (loaded through the Axios module) |
| `cart.html` | **Cart:** lines with quantity steppers, totals with the shipping rule, clear cart, saved-for-later list, recently viewed; kept in localStorage, prices re-checked with the API |
| `comparison.html` | Comparison table with "Highlight differences" |
| `404.html` | Not-found page |

Planned (designed in `task_1_api_plan.md`, not built yet): checkout, sign-in, order history, address book.

## npm scripts

| Script | Does |
| :--- | :--- |
| `dev` | Vite dev server (with the mock API on `/api`) |
| `start` / `preview` | Zero-dependency server for the project / for `dist/`, with the mock API on `/api` |
| `build` | Copy the site into `dist/` and check every page reference and module import |
| `lint` / `format` / `format:check` | ESLint / Prettier |
| `test` | Vitest unit and integration tests (`tests/unit`, `tests/integration`) |
| `e2e` | Browser journeys with Playwright (`tests/e2e`) |
| `mock` / `contract` | Mock API alone on port 4010 / check the API against the spec |
| `vendor` | Copy Axios's ES-module build into `src/vendor/` (no bundler) |
| `qa`, `branch:check`, `check` | Phase 1 QA, branch-name rule, everything |

## Deploy

Connect the Git repository to Netlify: it runs `npm run build`, publishes `dist/`, and serves the API from the
function in `netlify/functions/api.mjs` on `/api/*`. (Netlify Drop cannot run functions, so the catalog would
have no API there.)

## Documents

| Task | Document |
| :--- | :--- |
| Phase 2, Task 3 | `task_3_cart.md` |
| Phase 2, Task 2 | `task_2_catalog.md` |
| Phase 2, Task 1 | `task_1_api_plan.md`; previous README `docs/phase2-task1-README.md`; `docs/ARCHITECTURE.md`, `docs/STORAGE.md`, `docs/TEST_PLAN.md`, `docs/api/ENDPOINTS.md` |
| Phase 1 | `docs/phase1/README.md`, `task_1_build_plan.md`, `LAUNCH_REPORT.md` |
| Conventions | `CONTRIBUTING.md` (branch names, commits), `CHANGELOG.md` |
