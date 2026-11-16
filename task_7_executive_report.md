# Advanced Task 7: Production Readiness and the Executive Report

For: Dina Mostafa, Vice President of Engineering · Author: Ahmed · Date: 2026-11-16 · Release: **v2.0.0**
Repository: https://github.com/pathlyworks/brandstore-ecommerce · Deployed preview:
https://pathlyworks.github.io/brandstore-ecommerce/ · Deck: [`executive_presentation.pdf`](executive_presentation.pdf)
(source `docs/deck/`) · Monitoring: [`monitoring_plan.md`](monitoring_plan.md) · Evidence index:
[`docs/evidence/task7/README.md`](docs/evidence/task7/README.md)

Every number in this report and in the deck has a source in the evidence index (§11). **Measured** means
re-run by a command in this repository. **Estimated** is marked as such.

## 1. The answer

**Your question:** how should the front end be architected to scale, and what must ship and what must wait
before Black Friday?

**Answer: ship the React storefront for Black Friday. Hold the last two legacy pages and the cutover until
January.**

- **What ships (v2.0.0, ready now):** the React + TypeScript storefront: catalog, product, cart, a 3-step
  checkout, sign-in, order history and the protected admin dashboard, on one typed component system. Every
  change goes through 7 CI gates. A broken checkout cannot merge: we proved it with PR #17.
- **What waits, and why:** the addresses page and the comparison page (still served by the legacy site), the
  cutover (redirects and deleting the legacy code), and cookie-based sessions. None of them is needed to sell on
  Black Friday. All of them carry change risk in the freeze window.
- **The condition:** the storefront has only ever run against the TechSphere API kit. Before Black Friday it needs
  the production API behind an HTTPS address (`VITE_API_BASE`), the monitoring endpoint switched on, and a
  load test of `POST /orders`. These are the backend team's items in §7.
- **The biggest risk:** slow mobile networks. On a 3G profile the catalog takes 4.5 s to show its main content
  (measured), the slowest of the shopper routes (§9).

## 2. Situation: the legacy site's limits (audit, Task 1)

Source: `task_1_architecture.md` §1, `docs/migration/audit.md`, `docs/lighthouse/README.md`.

