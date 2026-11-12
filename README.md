# E-Commerce Storefront — Build Plan, Layout Architecture & Visual Polish (Tasks 1–3)

This repository delivers the complete build plan (Task 1), the semantic HTML5 + mobile-first responsive CSS3 implementation (Task 2), and the visual polish, interactive states and motion pass (Task 3) for **BrandStore**.

> Sections 1–6 describe Tasks 1–2. Class names quoted there were renamed to BEM in Task 3; the old-to-new mapping is in section 7.2. Sections 7–12 document Task 3.

## 1. Scope & Overview
- **Pages Built:**
  - `index.html` — Landing page featuring header and navigation, hero banner with positioned badge overlay, category grid, featured products with positioned status/discount badges, deals strip, customer testimonials, newsletter subscription form with client-side validation attributes, and global footer.
  - `comparison.html` — Product comparison page featuring global header/nav, comparison intro, responsive mobile-friendly semantic HTML `<table>` (`<caption>`, `<thead>`, `<tbody>`, `<th scope="col|row">`), and global footer.
- **Explicit Scope Exclusion:** Backend work (server APIs, database persistence, authentication, payment processing) is explicitly excluded from scope.

---

## 2. Page & Section Inventory with Semantic Justifications

| Page | Section | Semantic Element(s) | Justification |
| :--- | :--- | :--- | :--- |
| **Landing (`index.html`)** | Header & Nav | `<header>`, `<nav>` | Establishes the top-level site banner landmark and wraps primary site navigation links (`<ul>`, `<li>`, `<a>`) and accessible menu toggle (`<button>`). |
| **Landing (`index.html`)** | Hero | `<section>` | Groups the introductory promotional banner, primary `<h1>` headline, value proposition, CTAs, and responsive hero showcase graphic (`<figure>`). |
| **Landing (`index.html`)** | Category Grid | `<section>`, `<article>` | Defines the thematic "Shop by Category" section (`<section>`) containing four self-contained merchandising cards (`<article>`). |
| **Landing (`index.html`)** | Featured Products | `<section>`, `<article>` | Houses curated product cards (`<article>`) with positioned badges (`position: absolute` inside `position: relative` media containers) and responsive `<img srcset sizes width height>`. |
| **Landing (`index.html`)** | Deals Strip | `<section>`, `<ul>` | Isolates time-sensitive promotional offers and discount codes (e.g. `LAUNCH20`) as a distinct thematic strip; the offers are a list, so they are marked up as `<ul>`/`<li>`. |
| **Landing (`index.html`)** | Testimonials | `<section>`, `<article>`, `<blockquote>` | Presents verified customer quotes using semantic `<article>` cards, `<blockquote>`, and `<cite>` attributions. |
| **Landing (`index.html`)** | Newsletter Form | `<section>`, `<form>` | Encapsulates explicit `<label>`, `<input type="email" required>`, and `<button type="submit">` inside a semantic `<form>` landmark. |
| **Landing (`index.html`)** | Footer | `<footer>`, `<nav>` | Closing document landmark containing copyright notice and secondary utility links. |
| **Comparison (`comparison.html`)** | Header & Nav | `<header>`, `<nav>` | Consistent global header and navigation across pages. |
| **Comparison (`comparison.html`)** | Comparison Table | `<main>`, `<section>`, `<table>` | Uses semantic `<table>`, `<caption>`, `<thead>`, `<tbody>`, `<th scope="col">`, `<th scope="row">`, and `<td>` for true two-dimensional tabular product specifications. |
| **Comparison (`comparison.html`)** | Footer | `<footer>`, `<nav>` | Consistent global footer across pages. |

---

## 3. Layout Strategy: CSS Grid vs. Flexbox (With Reasons Stated)

