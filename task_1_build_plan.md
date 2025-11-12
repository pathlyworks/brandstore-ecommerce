# E-Commerce Storefront — Build Plan & Layout Architecture (FE-001 & FE-002)

This repository delivers the complete build plan (Task 1) and the semantic HTML5 + mobile-first responsive CSS3 implementation (Task 2) for **BrandStore**.

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
| **Landing (`index.html`)** | Deals Strip | `<section>` | Isolates time-sensitive promotional messaging and discount code (`LAUNCH20`) as a distinct thematic banner. |
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
