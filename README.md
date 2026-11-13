# BrandStore

A storefront built in plain HTML, CSS and ES-module JavaScript against a REST API (OpenAPI spec in
`api/openapi.json`, mock server in `mock-server/`). No framework; Vite is used only as a dev server.

## Current task: Phase 2, Task 5 — Automated testing (unit, integration, end-to-end) and CI

**Deliverable document: [`task_5_testing.md`](task_5_testing.md)** (edge-case unit tests, jsdom + MSW
integration tests, the two Playwright tests and the proof that they catch broken features, coverage, CI,
bugs found). Pull request text: [`docs/PR_TASK5.md`](docs/PR_TASK5.md). Branch: `feature/automated-tests-ci`.

## Run it

```bash
npm install
npm run start            # site + mock API on http://127.0.0.1:8080 (catalog: /catalog.html)
npm run dev              # the same through Vite
```

**Against the official TechSphere API** (used for grading): `python3 api/techsphere/server.py` (port 4010), then
`VITE_API_BASE=http://127.0.0.1:4010 npm run start`. Test account: `student@techsphere.test` / `Passw0rd!`.

Open `catalog.html#demo` for buttons that make the next request fail (400, 404, 429, 500) or load slowly.

## What the site does today

| Page | Features |
| :--- | :--- |
| `index.html` | Hero, categories, 3 featured products with filter buttons, launch-offers strip, testimonials, newsletter form |
| `catalog.html` | **Live catalog from the API:** debounced search; category, brand, price and rating filters with counts; sort; pagination; loading, empty and error states with retry; every view in the URL |
| `product.html?id=…` | **Product detail:** gallery, specs table, stock status, quantity stepper, add to cart, save for later, recently viewed strip (loaded through the Axios module) |
| `cart.html` | **Cart:** lines with quantity steppers, totals with the shipping rule, clear cart, saved-for-later list, recently viewed; kept in localStorage, prices re-checked with the API |
| `login.html` / `register.html` | **Sign in / create account:** labelled, validated forms; 401 and 400 messages; token kept in sessionStorage |
| `account.html` | **Account (Bearer token):** order history with pages and cancel, address book (edit, delete), sign out (cart kept); expired session → sign-in with a message |
| `comparison.html` | Comparison table with "Highlight differences" |
| `404.html` | Not-found page |

Planned (designed in `task_1_api_plan.md`, not built yet): checkout.

## npm scripts

| Script | Does |
| :--- | :--- |
| `dev` | Vite dev server (with the mock API on `/api`) |
| `start` / `preview` | Zero-dependency server for the project / for `dist/`, with the mock API on `/api` |
| `build` | Copy the site into `dist/` and check every page reference and module import |
| `lint` / `format` / `format:check` | ESLint / Prettier |
| `test` | Vitest: unit (`tests/unit`), API integration (`tests/integration`) and UI integration in jsdom with MSW (`tests/dom`) |
| `test:unit` / `test:integration` | Only the unit / only the integration tests |
| `test:coverage` | `test` with V8 coverage of `src/state` and `src/utils`; fails below 80% of lines |
| `e2e` | Playwright Test: the two end-to-end tests in `tests/e2e/specs` against the TechSphere API (needs Python 3.9+) |
| `e2e:prove` | Breaks four features one at a time in a temporary copy and checks the matching e2e test fails |
| `e2e:journeys` | The older journey suite (`tests/e2e/run.mjs`, desktop and phone) |
| `test:node`, `test:browser`, `e2e:local`, `coverage:node` | Stand-ins for machines without the packages: Node's test runner, real Chromium for the jsdom tests, the Playwright library for the specs, Node's coverage |
| `mock` / `contract` | Mock API alone on port 4010 / check the API against the spec |
| `vendor` | Copy Axios's ES-module build into `src/vendor/` (no bundler) |
| `qa`, `branch:check`, `check` | Phase 1 QA, branch-name rule, everything |

CI (`.github/workflows/ci.yml`) runs lint, build and contract; the unit and integration tests with coverage;
and the end-to-end tests on every pull request.

## Deploy

Connect the Git repository to Netlify: it runs `npm run build`, publishes `dist/`, and serves the API from the
function in `netlify/functions/api.mjs` on `/api/*`. (Netlify Drop cannot run functions, so the catalog would
have no API there.)

## Documents

| Task | Document |
| :--- | :--- |
| Phase 2, Task 5 | `task_5_testing.md`, `docs/PR_TASK5.md` |
| Phase 2, Task 4 | `task_4_auth.md`, `docs/SECURITY.md` |
| Phase 2, Task 3 | `task_3_cart.md` |
| Phase 2, Task 2 | `task_2_catalog.md` |
| Phase 2, Task 1 | `task_1_api_plan.md`; previous README `docs/phase2-task1-README.md`; `docs/ARCHITECTURE.md`, `docs/STORAGE.md`, `docs/TEST_PLAN.md`, `docs/api/ENDPOINTS.md` |
| Phase 1 | `docs/phase1/README.md`, `task_1_build_plan.md`, `LAUNCH_REPORT.md` |
| Conventions | `CONTRIBUTING.md` (branch names, commits), `CHANGELOG.md` |
