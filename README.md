# BrandStore — E-Commerce Storefront (Tasks 1–5)

**Launch report (Task 5): [`LAUNCH_REPORT.md`](LAUNCH_REPORT.md) / `LAUNCH_REPORT.pdf`. Release: `v1.0.1` ([`CHANGELOG.md`](CHANGELOG.md)).**

A static HTML5 / CSS3 / vanilla JavaScript storefront: the build plan and layout architecture (Tasks 1–2) the visual-polish, interaction-state and motion pass (Task 3), and the JavaScript interactivity, data-driven sections and form validation (Task 4). Sections 1–6 describe the pages and layout; sections 7–15 cover routes, CSS methodology, states, motion, keyboard operation, deviations, QA evidence and deliverables; sections 16–19 cover the JavaScript; sections 20–25 cover the accessibility, SEO, QA and deployment work of Task 5.

## 1. Scope & Overview
- **Pages built:**
  - `index.html` — skip link, header and navigation, hero with a positioned offer badge, four category cards (each links to the featured grid, pre-filtered when a matching filter exists), a category filter and three featured products (rendered from `js/data.js`), a deals strip of six promo offers with previous/next controls, two testimonials (rendered from `js/data.js`), a newsletter form with specific, announced client-side validation, and the footer.
  - `comparison.html` — header and navigation, page intro with a "Highlight Differences" toggle, a semantic comparison `<table>` (`<caption>`, `<thead>`, `<tbody>`, `<th scope="col|row">`; 6 specification rows x 3 products), and the footer.
- **Explicit scope exclusion:** backend work (server APIs, database persistence, authentication, payments) is excluded. The newsletter form is validated and answered in the browser only; it makes no network request. The data-driven sections come from JavaScript arrays, not from a server.

---

## 2. Page & Section Inventory with Semantic Justifications

| Page | Section | Semantic element(s) | Justification |
| :--- | :--- | :--- | :--- |
| **Both** | Skip link | `<a href="#main-content">` | First focusable element; moves keyboard users past the header to `<main tabindex="-1">`. |
| **Both** | Header & Nav | `<header>`, `<nav>`, `<ul>`, `<button>` | Banner landmark; the nav wraps the link list and the menu toggle (`aria-expanded`, `aria-controls`). |
| **Landing** | Hero | `<section>`, `<figure>` | Introductory banner with the page's single `<h1>`, two calls to action and a responsive illustration. |
| **Landing** | Category cards | `<section>`, `<article>`, `<a>` | Four self-contained merchandising cards; each card is one block link. |
| **Landing** | Featured products | `<section>`, `<article>`, `role="group"` | Product cards (created by `js/render.js` from `js/data.js`) with `<img srcset sizes width height>`; the filter buttons are a labelled group using `aria-pressed`, and a `role="status"` line announces the result count. |
| **Landing** | Deals strip | `<section>`, `<ul>`, `role="group"`, `role="region"` | Six offers are a list (`<ul>/<li>`). The scrolling area is a labelled, focusable region with previous/next buttons (`aria-controls`). |
| **Landing** | Testimonials | `<section>`, `<article>`, `<blockquote>`, `<cite>` | Quotes with attribution, created from `js/data.js`. |
| **Landing** | Newsletter | `<section>`, `<form>`, `<label>` | Email field with `required`, `minlength`, `maxlength`, `autocomplete`; the hint and the error are linked by `aria-describedby`; an alert region carries errors and a status region carries success. |
| **Comparison** | Table | `<main>`, `<table>`, `<caption>`, `<th scope>` | True two-dimensional data; scrolls horizontally inside a labelled region on narrow screens. |
| **Both** | Footer | `<footer>`, `<nav>` | Contentinfo landmark with a second labelled navigation. |

---

## 3. Layout Strategy: CSS Grid vs. Flexbox (With Reasons Stated)

| Component | Model | Reason |
| :--- | :--- | :--- |
| Site header (`.site-header__inner`) | **Flexbox** | One-dimensional strip: logo left, navigation right (`justify-content: space-between`). |
| Navigation list (`.nav__list`) | **Flexbox** | One axis: a column dropdown on mobile, a row from 1024px. |
| Hero action row (`.hero__actions`), filter (`.filter`) | **Flexbox** + `flex-wrap` | A row of buttons that wraps on a 375px screen. |
| Product card (`.product-card`) | **Flexbox** (column) | Stacks media and body; `margin-top: auto` pins the price and button to the bottom so cards in a row align. |
| Deals header (`.deals__header`), controls (`.deals__controls`) | **Flexbox** | Title block and the two buttons on one axis, wrapping under the title on narrow screens. |
| Deals track (`.deals__track`) | **Flexbox** (row, scroll-snap) | A single horizontal run of items; sizing via `--deals-visible`. |
| Newsletter form (`.newsletter__form`) | **Flexbox** | Input and button stacked on mobile, side by side from 768px. |
| Footer (`.site-footer__inner`, `.footer-nav__list`) | **Flexbox** | One-dimensional bars. |
| Hero split (`.hero__inner`) | **CSS Grid** | Two named columns (`1.15fr / 0.85fr`) from 1024px, one column below. |
| Categories, products, testimonials (`.grid--*`) | **CSS Grid** | Two-dimensional card matrices; columns are set by `--grid-columns` (1 -> 2 -> 4 for categories, 1 -> 2 -> 3 for products, 1 -> 2 for testimonials). |

---

## 4. Custom Properties, Box Model, Positioning, Fluid Type & Responsive Images
- **Custom properties** (`css/base.css`, 110 declared): colour, spacing, type scale, weights, leading, radii, shadows, z-index layers, motion durations/easing, sizes. Rules elsewhere only reference `var(--token)`.
- **Box model:** global `box-sizing: border-box` with margin/padding reset; `.container` is `width: 100%; max-width: var(--container-max)` with token padding.
- **Positioning:** `.site-header` is `position: sticky`. `.product-card__media` and `.hero__media` are `position: relative`, anchoring the absolutely positioned `.product-card__badge` and `.hero__badge` (`top`/`left` or `right` from `--space-sm`).
- **Fluid typography:** `--text-h1`, `--text-h2`, `--text-h3`, `--text-base`, `--text-lg` use `clamp()`.
- **Responsive images:** every `<img>` has `src`, `srcset` (`400w/800w` or `600w/1200w`), `sizes`, intrinsic `width`/`height` (no layout shift) and `max-width: 100%; height: auto`.

---

