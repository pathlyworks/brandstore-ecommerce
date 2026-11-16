# Task 5 evidence pack (performance and accessibility)

Everything here was produced by the scripts in `web/scripts/`, on the production build, against the TechSphere
API kit on :4010. The report that reads these files is [`task_5_dashboard_performance.md`](../../../task_5_dashboard_performance.md).

| Folder / file | What | Made by |
| :--- | :--- | :--- |
| `lighthouse/before/`, `lighthouse/after/` | Full Lighthouse reports (LHR JSON) for `/`, `/products`, `/products/p-001`, `/cart`, `/login`, and `summary.json` with the run conditions (Lighthouse 13.6.0, mobile, simulated throttling 150 ms RTT / 1.6 Mbps / 4× CPU, median of 3 runs) | `web/scripts/measure.mjs` |
| `lighthouse/lazy-all/` | The rejected variant (every route lazy), same conditions | `web/scripts/measure.mjs` |
| `bundle/before.json`, `after.json`, `lazy-all.json` | Every chunk (raw and gzip bytes), the first-visit JS, the lazy routes | `web/scripts/bundle-report.mjs` |
| `web-vitals/preview.json` | LCP, INP and CLS from the web-vitals library on the deployed preview, with the console lines the app logged | `web/scripts/field-vitals.mjs` |
| `web-vitals/deployed.json` | The same on the deployed preview, https://pathlyworks.github.io/brandstore-ecommerce/ | `web/scripts/field-vitals.mjs` |
| `web-vitals/preview-before-grid-fix.json` | The same, before the catalog grid fix (CLS 0.379 on a phone) | `web/scripts/field-vitals.mjs` |
| `axe/before.json`, `axe/after.json` | axe-core (WCAG 2.0/2.1 A and AA) on 8 pages at 375 and 1280 px | `web/scripts/a11y-scan.mjs` |
| `profiler.json` | Every React commit (profiling build, CPU 4×) for catalog typing, cart changes, the admin dashboard | `web/scripts/profile.mjs` |
| `profiler-footer-memo.json` | The only memoisation decision, with its runs | `web/scripts/profile.mjs`, run with and without `memo(Footer)` |

"Before" is the Task 4 build (commit `00f9134`); "after" is `feature/admin-dashboard-perf-a11y`.
