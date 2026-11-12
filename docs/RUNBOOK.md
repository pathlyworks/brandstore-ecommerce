# Launch Runbook — what only you can do

The code, the checks that can run offline, and the report skeleton are done. The steps below need a
real browser, a real account or a real screen reader. Each one ends with the evidence to paste into
`LAUNCH_REPORT.md` (the places marked `TO FILL`). Do not paste numbers you did not see.

## 1. Deploy (pick one, about 5 minutes)

**Netlify Drop (no account setup beyond sign-in):** run `npm run build`, go to https://app.netlify.com/drop
and drag the `dist/` folder onto the page. `dist/_headers` carries the security headers. (A Git-connected
Netlify site runs `npm run build` and publishes `dist/` itself, from `netlify.toml`.)
Note the URL, e.g. `https://your-name.netlify.app`. You can rename it under Site configuration.

**GitHub Pages:** push the repo, then Settings > Pages > Deploy from branch > `main` / root. The URL is
`https://<user>.github.io/<repo>`. `.nojekyll` is already included. Note that GitHub Pages ignores
`netlify.toml`, so the security headers are Netlify-only; the site still works.

## 2. Put the real URL into the files (canonical, Open Graph, sitemap, robots)

```bash
node scripts/set-site-url.js https://your-name.netlify.app      # or https://user.github.io/repo
node qa/preflight.js --release        # must end with: failed 0   (it fails while the placeholder host remains)
```
Commit and redeploy (`npm run build` and drag `dist/` again on Netlify Drop, or `git push`).

## 3. Smoke test the live site
Open the URL; check the landing page, `/comparison.html`, and `/typo` (should show the 404 page on Netlify;
GitHub Pages serves `404.html` too). Run `node qa/headers.js` locally to see the headers Netlify should send;
on the live site, DevTools > Network > click the document > Headers.

## 4. Lighthouse (Chrome DevTools > Lighthouse tab)
Mode: Navigation, Device: Mobile, categories: all four. Run it on the live landing page, then on
`/comparison.html`. Use an Incognito window (extensions skew scores). Target: Accessibility >= 90, SEO >= 90.
Save the report (the three-dot menu > Save as HTML) and paste the four scores into the report.
If something is under 90, read the failing audit; send me the audit names and I will fix them.

## 5. axe DevTools (browser extension)
Open the live landing page > DevTools > axe DevTools > Scan ALL of my page. Also scan `/comparison.html`.
Record: number of Critical / Serious / Moderate / Minor issues. Success criterion: no Critical.
Also run it once with the mobile menu open (narrow the window below 1024px, open the menu, scan again).

## 6. Screen reader pass on the landing page (15 minutes, one of NVDA / VoiceOver / TalkBack)
- NVDA (Windows, free): start NVDA, open the page in Firefox or Chrome.
- VoiceOver (Mac): Cmd+F5, Safari. TalkBack (Android): Settings > Accessibility > TalkBack, Chrome.

Script, with what should be spoken:
1. Page load: title "BrandStore - ..." is read. Press Tab once: "Skip to main content" (link). Press Enter: focus moves to main content.
2. Landmarks: list them (NVDA: D key / rotor): banner, 2 navigation (named), main, contentinfo. 
3. Headings (H key / rotor): one level 1, then level 2 section headings in order, no jumps.
4. Filter buttons: each is read as "<name>, toggle button, pressed / not pressed". Activate one: a status sentence such as "Showing 2 of 3 products" is announced.
5. Deals strip: the region is announced as "Launch offers, scrollable list"; previous/next buttons are read with names; the disabled end is announced as unavailable.
6. Newsletter: Tab into the field (label "Email address", hint is read). Submit empty: an error is announced immediately without moving away. Type a valid address, submit: the success message is announced.
7. Mobile menu (narrow window): the toggle announces "expanded / collapsed".
Write one line per step: what was said, and anything confusing. A step that fails is a finding, not a failure of you; log it.

## 7. Other browsers
Open the live landing page and `/comparison.html` in Firefox and Safari (or Edge). In each: layout looks right at a wide and a
narrow window, filter works, newsletter shows an error then a success, menu opens at narrow width. Fill the matrix row in the report
with PASS / FAIL and a note. If you have a real phone, repeat on it (the six Chrome rows were emulated).

## 8. Fill the report
Open `LAUNCH_REPORT.md`, replace each `TO FILL` with your result, put the live URL at the top, then export to PDF
(Print > Save as PDF, or paste into a doc). Keep it to two pages.