## 5. Responsive Breakpoints
`375px` (base, mobile small), `768px` (tablet), `1024px` (desktop, desktop navigation), `1440px` (wide, larger container padding). Media queries are written mobile-first as `min-width` in `em`: `48em`, `64em`, `90em`. Whether each page overflows at those widths is recorded in the QA matrix (section 13), not asserted here.

---

## 6. Clarifying Questions & Scope Limitations
### Clarifying questions
1. Should prices stay fixed in USD or support a client-side currency toggle (USD / AED / EUR)?
2. How many products should the comparison table support in future (fixed 3, or up to 5)?
3. Which email service provider will receive newsletter submissions once backend work begins?

### Scope limitations
1. **No backend:** no authentication, database, checkout or payment processing.
2. **Static catalogue:** products and testimonials live in `js/data.js`; the six promo codes (`LAUNCH20`, `SHIPFREE`, `BUNDLE10`, `WELCOME5`, `CARRY15`, `CARE3`) are static content in the HTML; no code is validated.

---

## 7. Routes (Endpoint Table)
This is a static front end, so there are no API endpoints. The table lists every page and in-page route.

| Route | File / target | Type | Notes |
| :--- | :--- | :--- | :--- |
| `/index.html` | `index.html` | Page | Landing page. |
| `/comparison.html` | `comparison.html` | Page | Product comparison. |
| `/index.html#categories` | `<section id="categories">` | Anchor | Nav link. |
| `/index.html#featured` | `<section id="featured">` | Anchor | Nav link, hero button, category cards. |
| `/index.html#deals` | `<section id="deals">` | Anchor | Nav link. |
| `/index.html#testimonials` | `<section id="testimonials">` | Anchor | Nav link (landing page only). |
| `/index.html#newsletter` | `<section id="newsletter">` | Anchor | Footer link. |
| `#main-content` | `<main id="main-content" tabindex="-1">` | Anchor | Skip link and "Back to Top" on both pages. |
| `/404.html` | `404.html` | Page | Not-found page (Netlify serves it for unknown paths; `noindex`). Added in Task 5. |
| `/robots.txt`, `/sitemap.xml` | same names | Crawler files | Added in Task 5; sitemap lists the two indexable pages. |
| Newsletter form | `action="#" method="POST"` | Form | `submit` is intercepted by `js/newsletter.js` (`preventDefault`); no request is sent. |
| API / backend endpoints | none | n/a | Out of scope (section 6). |

---

## 8. Task 3 — CSS Architecture & Methodology

### 8.1 Stated methodology
- **Naming: BEM** (`.block`, `.block__element`, `.block--modifier`). One block per component; selectors are single classes, so specificity stays flat.
- **State is expressed with the attribute that already describes it to assistive technology** and never with a free-floating class: `aria-expanded` (menu), `aria-pressed` (filter, diff toggle), `aria-current` (+ `.nav__link--current`), `aria-invalid` (email), `aria-disabled` / `disabled`, the `hidden` attribute (filtered cards, deals controls before JS runs). JavaScript flips those attributes (and renders the data-driven cards); CSS owns every visual change.
- **Utilities** carry a `u-` prefix (`.u-visually-hidden`).
- **Files are split by responsibility and loaded in cascade order:**

| Order | File | Contains |
| :--- | :--- | :--- |
| 1 | `css/base.css` | Design tokens (`:root`), reset, element defaults, global `:focus-visible` ring, reduced-motion token overrides |
| 2 | `css/layout.css` | `.container`, `.site-header`, `.site-footer`, `.section`, `.grid` and its breakpoint column counts |
| 3 | `css/components.css` | One BEM block per component (skip link, logo, nav, button, hero, category card, filter, product card, deals, testimonial, newsletter, footer nav, page header, table) |
| 4 | `css/utilities.css` | `.u-visually-hidden`, loaded last so it always wins |

### 8.2 Task 2 class names -> BEM
| Task 2 | Task 3 |
| :--- | :--- |
| `.header-container` | `.site-header__inner` |
| `.main-nav`, `.nav-toggle`, `.nav-list`, `a.active` | `.nav`, `.nav__toggle`, `.nav__list`, `.nav__link--current` |
| `.hero-layout`, `.hero-content`, `.hero-eyebrow`, `.hero-actions`, `.hero-media`, `.hero-overlay-badge`, `.hero-image` | `.hero__inner`, `.hero__content`, `.hero__eyebrow`, `.hero__actions`, `.hero__media`, `.hero__badge`, `.hero__image` |
| `.btn-primary`, `.btn-outline`, `.btn-secondary` | `.btn--primary`, `.btn--outline`, `.btn--secondary` |
| `.categories-section`, `.featured-section`, `.testimonials-section` | `.section`, `.section--surface`, `.section__title` |
| `.category-grid`, `.product-grid`, `.testimonial-grid` | `.grid.grid--categories`, `.grid.grid--products`, `.grid.grid--testimonials` |
| `.filter-bar`, `.filter-btn.active` | `.filter`, `.filter__btn[aria-pressed="true"]` |
| `.product-media`, `.product-badge.badge-new`, `.product-body`, `.category-tag`, `.price` | `.product-card__media`, `.product-card__badge--new`, `.product-card__body`, `.product-card__tag`, `.product-card__price` |
| `.deals-strip`, `.deals-content`, `.promo-pill` | `.deals`, `.deals__header`, `.deals__controls`, `.deals__control`, `.deals__viewport`, `.deals__track`, `.deals__item`, `.deals__code` |
| `.testimonial-card` | `.testimonial` |
| `.newsletter-form`, `.form-field`, `.newsletter-hint`, `.newsletter-feedback` | `.newsletter__form`, `.newsletter__field`, `.newsletter__hint`, `.newsletter__feedback--error` / `--success` |
| `.footer-container`, `.footer-links` | `.site-footer__inner`, `.footer-nav__list` |
| `.table-wrapper`, `tr.diff-highlight` | `.table-scroll`, `.comparison-table__row--diff` |
| `.visually-hidden`, `.product-card.hidden` | `.u-visually-hidden`, `hidden` attribute |

### 8.3 Custom properties and "no magic numbers"
Every colour, length, weight, line-height, duration, easing, shadow, radius and z-index is declared once in `:root` and referenced with `var()`. `node qa/tokens.js` checks this: every `var()` resolves, and no colour, length or time literal appears outside `:root` (0, `100%`, `1fr` and media-query bounds are structural and allowed). Three component-scoped counters hold plain numbers on purpose and are excluded from the scan: `--grid-columns`, `--deals-visible` (offers visible; the fraction, e.g. `1.25`, leaves a deliberate peek of the next card) and `--enter-order` (stagger position).

