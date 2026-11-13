# Task 6: robustness, checkout, accessibility, cross-browser and Lighthouse in CI, handoff

**Branch:** `feature/robustness-handoff` → `main` · Details: [`task_6_handoff.md`](../task_6_handoff.md)

## Why

This change hardens the store against the data the TechSphere API really sends and against the failures it
can produce. It also makes the cart and catalog work for keyboard and screen-reader users, tests every
supported browser on each pull request, and hands the API's contract gaps to the backend team.

## What changed

**App**

- **API address:** `VITE_API_BASE`, falling back to `http://localhost:4010` as the API kit asks (`src/config.js`). Our own mock is now opt-in with `VITE_API_URL=/api`; the QA scripts, the journey suite and Netlify set it.
- **Checkout:**
  - "Place order" sends `POST /orders` with the Bearer token (`components/checkout.js`, `api/orders.js`, `state/cart.js` `checkoutItems`).
  - An empty cart, or one with nothing in stock, is stopped before the API with the reason.
  - Signed-out shoppers sign in and come back to the cart.
  - 201 empties the cart and announces the order number. 400, 429, 5xx and network errors keep the cart.
  - Our mock and its contract gain `POST /orders`.
- **Edge cases:**
  - Missing or unloadable images show the placeholder with alt text (`utils/dom.js`, `api/techsphere.js`).
  - Specification values that are `null` or empty are left out (never "null").
  - Catalog counts use the API's page size of 8.
  - An empty cart's totals are in the API's currency.
  - The price legend no longer says "USD".
- **Accessibility:**
  - Every cart change (quantity, save for later, remove) is announced in the `role="status"` region with the new total.
  - The radio filters keep keyboard focus when their counts refresh, and are updated in place instead of rebuilt.
  - The checkout button is `aria-disabled`, so it stays focusable.

**Tests and CI**

- `tests/unit/edge-sweep.test.js`, `tests/dom/edge-sweep-ui.test.js` (jsdom + MSW, TechSphere format), `tests/e2e/specs/robustness.spec.js` and `tests/e2e/specs/keyboard-checkout.spec.js`.
- New CI jobs: **Cross-browser smoke** (Firefox, WebKit) and **Lighthouse** (`scripts/lighthouse.mjs`, results in the job summary).
- `E2E_BROWSERS` in `playwright.config.mjs`. `resetApi` tolerates an API without `/__reset`.

**Docs**

- `README.md`, rewritten for a new developer: setup, architecture, decisions, how to run the tests.
- `docs/HANDOFF.md`: 16 API contract gaps for the backend team.
- `docs/lighthouse/`.
- The demo video: `docs/demo/brandstore-demo.mp4`, recorded with `scripts/record-demo.mjs`.
- `task_6_handoff.md`, `CHANGELOG.md`.

## Edge-case sweep: evidence

|   # | Case                          | Unit (Vitest)                                        | jsdom + MSW                                                                                                                                | Playwright (Chromium, Firefox, WebKit)                                                                            |
| --: | :---------------------------- | :--------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------- |
|   1 | Missing product image         | `edge 1: missing product image` (3)                  | `edge 1: … shows the placeholder … when the image fails`; `… /images endpoint … is not loaded at all`                                      | `edge 1: a missing product image shows the placeholder, never a broken image`                                     |
|   2 | Null specification fields     | `edge 2: null specification fields` (3)              | `edge 2: specs that are all null show one clear line …`; `… real specs still shows its table`                                              | `edge 2: null specification fields are left out, never shown as "null"`                                           |
|   3 | 429 rate limit                | `edge 3: 429 rate limit` (3)                         | `edge 3: the product page explains the 429 …`; `… a 429 while placing an order keeps the cart`; catalog and cart 429 (Task 5)              | `edge 3: a 429 on the catalog explains itself, and "Try again" recovers`                                          |
|   4 | Empty-cart checkout attempt   | `edge 4: empty-cart checkout attempt` (3)            | `edge 4: "Place order" on an empty cart explains itself and sends nothing`; `… emptied in another tab …`; `… signed out goes to sign-in …` | `edge 4: "Place order" on an empty cart explains itself and sends no request`; `keyboard only: … place the order` |
|   5 | Offset-versus-page pagination | `edge 5: offset-versus-page pagination mismatch` (4) | `edge 5: a page past the end (?page=9) moves to the last page …`                                                                           | `edge 5: a page past the end … moves to the last page`; `sign in … and view the orders` (Next = offset 5)         |

Accessibility: jsdom `accessibility: cart updates are announced in the live region`; Playwright `keyboard: … tab order` and `keyboard only: …`. Demo: `docs/demo/brandstore-demo.mp4` (3:38; chapters in `docs/demo/chapters.md`).

## Merge conflict with `main` (resolved in `01fb719`)

PR #2 (product's copy change) edited the order summary in `cart.html` while this branch replaced its disabled
"Checkout" button. The resolution keeps both intents:

- from `main`: the currency-neutral shipping rule, the returns line, and the promise "Your cart is saved on this device, so nothing is lost meanwhile" (now in the checkout notes);
- from this branch: the working "Place order" button.

The full hunk is in `task_6_handoff.md` §3. The merged branch passes every CI job.

## Checks on this PR

CI run [43459653927](https://github.com/pathlyworks/brandstore-ecommerce/actions/runs/43459653927), on the last code change of PR #3. Every job passed; later commits add only documents and the demo video, and their runs are green too:

| Job                                             | Result                                                                                                                                 |
| :---------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------- |
| Lint, format and build                          | ESLint and Prettier clean, branch-name check, `npm run build`, contract: 58 requests, 10 operations, 0 problems                        |
| Unit and integration tests (Vitest, jsdom, MSW) | **259 of 259** tests in 26 files; coverage of lines **src/state 99.86%** (714/715), **src/utils 99.00%** (794/802)                     |
| End-to-end tests (Playwright, Chromium)         | **9 of 9** specs; journey suite **71 of 71** runs; 197 API requests checked against the spec, 0 problems                               |
| Cross-browser smoke (Firefox)                   | **9 of 9**                                                                                                                             |
| Cross-browser smoke (WebKit)                    | **8 passed, 1 skipped** (the tab-order check: WebKit tabs to links only with a macOS setting; `task_6_handoff.md` §4)                  |
| Lighthouse                                      | Accessibility, Best practices and SEO **100** on all 8 runs; Performance 91–98 on mobile, 100 on desktop (`docs/lighthouse/README.md`) |

Also run locally: `qa/js-rules`, `preflight` (475 passed), `headers`, `behaviour`, `keyboard`, `layout` and `contrast` all have 0 failures, and CLS is 0 at desktop size.

## How to review

```bash
git fetch origin && git checkout feature/robustness-handoff && npm install
python3 api/techsphere/server.py &          # or VITE_API_BASE=<an API> …
npm run dev                                 # /cart.html → "Place order" with an empty cart, then with items
npm test && npm run e2e                     # E2E_BROWSERS=all npm run e2e for all three engines
```

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_012ipYanQuc7m6qRW4Whdpdk
