# Advanced Task 4: Protected Routes, Session Handling, and Security Notes

Advanced Task 4 deliverable and security note. Author: Ahmed. Date: 2026-11-14.
Repository: https://github.com/pathlyworks/brandstore-ecommerce · Pull request: **#10**
(`feature/protected-routes-session` → `main`), after PR #9 (`npm run dev -- --port …` reaches Vite).

The app runs against the TechSphere API at `VITE_API_BASE` (`import.meta.env.VITE_API_BASE`, default
`http://localhost:4010`). What it really does, and what this note builds on:

- `POST /auth/login` → `200 { token, user }`, or `401` for wrong credentials.
- `POST /auth/register` → `201 { token, user }`, or `400`.
- The token is `header.{ sub, role, exp }.mock`: `"alg": "none"` and signed by nothing, with a one-hour lifetime.
- Protected endpoints answer `401` without a valid, unexpired token; `/admin/summary` answers `403` for a shopper.

`npm run dev -- --port 4000 --strictPort --host 0.0.0.0` starts the React app's Vite on that port: the root
script ends with `--` (PR #9), so the options reach `vite`. CI checks it: the "React app (web/)" job starts the
app exactly as the grader does, on port 4999, and fails unless the page answers there.

| The brief asks for                                                   | Where                                                                                           |
| :------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------- |
| AuthContext with login, register and logout                          | §2; `web/src/features/auth/AuthContext.tsx`, `LoginRoute.tsx`, `RegisterRoute.tsx`              |
| The Phase 2 token-storage decision, revisited for a SPA              | §1                                                                                              |
| ProtectedRoute: redirect, and return to the intended destination     | §3; `ProtectedRoute.tsx`, `session.ts` (`safeNext`)                                             |
| 401 handled in one central API wrapper, one re-authentication path   | §4; `web/src/api/client.ts`                                                                     |
| The cart preserved across login and logout                           | §5                                                                                              |
| Session expiry during checkout: clear message and recovery           | §6; `SessionExpiryNotice.tsx`, `LoginRoute.tsx` (`signInReason`)                                |
| Route-level code splitting: the admin bundle never ships to shoppers | §7; `app/routes.tsx`, `web/scripts/check-bundles.mjs`                                           |
| [v1.1] npm audit, and how each flagged package is handled            | §8; `scripts/audit-report.mjs`, `security/audit-allowlist.json`, `security/npm-audit-report.md` |
| Residual risks, stated honestly                                      | §9                                                                                              |

## 1. Token storage, revisited for a single-page app

**Phase 2 decision** (`docs/SECURITY.md` §1): the token in **sessionStorage**. It survives a reload, does not
outlive the tab, and is not shared with other tabs. The accepted risk: any script running in the page can read it.

**What changes in a SPA.** The legacy site loaded a new document on every page, so the token _had_ to be in
storage for the next page to see it. The React app is one long-lived document: the token is needed in storage
only to survive a **reload**. So the options look different now:

| Option                                                   | Survives reload             | Outlives the tab    | Readable by injected script (XSS)                                                   | Works with this API                                                                  |
| :------------------------------------------------------- | :-------------------------- | :------------------ | :---------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------- |
| Memory only                                              | no (sign in again after F5) | no                  | not from storage, but an injected script can still wrap `fetch` and read the header | yes                                                                                  |
| **Memory + sessionStorage mirror (chosen)**              | **yes**                     | **no**              | **yes**                                                                             | **yes**                                                                              |
| localStorage                                             | yes                         | yes, until sign-out | yes, and for longer                                                                 | yes                                                                                  |
| HttpOnly `SameSite` cookie set by a backend-for-frontend | yes                         | as the cookie says  | **no**: script cannot read it (it can still make requests while the page is open)   | **no**: the API returns the token in the body and takes only `Authorization: Bearer` |

**Updated decision: memory first, mirrored to sessionStorage.**

- `AuthContext` holds the session in memory. The API client reads it from there, through the bridge (§4).
- sessionStorage is only a mirror, written after every change and read once at start-up, so a reload keeps the
  shopper signed in.

On reading, the stored session is validated:

- the shape must be right;
- the token's `exp` must be in the future;
- the role is taken **from the token**, not from the stored user object, so editing `"role": "admin"` in DevTools
  does not open the admin area.

The session ends:

- when the token's time comes (a timer, cleared on change and unmount);
- on sign-out;
- on any 401.

**The trade-off, honestly.** Memory-only would close the "read the token from storage" path but not XSS itself:

- A script injected into the page can patch `fetch` and read the `Authorization` header of the next request.
- It can also simply make requests as the user while the page is open.
- Memory-only would cost a sign-in after every reload, including in the middle of checkout.

So it was not chosen. The real fix is an HttpOnly cookie (with `SameSite=Lax` and a CSRF defence), which needs a
backend change (§9). Until then the risk is reduced, not removed:

- no `innerHTML` and no `dangerouslySetInnerHTML` (ESLint `react/no-danger`); React escapes text;
- the Content-Security-Policy proposed in `docs/SECURITY.md` §5;
- one-hour tokens;
- sign-out in one tab signs out the others (§2).

## 2. AuthContext: login, register, logout

`AuthContext.tsx` holds `{ session, ended }` in a **pure reducer** with three actions:

- `signIn` (from login and register);
- `signOut`;
- `expire` (the timer, or any 401).

Nothing else writes the session. `ended` records why there is no session (`none`, `signed-out`, `expired`), so the
sign-in page can say why the user is there.

| Action    | Called by                                                          | Effects                                                                                                                        |
| :-------- | :----------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------- |
| `signIn`  | `/login` (`POST /auth/login`), `/register` (`POST /auth/register`) | session in memory and sessionStorage; `exp` and `role` from the token                                                          |
| `signOut` | "Sign out" in the account area                                     | session removed; **checkout draft removed** (name, phone, address); other tabs signed out (localStorage signal); **cart kept** |
| `expire`  | the expiry timer, or the API client on any 401                     | session removed; draft and cart **kept** (the user is coming back)                                                             |

The API client sees the session through a bridge (`connectAuth`), updated **synchronously** in the actions, not in
an effect. A child that renders first and requests at once after sign-in already has the token.

- **Register** (`/register`) is a controlled form: name, email, password of at least 8 characters, and the
  password again. The API's rules are checked in the browser first.
  - "Email already registered" (400) is shown on the email field.
  - On success the user is signed in (the API answers 201 with a token) and sent on like a sign-in.
- **Logout** first leaves the protected area, then ends the session: the button navigates home with
  `{ signOut: true }`, and `RootLayout` signs out once home is showing. This way `ProtectedRoute` never sees a user
  who just signed out and sends them to sign in again.

## 3. ProtectedRoute and the intended destination

`<ProtectedRoute>` wraps `/account/*` and `/checkout/*`; `<ProtectedRoute role="admin">` wraps `/admin`
(`app/routes.tsx`). On every render (not only when a timer fires) it checks that a session exists **and** that
its `exp` has not passed:

| State                                   | Result                                                                               |
| :-------------------------------------- | :----------------------------------------------------------------------------------- |
| no valid session                        | `<Navigate replace>` to `/login?next=<path + query>`                                 |
| session ended by expiry or a 401        | the same, plus `&reason=expired`                                                     |
| valid session without the required role | a 403 page ("This area is for administrators"); the guarded screen is never rendered |
| valid session (and role)                | the screen                                                                           |

**Back to the intended destination.**

- `next` carries the full path and query (`/account/orders?page=2` comes back to page 2).
- Login and register both honour it, and the "Create an account" and "Sign in" links pass it on.
- `safeNext` accepts only same-site paths: it rejects `//evil.example`, `https://…`, `/\evil` and loops back to
  `/login` or `/register` (each one a test).
- Without a valid `next`, the user goes to `/account/orders`.
- The redirect is `replace`, so Back does not return to the guard.

**These guards are UX, not access control.** They decide what the browser shows. The API checks the token on
every request and the role on `/admin/summary` (403). That server check is the real gate (§9).

## 4. One place for 401, one re-authentication path

`web/src/api/client.ts` is the only code that knows what a 401 means. A request marked `auth: true`:

1. takes the token from the bridge, and only while the session is valid. With no valid token, it is **not sent**;
   the client calls `onUnauthorized('missing-token')` and throws `ApiError` code `UNAUTHENTICATED`;
2. on a `401` answer, calls `onUnauthorized('rejected')` and throws the same error;
3. `onUnauthorized` is `expire()`. The reducer ignores a second `expire`, so several requests failing together end
   the session once.

Then `ProtectedRoute` sends the user to `/login?next=…&reason=expired`. **That is the only re-authentication
path.**

- **Components never handle 401.** The orders page, the cancel dialog, the address step and "Place order" lost
  their own 401 branches. They show their error state for a moment, and the redirect replaces them.
- **Login is the exception.** A 401 on `POST /auth/login` is not a session ending. That request has no `auth`
  flag, so the client classifies it as `INVALID_CREDENTIALS` ("The email or password is not right").
- **403 is not a session end:** the user stays signed in.

Checks:

- `client.test.ts` proves each case: the token is sent; no token means no request and one `onUnauthorized`; a 401
  means one `onUnauthorized`; the login 401 does not end the session; 403 does not either.
- A search finds the number `401` in `client.ts` only (and in comments and tests).

## 5. The cart across login and logout

The cart belongs to the **device**, not the account: the TechSphere API has no server cart.

- It lives in localStorage (`brandstore:cart`, versioned, Task 3).
- `AuthContext` never touches it. Login, register, logout, expiry and the cross-tab sign-out all leave it as it is.
- A guest's cart is still there after signing in, so they can go straight to checkout. It is still there after
  signing out, so the next sign-in finds it.

Tests check this in jsdom (`auth.test.tsx`: the badge and the stored value before and after each step) and in a
browser (`auth.spec.ts`).

**Not kept on sign-out:** the checkout draft (name, phone, address), because it is personal data on a possibly
shared computer. It **is** kept on expiry, because then the same person is coming back.

## 6. Session expiry during checkout

1. **Before it happens:** in the checkout, once less than 5 minutes are left, a status message says "Your session
   ends in about N minutes. Place your order before then…" (`SessionExpiryNotice`, an interval cleared on
   unmount).
