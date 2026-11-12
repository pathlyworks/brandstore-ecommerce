# End-to-end tests

`run.mjs` drives the real pages in a browser with the Playwright library: 9 journeys covering every
interactive feature on the site, at a desktop and a phone size. Run with `npm run e2e`
(first time: `npx playwright install chromium`). More engines:
`E2E_BROWSERS=chromium,firefox,webkit npm run e2e`. Test the build output: `npm run build` then
`E2E_DIST=1 npm run e2e`. The API journeys in docs/TEST_PLAN.md section 4 are added with those features.