Breakpoints are the one repeated literal: custom properties cannot be read inside `@media`, so `48em`, `64em` and `90em` are written out and documented in `base.css`.

### 8.4 How this maps to a larger project
**Sass partials (7-1 style).** The four files are already the folders; each comment-delimited block becomes one partial, and BEM nests with `&`:

```text
scss/
  abstracts/  _breakpoints.scss   (three media-query values + an mq() mixin)
  base/       _tokens.scss  _reset.scss  _elements.scss  _focus.scss
  layout/     _container.scss  _site-header.scss  _site-footer.scss  _section.scss  _grid.scss
  components/ _button.scss  _nav.scss  _hero.scss  _category-card.scss  _product-card.scss
              _filter.scss  _deals.scss  _testimonial.scss  _newsletter.scss  _comparison-table.scss
  utilities/  _helpers.scss
  main.scss   (@use base -> layout -> components -> utilities, same order as the <link> tags)
```

```scss
.btn {
  &--primary { ... }      // .btn--primary
  &:disabled { ... }
}
```

Runtime values (colour, spacing, motion) stay CSS custom properties so theming and `prefers-reduced-motion` still work without a rebuild; Sass variables are used only where CSS cannot (media queries).

**CSS Modules (component frameworks).** Each BEM block becomes one module file beside its component; the block name is replaced by the file scope, so elements and modifiers drop the prefix:

| Here | CSS Modules |
| :--- | :--- |
| `css/base.css` | global stylesheet imported once |
| `.product-card` | `ProductCard.module.css` -> `.root` |
| `.product-card__badge` | `.badge` |
| `.product-card__badge--new` | `.badge` + `.badgeNew` (or `composes: badge`) |
| `.btn.btn--secondary` | `Button.module.css` -> `.root`, `.secondary`, chosen by a `variant` prop |
| `.u-visually-hidden` | shared utilities module used with `composes` |

---

## 9. Interactive States
Order inside every block: default, `:hover`, `:focus-visible`, `:active`, then `:disabled` / `:invalid` / ARIA state.

| Element | `:hover` | `:focus-visible` | `:active` | Other states |
| :--- | :--- | :--- | :--- | :--- |
| Skip link | — | slides into view + ring | — | — |
| Logo | darker blue | ring | deepest blue | — |
| Menu toggle | blue border, soft fill | ring | tint fill | `aria-expanded="true"`: bars morph to a close icon |
| Nav link | brand colour + underline grows | ring + underline | deeper blue | current page keeps the underline (not colour alone) |
| `.btn--primary` | soft fill + shadow | ring (white on dark/coloured sections) | tint fill, 1px press | `:disabled` grey, `not-allowed` |
| `.btn--outline` | solid border + light veil | white ring | dark veil, press | `:disabled` |
| `.btn--secondary` | darker blue + shadow | ring | deepest blue, press | `aria-pressed="true"`, `:disabled` |
| Category card (one block link) | lift, blue border, blue title | ring drawn around the whole card | lift released | — |
| Filter button | soft fill, blue border | ring | tint, press | `aria-pressed="true"` filled, `:disabled` |
| Product card | lift + shadow + blue border | border turns blue when a control inside has focus | — | `hidden` when filtered out; result count announced in `#filter-status` |
| Deals previous/next | stronger border and fill | white ring | darker fill, press | `aria-disabled="true"` at either end (stays focusable) |
| Deals scroll region | — | white ring | — | arrow keys scroll it natively |
| Email field | blue border | ring + blue border | deeper border | invalid (`aria-invalid`): red border + outer ring + specific message in the alert region; styled placeholder |
| Footer link | blue + underline | ring | deeper blue | — |
| Comparison row | row tint | ring on the scroll region | — | `--diff` highlights differing rows |

- **Focus:** one global `:focus-visible` rule (3px ring, 2px offset) with an `@supports` fallback to `:focus`. On the hero, deals and newsletter backgrounds the ring colour token becomes white.
- **Invalid:** a required empty field is technically `:invalid` on first paint, so the error style appears only after the user typed and left the field, or tried to submit (`aria-invalid="true"`), and is always paired with a text message in the `role="status"` region.
- **Disabled vs `aria-disabled`:** the Subscribe button uses `disabled` (it is re-enabled when the user types). The deals buttons use `aria-disabled` so the button a keyboard user just pressed never drops out of the tab order at the end of the strip.

---

## 10. Motion

| # | Animation | Where | Purpose |
| :--- | :--- | :--- | :--- |
| 1 | Hero entrance (`enter-up` / `enter-scale`, 500ms, 80ms stagger) | `.hero__eyebrow` -> `__title` -> `__lead` -> `__actions`, then `.hero__media` | Leads the eye in reading order on first paint; plays once. |
| 2 | Card hover lift (`translateY(-0.25rem)` + shadow, 200ms) | `.category-card`, `.product-card` | Confirms which card is under the pointer. Inside `@media (hover: hover)` so touch screens never keep a raised card. |
| 3 | Scroll snapping (`scroll-snap-type: x mandatory`) + previous/next buttons | `.deals__viewport` | A swipe or button press settles on a whole offer. |

Supporting transitions (150–200ms, shared `--transition-*` tokens): nav underline and colour, mobile menu fade/slide and icon morph, buttons, filter, form field, table row tint, skip link.

**`prefers-reduced-motion: reduce`:** the duration, stagger, lift, press and entrance-distance tokens are zeroed in one `:root` override, so transitions become instant and nothing moves; the hero keyframes and `scroll-behavior: smooth` exist only inside `prefers-reduced-motion: no-preference`; the deals buttons scroll with `behavior: 'auto'` instead of `'smooth'`. Colour, border and underline feedback is kept; only movement is removed. Measured in section 13.

---

## 11. Keyboard Operation & Focus Order
Tab order follows DOM order, which matches visual order. Tab stops, measured in section 13:

| Page / width | Stops (in order) |
| :--- | :--- |
| `index` 375px (23) | skip link, logo, menu toggle, Shop Featured, Compare Models, 4 category cards, 3 filter buttons, 3 Compare Specs, deals previous, deals next, deals region, email, Subscribe, 3 footer links |
| `index` 1280px (28) | as above with the 6 nav links in place of the menu toggle |
| `comparison` 375px (8) | skip link, logo, menu toggle, Highlight Differences, table region, 3 footer links |
| `comparison` 1280px (11) | skip link, logo, 5 nav links, Highlight Differences, 3 footer links (the table region joins the order only when it overflows) |