2. **When it happens:** the timer runs out, or `POST /orders` (or any other request) gets a 401. The session
   ends, and the user lands on `/login?next=/checkout/review&reason=expired` with: "Your session expired during
   checkout. Sign in again to finish your order: your cart and the details you entered are kept." The header
   still shows the cart count.
3. **Recovery:** after signing in, the user is back on the same step. The draft (sessionStorage) and the cart
   (localStorage) are intact, and no order was created (the 401 came before one). "Place order" then goes through
   once, with the same idempotency key as before (Task 3).

`auth.test.tsx` runs this flow with MSW refusing the token. `web/e2e/auth.spec.ts` runs it in Chromium against the
TechSphere API twice:

- with an expired stored token (the app ends the session before any request);
- with the API answering 401 to `POST /orders` while the review is open.

## 7. Route-level code splitting: the admin bundle never ships to shoppers

- `/admin` renders `<ProtectedRoute role="admin"><AdminRoute /></ProtectedRoute>`.
- `AdminRoute` is `React.lazy(() => import('../features/admin/AdminRoute'))`. React fetches a lazy component's
  code only when it first **renders**, and the guard renders it only for an admin. So a shopper's browser never
  requests the chunk, not even at `/admin`, where the guard shows the 403 page instead.
  - React Router's `route.lazy` was not used: it loads a route's module during navigation, before the guard
    renders.
