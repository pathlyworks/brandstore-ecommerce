# Advanced Task 5: Admin Dashboard, TypeScript Hardening, Performance, and Accessibility

Advanced Task 5 deliverable. Date: 2026-11-16.
Repository: https://github.com/pathlyworks/brandstore-ecommerce · Pull requests: **#11**
(`feature/admin-dashboard-perf-a11y` → `main`) and **#12** (review fixes, deployed preview).
**Deployed preview: https://pathlyworks.github.io/brandstore-ecommerce/** (GitHub Pages, §5.1).
Evidence pack: [`docs/evidence/task5/`](docs/evidence/task5/README.md).

The app runs against the TechSphere API at `VITE_API_BASE` (`import.meta.env.VITE_API_BASE`, default
`http://localhost:4010`). `npm run dev -- --port 4000 --strictPort --host 0.0.0.0` starts it as the grader does.
Every number below comes from a file in the evidence pack, produced by a script in `web/scripts/` that anyone
can run again (§9).

| The brief asks for                                                                                                   | Where                                                          |
| :------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------- |
| `/admin` dashboard: KPI cards (sales, orders, average order value), category table, monthly trend, hand-built charts | §1; `web/src/features/admin/`                                  |
| A reusable generic DataTable with sorting and pagination                                                             | §2; `web/src/components/Table.tsx`, `table.model.ts`           |
| TypeScript hardening: strict, no `any`, generics only where they remove duplication                                  | §3                                                             |
| Performance: lazy routes, images, Profiler-driven memoisation, bundle before/after                                   | §4; `docs/evidence/task5/bundle/`, `profiler*.json`            |
| Lighthouse before/after under identical throttling                                                                   | §4.5; `docs/evidence/task5/lighthouse/`                        |
| [v1.1] LCP, INP and CLS from Lighthouse (lab) and web-vitals (field), lab vs field                                   | §5; `web/src/app/vitals.ts`, `docs/evidence/task5/web-vitals/` |
| Accessibility of shared components first                                                                             | §6; `docs/evidence/task5/axe/`                                 |
| [v1.1] Caching strategy for static assets                                                                            | §7; `web/public/_headers`, `web/public/sw.js`                  |

## 1. The dashboard

**What each number means** (the definitions are in `dashboard.model.ts` and on the page):

| Card                | Definition                                                                               | Source                               |
| :------------------ | :--------------------------------------------------------------------------------------- | :----------------------------------- |
| Sales               | Gross value of the orders that were not cancelled, before any costs                      | `GET /admin/summary` → `revenue`     |
| Orders              | Every order, cancelled ones included; the card adds "7 count toward sales · 2 cancelled" | `revenue` → `orders`; the order list |
| Average order value | Sales ÷ orders that count toward sales                                                   | summary + `GET /account/orders`      |
| Out of stock        | Products out of stock, "of 24 products"                                                  | `out_of_stock`, `products`           |

The page calls it **sales** everywhere and never uses the word profit or margin: the API's `revenue` is the
value of orders, not what the store keeps after costs. The API's own `note` field is not shown for that reason.

**Average order value** divides by the 7 orders that count, not by all 9. Dividing by 9 would mix in two
cancelled orders that add nothing to sales and would show EGP 2,232.56 instead of EGP 2,870.43.

**Category table and monthly trend.** The summary has neither, so they are computed from every order
(`GET /account/orders`, paged 50 at a time) and the catalog (`GET /products`, 3 pages): each order's total is
split over its lines by line value (here every order has one line). The page then checks that the categories
add up to the summary's sales and says so ("add up to the summary's sales: EGP 20,093.00 from the 7 orders
that were not cancelled"); if they ever disagree it shows the gap instead of hiding it.

**Reference calculation on the kit's fixtures** (`dashboard.model.test.ts` recomputes these from the raw API
JSON with the kit's own rule, `server.py` → `admin_summary`; `web/e2e/task5.spec.ts` does the same against
the running API and compares with the page):

| Category   | Products | Out of stock | Orders |             Sales | Share |
| :--------- | -------: | -----------: | -----: | ----------------: | ----: |
| Laptops    |        6 |            0 |      3 |      EGP 8,697.00 | 43.3% |
| Audio      |        6 |            0 |      2 |      EGP 5,798.00 | 28.9% |
| Phones     |        6 |            0 |      2 |      EGP 5,598.00 | 27.9% |
| Smart home |        6 |            5 |      0 |          EGP 0.00 |    0% |
| **All**    |   **24** |        **5** |  **7** | **EGP 20,093.00** |  100% |