| Limit                  | Measured                                                                                   |
| :--------------------- | :----------------------------------------------------------------------------------------- |
| No checked types       | 70 modules, 5,796 lines, 0 TypeScript; 93 JSDoc types that say nothing (`{object}`, `{*}`) |
| Duplicated page shell  | header and footer copied into 9 HTML pages, already drifted into 4 versions each           |
| Duplicated UI patterns | 6 hand-built image modules, 8 price formatters, 7 live regions                             |
| State created per page | 5 storage keys; the cart store created on 9 pages and synchronised by `storage` events     |
| No bundler             | 15–34 separate module requests a page, unminified, no cache-busting; two HTTP clients      |
| Missing features       | no checkout page, no admin view, no protected routes                                       |
| Mobile layout shift    | catalog CLS 0.143, cart 0.112 (Lighthouse, PR #3)                                          |

The legacy site works, and its tests were good (162 unit tests, state at 99.86% line coverage). It could not
grow: every new feature meant editing 9 pages.

## 3. Evidence

### 3.1 Before and after, measured under identical conditions

Lighthouse, mobile profile (emulated Moto G Power, simulated slow 4G: 150 ms RTT, 1.6 Mbps, 4× CPU), median
of 3 runs, production build against the API kit.

| Page                            | Legacy site (PR #3) | React, Task 4 build | React v2.0.0 (this release) |
| :------------------------------ | ------------------: | ------------------: | --------------------------: |
| `/` performance                 |                  98 |                  97 |                      **98** |
| `/products` performance         |                  91 |                  81 |                      **98** |
| `/products/p-001` performance   |                  94 |                  81 |                      **98** |
| `/cart` performance             |                  95 |                 100 |                     **100** |
| Accessibility, every page above |                 100 |              99–100 |                     **100** |
| SEO, every page above           |                 100 |               82–83 |                     **100** |
| CLS, worst page                 |               0.143 |               0.409 |                       **0** |

Sources: `docs/lighthouse/README.md` (legacy), `docs/evidence/task5/lighthouse/before/summary.json` (Task 4
build), `docs/evidence/task7/lighthouse/v2.0.0-mobile/summary.json` (this release, `web/scripts/measure.mjs`).

**What got worse, and why we accept it:** first-visit JavaScript grew from 11–44 KB gzip a page (legacy) to
125 KB transferred (React v2.0.0, `scriptBytes` in the same summary). React, React DOM and React Router are 81% of
it (`docs/evidence/task5/bundle/`). It is the cost of one application instead of 9 pages, it was forecast in the
Task 1 plan, and it is capped: a pull request that pushes JavaScript over 160,000 bytes fails CI.

### 3.2 Field data (scripted sessions, not real shoppers)

The web-vitals library on the deployed preview, our own scripted sessions (Task 5, `docs/evidence/task5/web-vitals/deployed.json`):
LCP 876 ms on `/products` on an emulated phone, INP 16–32 ms, CLS 0. These are not real users. Real-user data
starts when the monitoring endpoint exists (`monitoring_plan.md` §4).

### 3.3 Tests and quality gates

| Measure                                     | Value                                                                                      | Source                              |
| :------------------------------------------ | :----------------------------------------------------------------------------------------- | :---------------------------------- |
| Unit and component tests                    | 534 passing, 48 files                                                                      | `docs/evidence/task7/coverage.json` |
| Line coverage, `web/src/state`              | 96.3% (floor 75%)                                                                          | same                                |
| Line coverage, `web/src/components`         | 92.7% (floor 75%)                                                                          | same                                |
| Line coverage, everything measured          | 95.9%                                                                                      | same                                |
| End-to-end specs (Playwright, real API kit) | 7 files: full checkout, API 500 at submit, session expiry, admin denied, axe on key routes | `web/e2e/`                          |
| axe accessibility violations, key routes    | 0                                                                                          | `web/e2e/a11y.spec.ts`, CI          |
| A broken checkout reaches `main`            | blocked: PR #17 changed one character in the shipping rule and CI failed                   | `task_6_testing_quality.md` §5      |

## 4. What shipped

| Area                                 | Shipped in v2.0.0                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| :----------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Routes**                           | 13 working routes: `/`, `/products`, `/products/:id`, `/cart`, `/checkout/address`, `/checkout/payment`, `/checkout/review`, `/checkout/confirmation/:number`, `/login`, `/register`, `/account/orders`, `/admin`, and the 404 page. `/account`, `/checkout` and `/admin` are protected (sign-in with a return path, admin role for `/admin`). Two routes are placeholders that point to the legacy page: `/account/addresses` and `/compare` (§6). |
| **Component system**                 | 17 typed shared components (`web/src/components/`: Button, Input, Select, Modal with a focus trap, Table/DataTable with sorting and paging, Tabs, Steps, Badge, Card, Navbar, Footer, Toast and others), 11 with Storybook stories, axe run on every story, Tailwind on the brand tokens only (a CI check rejects any other colour).                                                                                                                |
| **Checkout**                         | cart on one pure reducer (integer cents, stock and quantity limits), 3 validated steps, the draft survives refresh and Back, one order however fast the clicks (idempotency key), a clear error and a safe retry when the API fails.                                                                                                                                                                                                                |
| **Dashboard**                        | `/admin`, admin-only and in its own chunk shoppers never download: sales, orders, average order value, sales by category and by month, each chart with a table of its numbers.                                                                                                                                                                                                                                                                      |
| **Production readiness (this task)** | API address from the environment only; deploy preview on every pull request; the tagged release v2.0.0 published by CI only after every gate passed; error-tracking hooks, Web Vitals reporting and funnel event hooks; a scheduled Lighthouse run against production.                                                                                                                                                                              |

**Not a complete migration.** The legacy pages are still live and still in the repository. The React app is a
new front end beside them, not their replacement yet (§6).

## 5. Release and CI

- **The pipeline** (`.github/workflows/ci.yml`), on every pull request: lint and format, type-check (strict, no
  `any`), unit and component tests with the coverage floors, the Vite and Storybook builds, Playwright end to end
  (Chromium) and a cross-browser smoke (Firefox, WebKit), Lighthouse CI budgets, and the **deploy preview** (the
  same build GitHub Pages serves, as a downloadable artifact). `main` deploys to GitHub Pages (`pages.yml`).
- **The release:** pushing the tag `v2.0.0` runs every gate again. The **Release** job runs only when all of them
  pass and publishes the GitHub Release with the built app attached. The run is linked in the evidence index.
- **Environment configuration:** the React app reads its API address only from `VITE_API_BASE`. The one default,
  the API kit's local server for development, lives in the build configuration (`web/vite.config.ts`), not in
  the app's code. Every variable is documented per environment in `.env.example` and `web/.env.example`. The
  legacy pages keep a development default in `src/config.js`, because they also run unbundled.
- **Found by this task:** GitHub Pages answered every deep link with HTTP 404 (served by `404.html`), so search
  engines would have treated product pages as missing. Fixed: the app shell is now written at every public route
  (`web/scripts/pages-routes.mjs`). The first scheduled run on production then found two more things: the
  preview ships 73 KB more JavaScript than the budget allows (its in-browser demo API, not part of a real
  production build; the preview has its own budget), and the alert had a bug that hid failures (fixed). See
  `monitoring_plan.md` §3.

## 6. Trade-offs made, and deferred work

### 6.1 Trade-offs

| Decision                                                                           | What we gained                                                                                | What it costs                                                                   | When to revisit                                                                    |
| :--------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------- |
| **Token storage:** in memory, mirrored to sessionStorage (`task_4_security.md` §1) | a reload keeps the session; nothing persists after the tab closes; sign-out reaches every tab | script injected into the page (XSS) could read it; a new tab must sign in again | with a backend: HttpOnly, SameSite cookies through a backend-for-frontend (wave 6) |
| **Migration in waves**, legacy pages live beside the React app                     | each wave shipped and tested on its own; the cart is shared through the same storage key      | two front ends to keep working until cutover                                    | cutover in January (wave 5)                                                        |
| **Client-side rendering only** (no SSR)                                            | the allowed stack, simple hosting, SEO 100 in Lighthouse                                      | first-load JavaScript of 125 KB; slow on 3G (§9)                                | if real-user LCP misses the target after Black Friday                              |
| **One HTTP client, no Axios, no server-state library**                             | less code, one 401 handler, smaller bundle                                                    | caching across routes is ours to write                                          | if caching becomes a problem                                                       |
| **GitHub Pages for the preview**, API answered in the browser                      | a public, free, shareable preview                                                             | not production: no backend, no server logs                                      | when the production API exists                                                     |

### 6.2 Deferred work, with the reason and the proposed wave

| Item                                                                               | Reason it waits                                                                                                      | Proposed wave                | Effort (estimated)                  |
| :--------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------- | :--------------------------- | :---------------------------------- |
| `/account/addresses` (legacy `account.html`)                                       | the API can list, edit and delete addresses but not create one (HANDOFF gap); shoppers can still use the legacy page | **Wave 5, January**          | 2 ideal days with tests             |
| `/compare` (legacy `comparison.html`)                                              | static page, no API, rarely visited, nothing depends on it                                                           | **Wave 5, January**          | 1 ideal day                         |
| Cutover: redirects, delete legacy pages, the mock API, the dialect layer and Axios | must not happen in the Black Friday freeze; legacy pages are the fallback                                            | **Wave 5, January**          | 2.5 ideal days                      |
| Cookie sessions through a backend-for-frontend, enforced CSP with nonces           | needs a backend we do not have                                                                                       | **Wave 6, with the backend** | backend-dependent                   |
| Funnel counting and dashboards                                                     | needs an events endpoint and storage                                                                                 | **Wave 6, with the backend** | 1 day front end, after the endpoint |
| Arabic and right-to-left layout                                                    | doubles visual QA; legacy did not have it either                                                                     | **Separate project, Q1**     | not estimated                       |
| Visual regression tests as a CI gate                                               | a stable baseline exists only after cutover                                                                          | **Wave 5**                   | 1 ideal day                         |

**The two remaining legacy pages: about 3 ideal days for both, 5.5 with the cutover** (estimated: one developer,
6 focused hours a day, the Task 1 assumptions, plus 20% contingency → about 7 days, so 1.5 weeks).

## 7. Black Friday readiness checklist, with risks

|   # | Item                                                                    | Status                 | Owner               |
| --: | :---------------------------------------------------------------------- | :--------------------- | :------------------ |
|   1 | CI green on the tagged release v2.0.0, all gates active                 | done                   | front end           |
|   2 | Broken checkout cannot merge (tests guard the money logic)              | done (PR #17)          | front end           |
|   3 | Lighthouse budgets enforced on every PR and checked daily on production | done                   | front end           |
|   4 | Error-tracking hooks, Web Vitals reporting and funnel hooks in the app  | done                   | front end           |
|   5 | Rollback: the previous tag and its build are one step away              | done (GitHub Releases) | front end           |
|   6 | Production API at an HTTPS address, set as `VITE_API_BASE`              | **open**               | backend             |
|   7 | Monitoring endpoint (or vendor) receiving events; alerts set            | **open**               | backend + front end |
|   8 | Load test of `POST /orders` and the catalog at the expected peak        | **open**               | backend             |
|   9 | Catalog fast enough on 3G (LCP under 4 s)                               | **open**, §9           | front end           |
|  10 | Deploy freeze 48 h before to 24 h after; on-call rota                   | **to agree**           | VP Engineering      |

| Risk                                                                   | Likelihood           | Impact                       | Mitigation                                                                                                          |
| :--------------------------------------------------------------------- | :------------------- | :--------------------------- | :------------------------------------------------------------------------------------------------------------------ |
| Slow mobile networks: the catalog shows its products after 4.5 s on 3G | high on Black Friday | lost sessions from campaigns | start the first catalog request before React renders; cache the first catalog page at the CDN; keep the budget gate |
| The API under peak load (never tested beyond the kit)                  | medium               | checkout fails               | load test (item 8); the checkout already retries safely with an idempotency key                                     |
| No real-user data yet, so no baseline for alerts                       | certain              | late detection               | watch-only for 2 weeks before Black Friday, then set thresholds (`monitoring_plan.md` §7)                           |
| Session in sessionStorage readable by injected script                  | low                  | account takeover             | React escaping, no raw HTML, one-hour tokens; cookies in wave 6                                                     |
| Two front ends during the freeze                                       | medium               | inconsistent pages           | the cart is shared by key; no legacy changes in the freeze                                                          |

## 8. Monitoring plan (summary)

Full plan: `monitoring_plan.md`. It is written for what we have: no backend and no analytics data.

- **Error-tracking hooks (live):** uncaught errors, unhandled rejections and route errors are captured by one
  sink (`web/src/app/monitoring.ts`), sent with `sendBeacon` once `VITE_MONITORING_ENDPOINT` is set.
- **Scheduled Lighthouse runs (live):** daily and after each deploy, against production, with the PR budgets. A
  missed budget opens a `performance-regression` issue.
- **Web Vitals reporting (live):** LCP, INP and CLS from every page view, through the same sink.
- **Funnel events to add when a real backend exists:** seven named events from `view_item` to `purchase`; three
  are already wired. Checkout completion = `purchase` ÷ `begin_checkout`.
- **Response process** for an accessibility regression in CI and for a drop in checkout completion:
  `monitoring_plan.md` §6.

## 9. The route most at risk on 3G

Lighthouse with its "regular 3G" preset (300 ms RTT, 700 kbps, 4× CPU), same build and method as §3.1
(`docs/evidence/task7/lighthouse/v2.0.0-3g/summary.json`):

| Route             | Performance |          LCP | CLS |
| :---------------- | ----------: | -----------: | --: |
| `/products`       |          83 | **4,467 ms** |   0 |
| `/products/p-001` |          84 |     4,435 ms |   0 |
| `/`               |          81 |     4,426 ms |   0 |
| `/cart`           |          88 |     3,767 ms |   0 |
| `/login`          |          99 |     1,515 ms |   0 |

**Most at risk: `/products`.** It has the slowest LCP, and (an assumption, without real traffic data) it is
where Black Friday campaign links land. Every route that waits for the API before its first content is above the
4,000 ms "poor" line on 3G. `/cart` and `/login` need no API call before they render, which is why they are
faster. The cost is the 125 KB of JavaScript followed by the API round trip. The fix with the best ratio:
start the first catalog request in parallel with the JavaScript (preload), and cache that response at the CDN.

## 10. Recommendations

|                 | Recommendation                                                                                                                                                                 | Why                                                                       |
| :-------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------ |
| **Protect**     | the CI gates (coverage floors, e2e checkout, axe, Lighthouse budgets), the cart reducer and its tests, the idempotent checkout                                                 | they are what stopped PR #17, and what makes a release safe in the freeze |
| **Invest**      | the production API and the monitoring endpoint (§7 items 6–8); the 3G fix for the catalog                                                                                      | they are the only open items between v2.0.0 and Black Friday              |
| **Investigate** | real-user Web Vitals after launch (is 3G a real share of our shoppers?); server-side rendering for the catalog only if real LCP misses the target; which error-tracking vendor | decide on data, not on lab numbers                                        |
| **Defer**       | addresses and compare pages, cutover, cookie sessions, Arabic, visual regression tests (§6.2)                                                                                  | none sells more on Black Friday; each adds change risk in the freeze      |

## 11. Evidence index

Every metric above, where it comes from and how to re-run it: [`docs/evidence/task7/README.md`](docs/evidence/task7/README.md).