- The checkout steps are lazy too, behind their own guard. `RootLayout` and `CheckoutLayout` hold the
  `<Suspense>` fallbacks.

**Checked twice:**

1. `npm run check:bundles -w web`, run in CI after `vite build` from the Vite manifest, fails unless all of these
   hold:
   - `AdminRoute.tsx` is its own dynamically imported chunk;
   - it is outside the entry's static import graph;
   - `dist/index.html` does not reference it;
   - the admin module's marker string is in that chunk and in no other file.

   Last CI run: entry `index-….js` 376.7 kB with one eagerly loaded chunk; `AdminRoute-….js` 1.2 kB; checkout
   chunks 0.2–3.9 kB.

2. `web/e2e/auth.spec.ts` records every script the browser loads. A shopper who signs in, opens `/admin` (403
   page) and then the catalogue loads **no** `AdminRoute-*.js`; an admin loads exactly one.

What this does **not** do: hide the admin code from someone who asks for the file by URL (§9).

## 8. Dependency audit (npm audit) [v1.1]

`npm run audit` (`scripts/audit-report.mjs`) runs `npm audit` twice:

- over everything;
- with `--omit=dev`: what ships to browsers (react, react-dom, react-router; axios in the legacy pages).

It then applies a written policy and writes `security/npm-audit-report.md`. CI runs it in the "React app (web/)"
job.