Laptops = o-001 (2,499) + o-005 (2,899) + o-009 (3,299). The four date formats (`2026-08-01T10:15:00Z`,
`02/08/2026`, `2026-08-03T18:40:00+03:00`, `4 Aug 2026`) all parse to August 2026, so the monthly trend has
one month: 7 orders, EGP 20,093.00. The page says so in words rather than drawing a misleading line.

**Charts without a library.** Two simple charts do not justify a chart library (tens of kilobytes in the
admin chunk). `BarChart<Datum>` draws the category bars in HTML and CSS (labels keep their real size on a
phone) and the monthly columns in SVG. Each chart has a title and a one-sentence summary for screen readers,
a tooltip per bar, and a DataTable with the exact numbers next to it. The whole admin chunk is 11.6 kB
(4.2 kB gzip) and is still downloaded only by admins (`npm run check:bundles -w web`).

**What the API forced.** There is no admin orders endpoint. In this API `GET /account/orders` returns the
store's orders to any valid token, so the dashboard uses it with the admin's token. A real backend would need
`GET /admin/orders` (and ideally the category and monthly totals in `/admin/summary`).

**A bug found in our own test mock.** The MSW handler for `/admin/summary` returned fixed numbers
(`revenue: 25491`, `out_of_stock: 2`) that matched nothing in the fixtures (the API says 20,093 and 5). It now
computes the summary from its own orders and products, like `server.py`, so the tests check the real rule.

## 2. DataTable&lt;Row&gt;, and where generics remove duplication

`DataTable<Row>` (`components/Table.tsx`) is the only table in the app: cart, order history, the admin
category, month and order tables. Columns are typed by the row (`Column<Row>`), so a column cannot read a
field the row does not have. Sorting is a header button with `aria-sort`; `pageSize` adds buttons that move one page
back or forward and a polite "Rows 1–5 of 9 · page 1 of 2" status; changing the sort goes back to page 1. Sorting and paging are
pure functions (`sortRows<Row>`, `pageOf<Row>` in `table.model.ts`, stable sort, page clamping) with their
own tests. The old `Table` name is kept as an alias, so the cart and orders screens did not change.

Generics in this codebase, each used by at least two different callers (none exists for show):

| Generic                                      | Removes the duplication of                                                      |
| :------------------------------------------- | :------------------------------------------------------------------------------ |
| `DataTable<Row>`, `Column<Row>`              | 5 tables (cart, orders, 3 admin tables) with one sort/page/state implementation |
| `sortRows<Row>`, `pageOf<Row>`               | the sort and page logic each table would otherwise copy                         |
| `collectPages<T>`                            | "fetch every page" for orders (offset-paged) and products (page-numbered)       |
| `BarChart<Datum>`                            | the category chart and the monthly chart                                        |
| `useApi<T>`, `Select<T>`, `Tabs<T>` (Task 2) | every data screen; every select; product tabs                                   |

## 3. TypeScript hardening