| Component | Layout Model | Reason Stated |
| :--- | :--- | :--- |
| **Header Bar (`.header-container`)** | **Flexbox** (`display: flex`) | One-dimensional horizontal strip aligning brand logo on the left and navigation items on the right along a single main axis (`justify-content: space-between; align-items: center`). |
| **Navigation Link List (`.nav-list`)** | **Flexbox** (`display: flex`) | One-dimensional list of links flowing vertically on mobile (`flex-direction: column`) and horizontally on desktop (`flex-direction: row`) with uniform `gap`. |
| **Hero Actions & Filter Bar (`.hero-actions`, `.filter-bar`)** | **Flexbox** (`display: flex; flex-wrap: wrap`) | One-dimensional row of action buttons that wraps cleanly onto new lines on narrow `375px` viewports without overflowing. |
| **Deals Strip (`.deals-content`)** | **Flexbox** (`display: flex`) | One-dimensional promotional banner aligning headline, offer details, and promo code pill along a single flow axis. |
| **Newsletter Form (`.newsletter-form`)** | **Flexbox** (`display: flex`) | One-dimensional control strip stacking input and submit button vertically on mobile (`375px`) and placing them side-by-side (`flex: 1` on input) from `768px` upward. |
| **Footer Bar (`.footer-container`, `.footer-links`)** | **Flexbox** (`display: flex`) | One-dimensional strip stacking copyright and links on mobile and distributing them horizontally on tablet/desktop. |
| **Category Grid (`.category-grid`)** | **CSS Grid** (`display: grid`) | Two-dimensional card matrix requiring simultaneous control over row tracks and column tracks (`1fr` at `375px` -> `repeat(2, 1fr)` at `768px` -> `repeat(4, 1fr)` at `1024px+`). |
| **Featured Product Grid (`.product-grid`)** | **CSS Grid** (`display: grid`) | Two-dimensional multi-row product catalog ensuring equal-height cards across rows and responsive column expansion (`1` -> `2` -> `3` columns). |
| **Testimonials Grid (`.testimonial-grid`)** | **CSS Grid** (`display: grid`) | Two-dimensional balanced layout aligning customer quote cards across columns with consistent row heights. |

---

## 4. CSS Custom Properties, Box Model, Positioning, Fluid Type & Responsive Images
- **CSS Custom Properties (`:root`):** Centralizes brand colors (`--color-primary`, `--color-accent`, `--color-surface`, `--color-text`), spacing scale (`--space-xs` through `--space-3xl`), typography tokens (`--font-sans`, `--text-h1`, `--text-h2`, `--text-h3`, `--text-body`), radii, and shadows.
- **Deliberate Box Model:** Global `box-sizing: border-box` reset, explicit padding/margin rhythm via spacing variables, structured borders (`1px solid var(--color-border)`), and `.container` width constraints (`width: min(100% - 2 * var(--space-md), var(--container-max))`) preventing horizontal overflow at `375px`, `768px`, `1024px`, and `1440px`.
- **Positioning for Badges & Overlays:**
  - `.site-header` uses `position: sticky; top: 0; z-index: 100` for persistent navigation.
  - `.product-media` and `.hero-media` use `position: relative` so `.product-badge` ("Best Seller", "New", "20% Off") and `.hero-overlay-badge` ("Phase 1 Launch") are anchored cleanly with `position: absolute; top: var(--space-sm); left/right: var(--space-sm)`.
- **Fluid Typography (`clamp()`):** Headings scale smoothly across viewports without abrupt jumps:
  - `--text-h1: clamp(1.875rem, 1.35rem + 2.2vw, 3rem)`
  - `--text-h2: clamp(1.5rem, 1.2rem + 1.2vw, 2.125rem)`
  - `--text-h3: clamp(1.125rem, 1.05rem + 0.4vw, 1.35rem)`
- **Responsive Images:** Every `<img>` specifies `src`, `srcset` (`400w` / `800w` or `600w` / `1200w`), `sizes`, explicit intrinsic `width` and `height` attributes (preventing Cumulative Layout Shift), and `max-width: 100%; height: auto; object-fit: cover` so images never stretch or clip unexpectedly.