- **Skip link:** first stop, slides into view on focus; Enter moves focus to `<main id="main-content" tabindex="-1">`, and the next Tab lands on the first control in the page content, not back in the header. `main` shows no ring because it is a programmatic target, not a control.
- **Deals strip:** Previous / Next are real buttons in the tab order, operable with Enter and Space; they step one offer, stay focused at the ends (`aria-disabled`), and are hidden until the script confirms the strip overflows. The scroll region itself is focusable, so arrow keys also scroll it.
- **Mobile menu:** Enter/Space on the toggle opens it; closed links are `visibility: hidden`, so they are not focusable; Escape closes it and returns focus to the toggle; choosing a link closes it.
- **No traps:** Tab leaves the document after the last stop and Shift+Tab returns to it.
- **Scroll regions** (`tabindex="0"`) are focusable only while their content overflows, so wide screens get no empty tab stop.
- **Without JavaScript:** navigation stays visible as a wrapping row (the collapsed menu applies only when `js/boot.js` added the `js` class), and the data-driven sections show a `<noscript>` note.

---

## 12. Deviations From the Design (With UI/UX Reasons)
The Figma file and brand guideline were not available to this workspace, so "the design" here means the Task 2 build and the brief; compare against the real file before submitting.

| # | Deviation | Reason |
| :--- | :--- | :--- |
| 1 | Deals strip is a snapping row of six offer cards with previous/next buttons instead of one banner. | Shows several offers without adding page height on mobile; the partly visible next card signals that it scrolls, and the buttons give keyboard and mouse users the same access as a swipe. |
| 2 | Focus ring is white on the hero, deals and newsletter sections, blue elsewhere. | A single blue ring has too little contrast on blue and dark backgrounds (WCAG 2.4.7 / 1.4.11). |
| 3 | Control borders (filter, menu toggle, email field) are `#6b7280`, darker than the `#e5e7eb` card border. | Control boundaries need 3:1 against the surface (WCAG 1.4.11): 4.83:1 vs 1.24:1, measured. |
| 4 | Every interactive element is at least 44px tall (logo and skip link were raised to this too). | Comfortable touch target on a 375px screen. |
| 5 | Hero eyebrow uses a dark veil and the hero lead is white. | The earlier light veil (3.89:1) and pale-blue lead (4.24:1) were below 4.5:1 against the lightest part of the gradient. |
| 6 | Hover lift is 4px, applies only on hover-capable devices, no scaling. | Avoids sticky hover on touch and blurry text from scaling. |
| 7 | Current nav item and hover use an underline as well as colour. | State must not rely on colour alone (WCAG 1.4.1). |
| 8 | Whole category card is one link that jumps to the (pre-filtered) featured grid. | A card that lifts on hover must act; a larger target is easier to hit. |
| 9 | Hamburger is drawn in CSS and morphs to a close icon. | Shows the open state visually and matches `aria-expanded`. |
| 10 | Invalid email styling waits for interaction and is paired with inline text instead of the browser bubble. | Red on an untouched field reads as an error the user has not made; inline text persists and is announced. |
| 11 | System font stack kept instead of a brand web font. | No download or layout shift; the type scale is tokenised so a brand font drops into `--font-sans`. |
| 12 | Entrance animation only on the hero; no scroll-triggered reveals. | Motion is kept for moments that help; content that animates on every scroll delays reading. |
| 13 | Navigation shows as a wrapping row when JavaScript is unavailable. | The menu must stay reachable if the script fails. |
| 14 | Hero illustration SVGs had an unescaped `&` (invalid XML), so the browser showed alt text; fixed. | A broken hero image is the most visible defect on the page. |
| 15 | Featured products and testimonials need JavaScript; a `<noscript>` note replaces them. | The Task 4 brief requires data-driven rendering; the note keeps the page honest and points to the comparison page. |
| 16 | Newsletter errors are written sentences instead of the browser's validation bubble. | Bubble wording differs per browser and language and is not announced consistently; the sentences say what to do and go through a live region. |

---

## 13. QA Matrix & Evidence
**Legend.** *Measured* = produced by the script named, run in this workspace on 2026-11-12 in headless Chromium (Playwright), reproducible from `qa/`. *Reasoned* = follows from the code but was not run. *Not measured* = not done.