- `web/tsconfig.json`: `strict` (which includes `noImplicitAny` and `strictNullChecks`),
  `noUncheckedIndexedAccess`, `noImplicitReturns`, `noUnusedLocals/Parameters`, and **new in this task:
  `exactOptionalPropertyTypes`**. Turning it on found 22 places where an optional prop received `undefined`
  without its type saying so (`Input`, `Select`, `Modal`, `Card`, the API client's options, a `Column`). Each
  now declares `| undefined`; no behaviour changed.
- **No `any`**: ESLint's `@typescript-eslint/no-explicit-any` is an error, and a search for `: any`, `as any`,
  `any[]` and `eslint-disable … no-explicit-any` finds nothing in `web/` or `src/types/`.
- `npm run typecheck -w web`: 0 errors. New interfaces were added only where two places shared a shape
  (`SummaryTotals`, `CategoryRow`, `MonthPoint`, the shared `STATUS_TONE` for order badges).

## 4. Performance

### 4.1 Method: identical conditions

`web/scripts/measure.mjs` runs Lighthouse 13.6.0 on the production build served by `vite preview`, with the API
kit on :4010, for `/`, `/products`, `/products/p-001`, `/cart` and `/login`, 3 runs per page, keeping the
median performance run. Both runs used Lighthouse's default mobile profile: emulated Moto G Power
(412 × 823), **simulated throttling: 150 ms RTT, 1.6 Mbps down, 4× CPU slowdown**, the same Chromium build,
on the same machine, minutes apart. The conditions are written into each `summary.json`.

"Before" is the Task 4 build (commit `00f9134`), "after" this branch. A first "after" run measured a preview
server left over from the "before" run; the script now refuses to start when its port is busy, and both runs
were repeated.

### 4.2 Bundle analysis (`web/scripts/bundle-report.mjs`, raw / gzip bytes)

| Build                                | JS on a first visit   | Chunks loaded first | Lazy chunks |
| :----------------------------------- | :-------------------- | :------------------ | ----------: |
| Before (Task 4)                      | 386,660 / 121,445     | 1                   |           6 |
| Variant: every route lazy (rejected) | 370,839 / 118,799     | 2 (app + vendor)    |          16 |
| **After**                            | **388,763 / 123,838** | 2 (app + vendor)    |          12 |

What the numbers say:

- 81% of the first-visit JavaScript is React, React DOM and React Router (316 kB raw); our own code is 73 kB.
  Lazy routes cannot shrink the framework, so they were never going to be the big win here.
- **Route-level lazy loading**: register, account, orders, order confirmation, the 404 page and the planned
  pages are now lazy (the checkout steps and the admin area already were). The variant that also made the
  catalog, product, cart and sign-in screens lazy saved 18 kB raw, but Lighthouse showed it cost more than it
  saved: a visitor landing on `/cart` or `/login` waited for a second round trip before anything appeared (LCP
  0.76 s → 2.4 s; `lighthouse/lazy-all/`). Those landing screens stay in the main chunk.
- After is 2.1 kB raw (2.4 kB gzip) larger than before: the lazy routes moved code out, and this task's new
  shared code moved some in (web-vitals reporting, the Search dialog, toasts, the service worker registration,
  table paging).
- **Vendor chunk**: React, React DOM and React Router are now their own hashed file, unchanged by our deploys.
  A returning visitor keeps 316 kB raw / 101 kB gzip from the cache after each release (§7).

### 4.3 Images

- The first product card is the LCP element on `/` and `/products`. It was `loading="lazy"`, so the browser
  waited to fetch it. Now the first row loads at once, the first card with `fetchpriority="high"`, the rest
  stay lazy, and `index.html` preloads the placeholder image. Lighthouse's "resource load delay" for the LCP
  image went from 221 ms to 41 ms on `/`.
- The product page image has `fetchpriority="high"`. Every image keeps its `width`/`height` (no layout shift)
  and gets `decoding="async"`.
- The API's image URLs (`/images/p-001.webp`) answer JSON, not images (recorded in Task 1), so the app shows
  a 2 kB SVG placeholder; no image is heavy. With real photos the next step is `srcset` with sized WebP/AVIF.

### 4.4 Memoisation only where the React Profiler shows a cost

`web/scripts/profile.mjs` builds with React's profiling build (`VITE_PROFILE=1`), wraps the app in
`<Profiler>`, and records every commit in Chromium with the CPU slowed 4×:

| Interaction                                  | Median commit |       Slowest commit |
| :------------------------------------------- | ------------: | -------------------: |
| Typing "laptops" in the catalog search       |        6.3 ms |              14.0 ms |
| Changing 5 quantities in a 10-line cart      |       14.1 ms |              18.4 ms |
| Loading the admin dashboard, paging, sorting |       10.7 ms | 47.0 ms (first data) |

All are far below what a user notices (an interaction should paint within 200 ms). One thing stood out: the
Footer re-rendered on every cart change because the layout reads the cart for the header count, though its
props never change. `memo(Footer)` brought the cart commit from a median of 14.1 ms to 11.0 ms (3 and 4 runs;
the runs are noisy, `profiler-footer-memo.json`). That is the only memo added. The dashboard calculation was
not memoised: it is a small part of an 11 ms commit for 9 orders. Overall, 5 of the 59 `.tsx` files that
export a component use `memo`, `useMemo` or `useCallback`: Footer (profiled, above), DataTable (the sorted
rows), and three context providers (Toast, Auth, Checkout) whose value must keep its identity so that every
consumer does not re-render.

### 4.5 Lighthouse before and after (mobile, identical conditions)

| Page              | Performance | Accessibility | Best practices |      SEO |        LCP (lab) |     CLS (lab) |         TBT |
| :---------------- | ----------: | ------------: | -------------: | -------: | ---------------: | ------------: | ----------: |
| `/`               |     97 → 97 |     100 → 100 |      100 → 100 | 83 → 100 |  2.36 s → 2.47 s | 0.049 → **0** | 111 → 93 ms |
| `/products`       | 81 → **97** |      99 → 100 |      100 → 100 | 83 → 100 |  2.33 s → 2.43 s | 0.367 → **0** |  64 → 96 ms |
| `/products/p-001` | 81 → **97** |     100 → 100 |      100 → 100 | 83 → 100 | 0.77 s* → 2.50 s | 0.409 → **0** |  23 → 67 ms |
| `/cart`           |   100 → 100 |     100 → 100 |      100 → 100 | 82 → 100 |  0.76 s → 0.78 s |         0 → 0 |  44 → 52 ms |
| `/login`          |   100 → 100 |     100 → 100 |      100 → 100 | 82 → 100 |  0.77 s → 0.76 s |         0 → 0 |  21 → 38 ms |

- **CLS** was the real problem: while a page loaded, the footer sat inside the first screen and was pushed
  down when the content arrived (0.37 and 0.41). `<main>` is now at least one screen tall, so the footer starts
  below the fold. Measured CLS is 0 on every page.
- **\*LCP on the product page got "worse" because it is now measured correctly.** Before, the largest thing on
  the first screen was the footer's small print (the bug above), painted at once. Now it is the product's own
  heading, which appears when `GET /products/p-001` answers. The lab LCP of the home and catalog pages is set
  by the same wait for the API under simulated slow 4G.
- **SEO 83 → 100**: a meta description, and a `robots.txt` (the preview answered `/robots.txt` with the app's
  HTML, which Lighthouse flagged as invalid).
- **Accessibility**: `/products` jumped from the page's `h1` to card `h3`s (99); cards there are now `h2`. During
  this task a new regression appeared and was fixed before merging: the toast region had an `aria-label` on a
  plain `div`, which ARIA does not allow (all pages dropped to 96, `lighthouse/lazy-all/`).
- TBT moved by tens of milliseconds both ways (the web-vitals library and the service worker registration run
  at start-up); all values stay in Lighthouse's "good" range (under 200 ms).

## 5. Core Web Vitals: lab and field

The three Core Web Vitals, each from two sources:

- **Lab: Lighthouse** (`web/scripts/measure.mjs`, §4.1): one synthetic load of the production build on an
  emulated Moto G Power with simulated slow 4G and a 4× slower CPU, median of 3 runs.
- **Field: the web-vitals library logged in the deployed preview.** `web/src/app/vitals.ts` reports
  **Largest Contentful Paint (LCP)**, **Interaction to Next Paint (INP)** and **Cumulative Layout Shift (CLS)**
  with the web-vitals library (5.1): each value is written to the browser console as a `[web-vitals]` line
  (metric, value, rating, page) and kept in `window.__webVitals`. The deployed preview is
  **https://pathlyworks.github.io/brandstore-ecommerce/** (§5.1). `web/scripts/field-vitals.mjs` opened it on
  16 Nov, clicked and typed as a shopper would, and saved every logged report (`web-vitals/deployed.json`).

| Page                        | Metric | Lab: Lighthouse (mobile, throttled)           | Field: web-vitals, deployed preview, phone | Field: web-vitals, deployed preview, desktop |
| :-------------------------- | :----- | :-------------------------------------------- | :----------------------------------------- | :------------------------------------------- |
| `/products`                 | LCP    | 2,426 ms                                      | 876 ms (good)                              | 832 ms (good)                                |
|                             | INP    | not measurable (a lab run has no interaction) | 32 ms (good)                               | 24 ms (good)                                 |
|                             | CLS    | 0                                             | 0 (good)                                   | 0 (good)                                     |
| `/products/p-001` / `p-003` | LCP    | 2,504 ms                                      | 340 ms (good)                              | 332 ms (good)                                |
|                             | INP    | not measurable                                | 16 ms (good)                               | 16 ms (good)                                 |
|                             | CLS    | 0                                             | 0 (good)                                   | 0 (good)                                     |
| `/cart`                     | LCP    | 778 ms                                        | 188 ms (good)                              | 188 ms (good)                                |
|                             | CLS    | 0                                             | 0 (good)                                   | 0 (good)                                     |

The phone column is Chromium emulating a Pixel 7 without network or CPU throttling; desktop is 1280 × 900. The
same script on the production build served locally by `vite preview` gave lower LCPs (`web-vitals/preview.json`),
because the deployed files come over the internet and the preview build loads its in-browser API first (§5.1).

**The difference between lab and field data.** Lab data is one synthetic page load under fixed, simulated
conditions with no user. It is repeatable, which is why the before/after comparison in §4 uses it, but it
cannot measure INP (INP needs real interactions: clicks, taps, key presses) and only sees layout shifts that
happen during the load. Field data is collected in the browsers that actually use the site: their real
devices and networks, their real clicks, the whole life of the page, so it includes INP and the shifts that
happen after an interaction. It varies from visit to visit, so it is read as a distribution (Google uses the
75th percentile of real visits). Our field numbers are our own scripted sessions on the deployed preview, not
real shoppers: that is why its LCP is lower than the lab's slow-phone simulation. Real-user field data would
need the same reports sent from shoppers' browsers to an analytics endpoint.

### 5.1 The deployed preview (GitHub Pages)

The React app is published at **https://pathlyworks.github.io/brandstore-ecommerce/** by
`.github/workflows/pages.yml` on every push to `main`. GitHub Pages has no backend, so that build answers the
API in the browser with the same MSW handlers the tests use (`src/demo/installDemoApi.ts`, included only when
`VITE_DEMO_API=1`): the numbers on its dashboard are the fixtures' (EGP 20,093.00 sales, 9 orders, EGP 2,870.43
average order value). Deep links load through `404.html`, so the browser logs one 404 for the page itself
before the app takes over; that is how GitHub Pages serves single-page apps. The in-browser API (fixtures and
MSW, 72 kB gzip) loads before the first render, which is why the deployed LCP is higher than locally; a real
deployment calls a real API instead.

