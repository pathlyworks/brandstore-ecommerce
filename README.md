# BrandStore — E-Commerce Storefront (Tasks 1–3)

A static HTML5 / CSS3 / vanilla JavaScript storefront: the build plan and layout architecture (Tasks 1–2) plus the visual-polish, interaction-state and motion pass (Task 3). Sections 1–6 describe the pages and layout; sections 7–15 cover routes, CSS methodology, states, motion, keyboard operation, deviations, QA evidence and deliverables.

## 1. Scope & Overview
- **Pages built:**
  - `index.html` — skip link, header and navigation, hero with a positioned offer badge, four category cards (each links to the featured grid, pre-filtered when a matching filter exists), three featured products with positioned badges and a category filter, a deals strip of six promo offers with previous/next controls, two testimonials, a newsletter form with client-side validation, and the footer.
  - `comparison.html` — header and navigation, page intro with a "Highlight Differences" toggle, a semantic comparison `<table>` (`<caption>`, `<thead>`, `<tbody>`, `<th scope="col|row">`; 6 specification rows x 3 products), and the footer.
- **Explicit scope exclusion:** backend work (server APIs, database persistence, authentication, payments) is excluded. The newsletter form is validated and answered in the browser only; it makes no network request.

---

## 2. Page & Section Inventory with Semantic Justifications

| Page | Section | Semantic element(s) | Justification |
| :--- | :--- | :--- | :--- |
| **Both** | Skip link | `<a href="#main-content">` | First focusable element; moves keyboard users past the header to `<main tabindex="-1">`. |
| **Both** | Header & Nav | `<header>`, `<nav>`, `<ul>`, `<button>` | Banner landmark; the nav wraps the link list and the menu toggle (`aria-expanded`, `aria-controls`). |
| **Landing** | Hero | `<section>`, `<figure>` | Introductory banner with the page's single `<h1>`, two calls to action and a responsive illustration. |
| **Landing** | Category cards | `<section>`, `<article>`, `<a>` | Four self-contained merchandising cards; each card is one block link. |
| **Landing** | Featured products | `<section>`, `<article>`, `role="group"` | Product cards with `<img srcset sizes width height>`; the filter buttons are a labelled group using `aria-pressed`. |
| **Landing** | Deals strip | `<section>`, `<ul>`, `role="group"`, `role="region"` | Six offers are a list (`<ul>/<li>`). The scrolling area is a labelled, focusable region with previous/next buttons (`aria-controls`). |
| **Landing** | Testimonials | `<section>`, `<article>`, `<blockquote>`, `<cite>` | Quotes with attribution. |
| **Landing** | Newsletter | `<section>`, `<form>`, `<label>` | Email field with `required`, `minlength`, `maxlength`, `autocomplete`; hint and live feedback linked by `aria-describedby`. |
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
2. **Static catalogue:** products, prices and the six promo codes (`LAUNCH20`, `SHIPFREE`, `BUNDLE10`, `WELCOME5`, `CARRY15`, `CARE3`) are static content; no code is validated.

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
| Newsletter form | `action="#" method="POST"` | Form | `submit` is intercepted by `js/main.js` (`preventDefault`); no request is sent. |
| API / backend endpoints | none | n/a | Out of scope (section 6). |

---

## 8. Task 3 — CSS Architecture & Methodology

### 8.1 Stated methodology
- **Naming: BEM** (`.block`, `.block__element`, `.block--modifier`). One block per component; selectors are single classes, so specificity stays flat.
- **State is expressed with the attribute that already describes it to assistive technology** and never with a free-floating class: `aria-expanded` (menu), `aria-pressed` (filter, diff toggle), `aria-current` (+ `.nav__link--current`), `aria-invalid` (email), `aria-disabled` / `disabled`, the `hidden` attribute (filtered cards, deals controls before JS runs). JavaScript only flips those attributes; CSS owns every visual change.
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
| Product card | lift + shadow + blue border | border turns blue when a control inside has focus | — | `hidden` when filtered out |
| Deals previous/next | stronger border and fill | white ring | darker fill, press | `aria-disabled="true"` at either end (stays focusable) |
| Deals scroll region | — | white ring | — | arrow keys scroll it natively |
| Email field | blue border | ring + blue border | deeper border | invalid: red border + outer ring + text message; `:disabled` grey; styled placeholder |
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
- **Without JavaScript:** navigation stays visible as a wrapping row (the collapsed menu applies only when the inline `js` class script ran).

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
| 9 | Non-text contrast | Control border 4.83:1 on white; focus ring 5.17:1 (blue on white), 5.02:1 (white on `#b45309`), 17.74:1 (white on `#111827`) | *Measured* — computed from the token values |
| 10 | Stylesheet tokens | 110 custom properties; every `var()` resolves; 0 colour/length/time literals outside `:root` | *Measured* — `node qa/tokens.js` |
| 11 | Category and filter behaviour | Choosing Accessories shows 1 of 3 products | *Measured* — scripted click, headless Chromium |
| 12 | Newsletter validation | Invalid address shows the red state and an inline message; valid address shows success and disables the button | *Measured* — scripted, headless Chromium |
| 13 | Firefox, Safari, real phones and tablets | — | *Not measured* |
| 14 | Screen reader pass (NVDA, VoiceOver, TalkBack) | — | *Not measured*; semantics are *reasoned* from the markup |
| 15 | axe DevTools and Lighthouse runs | — | *Not measured* |
| 16 | Pixel comparison with the Figma design | — | *Not measured* (design file not available here) |
| 17 | Live deployment | — | *Not measured*; the site is static, no build step, and deploys as is to GitHub Pages or Netlify |

Run the checks: `npm i -D playwright`, then `node qa/layout.js && node qa/keyboard.js && node qa/contrast.js && node qa/tokens.js` from the project root.

---

## 14. Deliverables & Consistency
| Deliverable | Where | Notes |
| :--- | :--- | :--- |
| Repository | this folder, `.git` included | Task 1–3 history; Task 3 commits restructure the CSS, markup and JS and add `qa/`. |
| Report | `README.md` (this file) and `task_1_build_plan.md` | `task_1_build_plan.md` is sections 1–6 of this file, word for word. |
| Demo | static site, deployable as is | Submit the deployed URL in the assessment form. |
| Deck | not part of this task | — |

Figures used across the files and kept in sync: 2 pages, 4 categories, 3 products, 6 offers, 2 testimonials, 6 comparison rows, 4 breakpoints, 3 animations, 4 CSS files.

## 15. Project Structure
```text
index.html            landing page
comparison.html       product comparison page
css/base.css          tokens, reset, element defaults, focus, motion policy
css/layout.css        container, header/footer bars, sections, grid
css/components.css    BEM components and their states
css/utilities.css     u- helpers
js/main.js            progressive enhancement (ARIA state toggles, deals controls)
assets/               responsive SVG illustrations
qa/                   reproducible checks (layout, keyboard, contrast, tokens)
```