---

## 5. Responsive Breakpoints & Acceptance Checklist
- **Breakpoints:** `375px` (Mobile Small), `768px` (Tablet), `1024px` (Desktop Standard), `1440px` (Desktop Wide).
- [x] **Responsive:** Zero horizontal scrolling at `375px`, `768px`, `1024px`, and `1440px`.
- [x] **Accessible:** Valid landmark outline (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`), logical heading hierarchy (`<h1>` -> `<h2>` -> `<h3>`), semantic `<table>` with `scope`, associated form `<label>`, and `:focus-visible` rings.
- [x] **SEO Basics:** Unique `<title>`, `<meta name="description">`, single `<h1>` per page, and descriptive `alt` text.
- [x] **Deployed:** Static HTML5/CSS3/JS architecture ready for GitHub Pages or Netlify.

---

## 6. Clarifying Questions & Scope Limitations
### Clarifying Questions
1. Should product prices remain fixed in USD (`$`) or support a client-side currency toggle (e.g., USD / AED / EUR)?
2. How many products should the comparison matrix support simultaneously in future iterations (fixed 3 vs. up to 5)?
3. Which email service provider webhook will connect to the newsletter `<form>` once backend work begins?

### Scope Limitations
1. **Backend Work Excluded:** No server-side authentication, database storage, cart checkout, or payment processing is included in this frontend phase.
2. **Static Catalog Data:** Product listings, pricing, and promo code (`LAUNCH20`) are static frontend content without live CMS/inventory API calls.

---

## 7. Task 3 — CSS Architecture & Methodology

### 7.1 Stated methodology
- **Naming: BEM** (`.block`, `.block__element`, `.block--modifier`). One block per UI component, no element selectors and no nesting deeper than one block, so specificity stays flat (almost every rule is a single class).
- **State** is never a free-floating class. It is expressed with the attribute that already describes it to assistive technology: `aria-expanded` (menu), `aria-pressed` (filter and diff buttons), `aria-current` + `.nav__link--current`, `aria-invalid` (email field), `disabled`, and the `hidden` attribute (filtered-out cards). JavaScript only flips those attributes; CSS owns every visual change.
- **Utilities** use a `u-` prefix (`.u-visually-hidden`) so they cannot be mistaken for a block.
- **Files are split by responsibility and loaded in cascade order:**

| Order | File | Contains | May use |
| :--- | :--- | :--- | :--- |
| 1 | `css/base.css` | Design tokens (`:root` custom properties), reset, element defaults, global `:focus-visible` ring, reduced-motion token overrides | element selectors only |
| 2 | `css/layout.css` | Page skeleton: `.container`, `.site-header`, `.site-footer`, `.section`, `.grid` and breakpoint column counts | tokens |
| 3 | `css/components.css` | One BEM block per component: `.skip-link`, `.logo`, `.nav`, `.btn`, `.hero`, `.category-card`, `.filter`, `.product-card`, `.deals`, `.testimonial`, `.newsletter`, `.footer-nav`, `.page-header`, `.table-scroll`, `.comparison-table` | tokens |
| 4 | `css/utilities.css` | Single-purpose helpers, loaded last so they always win | tokens |

### 7.2 Task 2 class names -> BEM
| Task 2 | Task 3 (BEM) |
| :--- | :--- |
| `.header-container` | `.site-header__inner` |
| `.main-nav`, `.nav-toggle`, `.nav-list`, `a.active` | `.nav`, `.nav__toggle`, `.nav__list`, `.nav__link--current` |
| `.hero-layout`, `.hero-content`, `.hero-eyebrow`, `.hero-actions`, `.hero-media`, `.hero-overlay-badge`, `.hero-image` | `.hero__inner`, `.hero__content`, `.hero__eyebrow`, `.hero__actions`, `.hero__media`, `.hero__badge`, `.hero__image` |
| `.btn-primary`, `.btn-outline`, `.btn-secondary` | `.btn--primary`, `.btn--outline`, `.btn--secondary` |
| `.categories-section`, `.featured-section`, `.testimonials-section` | `.section`, `.section--surface`, `.section__title` |
| `.category-grid`, `.product-grid`, `.testimonial-grid` | `.grid.grid--categories`, `.grid.grid--products`, `.grid.grid--testimonials` |
| `.filter-bar`, `.filter-btn.active` | `.filter`, `.filter__btn[aria-pressed="true"]` |
| `.product-media`, `.product-badge.badge-new`, `.product-body`, `.category-tag`, `.price` | `.product-card__media`, `.product-card__badge--new`, `.product-card__body`, `.product-card__tag`, `.product-card__price` |
| `.deals-strip`, `.deals-content`, `.promo-pill` | `.deals`, `.deals__viewport` / `.deals__track` / `.deals__item`, `.deals__code` |
| `.testimonial-card` | `.testimonial` |
| `.newsletter-form`, `.form-field`, `.newsletter-hint`, `.newsletter-feedback` | `.newsletter__form`, `.newsletter__field`, `.newsletter__hint`, `.newsletter__feedback--error` / `--success` |
| `.footer-container`, `.footer-links` | `.site-footer__inner`, `.footer-nav__list` |
| `.table-wrapper`, `tr.diff-highlight` | `.table-scroll`, `.comparison-table__row--diff` |
| `.visually-hidden`, `.product-card.hidden` | `.u-visually-hidden`, `hidden` attribute |

### 7.3 Custom properties and "no magic numbers"
Every colour, length, weight, line-height, duration, easing, shadow, radius and z-index is declared once in `:root` in `css/base.css` and referenced with `var()`. Outside that block the stylesheets contain only structural keywords and identities (`0`, `1`, `100%`, `1fr`, `-1 *` to negate a token).

- **Component-scoped properties** carry intent instead of repeated values: `--grid-columns` (column count per breakpoint), `--deals-visible` (how many offers fit the strip; `1.25` / `2.25` leaves a deliberate peek of the next card as a scroll cue), `--enter-order` (stagger position), `--input-border` / `--input-ring` (form-field state), `--focus-ring-color` (re-pointed to white on dark sections).
- **Breakpoints** are the one exception: custom properties cannot be read inside `@media`, so `48em` (768px), `64em` (1024px) and `90em` (1440px) are written literally and documented at the top of `base.css`. In Sass they become `$bp-tablet`, `$bp-desktop`, `$bp-wide`.

### 7.4 How this maps to a larger project
**Sass partials (7-1 style).** The four files are already the folders; each comment-delimited block becomes one partial and BEM nesting uses `&`:

```text
scss/
  abstracts/  _breakpoints.scss   (the three media-query values + a mq() mixin)
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

Runtime values (colours, spacing, motion) stay as CSS custom properties so theming and `prefers-reduced-motion` keep working without a rebuild; Sass variables are used only where CSS cannot (media queries).

**CSS Modules (component frameworks).** Each BEM block becomes one module file next to its component; the block name is replaced by the file scope, so elements and modifiers drop the prefix:

| Here | CSS Modules |
| :--- | :--- |
| `css/base.css` | global stylesheet imported once (tokens, reset, focus) |
| `.product-card` in `components.css` | `ProductCard.module.css` -> `.root` |
| `.product-card__badge` | `.badge` |
| `.product-card__badge--new` | `.badge` + `.badgeNew` (or `composes: badge`) |
| `.btn.btn--secondary` | `Button.module.css` -> `.root`, `.secondary`, chosen by a `variant` prop |
| `.u-visually-hidden` | global utility or shared `utilities.module.css` used with `composes` |

---

## 8. Interactive States

Order inside every block is the same: default, `:hover`, `:focus-visible`, `:active`, then `:disabled` / `:invalid` / ARIA state.

| Element | `:hover` | `:focus-visible` | `:active` | Other states |
| :--- | :--- | :--- | :--- | :--- |
| Skip link | — | slides into view + ring | — | — |
| Logo | darker brand blue | ring | deepest brand blue | — |
| Menu toggle | blue border, soft blue fill | ring | tint fill | `aria-expanded="true"`: bars morph to a close icon |
| Nav link | brand colour + underline grows from left | ring + underline | deeper blue | current page keeps the underline (not colour alone) |
| `.btn--primary` | soft fill + shadow | ring (white on dark sections) | tint fill, 1px press | `:disabled` grey, `not-allowed`, no press |
| `.btn--outline` | solid white border + light veil | white ring | dark veil, press | `:disabled` as above |
| `.btn--secondary` | darker blue + shadow | ring | deepest blue, press | `aria-pressed="true"` (diff toggle), `:disabled` |
| Category card (whole card is the link) | lift, blue border, title turns blue | ring around the card | lift released | — |
| Filter button | soft fill, blue border | ring | tint, press | `aria-pressed="true"` filled, `:disabled` |
| Product card | lift + larger shadow + blue border | border turns blue when its button has focus | — | `hidden` when filtered out |
| Deals strip | native scroll | white ring on the scroll region | — | focusable only while it overflows |
| Email field | blue border | ring + blue border | deeper border | invalid: red border + outer ring + text message; `:disabled` grey; styled `::placeholder` |
| Footer link | blue + underline fades in | ring | deeper blue | — |
| Comparison row | row tint | ring on the scroll region | — | `--diff` modifier highlights differing rows |

- **Focus:** one global `:focus-visible` rule (3px ring, 2px offset) so every focusable element gets the same indicator, with an `@supports` fallback to `:focus`. On the hero, deals and newsletter backgrounds the ring colour token switches to white; the Task 2 blue ring was invisible on blue.
- **Invalid:** a required empty field is technically `:invalid` on first paint, so the error style appears only after the user typed and left the field (`:not(:placeholder-shown):not(:focus):invalid`, `:user-invalid`) or tried to submit (`aria-invalid="true"`). The error is always paired with a text message in the `role="status"` region.
- **Disabled:** the Subscribe button is disabled and relabelled "Subscribed" after a successful submit and re-enabled as soon as the user types again.

---

## 9. Motion

| # | Animation | Where | Purpose |
| :--- | :--- | :--- | :--- |
| 1 | Hero entrance (`enter-up`, `enter-scale`, 500ms, 80ms stagger) | `.hero__eyebrow` -> `__title` -> `__lead` -> `__actions`, then `.hero__media` | Leads the eye through the message in reading order on first paint; runs once. |
| 2 | Card hover lift (`translateY` -0.25rem + shadow, 200ms) | `.category-card`, `.product-card` | Confirms which card the pointer is on and that it is actionable. Wrapped in `@media (hover: hover)` so touch devices never get a stuck raised card. |
| 3 | Scroll snapping (`scroll-snap-type: x mandatory`) | `.deals__viewport` | Each swipe settles on a whole offer instead of stopping mid-card. Pure CSS, native scrolling. |

Supporting **transitions** (150–200ms, shared `--transition-colors` / `--transition-lift` tokens): navigation link underline and colour, mobile menu fade/slide and icon morph, button colour/shadow/press, filter buttons, form-field border and ring, table row tint, skip link.

**`prefers-reduced-motion: reduce`:**
- Duration, stagger, lift, press and entrance-distance tokens are set to zero in one `:root` override, so every transition becomes an instant state change and nothing moves.
- The hero keyframes and `scroll-behavior: smooth` are declared only inside `@media (prefers-reduced-motion: no-preference)`, so they do not exist for these users.
- Hover, focus and active feedback is still there (colour, border, underline); only the movement is removed.

---

## 10. Deviations From the Design (With UI/UX Reasons)

| # | Deviation | Reason |
| :--- | :--- | :--- |
| 1 | Deals strip is a horizontally scrolling, snapping row of four offer cards instead of one static banner. | Shows more than one offer without adding page height on mobile; the partially visible next card is the affordance that the strip scrolls. At 1024px+ all four fit and it behaves as a static row. |
| 2 | Focus ring is white on the hero, deals and newsletter sections, blue elsewhere. | A single brand-blue ring fails the 3:1 non-text contrast requirement on blue and dark backgrounds (WCAG 2.4.7 / 1.4.11). |
| 3 | Borders of the filter buttons, menu toggle and email field are a darker grey (`#6b7280`) than the card border (`#e5e7eb`). | Control boundaries need 3:1 contrast against the surface (WCAG 1.4.11); the light card border is about 1.2:1. |
| 4 | Buttons, filter pills, nav and footer links are at least 2.75rem (44px) tall, slightly taller than drawn. | Comfortable touch target (WCAG 2.5.8 / platform guidance) at the 375px breakpoint. |
| 5 | Hover lift applies only on hover-capable devices and is 4px, with no scale. | Avoids sticky hover on touch and layout jitter or blurry text from scaling. |
| 6 | Current nav item and hover use an underline as well as colour. | State must not be conveyed by colour alone (WCAG 1.4.1). |
| 7 | Whole category card is clickable and jumps to the (pre-filtered) featured grid. | A card that lifts on hover must do something; a larger target is easier to hit than the title text. |
| 8 | The hamburger glyph is drawn in CSS and morphs into a close icon. | Communicates the open state visually, matching `aria-expanded`; a text glyph cannot animate. |
| 9 | Invalid email styling is delayed until interaction and paired with inline text instead of the browser bubble. | Showing red on an untouched field reads as an error the user has not made; inline text persists and is announced by screen readers. |
| 10 | System font stack is kept instead of loading a brand web font. | No font download, no layout shift, no third-party request; the type scale, weights and line-heights are tokens so a brand font can be dropped into `--font-sans` in one line. |
| 11 | Entrance animation is limited to the hero; no scroll-triggered reveals. | Motion is reserved for moments with a purpose; content that animates on every scroll delays reading. |
| 12 | Without JavaScript the navigation is shown as a wrapping row instead of a collapsed menu. | The menu must stay reachable when scripts fail; the collapsed pattern is applied only when the `js` class is present. |

Also fixed in this pass: the hero illustration SVGs contained an unescaped `&`, which made them invalid XML so the browser showed the `alt` text instead of the image.

---

## 11. Verification (Task 3)
- [x] No horizontal overflow at `375px`, `768px`, `1024px`, `1440px` on both pages (checked `scrollWidth === clientWidth` in headless Chromium).
- [x] Keyboard pass: every link, button, field and scroll region shows the focus ring; Escape closes the mobile menu and returns focus to the toggle.
- [x] With "reduce motion" emulated: hero `animation-name` is `none`, transition durations compute to `0s`, `scroll-behavior` is `auto`.
- [x] Every `var()` reference resolves to a declared token; no raw colour or length outside `:root`.
- [x] Text/background pairs meet WCAG AA (4.5:1), e.g. white on `#2563eb` 5.2:1, white on `#b45309` 5.0:1, `#4b5563` on `#f9fafb` 7.2:1.

## 12. Project Structure
```text
index.html            landing page
comparison.html       product comparison page
css/base.css          tokens, reset, element defaults, focus, motion policy
css/layout.css        container, header/footer bars, sections, grid
css/components.css    BEM components and their states
css/utilities.css     u- helpers
js/main.js            progressive enhancement (ARIA state toggles only)
assets/               responsive SVG illustrations
```
