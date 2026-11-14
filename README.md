# BrandStore

A storefront in plain HTML, CSS and ES-module JavaScript, built on the **TechSphere Store API**: catalog with
search, filters and pagination; product pages; a cart kept on the device; sign-in with a JWT-protected account
(orders, addresses); and checkout. There is no framework and no bundler. Vite is used only as a dev server.

**Current task: Advanced Task 2 — React foundation: typed components, routing and the Tailwind system.**
Deliverable: [`task_2_react_foundation.md`](task_2_react_foundation.md); the app is in [`web/`](web/README.md)
(Vite + React + TypeScript, React Router, Tailwind brand tokens, Storybook). `npm run dev` starts it;
`npm run dev:legacy` the legacy pages. The plan it follows: [`task_1_architecture.md`](task_1_architecture.md).

## 1. Set up and run

You need **Node.js 20 or newer**. Python 3.9+ is only needed to run the TechSphere API yourself (it is the
API kit's `server.py`).

```bash
git clone https://github.com/pathlyworks/brandstore-ecommerce.git
cd brandstore-ecommerce
npm install
npx playwright install chromium        # once, for the end-to-end tests
```

The app reads the API address from **`VITE_API_BASE`** and falls back to **`http://localhost:4010`**, where the API
kit's server runs (`src/config.js`). Pick one:

| You have | Start the API | Start the site |
| :--- | :--- | :--- |
| A TechSphere API already running (for example, the grader's) | — | `VITE_API_BASE=<its address> npm run dev` |
| Python 3.9+ | `python3 api/techsphere/server.py` (port 4010; Windows: `python`) | `npm run dev` |
| Node.js only, no API | — | `VITE_API_URL=/api npm run dev:legacy` (legacy pages with our own BrandStore mock on `/api`) |

`npm run dev` starts the **React app** (`web/`) on http://localhost:5173; `npm run dev:legacy` starts the legacy
pages (open `/catalog.html`). `npm run storybook` opens the component stories on http://localhost:6006. `npm run start` does the
same without Vite, on http://127.0.0.1:8080. On Windows (cmd), set variables first: `set VITE_API_BASE=http://localhost:4010`.

**Test account:** `student@techsphere.test` / `Passw0rd!` (the kit's; our mock has the same account).

## 2. Run the tests

| Command | What it runs | Needs |
| :--- | :--- | :--- |
| `npm run test -w web`, `lint -w web`, `typecheck -w web`, `build-storybook -w web` | The React app: Vitest + RTL + MSW (components, hooks, routes, routing map against the plan, axe on every story), ESLint and the brand-token check, `tsc`, the Storybook build | Node only |
| `npm test` | The legacy suite below, then `npm run test -w web`. Vitest: unit tests (`tests/unit`), API integration tests (`tests/integration`) and UI integration tests in jsdom with Mock Service Worker (`tests/dom`) | Node only (the few TechSphere-server integration tests are skipped without Python) |
| `npm run test:coverage` | The same with V8 coverage of `src/state` and `src/utils`; fails below 80% of lines | Node only |
| `npm run e2e` | Playwright Test: the React app (`web/e2e`, built and served by `vite preview` on :4174) and `tests/e2e/specs`: catalog and cart, sign-in and orders, the edge-case sweep, the keyboard pass and checkout | Chromium. If `VITE_API_BASE` is set, that API is used and only the site is started. Otherwise Python starts the kit's server (`playwright.config.mjs`) |
| `E2E_BROWSERS=all npm run e2e` | The same specs in Chromium, Firefox and WebKit | `npx playwright install` |
| `npm run e2e:journeys` | The older journey suite: 36 journeys at desktop and phone sizes | Node; the `auth:` journeys need Python |
| `npm run e2e:prove` | Breaks four features in a temporary copy and checks that the right e2e test fails | as `e2e` |
| `npm run lint`, `npm run format:check` | ESLint (including the architecture rules), Prettier | Node only |
| `npm run contract` | Sends 58 requests to our mock and checks every answer against `api/openapi.json` | Node only |
| `npm run qa` | Phase 1 checks: JavaScript rules, preflight, behaviour | Node only |
| `npm run typecheck` | `tsc` strict over `src/types/` (the migration's domain types, checked against the captured API responses) | Node only |
| `npm run audit:legacy`, `api:capture`, `api:fields`, `tokens:tailwind` | Regenerate the migration evidence in `docs/migration/` | Node; `api:capture` needs an API (Python for the kit, or `VITE_API_BASE`) |

**CI** (`.github/workflows/ci.yml`) runs on every pull request:
- the React app: lint, brand tokens, typecheck, tests, build, Storybook build;
- lint, format, build and contract;
- unit and integration tests with coverage;
- the end-to-end tests in Chromium;
- the same specs in Firefox and WebKit;
- Lighthouse on the built site.

Without the npm packages (offline), `npm run test:node`, `npm run test:browser` and `npm run e2e:local` run the
same test files on Node's test runner, real Chromium and the Playwright library.

## 3. Architecture

```
HTML page ──> src/pages/<page>.js ──> src/components/* ──> src/api/*   ──> TechSphere API (VITE_API_BASE)
                (one entry module)      (render + events)   └ techsphere.js translates both ways
                                                       └──> src/state/* ──> src/utils/storage.js ──> localStorage
                                                                                                   sessionStorage
```

| Folder | Owns | Rule (enforced by ESLint) |
| :--- | :--- | :--- |
| `src/utils/` | Pure helpers: money in integer cents, cart math, query strings, dates, validation, the storage wrapper, DOM building (text only, with an image fallback) | imports nothing from the app |
| `src/api/` | `http.js` (fetch: timeout, abort, `ApiError`, Bearer header) and `product-api.js` (Axios) for each resource; `techsphere.js` maps TechSphere's format to the app's and back | no DOM, no state; `fetch` only in `http.js` |
| `src/state/` | Pure reducers for the cart, saved items, recently viewed, the catalog query and the session; stores persist through `utils/storage.js` | never calls the API |
| `src/components/` | One piece of UI each: `mount(root, deps)` with its dependencies passed in (so tests can pass fakes) | may import `api/`, `state/`, `utils/` |
| `src/pages/` | One entry per HTML page: creates the stores and clients and mounts the components | no feature logic |

Data flow for the cart:
1. A click calls a pure reducer (`state/cart.js`).
2. The store saves the result to localStorage and notifies subscribers.
3. The cart re-renders, focus is restored, and the change is announced in the `role="status"` live region.

On load, the cart re-checks prices and stock with the API.

More detail: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/STORAGE.md`](docs/STORAGE.md),
[`docs/SECURITY.md`](docs/SECURITY.md), [`docs/TEST_PLAN.md`](docs/TEST_PLAN.md).

## 4. Decisions

| Decision | Why | Trade-off |
| :--- | :--- | :--- |
| No framework, native ES modules | Small pages; every file is readable as written; no build step to debug | Hand-written rendering, so the DOM helpers in `utils/dom.js` and tests in jsdom carry that load |
| Our own app format plus a translation layer (`api/techsphere.js`) | The TechSphere API's data is not clean (prices as numbers or strings, four date formats, two pagination schemes); one place absorbs it | Every new endpoint needs a mapping and its tests |
| Money in integer cents | `0.1 + 0.2` is not `0.3` in floating point | Format only at the edge (`utils/money.js`) |
| Cart in localStorage; token in sessionStorage | The cart survives closing the browser; the token does not outlive the tab | Script injected into the page could read the token (see `docs/SECURITY.md` for the XSS defences and the CSP) |
| Text only, never `innerHTML` | Product data cannot inject markup | More verbose rendering code |
| Errors shown per status (400, 401, 404, 409, 429, 5xx, network) with a next step | The shopper always knows what happened and what to do | More messages to keep consistent (`api/errors.js`) |
| Tests through roles, labels and text | Tests read the page as a user would and survive markup refactors | `tests/support/screen.js` is a small home-made query set (Testing Library is not in the allowed tools) |

## 5. Project layout

```
web/                 the React + TypeScript app (Vite, React Router, Tailwind, Storybook); see web/README.md
*.html               pages (index, catalog, product, cart, login, register, account, comparison, 404)
css/                 tokens.css (design tokens), base, layout, components
src/                 the app (see Architecture)
api/openapi.json     our own API contract; api/techsphere/ = the official API kit (openapi.yaml, server.py)
mock-server/         our BrandStore mock (served on /api by npm run start, Vite and the Netlify function)
tests/               unit/, integration/, dom/ (jsdom + MSW), e2e/specs (Playwright Test), e2e/*.mjs (journeys)
qa/                  Phase 1 quality scripts (accessibility, keyboard, layout, headers, contrast)
scripts/             build, serve, contract, coverage summary, Lighthouse, e2e proof
docs/                architecture, security, storage, test plan, handoff, Lighthouse reports, demo
```

## 6. Deploy

Netlify runs `npm run build`, publishes `dist/` and serves our mock from `netlify/functions/api.mjs` on `/api`
(`netlify.toml` sets `VITE_API_URL=/api`). To deploy against a real TechSphere API instead, set `VITE_API_BASE`
in Netlify's environment and add its origin to `connect-src` and `img-src` in the Content-Security-Policy.

## 7. Documents

| Task | Document |
| :--- | :--- |
| Advanced, Task 2 | `task_2_react_foundation.md`, `web/` |
| Advanced, Task 1 | `task_1_architecture.md`, `docs/migration/`, `src/types/` |
| Phase 2, Task 6 | `task_6_handoff.md` (edge-case sweep, accessibility, PR and merge conflict, browsers, Lighthouse, demo), `docs/HANDOFF.md`, `docs/lighthouse/`, `docs/demo/` |
| Phase 2, Task 5 | `task_5_testing.md`, `docs/PR_TASK5.md` |
| Phase 2, Task 4 | `task_4_auth.md`, `docs/SECURITY.md` |
| Phase 2, Task 3 | `task_3_cart.md` |
| Phase 2, Task 2 | `task_2_catalog.md` |
| Phase 2, Task 1 | `task_1_api_plan.md`, `docs/ARCHITECTURE.md`, `docs/STORAGE.md`, `docs/TEST_PLAN.md`, `docs/api/ENDPOINTS.md` |
| Phase 1 | `docs/phase1/README.md`, `task_1_build_plan.md`, `LAUNCH_REPORT.md` |
| Conventions | `CONTRIBUTING.md` (branch names, commits, pull requests), `CHANGELOG.md` |
