# Lighthouse

**How it is run:** by `scripts/lighthouse.mjs`, in the CI job "Lighthouse (built site against the TechSphere API)", on
every pull request. The job:
1. builds the site (`npm run build`, with `VITE_API_BASE=http://127.0.0.1:4010`);
2. serves `dist/` with `scripts/serve.mjs`;
3. starts the API kit's `server.py`;
4. runs Lighthouse 12.6.1 on four pages, as mobile (the default) and desktop (`--preset=desktop`).

The full HTML and JSON reports are the job's "lighthouse" artifact.

## Result on PR #3

| Page | Form factor | Performance | Accessibility | Best practices | SEO |
| :--- | :--- | ---: | ---: | ---: | ---: |
| home | mobile | 98 | 100 | 100 | 100 |
| catalog | mobile | 91 | 100 | 100 | 100 |
| product | mobile | 94 | 100 | 100 | 100 |
| cart | mobile | 95 | 100 | 100 | 100 |
| home | desktop | 100 | 100 | 100 | 100 |
| catalog | desktop | 100 | 100 | 100 | 100 |
| product | desktop | 100 | 100 | 100 | 100 |
| cart | desktop | 100 | 100 | 100 | 100 |

## What the scores say, and what is left

- **Accessibility, Best practices and SEO are 100 on every page and form factor.**
- **Performance is 91–100.** It is 100 on desktop everywhere and 91–98 on a throttled mobile.
- **Catalog went from 89 to 100 on desktop** within this PR, after the catalog stopped requesting 8 "images" a page from the API's `/images` endpoint, which answers JSON (runs 43453346129 and 43456625322).
- **Left to do, in order of value:**
  1. **Layout shift on mobile:** catalog 0.143, cart 0.112. The results grid and the cart lines are filled in after the API answers. Reserving their height while loading would remove it.
  2. **Text compression and cache lifetimes:** these are host settings. `scripts/serve.mjs` is a plain local server without either. Netlify compresses with Brotli automatically. Long cache lifetimes would need fingerprinted file names, which this no-bundler site does not have, so `netlify.toml` would have to cache `css/` and `src/` briefly.
  3. **Render-blocking CSS and unminified files:** this follows from the no-bundler decision (README §4). Inlining critical CSS would be the next step if mobile first paint matters more.

Run: https://github.com/pathlyworks/brandstore-ecommerce/actions/runs/43459653927 (job "Lighthouse"; HTML and JSON reports in the artifact "lighthouse").

### Metrics and every audit below 90 (from the same run)