**Policy:**

- **Production dependencies:** moderate or above fails.
- **Development dependencies** (build, test, lint, Storybook, Lighthouse CI; they run on developer machines and in
  CI, never in a user's browser): critical fails; the rest must be listed in `security/audit-allowlist.json` with
  how it is handled and an expiry date.
- An **expired** allowlist entry fails, so every exception is looked at again.
- An entry no longer needed is reported.

**First run (this branch, before any change): 27 advisories.**

| Package (how it got in)                              | Severity                    | Scope       | Handling                                                                                                                                                                                                                  |
| :--------------------------------------------------- | :-------------------------- | :---------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **axios 1.19.0** (legacy pages' `product-api.js`)    | 7 high, 5 moderate          | production  | **Fixed: upgraded to 1.21.1** (pinned). Most of them are in axios's Node adapters (HTTP/2, proxy, `data:` URLs) and do not run in a browser, but a production package with known advisories is not kept on that argument. |
| **tinypool** (via vitest 3)                          | **2 critical** (RCE gadget) | development | **Fixed: vitest and @vitest/coverage-v8 3.2 → 5.1** in both workspaces; the 178 web tests and the 259 legacy tests pass on 5.1.                                                                                           |
| vitest 3, @vitest/mocker 3, minimatch (via vitest 3) | moderate                    | development | Fixed by the same upgrade (vitest's own copies).                                                                                                                                                                          |
| extract-zip, tmp, zod, uuid (via @lhci/cli 0.15)     | 4 high, 1 moderate, 1 low   | development | **Fixed: @lhci/cli 0.15 → 0.16.1.**                                                                                                                                                                                       |

**After the fixes: 0 production advisories, 7 development ones, each allowlisted until 2027-02-14:**

| Package (how it got in)                                   | Severity           | Why it is accepted for now                                                                                                                                                                                                                                                             |
| :-------------------------------------------------------- | :----------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| basic-ftp (@lhci/cli → puppeteer → proxy-agent → get-uri) | 1 high, 2 moderate | Reached only for `ftp://` URLs or PAC proxy files; Lighthouse CI here opens `http://127.0.0.1` with no proxy, so the FTP client never runs; worst case a denial of service of a CI step. npm's only fix is a **downgrade** to @lhci/cli 0.13 (older Lighthouse), which would be worse. |
| @vitest/mocker 3 (Storybook 9's own copy)                 | 2 moderate         | Our tests use the fixed Vitest 5.1. This copy belongs to Storybook's `storybook/test` mocking, which our stories do not use; the Storybook dev server listens on localhost. **Fixed in Storybook 10.6.7: planned upgrade** (a major version, its own PR).                              |
| glob, minimatch (Storybook 9)                             | 2 moderate         | Only Storybook's CLI uses them, on fixed globs over our own files (`.storybook/main.ts`); no untrusted pattern or AbortSignal reaches them. npm's only fix is a downgrade to Storybook 8.5.                                                                                            |

Nothing above ships to a browser: `npm audit --omit=dev` reports **0**.

## 9. Residual risks (stated honestly)

| Risk                                                                                                                                                                                                                                                                                                                                                                                                                         | Why it remains                                                                                                                                                  | What would remove it                                                                                                                                                                       |
| :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **XSS would expose the session.** Injected script can read the sessionStorage mirror, wrap `fetch`, or act as the user.                                                                                                                                                                                                                                                                                                      | The API only accepts a Bearer token from script (§1). Defences reduce it: React escaping, no `innerHTML`, `react/no-danger`, the proposed CSP, one-hour tokens. | HttpOnly `SameSite` cookie via a backend-for-frontend, plus CSRF tokens; an enforced CSP with nonces.                                                                                      |
| **Logout is client-side only.** A copied token stays valid until its `exp` (up to an hour).                                                                                                                                                                                                                                                                                                                                  | The API has no logout or revocation endpoint.                                                                                                                   | Server-side sessions or a revocation list; short-lived access tokens plus refresh tokens.                                                                                                  |
| **The mock's tokens are forgeable.** `"alg": "none"`; anyone can write `{ "role": "admin", "exp": … }` and the mock API accepts it.                                                                                                                                                                                                                                                                                          | The TechSphere kit is a teaching mock. The client cannot verify a signature either; it reads `role` and `exp` only to decide what to **show**.                  | A real API with signed tokens (RS256/EdDSA) verified on every request. The client code would not change.                                                                                   |
| **Client guards are not security.** `ProtectedRoute` and the hidden admin link only control the UI.                                                                                                                                                                                                                                                                                                                          | Anyone can call the API directly.                                                                                                                               | Nothing in the client can: the API must (and the kit does) check token and role on every endpoint.                                                                                         |
| **The admin chunk is public.** A shopper's browser never downloads it, but anyone who learns its URL can.                                                                                                                                                                                                                                                                                                                    | Static hosting serves every file in `dist/`. The chunk holds UI code only: no secrets, and it calls an endpoint that answers 403 to non-admins.                 | Serve admin assets from a separate, authenticated origin if the admin UI itself must stay private.                                                                                         |
| **Hard expiry, no silent renewal.** A session ends at `exp` even mid-checkout.                                                                                                                                                                                                                                                                                                                                               | The API has no refresh endpoint. Mitigated: the 5-minute warning, and recovery that keeps the cart and the draft (§6).                                          | Refresh tokens (rotating, in an HttpOnly cookie).                                                                                                                                          |
| **Per-tab sessions.** A new tab must sign in again; sign-out reaches other tabs only through localStorage.                                                                                                                                                                                                                                                                                                                   | The cost of sessionStorage (§1). If storage is blocked, the session lasts for the page only.                                                                    | Cookie sessions.                                                                                                                                                                           |
| **Dependency risk.** 7 development-only advisories are accepted (§8). `npm audit` only knows **published** advisories: zero-days, malicious releases and typosquats are not covered. There is **no lockfile**, so CI and developers resolve the latest matching versions at each install, and a compromised new release of any transitive package would be picked up. Development tools run in CI with the repository token. | A lockfile was left out in Phase 1 (installs on the grading machine, Node only); the `^` ranges float.                                                          | Commit `package-lock.json` and install with `npm ci`; Dependabot or Renovate for reviewed updates; `--ignore-scripts` where possible; least-privilege CI tokens; the Storybook 10 upgrade. |
| **Personal data in storage.** The checkout draft (name, phone, address) sits in sessionStorage until the order is placed, sign-out, or the tab closes.                                                                                                                                                                                                                                                                       | It is what makes input survive refresh and the sign-in detour (Task 3).                                                                                         | Keep only non-personal fields, or a server-side draft.                                                                                                                                     |

## 10. Tests and CI

| Test                                               | What it proves                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| :------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api/client.test.ts`                               | Bearer from the bridge; no token → nothing sent, one `onUnauthorized`; 401 → one `onUnauthorized`; login 401 and 403 do not end the session                                                                                                                                                                                                                                                                                                                           |
| `features/auth/session.test.ts`                    | `exp` and `role` from the token; an edited stored role is ignored; expired and malformed sessions dropped; `safeNext` cases; the reducer (a second `expire` changes nothing)                                                                                                                                                                                                                                                                                          |
| `features/auth/auth.test.tsx`                      | 4 protected paths redirect with `next`; an expired stored session; the exact destination with its query; register (validation, taken email, destination); shopper 403 at `/admin` with no admin request; admin lazily loaded; refused token → `reason=expired` and back; the timer ends the session; sign-out in another tab; cart kept across sign-in and sign-out, draft removed on sign-out; expiry during checkout and recovery (one order); the 5-minute warning |
| `web/e2e/auth.spec.ts` (Chromium, Firefox, WebKit) | a shopper never downloads `AdminRoute-*.js`; an admin does; signed-out deep link with a query and back; token refused during checkout → sign in → same review → one order; the cart across sign-in and sign-out                                                                                                                                                                                                                                                       |
| `npm run check:bundles -w web`                     | the admin chunk is lazy, outside the entry graph and alone in carrying the admin code                                                                                                                                                                                                                                                                                                                                                                                 |
| `npm run audit`                                    | the policy in §8                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
