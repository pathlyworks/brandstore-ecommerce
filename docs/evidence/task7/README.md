# Evidence index: Advanced Task 7 (release v2.0.0)

Every number quoted in `executive_presentation.pdf`, `task_7_executive_report.md` and `monitoring_plan.md`,
with the file it comes from and the command that produces it again.

| Metric (as quoted) | Value | Evidence file | Re-run with |
| :-- | :-- | :-- | :-- |
| Legacy audit: modules, lines, TypeScript, loose JSDoc types | 70 modules, 5,796 lines, 0 TS, 93 loose types | `docs/migration/audit.md` | `npm run audit:legacy` |
| Legacy: shell copied into pages, drift | 9 pages, 4 versions | `docs/migration/audit.md` §3 | same |
| Legacy: cart store instances | 9 pages | `docs/migration/audit.md` §4 | same |
| Legacy: module requests and JS per page | 15–34 requests, 11–44 KB gzip | `docs/migration/audit.md` §2 | same |
| Legacy Lighthouse, mobile (perf / a11y / SEO, CLS) | 91–98 / 100 / 100; catalog CLS 0.143, cart 0.112 | `docs/lighthouse/README.md` (CI run 43459653927) | CI job "Lighthouse" |
| React, Task 4 build, Lighthouse mobile | perf 81–100, SEO 82–83, CLS up to 0.409 | `docs/evidence/task5/lighthouse/before/summary.json` | `node web/scripts/measure.mjs <dist> before` |
| **React v2.0.0, Lighthouse mobile (slow 4G)** | perf 98–100, a11y 100, best practices 100, SEO 100, CLS 0, LCP 766–2,191 ms, JS 125,066 bytes | `docs/evidence/task7/lighthouse/v2.0.0-mobile/summary.json` (+ full reports per page) | `VITE_API_BASE=http://127.0.0.1:4010 npm run build -w web && node web/scripts/measure.mjs web/dist v2.0.0-mobile --task 7` (API kit on :4010) |
| **React v2.0.0, Lighthouse "regular 3G"** | `/products` LCP 4,467 ms, perf 83; `/cart` 3,767 ms; `/login` 1,515 ms | `docs/evidence/task7/lighthouse/v2.0.0-3g/summary.json` | the same with `--profile 3g` and the label `v2.0.0-3g` |
| First-visit JS share of React + React DOM + Router | 81% | `docs/evidence/task5/bundle/` | `node web/scripts/bundle-report.mjs` |
| Field Web Vitals, scripted sessions on the deployed preview | LCP 876 ms (`/products`, phone), INP 16–32 ms, CLS 0 | `docs/evidence/task5/web-vitals/deployed.json` | `node web/scripts/field-vitals.mjs` |
| **Tests and line coverage** | 534 tests in 48 files; `web/src/state` 96.3%, `web/src/components` 92.7%, all measured 95.9% | `docs/evidence/task7/coverage.json` | `npm run test:coverage` |
| Coverage floors | 75% (`web/src/state`, `web/src/components`), 80% (legacy) | `vitest.config.js` `thresholds` | — |
| Broken checkout blocked by CI | PR #17, 2 shipping tests failed | `task_6_testing_quality.md` §5, run 43926913772 | — |
| axe violations on key routes | 0 | `web/e2e/a11y.spec.ts` (CI job "End-to-end tests") | `npm run e2e` |
| Lighthouse CI budgets (PR gate and scheduled) | perf ≥ 0.90, a11y ≥ 0.95, BP/SEO ≥ 0.90, LCP ≤ 3,500 ms, CLS ≤ 0.1, TBT ≤ 300 ms, JS ≤ 160,000 B, total ≤ 400,000 B | `lighthouserc.json`, `lighthouserc.production.json` | `npx lhci autorun --config=…` |
| GitHub Pages deep links answered 404 (before this release) | `/products` → HTTP 404 | `docs/evidence/task7/pages-deep-links.txt` | `curl -s -o /dev/null -w "%{http_code}" <url>` |
| Migration effort, remaining pages | about 3 ideal days (5.5 with cutover; ~7 with 20% contingency) | `task_7_executive_report.md` §6.2 (**estimate**, Task 1 assumptions) | — |
| Release v2.0.0: CI green on the tag, Release published | see `docs/evidence/task7/release.md` | GitHub Actions | push the tag |

Measurement conditions for every Lighthouse number above are in the `conditions` block of each `summary.json`
(Lighthouse version, form factor, throttling, screen, runs per page). Both v2.0.0 runs used the same build, the
same machine and the same Chromium, minutes apart, on 16 Nov 2026.
