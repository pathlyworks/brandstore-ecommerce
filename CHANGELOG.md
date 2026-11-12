# Changelog

## v1.0.0 — 2026-11-12 (Task 5 release candidate)
### Added
- `404.html`, `robots.txt`, `sitemap.xml`, `favicon.svg`, `apple-touch-icon.png`, `og-image.png` (1200x630), `.nojekyll`.
- Unique title, meta description, canonical, Open Graph and Twitter tags on every page; one `h1` per page.
- `netlify.toml` with security headers and a same-origin Content-Security-Policy.
- `scripts/set-site-url.js` to replace the placeholder host with the deployed URL.
- QA scripts: `qa/preflight.js` (accessibility/SEO audit), `qa/headers.js`, `qa/matrix.js` (browser x viewport).
- `LAUNCH_REPORT.md` / `.pdf` and `docs/RUNBOOK.md`.
### Fixed
- Header/nav links clipped at 200% text size (now wrap).
- 404 page in-page anchors pointed at sections that do not exist on it.
### Known limitations
- Live URL, Lighthouse, axe, screen-reader, Firefox/Safari results are pending (see `docs/RUNBOOK.md`).

## v0.4.0 — Task 4: JavaScript interactivity, data-driven sections, form validation (fixed stale-error bug).
## v0.3.0 — Task 3: visual polish, interaction states, motion, keyboard/focus work.
## v0.2.0 — Task 2: layout architecture (Grid/Flexbox, responsive images).
## v0.1.0 — Task 1: build plan.