- **home, mobile:** First Contentful Paint: 1.7 s; Largest Contentful Paint: 2.0 s; Total Blocking Time: 0 ms; Cumulative Layout Shift: 0. Below 90: Serve static assets with an efficient cache policy (30 resources found); Eliminate render-blocking resources (Est savings of 550 ms); Minify CSS (Est savings of 18 KiB); Minify JavaScript (Est savings of 17 KiB); Reduce unused CSS (Est savings of 31 KiB); Enable text compression (Est savings of 88 KiB); Use efficient cache lifetimes (Est savings of 128 KiB); Document request latency (Est savings of 10 KiB); Network dependency tree; Render blocking requests.
- **catalog, mobile:** First Contentful Paint: 1.9 s; Largest Contentful Paint: 2.3 s; Total Blocking Time: 0 ms; Cumulative Layout Shift: 0.143. Below 90: First Contentful Paint (1.9 s); Cumulative Layout Shift (0.143); Avoid large layout shifts (1 layout shift found); Serve static assets with an efficient cache policy (39 resources found); Eliminate render-blocking resources (Est savings of 600 ms); Minify CSS (Est savings of 18 KiB); Minify JavaScript (Est savings of 26 KiB); Reduce unused CSS (Est savings of 36 KiB); Enable text compression (Est savings of 103 KiB); Use efficient cache lifetimes (Est savings of 162 KiB); Layout shift culprits; Document request latency (Est savings of 6 KiB); Network dependency tree; Render blocking requests.
- **product, mobile:** First Contentful Paint: 2.0 s; Largest Contentful Paint: 2.6 s; Total Blocking Time: 0 ms; Cumulative Layout Shift: 0.076. Below 90: First Contentful Paint (2.0 s); Largest Contentful Paint (2.6 s); Largest Contentful Paint element (2,560 ms); Serve static assets with an efficient cache policy (32 resources found); Eliminate render-blocking resources (Est savings of 600 ms); Minify CSS (Est savings of 18 KiB); Minify JavaScript (Est savings of 23 KiB); Reduce unused CSS (Est savings of 38 KiB); Reduce unused JavaScript (Est savings of 21 KiB); Enable text compression (Est savings of 116 KiB); Use efficient cache lifetimes (Est savings of 188 KiB); Document request latency (Est savings of 3 KiB); Network dependency tree; Render blocking requests.
- **cart, mobile:** First Contentful Paint: 1.7 s; Largest Contentful Paint: 2.0 s; Total Blocking Time: 0 ms; Cumulative Layout Shift: 0.112. Below 90: Cumulative Layout Shift (0.112); Avoid large layout shifts (1 layout shift found); Serve static assets with an efficient cache policy (34 resources found); Eliminate render-blocking resources (Est savings of 600 ms); Minify CSS (Est savings of 18 KiB); Minify JavaScript (Est savings of 25 KiB); Reduce unused CSS (Est savings of 39 KiB); Reduce unused JavaScript (Est savings of 33 KiB); Enable text compression (Est savings of 124 KiB); Use efficient cache lifetimes (Est savings of 198 KiB); Layout shift culprits; Document request latency (Est savings of 5 KiB); Network dependency tree; Render blocking requests.
- **home, desktop:** First Contentful Paint: 0.5 s; Largest Contentful Paint: 0.5 s; Total Blocking Time: 0 ms; Cumulative Layout Shift: 0. Below 90: Serve static assets with an efficient cache policy (30 resources found); Eliminate render-blocking resources (Est savings of 160 ms); Minify CSS (Est savings of 18 KiB); Minify JavaScript (Est savings of 17 KiB); Reduce unused CSS (Est savings of 31 KiB); Enable text compression (Est savings of 88 KiB); Use efficient cache lifetimes (Est savings of 128 KiB); Document request latency (Est savings of 10 KiB); Network dependency tree; Render blocking requests.
- **catalog, desktop:** First Contentful Paint: 0.5 s; Largest Contentful Paint: 0.6 s; Total Blocking Time: 0 ms; Cumulative Layout Shift: 0.041. Below 90: Largest Contentful Paint image was lazily loaded; Serve static assets with an efficient cache policy (39 resources found); Eliminate render-blocking resources (Est savings of 120 ms); Minify CSS (Est savings of 18 KiB); Minify JavaScript (Est savings of 26 KiB); Reduce unused CSS (Est savings of 35 KiB); Enable text compression (Est savings of 103 KiB); Use efficient cache lifetimes (Est savings of 162 KiB); Document request latency (Est savings of 6 KiB); LCP request discovery; Network dependency tree; Render blocking requests.
- **product, desktop:** First Contentful Paint: 0.5 s; Largest Contentful Paint: 0.6 s; Total Blocking Time: 0 ms; Cumulative Layout Shift: 0. Below 90: Serve static assets with an efficient cache policy (32 resources found); Eliminate render-blocking resources (Est savings of 120 ms); Minify CSS (Est savings of 18 KiB); Minify JavaScript (Est savings of 23 KiB); Reduce unused CSS (Est savings of 38 KiB); Reduce unused JavaScript (Est savings of 21 KiB); Enable text compression (Est savings of 116 KiB); Use efficient cache lifetimes (Est savings of 188 KiB); Document request latency (Est savings of 3 KiB); Network dependency tree; Render blocking requests.
- **cart, desktop:** First Contentful Paint: 0.5 s; Largest Contentful Paint: 0.6 s; Total Blocking Time: 0 ms; Cumulative Layout Shift: 0. Below 90: Serve static assets with an efficient cache policy (34 resources found); Eliminate render-blocking resources (Est savings of 120 ms); Minify CSS (Est savings of 18 KiB); Minify JavaScript (Est savings of 25 KiB); Reduce unused CSS (Est savings of 39 KiB); Reduce unused JavaScript (Est savings of 33 KiB); Enable text compression (Est savings of 124 KiB); Use efficient cache lifetimes (Est savings of 198 KiB); Document request latency (Est savings of 5 KiB); Network dependency tree; Render blocking requests.

