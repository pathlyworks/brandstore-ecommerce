# Monitoring plan: BrandStore React storefront

Advanced Task 7 deliverable. Author: Ahmed · Date: 2026-11-16 · Release: `v2.0.0`.
Companion to [`executive_presentation.pdf`](executive_presentation.pdf) and
[`task_7_executive_report.md`](task_7_executive_report.md).

**The constraint this plan is written for:** there is no real backend, no analytics account and no real
shopper traffic yet. The GitHub Pages deployment answers the API in the browser. So the plan has two parts:

- **What runs today**, with no data and no vendor: the code hooks, the CI gates and the scheduled Lighthouse
  run. These are in the repository and tested.
- **What to switch on when a backend exists**: where the hooks send their events, and the funnel to count.
  The thresholds below start from lab budgets and our own scripted sessions. They are **starting points, not
  baselines**: the first two weeks of real traffic set the real baseline (§7).

| Signal               | Running today                                                                        | Where                                                                        | Switch on with a backend                                                       |
| :------------------- | :----------------------------------------------------------------------------------- | :--------------------------------------------------------------------------- | :----------------------------------------------------------------------------- |
| Error tracking       | yes: uncaught errors, unhandled rejections and route errors are captured in the page | `web/src/app/monitoring.ts`, `RouteError.tsx`, `main.tsx`                    | set `VITE_MONITORING_ENDPOINT`, or replace `send()` with an error-tracking SDK |
| Scheduled Lighthouse | yes: every day and after every deploy, against production                            | `.github/workflows/lighthouse-scheduled.yml`, `lighthouserc.production.json` | nothing to add                                                                 |
| Web Vitals reporting | yes: LCP, INP, CLS from every page view, with the web-vitals library                 | `web/src/app/vitals.ts` → `monitoring.ts`                                    | the same endpoint as errors                                                    |
| Funnel events        | hooks named and three of them wired; no counting yet                                 | `FUNNEL_EVENTS` in `monitoring.ts`                                           | an events endpoint and a dashboard (§5)                                        |
| CI quality gates     | yes: every pull request and every release tag                                        | `.github/workflows/ci.yml`                                                   | nothing to add                                                                 |

## 1. One sink for every event

`web/src/app/monitoring.ts` is a small, vendor-neutral sink. Every event has a `type` (`error`, `vital`,
`funnel`), the page path (never the query string, which can hold search terms), the release (`VITE_RELEASE`,
set by CI to the tag or commit) and a timestamp.

- Today, events are kept in the page (`window.__monitoring`, the last 100). The tests and our scripts read
  them there.
- When `VITE_MONITORING_ENDPOINT` is set, each event is also sent with `navigator.sendBeacon`. The beacon
  survives the page closing and never blocks the shopper. A failure to send is swallowed: monitoring never
  breaks the shop (`monitoring.test.ts`).
- **Privacy rule:** no token, name, phone, address or card detail ever goes into an event. Funnel properties
  are IDs, counts and amounts only. This rule belongs in code review (`CONTRIBUTING.md`).

Moving to a vendor (Sentry, Datadog RUM or similar) means replacing `send()` and nothing else. That choice
is deferred until there is a backend and a budget for it.

## 2. Error tracking

**Hooks (live in this release):**