**What only the field measurement found.** The first field run measured **CLS 0.379 on `/products` on a phone**
(0.161 on desktop, `web-vitals/preview-before-grid-fix.json`) although Lighthouse said 0: after choosing a
category, cards that stayed in the result moved up the page when the new list arrived, more than 500 ms
after the click, so CLS counted it. The product grid now remounts for each new result (new elements do not
count as shifts); the next field run measured CLS 0. INP for the cart's quantity select is missing: the
scripted select change does not produce the pointer events the browser times, so it is not reported.

## 6. Accessibility: shared components first

| Component                       | Fix                                                                                                                                                                                                                                                         | Proof                                                                                                   |
| :------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------ |
| Modal (all dialogs)             | Already moved focus in, trapped Tab/Shift+Tab, closed on Escape and returned focus. New: every button that opens a dialog says so (`aria-haspopup="dialog"`: Search, Empty the cart, Cancel order).                                                         | `a11y.test.tsx`, `components.test.tsx`, `e2e/task5.spec.ts` (Tab 6×, Escape, focus back on the trigger) |
| Search dialog (new, every page) | Built on Modal; a labelled search field; focus returns to the Search button                                                                                                                                                                                 | same                                                                                                    |
| Toasts (new)                    | One `aria-live="polite"` region, always in the page and empty until needed, so screen readers announce "Added 1 × Orbit Audio 3 to the cart." without moving focus; a Close button; 5 s                                                                     | `a11y.test.tsx`; e2e checks the region's text after Add to cart                                         |
| Cart                            | Quantity changes and removals were already announced in a polite status region; the product page now announces once (toast), not twice                                                                                                                      | —                                                                                                       |
| Badge                           | The muted badge (a status that no longer applies, e.g. a cancelled order) had text at **4.0:1**, under WCAG AA's 4.5:1. It now uses the muted text colour (6.4:1). Every tone is checked from the theme tokens in a unit test; cancelled orders now use it. | `a11y.test.tsx` (contrast per tone)                                                                     |
| DataTable                       | Sort buttons with `aria-sort`, reachable and operable with Tab/Enter/Space; paging buttons and a polite page status; the scroll container is a named, focusable region (wide tables scroll with the arrow keys on a phone)                                  | `a11y.test.tsx`                                                                                         |
| Tabs                            | Already the ARIA tabs pattern (roving tabindex, Left/Right/Home/End); kept, test kept                                                                                                                                                                       | `components.test.tsx`                                                                                   |
| Offline banner (new)            | `role="status"` text when the connection drops                                                                                                                                                                                                              | `e2e/task5.spec.ts`                                                                                     |

