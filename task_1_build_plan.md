# BrandStore — Task 1 Build Plan

This file is sections 1–6 of `README.md`, kept identical to it.

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
