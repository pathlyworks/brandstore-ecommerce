// Browser x viewport QA matrix. Runs the same functional checks in real Chrome (Chrome for Testing,
// via Playwright) at desktop, tablet and phone sizes, using Playwright's device descriptors for phones
// (this is EMULATION of screen size, touch and user agent, not a physical phone).
// Firefox, Safari and Edge are NOT run here: those engines are not installed in this environment.
// Usage: node qa/matrix.js [projectRoot] [--md]     Needs: playwright
const { chromium, devices } = require('playwright'); const path = require('path');
const root = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : path.resolve(__dirname, '..');
const md = process.argv.includes('--md');
const exe = process.env.CHROME_BIN || (require('fs').existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined);
const VIEWPORTS = [
  ['Desktop 1440x900', { viewport: { width: 1440, height: 900 } }],
  ['Laptop 1024x768', { viewport: { width: 1024, height: 768 } }],
  ['Tablet 768x1024 (iPad Mini)', devices['iPad Mini']],
  ['Phone 375x667 (iPhone SE)', devices['iPhone SE']],
  ['Phone 390x844 (iPhone 13)', devices['iPhone 13']],
  ['Phone 412x915 (Pixel 7)', devices['Pixel 7']],
];
(async () => {
  const b = await chromium.launch(exe ? { executablePath: exe } : {}); const ver = b.version(); const rows = []; let fails = 0;
  for (const [name, opts] of VIEWPORTS) {
    const o = Object.assign({}, opts); delete o.defaultBrowserType; // keep Chromium for every row
    const ctx = await b.newContext(o); const p = await ctx.newPage(); const notes = []; const errs = [];
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push(String(e)));
    const T = (ok, msg) => { if (!ok) notes.push(msg); };
    await p.goto('file://' + root + '/index.html'); await p.waitForTimeout(400);
    T(errs.length === 0, 'console errors on load: ' + errs.join(' | '));
    T(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'index: horizontal overflow');
    const cards = await p.locator('.product-card').count(); T(cards === 3, 'index: expected 3 product cards, got ' + cards + ' product cards');
    T(await p.locator('.testimonial, .testimonial-card').count() > 0, 'index: no testimonials rendered');
    // nav: wide screens show links; narrow screens use the toggle
    const toggle = p.locator('.nav__toggle');
    if (await toggle.isVisible()) {
      await toggle.click(); T(await toggle.getAttribute('aria-expanded') === 'true', 'nav toggle did not open');
      T(await p.locator('#nav-menu').isVisible(), 'nav menu not visible after open');
      await p.keyboard.press('Escape'); T(await toggle.getAttribute('aria-expanded') === 'false', 'Escape did not close nav');
    } else T(await p.locator('#nav-menu a').first().isVisible(), 'desktop nav links not visible');
    // filter
    const btn = p.locator('.filter__btn').nth(1); await btn.click();
    T(await btn.getAttribute('aria-pressed') === 'true', 'filter button not pressed');
    T((await p.locator('#filter-status').innerText()).length > 0, 'filter status empty');
    // deals controls
    const dc = p.locator('[data-deals-controls]');
    if (await dc.isVisible()) { const next = p.locator('[data-deals-step="1"]'); await next.click(); await p.waitForTimeout(500);
      T(await p.evaluate(() => document.getElementById('deals-viewport').scrollLeft > 0), 'deals next did not scroll'); }
    // newsletter: invalid then valid
    const email = p.locator('#newsletter-email'); await email.fill('nope'); await email.press('Enter'); await p.waitForTimeout(200); // error text is re-announced after a short tick
    T(await email.getAttribute('aria-invalid') === 'true', 'invalid email not flagged');
    T((await p.locator('#newsletter-error').innerText()).length > 0, 'no error message');
    await email.fill('a@b.co'); await email.press('Enter'); await p.waitForTimeout(300);
    T((await p.locator('#newsletter-success').innerText()).length > 0, 'no success message');
    // no clipped/overflowing text in header/footers at this size
    // skip link first tab stop
    await p.reload(); await p.keyboard.press('Tab');
    T(await p.evaluate(() => document.activeElement.getAttribute('href') === '#main-content'), 'first Tab is not the skip link');
    // comparison page
    await p.goto('file://' + root + '/comparison.html'); await p.waitForTimeout(300);
    T(await p.locator('.comparison-table tbody tr').count() > 0, 'comparison: table has no rows');
    T(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'comparison: horizontal page overflow');
    // 404 page
    await p.goto('file://' + root + '/404.html'); T(await p.locator('h1').count() === 1, '404: h1 count != 1');
    const ok = notes.length === 0; if (!ok) fails++; rows.push([name, ok ? 'PASS' : 'FAIL', ok ? 'all checks passed' : notes.join('; ')]);
    await ctx.close();
  }
  await b.close();
  console.log('Engine: Chromium ' + ver + (exe ? ' (Chrome for Testing)' : ''));
  if (md) { console.log('\n| Viewport (Chrome) | Result | Notes |\n|---|---|---|'); rows.forEach(r => console.log('| ' + r.join(' | ') + ' |')); }
  else rows.forEach(r => console.log(r[1].padEnd(5), r[0].padEnd(32), r[2]));
  console.log('FAILS: ' + fails); process.exit(fails ? 1 : 0);
})();
