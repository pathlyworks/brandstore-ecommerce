# Storage strategy

Rule of thumb: decide by what must survive **refresh**, **tab close** and **logout**.
`localStorage` survives all three; `sessionStorage` survives refresh only (it is per tab and is
cleared when the tab closes); memory survives nothing; the URL survives refresh and can be shared.

| Data                                                                                                                                           | Where            | Key                     | Refresh   | Tab close                      | Logout                    | Why                                                                                                                                                                                                 |
| :--------------------------------------------------------------------------------------------------------------------------------------------- | :--------------- | :---------------------- | :-------- | :----------------------------- | :------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cart lines (`productId`, `quantity`, price snapshot)                                                                                           | localStorage     | `brandstore:cart:v1`    | kept      | kept                           | kept                      | A shopper expects the cart tomorrow and after signing out/in. It holds no personal data. Prices are re-checked against `GET /products/{id}` before checkout, so a stale snapshot cannot be charged. |
| Save-for-later items                                                                                                                           | localStorage     | `brandstore:saved:v1`   | kept      | kept                           | kept                      | A wishlist is only useful if it lasts; same content and risk level as the cart.                                                                                                                     |
| Session: token, `expiresAt`, user `{id, name, email}`                                                                                          | sessionStorage   | `brandstore:session:v1` | kept      | **cleared**                    | **cleared**               | Refresh must not sign the user out, but a bearer token should not outlive the tab (shared computers). Cleared on logout and on any 401.                                                             |
| Transient flags: `returnTo` after login, "session expired" notice, dismissed rate-limit banner, last cancelled order id for a one-time message | sessionStorage   | `brandstore:flags:v1`   | kept      | cleared                        | **cleared**               | Only meaningful during this visit; must not leak into a later visit or another user's session.                                                                                                      |
| Recently viewed products (id, name, price, image; newest first, no duplicates, max 6) — added in Task 3                                        | sessionStorage   | `brandstore:recent:v1`  | kept      | cleared                        | unaffected (not personal) | A browsing aid for this visit only; a new tab starts empty.                                                                                                                                         |
| Catalog filters, sort, page                                                                                                                    | URL query string | n/a                     | kept      | n/a (in history and bookmarks) | unaffected                | Shareable and back/forward work; storing them would make the URL lie.                                                                                                                               |
| Products, orders, addresses from the API                                                                                                       | memory only      | n/a                     | refetched | gone                           | cleared                   | The server is the source of truth. Orders and addresses are personal data and are never written to the device.                                                                                      |

## Decisions and trade-offs

1. **Why not localStorage for the token?** It would survive closing the browser, so the next person
   on a shared computer would be signed in. sessionStorage limits that to the open tab.
2. **XSS.** Any script on the page can read both storages. Mitigations already in place: the
   Content-Security-Policy from Phase 1 (`script-src 'self'`) and rendering with `textContent`
   only. The safer design is an HttpOnly cookie set by the server; the contract returns the token
   in the body, so that is listed as a backend follow-up, not something the client can do.
3. **Keeping the cart after logout** is a product choice (it matches most stores and avoids
   losing a guest cart at sign-in). If the business wants per-user carts, logout also clears
   `brandstore:cart:v1` and the cart moves to a future `/account/cart` endpoint.
4. **Versioned keys** (`:v1`): if the stored shape changes, the key changes and old data is ignored
   instead of crashing the app.
5. **Failure handling:** `utils/storage.js` wraps every call in try/catch (private mode, disabled
   storage, `QuotaExceededError`) and returns the fallback; the app keeps working in memory.
6. **Token expiry:** `expiresAt = now + expiresIn * 1000` is stored with the token; the session is
   treated as signed out once it passes, without waiting for a 401.

## What logout does

`state/session.signOut()` removes `brandstore:session:v1` and `brandstore:flags:v1`, drops orders and
addresses from memory, and leaves `brandstore:cart:v1` and `brandstore:saved:v1` untouched.
