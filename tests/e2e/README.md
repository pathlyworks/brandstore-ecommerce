# End-to-end tests

**`specs/` — Playwright Test (`npm run e2e`).** The two Task 5 tests, run against the official TechSphere API
(`api/techsphere/server.py`) and the site served with `VITE_API_BASE`, both started by
`playwright.config.mjs` (needs Python 3.9+ unless `VITE_API_BASE` points at a running TechSphere API, as in grading;
first time: `npx playwright install chromium`):

- `catalog-cart.spec.js`: filter the catalog by category and add a product to the cart.
- `account.spec.js`: sign in with a wrong password first, then the right one, and view the orders.

`npm run e2e:prove` shows each of them failing when the feature it protects is broken.
Without `@playwright/test` installed, `npm run e2e:local` runs the same files on the Playwright library.

**`run.mjs` — the journey suite (`npm run e2e:journeys`).** 36 journeys at a desktop and a phone size (71 runs):
catalog, product page, cart, sign-in and account. The cart and catalog journeys use our mock API, and the
`auth:` journeys use TechSphere. More engines: `E2E_BROWSERS=chromium,firefox,webkit npm run e2e:journeys`.
To test the build output, run `npm run build` and then `E2E_DIST=1 npm run e2e:journeys`.
