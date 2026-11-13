# Security note (Phase 2, Task 4)

Plain-language notes on how BrandStore signs people in and what protects them. Each point names the code
that does it and the check that proves it.

## 1. Token storage: where the token is kept, and the risk we accept

**Choice: `sessionStorage`** (key `brandstore:session:v1`: token, expiry time, name/email/role).

| Option                             | Survives refresh                 | Survives closing the tab | Readable by injected script (XSS) |
| :--------------------------------- | :------------------------------- | :----------------------- | :-------------------------------- |
| Memory only                        | no (signed out on every refresh) | no                       | yes, while the page is open       |
| **sessionStorage (chosen)**        | **yes**                          | **no**                   | **yes**                           |
| localStorage                       | yes                              | yes (stays until logout) | yes, and for much longer          |
| HttpOnly cookie (needs the server) | yes                              | configurable             | **no**                            |

**The honest trade-off:** any script running in our page can read sessionStorage, so **if an attacker managed
to run JavaScript on the site (XSS), they could steal the token** and use it until it expires (1 hour on the
TechSphere API). We accept this because:

- a refresh should not sign the shopper out (that rules out memory only);
- the token should not outlive the tab on a shared computer (that rules out localStorage);
- the API returns the token in the response body, so an HttpOnly cookie is not possible from the browser
  side; it is the recommended next step on the server.

We reduce the risk instead: no way to inject script (section 2), a strict CSP (section 5), a short token life,
and the session is removed on sign-out, on expiry and on any 401. The password is never stored anywhere.

**Expiry.** The token's `exp` claim is read (`src/utils/jwt.js`; only to know the time, a browser cannot verify a
signature). An expired session is never sent: the account page sends the shopper to sign-in with "Your session
has expired. Please sign in again." A token the server rejects (401) does the same, and a timer does it if the
token expires while the page is open (`src/components/auth-session.js`).

**Sign-out** removes the session and the one-visit flags (sessionStorage) and leaves the page, so account data
held in memory is gone. The cart and saved items (localStorage) are deliberately kept.

## 2. XSS (cross-site scripting) and how the code avoids it

XSS means text from outside (an API response, a URL, a form) ends up being run as code in our page. With our
token in sessionStorage, that is the main way it could be stolen. How the code avoids it:

- **Text, never HTML.** Every element is built with `document.createElement` and `textContent`
  (`src/utils/dom.js`). `innerHTML`, `outerHTML`, `insertAdjacentHTML` and `document.write` are banned and
  checked by `qa/js-rules.js`. Product names, order data and error messages from the API are always plain text.
- **No inline scripts or event-handler attributes**, no `eval` or `new Function`; every page loads one ES module
  file (checked by `qa/js-rules.js`). This is what lets the CSP forbid inline script entirely.
- **URLs are built safely:** ids go through `encodeURIComponent`; query strings through `URLSearchParams`.
- **No open redirect:** after sign-in the app returns only to a known page of this site (`withFlags` in
  `src/state/session.js`); an outside address is ignored.
- `qa/behaviour.js` renders a product whose name is `<img src=x onerror=…>` and checks it shows as text.

## 3. CORS (cross-origin resource sharing) and why the mock server's headers matter

A browser only lets a page read a response from **another origin** (scheme + host + port) if that server says so
with CORS headers. Our site and the API are on different origins when `VITE_API_BASE` points to the TechSphere
API (e.g. site on `:8080`, API on `:4010`), so CORS decides whether the app works at all.

- The TechSphere server answers with `Access-Control-Allow-Origin: <your origin>`,
  `Access-Control-Allow-Headers: Authorization, Content-Type` and the allowed methods, and answers the
  browser's preflight `OPTIONS` request with 204.
- Because `Authorization` is in the allowed headers, the browser lets us send the Bearer token. A header that is
  not in the list makes the browser block the request before it is sent; that is why the app does **not** send
  its `X-Client-Id` header to the TechSphere API (`src/api/product-api.js`).
- CORS protects **users**, not the server: it stops other websites from reading responses in a visitor's browser.
  It is not access control (curl ignores it). `Allow-Origin: *` is fine for public catalog data; a real API that
  used cookies would have to name its exact origins and never combine `*` with credentials.
- Our own mock serves the API on the **same origin** (`/api` with `npm run start`, Vite and the Netlify
  function), so no CORS is needed in production; its CORS headers only matter when it runs on its own port.

## 4. CSRF (cross-site request forgery): Bearer tokens versus cookies

CSRF is when another website makes the visitor's browser send a request to our API, and the browser attaches
the visitor's credentials **automatically**. Browsers attach **cookies** automatically; they never attach an
`Authorization` header by themselves. Our token is sent only by our own code in that header, so a forged request
from another site arrives **without** it and gets 401: classic CSRF does not apply to this design.

The price is section 1: a token readable by script is exposed to XSS. If the API moved the token to an HttpOnly
cookie (safer against XSS), CSRF would come back and need `SameSite=Lax` or `Strict` cookies plus a CSRF token
or an Origin check on every request that changes data.

## 5. Proposed Content-Security-Policy for the deployed site

Already set in `netlify.toml` and tested by `qa/headers.js` (every page loads with 0 CSP violations):

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self';
  font-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'self'; frame-ancestors 'none';
  object-src 'none'; upgrade-insecure-requests
```

| Directive                                 | What it does for us                                                                                                                                                                                                                                          |
| :---------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `script-src 'self'`                       | Only our own script files run: no inline script, no injected `<script src=…>` from elsewhere. The strongest limit on XSS.                                                                                                                                    |
| `connect-src 'self'`                      | `fetch`/Axios may only call our own origin (the `/api` function). **When deployed against an API on another origin, add it here**, e.g. `connect-src 'self' https://api.techsphere.example`; that also stops stolen data being sent to an attacker's server. |
| `style-src`, `img-src`, `font-src 'self'` | Only our own files.                                                                                                                                                                                                                                          |
| `form-action 'self'`                      | Forms can only submit to our own pages.                                                                                                                                                                                                                      |
| `base-uri 'self'`, `object-src 'none'`    | Block two classic injection tricks (`<base>` and plugins).                                                                                                                                                                                                   |
| `frame-ancestors 'none'`                  | Nobody can frame the site (clickjacking on the sign-in form).                                                                                                                                                                                                |
| `upgrade-insecure-requests`               | Any `http://` request is upgraded to `https://`.                                                                                                                                                                                                             |

Other headers already sent: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: strict-origin-when-cross-origin` (other sites never see our paths), `Permissions-Policy`.

## 6. Credentials never in URLs or logs

- Forms use `method="post"` and the script stops the browser's own submission; email and password travel only
  in the JSON **body** of `POST /auth/login` / `/auth/register` (`src/api/auth.js`).
- The token travels only in the `Authorization` **header** (`src/api/http.js`, `src/api/account.js`).
- Notices and the return page travel in sessionStorage flags, not in the URL.
- ESLint forbids `console.log`/`info`/`warn` in `src/` (only `console.error` for a feature that fails to start).
- Checked: the e2e journey "the token and password never appear in a URL, a query string or the console"
  records every request and navigation URL and every console line in the browser, plus the TechSphere server's
  own request log, and fails if either secret appears (verified to fail when a `console.info` of the token is added).
- Fields use `autocomplete="username"`, `current-password` and `new-password` so password managers work and
  browsers do not save the password as ordinary form history.