| # | Check | Result | Evidence |
| :--- | :--- | :--- | :--- |
| 1 | No horizontal overflow, 2 pages x 375 / 768 / 1024 / 1440px | 8 of 8 pass (`scrollWidth` = `clientWidth`) | *Measured* — `node qa/layout.js` |
| 2 | Interactive targets at least 44px (every link, button, input, scroll region) | 0 below 44px on both pages at 375 and 1280px | *Measured* — `node qa/layout.js` |
| 3 | Tab order, focus ring on every stop, nothing off-screen when focused, no trap | 23 / 28 / 8 / 11 stops (section 11), 0 failures | *Measured* — `node qa/keyboard.js` |
| 4 | Skip link works | First stop, visible on focus; Enter focuses `main`; next Tab is in-page content; both pages | *Measured* — `node qa/keyboard.js` |
| 5 | Deals previous/next by keyboard | Enter and Space move forward to the last offer and back to the first; focus stays on the button at the ends; checked at 375px, 1280px and 1280px with reduced motion | *Measured* — `node qa/keyboard.js` |
| 6 | Mobile menu by keyboard | Opens with Enter; closed links not focusable; Escape closes and returns focus to the toggle | *Measured* — `node qa/keyboard.js` |
| 7 | Reduced motion | Hero `animation-name: none`, transitions `0s`, `scroll-behavior: auto` | *Measured* — `node qa/layout.js` |
| 8 | Text contrast, rendered DOM | 260 text nodes, lowest 5.02:1, 0 below threshold (4.5:1, or 3:1 for large text). Excludes visually-hidden text and disabled controls (exempt). Gradient text is checked against both gradient ends. | *Measured* — `node qa/contrast.js` |
| 9 | Non-text and message contrast | Control border 4.83:1 on white; focus ring 5.17:1 (blue on white), 5.02:1 (white on `#b45309`), 17.74:1 (white on `#111827`); newsletter error text 9.35:1 and success text 12.63:1 on `#111827` | *Measured* — computed from the token values |
| 10 | Stylesheet tokens | 110 custom properties; every `var()` resolves; 0 colour/length/time literals outside `:root` | *Measured* — `node qa/tokens.js` |
| 11 | Data-driven rendering | Product names, prices, categories and testimonials in the DOM equal `js/data.js`; filter buttons derived from the categories; the HTML source contains no product or testimonial text; no console errors on either page | *Measured* — `node qa/behaviour.js` |
| 12 | Text safety | Markup-looking strings in the data (`<img onerror>`, `<script>`) are shown as literal text with 0 child elements and nothing runs (checked on a temporary copy with hostile data) | *Measured* — `node qa/behaviour.js` |
| 13 | JavaScript source rules | 0 inline handlers, `javascript:` URLs or inline script bodies in both pages; 0 uses of `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`; 46 named functions all commented; 12 files all with a header comment | *Measured* — `node qa/js-rules.js` |
| 14 | Filter | Accessories 1 of 3, Electronics 2 of 3, All 3, with the matching `aria-pressed` and status sentence; operable with Enter; category cards pre-filter, and a category with no products shows all | *Measured* — `node qa/behaviour.js` |
| 15 | Mobile menu `aria-expanded` | Enter and Space open (true); Escape closes (false) and refocuses the button; click outside closes; growing to desktop resets to false | *Measured* — `node qa/behaviour.js` |
| 16 | Email validator | 13 input cases return the expected message (section 16.3) | *Measured* — `node qa/behaviour.js` |
| 17 | Newsletter form behaviour | Invalid: specific message visible in a `role="alert"` region, `aria-invalid`, `aria-describedby`, focus on the field. Fixing clears it at once. Valid: `role="status"` success, field cleared, button "Subscribed" and disabled; typing re-enables. The same error twice causes new live-region mutations. | *Measured* — `node qa/behaviour.js` |
| 18 | Regression for the debugged bug | No stale error after a success or after a correction inside the 50ms window | *Measured* — `node qa/behaviour.js`; session in `node qa/debug-newsletter.js` |
| 19 | Layout shift from script rendering | Cumulative Layout Shift 0 at 375px and 1280px, at normal speed and with the CPU slowed 6x | *Measured* — `node qa/cls.js` |
| 20 | Comparison table toggle | "Highlight Differences" marks 6 rows and sets `aria-pressed` | *Measured* — `node qa/behaviour.js` |
| 21 | Firefox, Safari, Edge, real phones and tablets | Chrome rows only; see section 22 | *Not measured* (Chrome emulation is *measured*, section 22) |
| 22 | Screen reader pass (NVDA, VoiceOver, TalkBack): what is actually spoken for the alert, status and filter regions | — | *Not measured*; the roles and ids are *measured*, the announcements are *reasoned* from them |
| 23 | axe DevTools and Lighthouse runs | — | *Not measured* |
| 24 | Pixel comparison with the Figma design | — | *Not measured* (design file not available here) |
| 25 | Live deployment | — | *Not measured*; the site is static, no build step, and deploys as is to GitHub Pages or Netlify |

Run the checks: `npm i -D playwright`, then `node qa/js-rules.js && node qa/tokens.js && node qa/layout.js && node qa/keyboard.js && node qa/contrast.js && node qa/behaviour.js && node qa/cls.js` from the project root (`node qa/debug-newsletter.js` prints the debugger session). Results above are from 2026-11-12 in headless Chromium.

---

## 14. Deliverables & Consistency
| Deliverable | Where | Notes |
| :--- | :--- | :--- |
| Repository | this folder, `.git` included | Tasks 1–5 history; release tags `v1.0.0` and `v1.0.1` with `CHANGELOG.md`. Task 5 commits add the SEO files, the 404 page, security headers, three QA scripts and the launch report. |
| Report | `LAUNCH_REPORT.md` / `LAUNCH_REPORT.pdf` (Task 5 launch report, 2 pages), `README.md` (this file) and `task_1_build_plan.md` | The launch report has the endpoint table, SEO summary, deviations list, QA matrix and results; `task_1_build_plan.md` is sections 1–6 of this file, word for word. |
| Demo | static site, deployable as is (`docs/RUNBOOK.md`) | Live URL pending deployment; the same URL goes in the report header and the assessment form. |
| Deck | not part of this task (not requested in the Task 5 brief) | — |

Figures used across the files and kept in sync: 2 pages (plus a 404 page), 4 categories, 3 products, 6 offers, 2 testimonials, 6 comparison rows, 4 breakpoints, 3 animations, 4 CSS files, 12 JS files, 46 commented functions, 11 QA scripts, 3 HTML pages (2 content + 404).

## 15. Project Structure
```text
index.html            landing page
comparison.html       product comparison page
css/base.css          tokens, reset, element defaults, focus, motion policy
css/layout.css        container, header/footer bars, sections, grid
css/components.css    BEM components and their states
css/utilities.css     u- helpers
js/boot.js            adds the `js` class in <head>
js/app.js             BrandStore.register / start
js/dom.js             el(), clear(), qs(), qsa() (textContent only)
js/data.js            products and testimonials
js/render.js          builds product cards, filter buttons, testimonials
js/filter.js          category filter + announced result count
js/nav.js             mobile menu, aria-expanded
js/newsletter.js      validation and accessible messages
js/deals.js           previous / next controls
js/regions.js         focusable scroll regions
js/table.js           comparison highlight
js/main.js            starts the registered features
assets/               responsive SVG illustrations
qa/                   reproducible checks (js-rules, tokens, layout, keyboard, contrast, behaviour, cls, debug-newsletter, preflight, headers, matrix)
404.html              not-found page (noindex)
netlify.toml          publish dir and security headers (Netlify only)
robots.txt, sitemap.xml, favicon.svg, apple-touch-icon.png, og-image.png, .nojekyll
scripts/set-site-url.js  replaces the placeholder host with the deployed URL
docs/RUNBOOK.md       steps only the owner can run (deploy, Lighthouse, axe, screen reader)
LAUNCH_REPORT.md      the 1–2 page report for stakeholders
```

---

## 16. Task 4 — JavaScript Interactivity, Data-Driven Sections & Form Validation

