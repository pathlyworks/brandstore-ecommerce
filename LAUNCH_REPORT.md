# BrandStore — Launch Report

| Item | Value |
| :--- | :--- |
| Release | v1.0.1 (git tag `v1.0.1`, see `CHANGELOG.md`) |
| Date | 2026-11-12 |
| Author | Ahmed |
| Live demo URL | Pending: added after deployment (steps in `docs/RUNBOOK.md`) |
| Repository | this folder (`.git` included); technical detail in `docs/phase1/README.md` sections 7, 12, 13 and 20–25 |

## 1. What Was Built
BrandStore is a small online-shop front end with three pages: a landing page (hero offer, four categories, a filterable list of
three products, a scrolling strip of six launch offers, two customer quotes and an email sign-up), a side-by-side product
comparison page, and a "page not found" page. It is plain HTML, CSS and JavaScript with no server, so it loads quickly and can be
hosted for free. The sign-up form checks the address and answers on screen, but nothing is sent or stored. There is no checkout,
login or database in this version.

## 2. Endpoint Table
The site is static, so it has no API endpoints. These are all the addresses a visitor or a search engine can open.

| Route | File | What it is | Indexed by search engines |
| :--- | :--- | :--- | :--- |
| `/` | `index.html` | Landing page; sections `#categories`, `#featured`, `#deals`, `#testimonials`, `#newsletter` | Yes |
| `/comparison.html` | `comparison.html` | Product comparison table | Yes |
| any unknown address | `404.html` | Page not found (served by Netlify) | No (`noindex`) |
| `/robots.txt` | `robots.txt` | Rules for crawlers; points to the sitemap | n/a |
| `/sitemap.xml` | `sitemap.xml` | Lists the two indexable pages | n/a |
| Backend / API | none | Sign-up is simulated in the browser | n/a |

## 3. SEO Summary (per page)
| Page | Title (unique) | Meta description (unique) | Open Graph + Twitter tags | h1 count |
| :--- | :--- | :--- | :--- | :--- |
| `index.html` | BrandStore — Curated Electronics, Apparel & Modern Essentials | 134 characters | Yes, with 1200x630 image | 1 |
| `comparison.html` | Product Comparison — BrandStore | 127 characters | Yes, with 1200x630 image | 1 |
| `404.html` | Page not found — BrandStore | 99 characters | Yes, with 1200x630 image | 1 |

## 4. Key Decisions
- **No frameworks or build step.** Anyone can open the folder and edit it. The trade-off is that the product list lives in a
  JavaScript file, not a database.
- **Accessibility first:** a "skip to main content" link, labelled page regions, every control reachable by keyboard with a
  visible focus ring, errors read out by screen readers, and reduced animation for people who ask for it.
- **Security headers** (Netlify only): pages may only load their own scripts, styles and images, and cannot be embedded in other sites.

## 5. Deviations List
| # | Deviation | Why | Effect / follow-up |
| :--- | :--- | :--- | :--- |
| 1 | Canonical and share links use the placeholder `https://brandstore.example` until deployment | The real address is only known after deploying | Run `node scripts/set-site-url.js <url>`; `node qa/preflight.js --release` fails until this is done |
| 2 | The 404 page shows correctly only for unknown addresses at the site root | Assets use relative paths so the site also works from a folder and on GitHub Pages | A deep wrong address such as `/a/b` shows the text without styling; fix with root-relative paths once the host is fixed |
| 3 | Phones and tablet were tested by emulation in Chrome, not on real devices | No real devices or other browsers in the build environment | Real-device, Firefox and Safari/Edge rows are pending (section 6) |
| 4 | Our own accessibility/SEO audit stands in for Lighthouse and axe until they are run on the live site | Those tools were not available offline | Results in section 7 are pending; the audit is not reported as Lighthouse or axe |

## 6. QA Matrix (browser x viewport)
Each row runs the same script (`node qa/matrix.js`): loads without console errors, no sideways scrolling, three products,
quotes, menu or links, filter, deals buttons, newsletter error and success, skip link, comparison table, 404 page.

| Browser | Viewport / device | Result | Notes |
| :--- | :--- | :--- | :--- |
| Chrome 153 | Desktop 1440x900 | PASS | Measured |
| Chrome 153 | Laptop 1024x768 | PASS | Measured |
| Chrome 153 | Tablet 768x1024 (iPad Mini profile) | PASS | Measured, emulated |
| Chrome 153 | Phone 375x667 (iPhone SE profile) | PASS | Measured, emulated |
| Chrome 153 | Phone 390x844 (iPhone 13 profile) | PASS | Measured, emulated |
| Chrome 153 | Phone 412x915 (Pixel 7 profile) | PASS | Measured, emulated |
| Firefox | Desktop | Pending | Owner runs on the live site |
| Safari or Edge | Desktop | Pending | Owner runs on the live site |
| Real phone | Owner's phone | Pending | Owner runs on the live site |

## 7. Lighthouse and axe Results
| Tool | Page | Result |
| :--- | :--- | :--- |
| Lighthouse (mobile): Performance / Accessibility / Best Practices / SEO | landing, comparison | Pending: run on the live URL |
| axe DevTools: Critical / Serious / Moderate / Minor | landing, comparison | Pending: run on the live URL |
| Screen reader (NVDA, VoiceOver or TalkBack) | landing | Pending: script in `docs/RUNBOOK.md` |
| Own offline audit `node qa/preflight.js` (not Lighthouse or axe) | all three pages | 163 of 163 checks pass (166 after the real URL is set) |
| Text contrast audit `node qa/contrast.js` | landing | Lowest ratio 5.02:1; the standard asks for 4.5:1 |

Targets: Lighthouse Accessibility and SEO at least 90; axe shows no Critical issue.

## 8. Bug Found and Fixed During QA
**Symptom:** with the browser's text size at 200%, the last links in the top menu were cut off at the right edge on desktop
widths, so a visitor could not read or click them. **Found by:** the audit that enlarges text. **Cause:** the menu was a single
row that could not wrap. **Fix:** the header and menu now wrap onto a second line. **Check:** a screenshot at 200% shows every link,
and the layout, keyboard and audit checks still pass. Two smaller fixes are listed in `CHANGELOG.md`.

## 9. Limitations
- Sign-up is simulated: no emails are collected. The products are three sample items, not a catalogue.
- The security headers only apply on Netlify; GitHub Pages ignores them.
- Pixel-level match to the Figma design was not measured.

## 10. Next Steps
1. Deploy, set the real URL, then run Lighthouse, axe and the screen-reader pass and replace each "Pending" with the result.
2. Make asset paths root-relative so the 404 page is styled for any mistyped address.
3. Connect the sign-up to a real email service and the products to a data source.
4. Add checkout, product detail pages, and analytics with a cookie notice.