| Hook                                                                                             | Catches                                                              | Tested in                                         |
| :----------------------------------------------------------------------------------------------- | :------------------------------------------------------------------- | :------------------------------------------------ |
| `window` `error` listener (`installErrorTracking`, called in `main.tsx` before the first render) | uncaught exceptions, script errors                                   | `monitoring.test.ts`                              |
| `unhandledrejection` listener                                                                    | promises nobody awaited or caught (an API call left without `catch`) | `monitoring.test.ts`                              |
| `RouteError` (the layout route's error element)                                                  | anything thrown while rendering a route                              | `RouteError.tsx` calls `captureError(…, 'route')` |
| `purchase_failed` funnel event                                                                   | a checkout submit the API refused (status and error code only)       | wired in `usePlaceOrder.ts`                       |

**What we do not capture, on purpose:** API errors that the UI already handles and explains (a 404 product,
a 429 with a retry, a 401 that sends the shopper to sign in). They are expected behaviour, and counting them
as errors would bury the real ones. They show up in the API's own logs once there is a backend.

**Alert rules when the endpoint exists (starting points):**

| Rule                              | Threshold                                                 | Why this number                                                                               |
| :-------------------------------- | :-------------------------------------------------------- | :-------------------------------------------------------------------------------------------- |
| New error message in a release    | first occurrence after a deploy                           | a new message after a deploy is almost always that deploy                                     |
| Error rate                        | more than 1% of page views with an error, over 15 minutes | today the suite and the e2e runs log 0 uncaught errors; 1% leaves room for browser extensions |
| `purchase_failed` with status 500 | more than 3 in 10 minutes                                 | the checkout's idempotent retry already covers single failures (Task 6 e2e)                   |

Each error is grouped by message and release, so "which deploy broke it" is one filter.

## 3. Scheduled Lighthouse runs

`.github/workflows/lighthouse-scheduled.yml` runs Lighthouse CI against the deployed site every day at 07:17
Cairo time and after every successful deploy, on `/`, `/products`, `/products/p-001`, `/cart` and `/login`,
3 runs per page, median run.

- **Budgets** are the same as the pull-request gate (`lighthouserc.json`): performance ≥ 0.90,
  accessibility ≥ 0.95, best practices and SEO ≥ 0.90, LCP ≤ 3,500 ms, CLS ≤ 0.1, TBT ≤ 300 ms,
  JavaScript ≤ 160,000 bytes, all transfers ≤ 400,000 bytes (mobile profile, simulated slow 4G).
- **Alert:** a missed budget does not turn the pipeline red, because production has already shipped. It opens
  one issue labelled `performance-regression` (or comments on the open one) with the failed assertions and a
  link to the reports. Reports are kept 30 days as the `lighthouse-scheduled` artifact.
- **Why both a PR gate and a schedule:** the PR gate stops our own regressions before merge. The schedule
  catches what changes without a pull request: the host, a CDN, a dependency served at run time, and slow drift.
- **First finding.** The first production run could not audit `/products`: GitHub Pages answered every deep link
  with HTTP 404 (through `404.html`), although the page then rendered. Search engines treat that as a missing
  page. Fixed in this release: `web/scripts/pages-routes.mjs` writes the app shell at every public route
  (evidence: `docs/evidence/task7/README.md`).

Lab scores are not user experience. They are the early warning. Web Vitals from real visits (§4) are the
measure.

## 4. Web Vitals reporting

`web/src/app/vitals.ts` uses the **web-vitals** library (5.1) to report **LCP**, **INP** and **CLS** from every
page view. Each report is logged (`[web-vitals] LCP 876 ms good /products`), kept in `window.__webVitals`, and
recorded in the monitoring sink, which sends it when the endpoint is set.

**Targets (Google's "good" thresholds, judged at the 75th percentile of real page views):**

| Metric | Good       | Poor       | Our evidence today (not real users)                                                                                |
| :----- | :--------- | :--------- | :----------------------------------------------------------------------------------------------------------------- |
| LCP    | ≤ 2,500 ms | > 4,000 ms | lab, mobile, slow 4G: 2,426 ms on `/products`; scripted sessions on the deployed preview: 876 ms (phone emulation) |
| INP    | ≤ 200 ms   | > 500 ms   | scripted sessions: 16–32 ms; the lab cannot measure INP                                                            |
| CLS    | ≤ 0.1      | > 0.25     | 0 in the lab and in the scripted sessions, after the Task 5 fixes                                                  |

Sources: `task_5_dashboard_performance.md` §4.5 and §5, `docs/evidence/task5/web-vitals/deployed.json`.

**How to read them once real data arrives:** by route and by device class, at the 75th percentile, over 7
days. Alert when the 75th percentile of any metric on `/`, `/products`, `/products/:id`, `/cart` or `/checkout/*`
leaves "good" for 2 days in a row. A single bad day is usually one network or one campaign.

## 5. Funnel events to add when a real backend exists

Counting a funnel needs a server: an events endpoint, deduplication and a place to store and query the
counts. None of that exists, so **this release names the events and wires the three that the code can fire
reliably today**. The others are listed with the screen that fires them, ready to add with the backend.

| Step | Event               | Fired by                                         | Properties (no personal data) | Status    |
| :--- | :------------------ | :----------------------------------------------- | :---------------------------- | :-------- |
| 1    | `view_item`         | product page loaded                              | `productId`                   | to add    |
| 2    | `add_to_cart`       | "Add to cart" on the product page                | `productId`, `quantity`       | **wired** |
| 3    | `begin_checkout`    | `/checkout/address` opened with a non-empty cart | `items`, `total`              | to add    |
| 4    | `add_shipping_info` | address step valid, "Continue to payment"        | `governorate`                 | to add    |
| 5    | `add_payment_info`  | payment step valid                               | `method` (card, cod, wallet)  | to add    |
| 6    | `purchase`          | order accepted by `POST /orders`                 | `items`, `total`, `currency`  | **wired** |
| —    | `purchase_failed`   | `POST /orders` refused                           | `status`, `code`              | **wired** |

The names follow the common e-commerce vocabulary (the same as GA4's), so any analytics tool reads them.

**Server-side truth:** the order count for the funnel's last step comes from the orders database, not from
the browser. Ad blockers drop 10–30% of browser analytics in typical stores; the browser funnel is for the
shape of drop-off between steps, not for revenue.

**Checkout completion** = `purchase` ÷ `begin_checkout`, per day. Without real data there is no baseline, so
for the first two weeks we only watch it; then the alert is "completion more than 20% below the trailing
7-day average for 2 hours during trading hours".

## 6. Response process

**When CI detects an accessibility regression** (the axe spec, the Storybook axe test or the Lighthouse
accessibility budget fails on a pull request):

1. The merge is already blocked: the PR cannot go in red.
2. The author fixes it in the same pull request. The axe output names the rule and the element.
3. If the regression is in a shared component (`web/src/components/`), add a story or test that shows it, so
   it cannot come back.
4. An exception is allowed only for a third-party cause, with an issue, an owner and a date.

**When the scheduled run or field data shows a regression on production:**

1. The `performance-regression` issue is the ticket. The on-call engineer triages it within one working day.
2. Find the release: compare the last good and first bad report (both are artifacts) and the deploys between.
3. Revert first if a customer-facing metric is in "poor" (LCP > 4 s, CLS > 0.25, accessibility below 0.90).
   Investigate after.

**When checkout completion drops** (after the backend exists):

1. Check errors first: `purchase_failed` and new error messages in the same window.
2. Check the API: status codes and latency of `POST /orders`.
3. Check the last deploy. If one shipped in the window, roll it back. The tag and the release zip make this
   one step (`v2.0.0` → the previous tag).
4. Write a short incident note: what happened, how long, how many sessions, the fix, the test added.

**Black Friday:** a deploy freeze from 48 hours before until 24 hours after, except fixes approved by the VP
of Engineering. The scheduled Lighthouse run moves to every 3 hours that week (`cron: '17 */3 * * *'`).

## 7. What this plan does not claim

- No number in this plan comes from real shoppers. The field numbers are our own scripted sessions on the
  deployed preview (Task 5), and the lab numbers are Lighthouse runs.
- The thresholds are starting points. The first two weeks of real traffic set the baseline, and the
  thresholds are reviewed then.
- The preview has no server logs, so API errors and latency are not monitored until there is a backend.
