# Demo chapters (brandstore-demo.mp4)

Recorded by scripts/record-demo.mjs against the TechSphere API kit's server.

| Time | Caption                                      | Detail                                                                                                                             |
| :--- | :------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------- |
| 0:01 | BrandStore — demo                            | Plain HTML, CSS and ES modules on the TechSphere API (VITE_API_BASE=http://127.0.0.1:37849). Happy path, then three failure paths. |
| 0:10 | Happy path 1/6 · Catalog                     | Products come from GET /products (8 a page; the app shows "Showing 1–8 of 24").                                                    |
| 0:20 | Happy path 2/6 · Search                      | Debounced search, sent as ?search=orbit; the address bar keeps the view (shareable, survives reload).                              |
| 0:27 | Filter by category                           | Category "Audio": the counts, the list and the URL update together.                                                                |
| 0:35 | Sort                                         | Price: high to low — the API sorts; prices that arrive as numbers or as "EGP 13,999" are both read as integer cents.               |
| 0:43 | Happy path 3/6 · Product page                | Gallery, stock status, specifications, quantity stepper limited by stock.                                                          |
| 0:54 | Added to the cart                            | Announced in a live region ("Added 2 × …") and counted in the menu badge.                                                          |
| 1:01 | Happy path 4/6 · Cart                        | Kept in localStorage; prices and stock re-checked with the API on load. Totals use integer cents.                                  |
| 1:10 | Every change is announced                    | Screen readers hear: "Quantity of … is now 1. Cart total: EGP … for 1 item."                                                       |
| 1:19 | Happy path 5/6 · Checkout needs an account   | Signed out: the app asks you to sign in and brings you back to the cart (no token in the URL).                                     |
| 1:35 | Back in the cart, signed in                  | The JWT is kept in sessionStorage and sent only as "Authorization: Bearer …".                                                      |
| 1:42 | Order placed                                 | POST /orders → 201. The order number is announced and the cart is emptied.                                                         |
| 1:49 | Happy path 6/6 · Account                     | GET /account/orders pages by offset (5 a page); four date formats from the API shown as one.                                       |
| 1:59 | Next page                                    | Page 2 = offset 5. Order history and the address book are behind the Bearer token.                                                 |
| 2:06 | Signed out                                   | Token and account data cleared; the cart stays on the device.                                                                      |
| 2:12 | Failure path 1 · Wrong password              | POST /auth/login answers 401.                                                                                                      |
| 2:26 | One clear message, focus moved to it         | "The email or password is incorrect." The password never appears in a URL or a log.                                                |
| 2:33 | Failure path 2 · The API rate-limits (429)   | The API kit is told to answer 429 to the next requests for /products.                                                              |
| 2:40 | What the shopper sees                        | "Too many requests — wait a moment, then try again", with a Try again button. Nothing breaks.                                      |
| 2:48 | Recovered                                    | The API answers again; the products load without a page reload.                                                                    |
| 2:55 | Failure path 3 · Checkout with an empty cart | The button is aria-disabled (still focusable) and says why.                                                                        |
| 3:02 | No request is sent                           | "Your cart is empty. Add a product before you check out." — handled before the API.                                                |
| 3:09 | Edge case · A product whose image is missing | The API has no loadable image for p-010: the placeholder is shown, with the product name as alt text — never a broken image.       |
| 3:17 | Edge case · Page 9 of 3                      | The API pages by 8; a page past the end moves to the last page ("Showing 17–24 of 24").                                            |
| 3:24 | Tested on every pull request                 | Vitest (unit, jsdom + MSW), Playwright in Chromium, Firefox and WebKit, Lighthouse. README → "Run the tests".                      |
