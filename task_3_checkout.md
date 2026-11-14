# Advanced Task 3: Global State — Cart Context, Multi-Step Checkout, and Orders

Advanced Task 3 deliverable. Author: Ahmed. Date: 2026-11-14.
Repository: https://github.com/pathlyworks/brandstore-ecommerce · Pull request: **#8**
(`feature/cart-checkout-orders` → `main`). Builds on Task 2 (`web/`, PR #6) and its review follow-ups (PR #7).

The app runs against the TechSphere API at `VITE_API_BASE` (`import.meta.env.VITE_API_BASE`, default
`http://localhost:4010`). Everything below is built on what that API really returns: prices as numbers or as
strings (`"EGP 33,999"`), stock as a status (sometimes missing), `POST /orders` → `201 { id, number, status }`,
`GET /account/orders` paged by offset, `PATCH /account/orders/:id/cancel` → `200` or `409`.

| The brief asks for                                          | Where                                                                                  |
| :---------------------------------------------------------- | :------------------------------------------------------------------------------------- |
| CartContext with useReducer (add, update, remove, clear)    | §1; `web/src/features/cart/cart.reducer.ts`, `CartContext.tsx`                         |
| Total selectors                                             | §1; `cart.selectors.ts`, tested against reference calculations (`cart-reference.json`) |
| Versioned localStorage persistence with rehydration         | §2; `cart.storage.ts`                                                                  |
| Multi-step checkout: address, mock payment, review          | §3; `web/src/features/checkout/`                                                       |
| Per-step validation, progress indicator                     | §3; `checkout.model.ts` (validation), `components/Steps.tsx` (with stories)            |
| Input survives refresh and back navigation at any step      | §4; `CheckoutContext.tsx`, `checkout.storage.ts`                                       |
| POST /orders, double submission prevented, idempotency note | §5; `usePlaceOrder.ts`                                                                 |
| Confirmation route with the order number                    | §5; `/checkout/confirmation/:number`, `ConfirmationRoute.tsx`                          |
| Order history from GET /account/orders with PATCH cancel    | §6; `features/account/OrdersRoute.tsx`                                                 |

## 1. Cart state: one reducer, derived totals

**The reducer is the single writer.** `cartReducer(state, action)` in `cart.reducer.ts` is the only code that
produces a cart state; components and the provider only `dispatch`. Its header comment documents the rules, and
each rule is a test (`cart.reducer.test.ts`):

| Action                           | Effect                                                                                                                   | Dispatched by        |
| :------------------------------- | :----------------------------------------------------------------------------------------------------------------------- | :------------------- |
| `add { product, quantity }`      | New line with a snapshot of the product (name, price in cents, image, stock) or merged into its line; capped             | product page         |
| `update { productId, quantity }` | Sets the quantity, capped; `0` or less removes the line                                                                  | cart page            |
| `remove { productId }`           | Removes the line                                                                                                         | cart page            |
| `clear`                          | Empty cart                                                                                                               | cart page, checkout  |
| `hydrate { state }`              | Takes another tab's saved cart (already validated)                                                                       | provider (`storage`) |
| `reprice { products, missing }`  | Fresh price, name, image and stock from the API; quantities capped; 404 products removed; out of stock kept, not charged | provider, on load    |

- **Pure:** no storage, network, time or randomness. The tests deep-freeze the input state (any mutation
  throws), check that the same input gives the same output, and that an action that changes nothing returns the
  **same object** (so React skips the re-render and nothing is saved).
- **Bounds:** a quantity is a whole number from 1 to the stock and the per-line limit of 10. Stock is the API's
  status mapped as before: `in_stock` 25, `low` 3, `out_of_stock` 0, missing → available (25).
- **Selectors** (`cart.selectors.ts`): `selectItemCount` (the header badge), `selectSubtotal`, `shippingFor`,
  `selectTotals` (`{ itemCount, subtotal, shipping, total, freeShippingRemaining, currency }`),
  `selectLineTotal`, `selectChargeableLines`, `selectUnavailableLines` and `selectOrderItems` (the
  `POST /orders` lines). Totals are never stored, so the badge, the cart page and the checkout review cannot
  disagree. All money is integer cents.
- **Shipping rule** (unchanged from the legacy app and its reference fixture): free from 100.00 of subtotal,
  otherwise 7.99; nothing for an empty cart; no tax. With the TechSphere catalogue (2,499 EGP and up) every order
  ships free, so total = subtotal.

**Totals match the reference calculations.** `web/scripts/cart-reference.mjs` computes reference totals outside
the app, in exact decimal arithmetic (BigInt minor units from the price **text**, never floating point), and
writes `cart-reference.json` (16 cases). `cart.selectors.test.ts` builds each cart through the real mapper and
reducer and compares item count, subtotal, shipping and total within the fixture's tolerance (0.005):

- 8 TechSphere cases, from the captured API responses: a number price; the string price `"EGP 33,999"` ×2; mixed
  string and number prices; low stock capped at 3; missing `stock_status` ×10; the per-line limit (12 → 10); an
  out-of-stock line that is not charged; six lines.
- 8 Phase 2 reference cases (`tests/fixtures/cart-cases.json`, computed with Python's Decimal), which cover the
  shipping threshold (98.99 + 7.99 shipping, 101.00 free).

## 2. Versioned persistence and rehydration

`cart.storage.ts` saves the cart to localStorage as an envelope:

```json
{
  "version": 2,
  "savedAt": "2026-11-14T13:00:00.000Z",
  "lines": [{ "productId": "p-001", "quantity": 2, "...": "…" }]
}
```

| Situation when the app loads                                                               | What happens                                                                                                         |
| :----------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------- |
| `brandstore:cart` holds version 2                                                          | Read, then every line validated and repaired                                                                         |
| Nothing there, the legacy pages' cart `brandstore:cart:v1` exists (`{ lines }`, version 1) | Migrated (read once; the legacy key is left for the legacy pages)                                                    |
| A version newer than this code (a newer deploy in another tab)                             | Not guessed at: empty cart in memory, and the stored value is **not** overwritten until the shopper changes the cart |
| Invalid JSON, wrong types                                                                  | Unreadable: empty cart                                                                                               |
| Lines with wrong types, quantities out of bounds, duplicates                               | Dropped, capped to 1…min(stock, 10), merged                                                                          |
| Storage blocked or full                                                                    | The cart works in memory for the visit                                                                               |

**Rehydration** happens in the reducer's lazy initial state, so the first render already shows the stored
cart. Then the provider (`CartContext.tsx`):

- saves every new state (an unchanged state is the same object and is not saved);
- follows other tabs (`storage` event → validated → `hydrate`), listener removed on unmount;
- re-prices once on load: `GET /products/:id` for each stored line (aborted on unmount), then `reprice`. A
  changed price, a product now out of stock or a removed product is announced on the cart page.

## 3. The multi-step checkout

| Route                            | Component           | Guard                                                                                                                                    |
| :------------------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------------------------------------- |
| `/checkout`                      | `CheckoutLayout`    | RequireAuth (sign in, then back to the same URL); nothing chargeable in the cart → message (and a link to the order just placed, if any) |
| `/checkout` (index)              | `CheckoutIndex`     | opens the first step that still has errors                                                                                               |
| `/checkout/address`              | `AddressStep`       | —                                                                                                                                        |
| `/checkout/payment`              | `PaymentStep`       | the address must be valid, else back to `/checkout/address` with "Complete … first"                                                      |
| `/checkout/review`               | `ReviewStep`        | address and payment valid                                                                                                                |
| `/checkout/confirmation/:number` | `ConfirmationRoute` | outside the layout (the cart is empty by then)                                                                                           |

The routing map in `task_1_architecture.md` §4 is revised to these rows, and `routes.test.ts` still fails if the
app and the plan differ.

**Steps.**

1. **Delivery address:** full name, Egyptian mobile number, street and building, city or district, governorate,
   optional postal code. A saved address from `GET /account/addresses` can fill the street and city (the API's
   addresses have only those two fields).
2. **Payment method (mock):** a test card (Visa 4242 or Mastercard 4444, plus the name on the card), cash on
   delivery, or a mobile wallet (its number). **No card number is typed or stored**, and nothing is charged.
3. **Review:** the lines (chargeable ones only), the address and payment with "Change" links, the totals from the
   selectors, and "Place order, EGP …".

**Per-step validation** (`validateAddress`, `validatePayment` in `checkout.model.ts`, pure):

- "Continue" validates the step. With errors it does not move on: an error summary appears (`role="alert"`),
  takes focus, and lists each problem as a link to its field; each field shows its message (`aria-invalid`,
  `aria-describedby`). From then on, errors update as the shopper types.
- Later steps cannot be reached by URL or by the progress indicator while an earlier step is invalid
  (`StepGuard`, `blockingStep`).

**Progress indicator:** `Steps` (a new core component, with stories for all six states). A labelled `<nav>` with
an ordered list. The current step has `aria-current="step"`, and every step says its state in text ("Step 2 of 3,
completed"). Completed steps are links back; locked steps are text with `aria-disabled`.

## 4. Input survives refresh and Back, at every step

- **Each step is its own URL.** Back and Forward move between steps, and a refresh reopens the same step.
- **The draft is in a pure reducer** (`checkoutReducer`), held by `CheckoutProvider` and saved to sessionStorage
  (`brandstore:checkout:v1`) after every change. On load it is read back and validated field by field.
- **sessionStorage, not localStorage:** the draft holds a name, a phone number and an address, so it stays in this
  tab and is gone when the tab closes. The cart stays in localStorage.
- **Sign-in detour:** if the session expires, the shopper signs in and comes back to the same step with the draft
  intact.
- **After the order is placed** the draft is cleared, so the next checkout starts empty with a new idempotency
  key.

The Vitest flow test proves this. It fills a step, unmounts and remounts the app on the same URL (a refresh),
opens the address step from the progress indicator, then goes Back, and checks every value. The Playwright spec
does the same in a real browser: `page.reload()`, `goBack()` and `goForward()` on each step.

## 5. Placing the order, exactly once

`usePlaceOrder.ts` sends `POST /orders` with the `Authorization: Bearer` token:

```json
{
  "items": [{ "productId": "p-003", "qty": 2 }],
  "idempotencyKey": "6f1c…",
  "shipping": {
    "fullName": "Mona Adel",
    "phone": "01012345678",
    "street": "90th Street",
    "city": "Cairo",
    "governorate": "cairo"
  },
  "payment": { "method": "cod", "reference": "Cash on delivery" }
}
```

The API requires only `items`. It accepts the other fields and ignores them, and returns `201 { id, number,
status }`. The app then:

1. remembers the order in this tab;
2. replaces `/checkout/review` with `/checkout/confirmation/TS-1001`;
3. clears the draft and the cart.

**Double submission is prevented at three levels:**

| Level      | How                                                                                                                                                                                                                                                                                       | Stops                                                      |
| :--------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------- |
| The click  | `inFlight` is a **ref**, set synchronously before the request. React state would not be set until the next render, so two clicks in one frame would both pass.                                                                                                                            | double click, click + Enter, a second click while waiting  |
| The button | While the request runs the button shows "Placing your order…" (`aria-busy`, `aria-disabled`) and ignores clicks. A status line asks the shopper not to close the page.                                                                                                                    | the shopper clicking again because nothing seems to happen |
| The tab    | The placed order is stored with the draft's idempotency key. Opening the review again with the same draft (Back, refresh) goes to its confirmation instead of posting. After success the cart and draft are empty, so the checkout shows "nothing to check out" with a link to the order. | Back after success, a refresh during a slow response       |

**Idempotency note.** Every checkout draft gets one key (`crypto.randomUUID()`) when it is created, and it is
sent with the order.

- If the request fails with an unknown outcome (network error, timeout, 5xx), the order may or may not exist. So
  "Try again" sends **the same key**, and a backend that honours the key returns the first order instead of
  creating a second. The test checks that the retry's key equals the first attempt's.
- The key travels in the body, not in an `Idempotency-Key` header, because the TechSphere API's CORS allows only
  `Authorization` and `Content-Type`; a custom header would fail the browser's preflight.
- **The TechSphere mock ignores the key**: it would create a second order for a true duplicate. That is why the
  client-side levels above matter, and why a production backend must store the key with the order (for example,
  24 hours) and return the stored response on a repeat.

**Errors:**

- `400`: the API's message.
- `401`: the shopper is signed out, sent to sign in, and brought back to the review with the draft intact.
- Network or `5xx`: a message and "Try again" (safe, because the key is the same).

**Confirmation route** (`/checkout/confirmation/:number`): shows the order number the API returned, plus status,
items, total, delivery address and payment from this tab's record. A refresh shows the same page. Opened
elsewhere, it still shows the number from the URL, with a link to the order history.

## 6. Order history and cancel

`/account/orders` lists `GET /account/orders` (five per page, `?page=` in the URL → `offset`) in a
`Table<Order>`. It adds:

- **Cancel** on `processing` orders only (the API returns 409 for the others). Cancel opens a confirmation dialog
  ("Keep the order" / "Cancel the order"; focus trapped, Escape closes). Confirming sends
  `PATCH /account/orders/:id/cancel`, once: a ref guard plus the busy button.
- **200:** the row shows the order the API returned (status "cancelled", no Cancel button), and a live region
  announces it.
- **409** (it shipped in the meantime): the reason is announced and the list reloads.
- **401:** sign in again. **Other failures:** the dialog stays open with the message.
- **Orders placed in this session:** the TechSphere API does not add new orders to `GET /account/orders`, so
  orders placed in this tab are listed above the table, marked as such. They are never mixed into the API's rows.

## 7. Tests and CI

| Test                                    | What it proves                                                                                                                                                                                                                                   |
| :-------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cart.reducer.test.ts`                  | every action, bounds, purity (frozen input, same output), same object when nothing changes, reprice                                                                                                                                              |
| `cart.selectors.test.ts`                | 16 reference cases within 0.005, shipping threshold, only chargeable lines ordered                                                                                                                                                               |
| `cart.storage.test.ts`                  | envelope round trip, v1 → v2 migration, repair, newer version not touched, unreadable data, storage that throws                                                                                                                                  |
| `checkout.test.tsx`                     | sign-in and empty-cart guards; validation blocks each step (focused summary); URL skipping blocked; refresh and Back keep input; double click → one POST; confirmation number; cart and draft cleared; network failure → retry with the same key |
| `orders.test.tsx`                       | cancel only on processing; "Keep the order" sends nothing; 200 updates the row; 409 explained and reloaded; 5xx keeps the dialog open                                                                                                            |
| `stories.test.tsx`                      | the new `Steps` stories (six states) pass axe                                                                                                                                                                                                    |
| `web/e2e/checkout.spec.ts` (Playwright) | against the TechSphere API: reload, Back and Forward at every step; a saved address; double click → exactly one `POST /orders`; `TS-…` confirmation; cancel with PATCH survives a reload                                                         |

MSW handlers (`web/src/test/server.ts`) behave like the kit: `POST /orders` (400 without items, 201 with
`TS-100n`, no de-duplication), `PATCH …/cancel` (404, 409, 200), `GET /account/addresses`. Their state is reset
after every test.

CI runs all of it in the "React app (web/)" job and the end-to-end jobs (Chromium, Firefox, WebKit). As before,
the kit's server is started only when `VITE_API_BASE` is not set.

## 8. Try it

```bash
npm install
npm run dev                  # http://localhost:5173 (API at VITE_API_BASE, default :4010)
# sign in: student@techsphere.test / Passw0rd!
# add products → Cart → Go to checkout → address → payment → review → Place order
npm run test -w web          # unit, integration, a11y
E2E_APPS=web npm run e2e     # the browser specs
```