### 16.1 Success criteria and where each is checked
| Criterion | How it is met | Evidence |
| :--- | :--- | :--- |
| No inline `onclick` / `onchange` handlers in the markup | Every listener is attached with `addEventListener` in `js/`. The HTML has no `on*=` attribute, no `javascript:` link and no inline `<script>` body (the `js` class that an inline script used to add now comes from `js/boot.js`). | *Measured* — `node qa/js-rules.js` |
| Featured products and testimonials render from data arrays via created elements | `js/data.js` holds `products` and `testimonials`; `js/render.js` builds the cards with `createElement` through the `dom.el()` helper. `index.html` holds only empty containers (`#product-filter`, `#product-grid`, `#testimonial-grid`). The filter buttons are derived from the product categories. | *Measured* — `node qa/behaviour.js` (the DOM equals the data; the HTML source contains no product or testimonial text) |
| Form messages are visible, specific and announced (aria-live) | `js/newsletter.js` gives one specific sentence per problem (16.3). Errors go to a `role="alert"` region and success to a `role="status"` region, both present in the HTML from the start so announcements work. | Text, visibility, roles and focus *measured*. What a screen reader actually says is *reasoned*, not tested (section 13). |
| Navigation toggle and strip controls work with the keyboard | Toggle: Enter and Space open it, Escape closes it and returns focus, and `aria-expanded` always matches. Deals strip: Previous/Next are real buttons. | *Measured* — `node qa/behaviour.js`, `node qa/keyboard.js` |
| Code is organised into named functions with comments explaining intent | 12 files, 46 named functions, each with a comment directly above it, and a header comment per file (16.4). | *Measured* — `node qa/js-rules.js` |
| **v1.1** Data-driven text inserted with `textContent`, never `innerHTML` | `dom.el()` sets text with `textContent` and text nodes only. No file in `js/` uses `innerHTML`, `outerHTML`, `insertAdjacentHTML` or `document.write`. A probe puts `<img onerror=...>` and `<script>` into the data and confirms they are shown as literal text and nothing runs. | *Measured* — `node qa/js-rules.js`, `node qa/behaviour.js` |
| **v1.1** Debugger used to diagnose at least one bug, documented | Section 18. | *Measured* — `node qa/debug-newsletter.js` |

### 16.2 Architecture
No build tools and no ES modules, so the site also opens straight from the file system. Each file is a small IIFE (`'use strict'`) that plugs into one namespace, `window.BrandStore`:

- `js/boot.js` runs in `<head>` and adds the `js` class before first paint.
- `js/app.js` defines `BrandStore.register(name, init)` and `BrandStore.start()`.
- Feature files register an `init` function. **Each page chooses its features by choosing its `<script defer>` tags**: `index.html` loads dom, data, render, filter, nav, newsletter, deals and regions; `comparison.html` loads dom, nav, regions and table.
- `js/main.js` is loaded last and calls `BrandStore.start()`, which runs the `init` functions in load order. A feature that throws is logged and skipped, so it cannot stop the others.
- Every `init` looks for its own elements first and returns quietly when the page does not have them.

Data flow for the featured section: `data.products` -> `isProduct()` drops malformed entries -> `createProductCard()` builds `article > (media, body)` -> `renderProducts()` appends into `#product-grid`; `renderFilterButtons()` appends "All Products" plus one button per distinct category. Editing a product means editing an object in `js/data.js`; no HTML changes are needed.

Without JavaScript the containers stay empty and a `<noscript>` note links to the comparison page, which still lists every product.

### 16.3 Newsletter validation
Validation runs on submit. The browser's own bubbles are switched off (`noValidate`, set by the script so the browser still validates normally if the script fails) because their wording differs per browser and language. `getEmailError()` returns the first problem as a sentence that says what to do:

| Input | Message |
| :--- | :--- |
| empty or only spaces | Enter your email address. |
| `abc` | Add an “@” to the email address, like name@example.com. |
| `a@@b.com` | Use only one “@” in the email address. |
| `a b@c.com` | Remove the spaces from the email address. |
| `@b.com` | Add the part before the “@”, like name. |
| `a<b@c.com` | The part before the “@” can only use letters, numbers and . _ % + ' - |
| `a@` | Add the part after the “@”, like example.com. |
| `a@b` | The part after the “@” needs a dot, like example.com. |
| `a@b..com`, `a@b.com.` | Check the domain after the “@”: no empty parts between dots and no unusual characters. |
| more than 120 characters | That address is too long. Use 120 characters or fewer. |
| a valid address | Thanks for subscribing! We sent a confirmation to name@example.com. |

Accessibility behaviour:
- **Error:** the text goes into `#newsletter-error` (`role="alert"`), the field gets `aria-invalid="true"`, the field is already linked to the message by `aria-describedby="newsletter-hint newsletter-error"`, and focus returns to the field. The text is cleared and set again 50ms later so the same error submitted twice is announced twice.
- **Fixing it:** as soon as the value becomes valid the error and `aria-invalid` are removed, without waiting for another submit.
- **Success:** the text goes into `#newsletter-success` (`role="status"`), the field is emptied, and the button shows "Subscribed" and is disabled. Typing again re-enables it and clears the message.
- **Visible:** the messages sit on the dark newsletter section in the Task 3 colour tokens: error `#fca5a5` on `#111827` is 9.35:1 and success `#86efac` is 12.63:1 (computed from the token values; the load-time contrast audit does not see them because the regions are empty until used). An invalid field also gets a red border and ring, and the sentence itself says what is wrong, so the state is not colour-only.
- All message text is inserted with `textContent`; the address a visitor typed is shown back as text.

### 16.4 Function index (generated from the source)
Every function below has a comment directly above it. This list was produced by reading `js/*.js`, so it matches the code.

**`js/boot.js`** — runs in <head>, before first paint.

**`js/app.js`** — the tiny module system every other file plugs into.
- `register()` — Add a feature's init function to the start-up list.
- `start()` — Run every registered init function. One failing feature is reported and

**`js/dom.js`** — small helpers for building and finding elements.
- `el()` — Create an element without parsing any HTML.
- `clear()` — Remove every child of a node (used before re-rendering a list).
- `qs()` — Find one element, or null.
- `qsa()` — Find all matching elements as a real array (so forEach/map/filter work).

**`js/data.js`** — the content the data-driven sections are built from.

**`js/render.js`** — builds the data-driven sections from the arrays in data.js.
- `isProduct()` — Check that a data object has everything a product card needs, so one
- `imagePath()` — Path of a product image at one of the generated widths.
- `createBadge()` — The "Best Seller" / "New Arrival" pill positioned over the image.
- `createImage()` — Responsive product image with intrinsic size (prevents layout shift).
- `createProductMedia()` — Top half of a card: optional badge plus the image.
- `createProductBody()` — Bottom half of a card: tag, title, description, price and the link.
- `createProductCard()` — One complete product card.
- `renderProducts()` — Fill #product-grid from data.products.
- `uniqueCategories()` — The distinct categories in the order they first appear in the data.
- `createFilterButton()` — One toggle button; its state is carried by aria-pressed.
- `renderFilterButtons()` — Fill #product-filter with "All Products" plus one button per category.
- `createTestimonialCard()` — One testimonial: quote in a blockquote, attribution with <cite>.
- `renderTestimonials()` — Fill #testimonial-grid from data.testimonials.
- `init()` — Render everything this page has a container for.