**axe-core 4.14 (WCAG 2.0/2.1 A and AA)** on 8 pages (including `/account/orders` and `/admin` signed in)
at 375 px and 1280 px: **0 violations before and after** (`axe/before.json`, `axe/after.json`). axe cannot
see focus return, live-region timing or the contrast of a badge variant that no scanned page showed, which is
why those have their own tests.

## 7. Caching strategy for static assets

1. **Hashed file names.** `vite build` names every JS and CSS file after its content
   (`assets/index-H9eopIVZ.js`, `assets/vendor-D6DSu3JT.js`). A changed file gets a new name; an unchanged one
   keeps its name and its cached copy. React, React DOM and React Router are a separate `vendor` chunk, so our
   releases do not change its name.
2. **Cache headers** (`web/public/_headers`, Netlify's format, copied into `web/dist`):

   | Path                                       | Cache-Control                         | Why                                             |
   | :----------------------------------------- | :------------------------------------ | :---------------------------------------------- |
   | `/assets/*`                                | `public, max-age=31536000, immutable` | content-hashed: never changes                   |
   | `/`, `/index.html`, `/sw.js`               | `no-cache`                            | name the current assets; a deploy shows at once |
   | `/product-placeholder.svg`, `/favicon.svg` | `public, max-age=86400`               | not hashed: a day, then revalidated             |

3. **Service worker** (`web/public/sw.js`), for repeat visits and offline:

   | Request                                                                                                     | Strategy                                                             |
   | :---------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------- |
   | `/assets/*-<hash>.*`                                                                                        | cache first (safe: the name changes with the content)                |
   | Page navigations                                                                                            | network first; the cached page or app shell offline                  |
   | Catalog API (`/products`, `/products/:id`, `/categories`), no token                                         | network first (prices and stock stay fresh); the last answer offline |
   | Anything with an `Authorization` header (orders, account, admin, checkout), and every POST/PATCH/PUT/DELETE | network only, never stored                                           |

   Cache names carry a version (`brandstore-static-v1` …); `activate` deletes every older cache. A product page
   visited once opens offline with a banner saying prices and stock may have changed (tested in e2e).

## 8. Bugs found and fixed in this task

1. Footer inside the first screen during loading: CLS 0.37–0.41 measured by Lighthouse on the catalog and product pages.
2. Cards moving after a filter: CLS 0.38 measured on a phone, seen only in field data (web-vitals).
3. Muted badge text at 4.0:1 contrast (computed from the tokens).
4. LCP image loaded lazily on the home and catalog pages (Lighthouse LCP breakdown).
5. Missing meta description; `/robots.txt` answered with HTML (SEO 83 → 100).
6. Card headings skipped a level under the catalog's `h1`.
7. The MSW admin mock returned numbers that matched no fixture.
8. Found during the task and fixed before merging: making every route lazy delayed the first paint of
   `/cart` and `/login` by a second round trip; an `aria-label` on the toast `div` (Lighthouse accessibility 96).

## 9. How to reproduce

```bash
npm install
python api/techsphere/server.py                      # the API on :4010
npm run build -w web
node web/scripts/bundle-report.mjs web/dist after    # bundle analysis
node web/scripts/measure.mjs web/dist after          # Lighthouse, 3 runs per page, mobile profile
npx vite preview --outDir web/dist --port 4191 &     # (in web/) the deployed preview
node web/scripts/field-vitals.mjs http://localhost:4191 preview
node web/scripts/a11y-scan.mjs http://localhost:4191 after
node web/scripts/profile.mjs                         # React Profiler, profiling build
npm run test -w web && npm run e2e                   # 218 unit/integration tests; Playwright incl. task5.spec.ts
```

Set `CHROME_PATH` if Playwright's Chromium is not where `playwright` expects it.

## 10. Limits and next steps

- The deployed preview (GitHub Pages) has no real API and no real visitors, so its numbers are field-style
  measurements from our own sessions. GitHub Pages also ignores `_headers`; the cache headers apply where the
  app is deployed on Netlify. Sending the web-vitals reports to an endpoint from a real deployment would give
  real-user field data.
- Lighthouse's simulated throttling varies by tens of milliseconds between runs; the median of 3 runs is
  kept, and differences of that size (TBT, the home page LCP) are not claimed as gains or losses.
- With 9 orders, every dashboard calculation is instant. With thousands, the totals per category and month
  belong in the API (`/admin/summary`), not in the browser.