**`js/filter.js`** — shows and hides product cards by category.
- `announce()` — Update the visually announced result line.
- `applyFilter()` — Apply one filter: press the matching button, hide the other cards.
- `onFilterClick()` — Click on the filter group: find which button was used.
- `onCategoryLinkClick()` — Click on a category card link: pre-filter the featured grid when that
- `init()` — Attach the listeners (only on pages that have the filter).

**`js/nav.js`** — mobile navigation toggle.
- `isOpen()` — Is the menu open?
- `setOpen()` — Set the state the button announces and CSS reads.
- `init()` — Wire the toggle and the ways the menu closes again.

**`js/newsletter.js`** — newsletter form validation with accessible messages.
- `getEmailError()` — Return the first problem with an email address as a sentence that says
- `findParts()` — Collect the elements the form needs, or null when the page has none.
- `clearMessages()` — Empty both live regions, clear the invalid flag and cancel any error
- `showError()` — Show an error, flag the field and move focus to it. The text is cleared
- `showSuccess()` — Confirm the subscription, empty the field and lock the button until the
- `resetButton()` — Put the submit button back to its normal state.
- `onSubmit()` — Submit handler: validate, then show an error or the success message.
- `onInput()` — Input handler: once the user fixes a flagged field the error goes away
- `init()` — Attach the listeners.

**`js/deals.js`** — previous / next controls for the deals strip.
- `stepSize()` — Distance of one step: the width of an offer plus the gap between them.
- `syncControls()` — Show the controls only when the strip overflows, and mark the button
- `step()` — Scroll one offer in the button's direction (smooth unless the user
- `init()` — Attach the listeners (only on pages with the strip).

**`js/regions.js`** — keyboard access to scrollable areas.
- `syncRegions()` — Add or remove the tab stop for each region.
- `init()` — Sync now and whenever the window size changes.

**`js/table.js`** — "Highlight Differences" toggle on the comparison table.
- `rowIsUniform()` — Do all cells in a row show the same text?
- `setHighlight()` — Turn the highlight on or off for every row.
- `init()` — Attach the toggle (only on pages with the table).

**`js/main.js`** — entry point. Loaded last, so every feature file has already

---

## 17. Other Interactive Behaviour (Task 4)
- **Filter:** one click listener on `#product-filter` (event delegation) serves every button, including the generated ones. State is `aria-pressed` on the buttons and the `hidden` attribute on cards. Each change updates `#filter-status` (`aria-live="polite"`), e.g. "Showing 1 of 3 products in Accessories." It is empty on load, so nothing is announced until the user acts. Category cards pre-filter the grid when that category has products and show everything otherwise (Apparel and Home & Living have none).
- **Mobile menu:** `aria-expanded` on the toggle is the only state; CSS shows the list from it. Enter and Space open it, Escape closes it and refocuses the button, choosing a link or clicking outside closes it, and growing to the desktop layout resets it to `false` so a hidden button never reports "expanded".
- **Deals strip:** Previous/Next buttons scroll one offer (smooth, or instant under reduced motion), use `aria-disabled` at the ends so focus is never lost, and appear only when the strip overflows.
- **Comparison table:** "Highlight Differences" toggles `aria-pressed` and marks the rows whose cells differ.
- **Scroll regions:** focusable only while they overflow.

---

## 18. Debugging Log — Stale Error After a Successful Subscribe

**Tool.** The Chrome DevTools `Debugger` interface: breakpoints, and watch expressions evaluated in the paused call frame. `qa/debug-newsletter.js` drives it through the DevTools Protocol (the interface behind the Sources panel) in headless Chromium and prints what the panel shows. The manual equivalent is at the end of this section.

**Symptom.** After subscribing successfully, an error from an earlier failed attempt ("Add an “@” to the email address…") could appear *under* the success message about 50ms later, so the page, and a screen reader, showed an error and a success together.

**Found by.** Probing the code path I considered most fragile. `showError()` writes its message through a 50ms timer (so that a repeated identical error is re-announced), and a timer can outlive the state that scheduled it. Reproduction, in the page's console:

```js
const f = document.querySelector('.newsletter__form'), i = document.querySelector('#newsletter-email');
i.value = 'bad'; f.requestSubmit();            // invalid: the error is scheduled for +50ms
i.value = 'ok@example.com'; f.requestSubmit(); // valid, inside the 50ms window
setTimeout(() => console.log(document.querySelector('#newsletter-error').textContent), 200);
// before the fix it prints the error text; expected: an empty string
```

**Breakpoints** (line numbers are from the code before the fix):

| # | Where | Why |
| :--- | :--- | :--- |
| B1 | `showError()`, the `window.setTimeout(` line (107) | see the error being scheduled |
| B2 | `showSuccess()`, the `parts.success.textContent =` line (123) | see the success being applied |
| B3 | inside the timer callback, `parts.error.textContent = message;` (108) | see when the late write happens |

**Watch expressions:** `message`, `parts.input.value`, `parts.error.textContent`, `parts.success.textContent`, `parts.input.getAttribute("aria-invalid")`.

**Trace** (the debugger paused three times, in this order):

| Pause | Function (call stack) | `message` | `input.value` | `error.textContent` | `success.textContent` | `aria-invalid` |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `showError` <- `onSubmit` | "Add an “@”…" | "bad" | "" | "" | "true" |
| 2 | `showSuccess` <- `onSubmit` | undefined | "" | "" | "" | null |
| 3 | anonymous timer callback (no `onSubmit` in the stack) | "Add an “@”…" | "" | "" | "Thanks for subscribing!…" | null |

**Diagnosis.** Pause 3 is the cause. The callback scheduled at pause 1 runs *after* `showSuccess` (pause 2) has already cleared the error flag and written the success text, yet it still holds the old `message` in its closure and writes it. Its call stack shows that no submit started it, so no later code could have decided to show an error. `clearMessages()` emptied the text but never cancelled the pending timer.

**Fix** (`js/newsletter.js`):
1. `showError()` stores the timer id in `parts.errorTimer`.
2. `clearMessages()` calls `clearTimeout(parts.errorTimer)`, so every success, every new error and every corrected keystroke cancels a pending error.
3. Defence in depth: the callback writes only while the field still has `aria-invalid="true"`.

**Verification.** Re-running the debugger session on the fixed code, pause 3 never occurs and `error.textContent` stays `""`. Two regression checks in `qa/behaviour.js` cover the invalid-then-valid and the invalid-then-corrected sequences.

**Same session in the DevTools UI.** Open Sources > `js/newsletter.js` and click the line numbers for B1–B3. Add the five watch expressions in the Watch pane, run the reproduction snippet in the Console, then press Resume (F8) after each pause and read the Watch pane; the Call Stack pane gives the "Function" column.

---

## 19. Known Limitations (JavaScript)
- The address check is a readable approximation, not a full RFC 5322 parser. It accepts ASCII letters, numbers and `. _ % + ' -` before the “@” and rejects internationalised (non-ASCII) addresses. A real service would also confirm by sending a message.
- The subscription is simulated in the browser: nothing is sent or stored.
- The filter and the data-driven sections need JavaScript; without it the visitor sees a note and a link to the comparison page.

---

## 20. Task 5 — Accessibility, SEO, QA, Deployment & Launch Report

### 20.1 Success criteria and where each is checked
| Criterion | Status | Evidence |
| :--- | :--- | :--- |
| Live URL loads and behaves as described | *Not measured* — deployment is the owner's step | `docs/RUNBOOK.md` section 1 |
| QA matrix is specific and matches the repository | Chrome rows *Measured*; Firefox, Safari/Edge, real phone *Not measured* | section 22 |
| Lighthouse Accessibility and SEO >= 90; axe has no critical violations | *Not measured* (Lighthouse and axe are not available in this workspace) | offline stand-in: `node qa/preflight.js` (section 21) |
| Report understandable to a non-technical reader | Written | `LAUNCH_REPORT.md` |
| At least one real bug found and fixed in QA documented | Done | section 24 |

### 20.2 Evidence labels
*Measured* = a script in `qa/` produced it on 2026-11-12 in Chrome for Testing 153 (Playwright). *Not measured* = nobody ran it yet.
`qa/preflight.js` is **our own audit with rules named after axe and Lighthouse; it is not axe or Lighthouse** and its pass count must not be reported as theirs.

## 21. Accessibility and SEO Pass
- **Accessibility:** one `main` (focus target of the skip link), `header`, `footer`, every `nav` labelled; one `h1` and no skipped heading levels per page; every control has an accessible name; every image has `alt`; form field has a label and described-by hint and error; contrast measured (lowest 5.02:1); focus order and keyboard operation per section 11; reflow at 320px and 200% text.
- **SEO:** unique `title` and `description` and exactly one `h1` on every page (404 included), Open Graph and Twitter tags with absolute URLs on every page, canonical on the two indexable pages, a 1200x630 `og-image.png`, favicon, `robots.txt` pointing to `sitemap.xml`, sitemap listing every indexable page, custom `404.html` marked `noindex`, internal links resolve.
- `node qa/preflight.js` runs 163 checks (all pass) on all three pages, 404 included, with the placeholder host, 166 with `--release` after `node scripts/set-site-url.js <url>`; verified for a root host and a GitHub Pages sub-path.
- `node qa/headers.js` serves the site with the `netlify.toml` headers and loads each page at 375 and 1280px: 0 CSP violations or console errors, 404 status for unknown paths, `.git` not served.

## 22. QA Matrix (browser x viewport)
`node qa/matrix.js [--md]` runs the same checks in Chrome for Testing 153 on six profiles (phones and tablet use Playwright device profiles: emulated size, touch and user agent, not physical devices).

| Browser | Viewport | Result | Evidence |
| :--- | :--- | :--- | :--- |
| Chrome 153 | Desktop 1440x900 | PASS | *Measured* |
| Chrome 153 | Laptop 1024x768 | PASS | *Measured* |
| Chrome 153 | Tablet 768x1024 (iPad Mini) | PASS | *Measured*, emulated |
| Chrome 153 | Phone 375x667 (iPhone SE) | PASS | *Measured*, emulated |
| Chrome 153 | Phone 390x844 (iPhone 13) | PASS | *Measured*, emulated |
| Chrome 153 | Phone 412x915 (Pixel 7) | PASS | *Measured*, emulated |
| Firefox | desktop and phone | — | *Not measured* (engine not installed here) |
| Safari / Edge | desktop and phone | — | *Not measured* |
| Real phone | — | — | *Not measured* |
| Lighthouse, axe, screen reader | — | — | *Not measured*; steps in `docs/RUNBOOK.md` |

## 23. Deployment
Static site, no build. Netlify Drop or GitHub Pages; exact steps, the URL replacement command and the release check are in `docs/RUNBOOK.md`. `netlify.toml` sets the publish directory and security headers (nosniff, frame deny, strict referrer policy, permissions policy, a content-security-policy that allows only same-origin resources); GitHub Pages ignores it.

## 24. Bug Log (Task 5)
| Bug | Found by | Cause | Fix | Verified |
| :--- | :--- | :--- | :--- | :--- |
| Last desktop nav links clipped at 200% text size | `qa/preflight.js` text-enlargement check, confirmed by screenshot | `.nav__list` and `.site-header__inner` did not wrap | `flex-wrap: wrap` plus column gap in `css/layout.css` and `css/components.css` | preflight, layout and keyboard checks pass; screenshot shows all links |
| 404 page had no Open Graph tags | grader feedback on the first Task 5 submission | OG/Twitter checks only ran on indexable pages | added the tags; preflight now checks title, description, OG and single h1 on all three pages | preflight 163 of 163 |
| 404 page had in-page anchors that went nowhere | preflight internal-link check | anchors like `#featured` do not exist on `404.html` | repointed to `index.html#...` | preflight link check passes |
| Preflight failed on GitHub Pages sub-path URLs | testing the URL script with `https://someone.github.io/brandstore` | og-image path mapped by stripping only the host | resolve the file by its base name | sub-path run passes 150 of 150 |

## 25. Known Limitations (Task 5)
- On a nested unknown URL (e.g. `/a/b`) the 404 page loads but its relative assets do not; the fix is root-relative asset paths.
- Security headers do not apply on GitHub Pages.
- Lighthouse, axe, screen-reader, Firefox, Safari and real-device results are not in this repository until the owner runs them.
