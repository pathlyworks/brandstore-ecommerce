// End-to-end behaviour test for Task 4: data-driven rendering, XSS safety,
// filter, mobile nav aria-expanded, newsletter validation and announcements.
// Usage: node qa/behaviour.js [projectRoot]    Needs: playwright
const { chromium } = require('playwright'); const fs = require('fs'), os = require('os'), path = require('path');
const root = process.argv[2] || path.resolve(__dirname, '..');
let fails = 0; const check = (ok, msg, extra = '') => { if (!ok) fails++; console.log(ok ? 'PASS' : 'FAIL', msg, extra); };
const { siteBase } = require('./serve');
const url = async (r, p) => (await siteBase(r)) + '/' + p; // ES modules need http, not file://

(async () => {
  const b = await chromium.launch();
  const open = async (r, page = 'index.html', w = 1280) => { const p = await b.newPage({ viewport: { width: w, height: 900 } }); p.errs = []; p.on('console', m => m.type() === 'error' && p.errs.push(m.text())); p.on('pageerror', e => p.errs.push(String(e))); await p.goto(await url(r, page)); await p.waitForTimeout(400); return p; };

  // 1. rendering from data
  let p = await open(root);
  const data = await p.evaluate(() => import('/src/state/content.js').then((m) => JSON.parse(JSON.stringify({ products: m.products, testimonials: m.testimonials }))));
  const dom = await p.evaluate(() => ({
    names: [...document.querySelectorAll('.product-card__title')].map(e => e.textContent),
    prices: [...document.querySelectorAll('.product-card__price')].map(e => e.textContent),
    cats: [...document.querySelectorAll('.product-card')].map(e => e.dataset.category),
    quotes: [...document.querySelectorAll('.testimonial__quote p')].map(e => e.textContent),
    authors: [...document.querySelectorAll('.testimonial cite')].map(e => e.textContent),
    filters: [...document.querySelectorAll('.filter__btn')].map(e => e.textContent + ':' + e.getAttribute('aria-pressed')),
    srcset: document.querySelector('.product-card__image').getAttribute('srcset'),
    containersEmptyInSource: true }));
  const src = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  check(JSON.stringify(dom.names) === JSON.stringify(data.products.map(x => x.name)), 'product names come from src/state/content.js', dom.names.length + ' cards');
  check(dom.prices.join() === '$199.99,$149.99,$89.99', 'prices formatted by Intl.NumberFormat', dom.prices.join(' '));
  check(dom.quotes.length === data.testimonials.length && dom.quotes[0].includes(data.testimonials[0].quote), 'testimonials come from src/state/content.js', dom.quotes.length + ' cards');
  check(dom.filters.join() === 'All Products:true,Electronics:false,Accessories:false', 'filter buttons derived from product categories', dom.filters.join(' | '));
  check(!/Wireless Headphones Pro|Sarah M\./.test(src.replace(/<noscript>[\s\S]*?<\/noscript>/g, '')), 'index.html source contains no product or testimonial text');
  check(p.errs.length === 0, 'no console errors on index', p.errs.join('|'));
  await p.close();

  // 2. injection probe: markup-looking data must stay text
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bs-')); fs.cpSync(root, tmp, { recursive: true, filter: s => !s.includes('.git') });
  let d = fs.readFileSync(path.join(tmp, 'src/state/content.js'), 'utf8');
  d = d.replace("name: 'Wireless Headphones Pro'", "name: '<img src=x onerror=\"window.__pwned=1\">Bold <b>name</b>'").replace("author: 'Sarah M.'", "author: '<script>window.__pwned=2<\\/script>Sarah'");
  fs.writeFileSync(path.join(tmp, 'src/state/content.js'), d);
  p = await open(tmp); await p.waitForTimeout(300);
  const x = await p.evaluate(() => ({ pwned: window.__pwned, title: document.querySelector('.product-card__title').textContent, kids: document.querySelector('.product-card__title').children.length, authorKids: document.querySelector('.testimonial cite').children.length, scriptsInCite: document.querySelectorAll('.testimonial script').length }));
  check(x.pwned === undefined && x.kids === 0 && x.authorKids === 0 && x.scriptsInCite === 0 && x.title.startsWith('<img'), 'markup in data is shown as text, never executed', JSON.stringify(x));
  await p.close(); fs.rmSync(tmp, { recursive: true, force: true });

  // 3. filter
  p = await open(root);
  const vis = () => p.evaluate(() => ({ shown: [...document.querySelectorAll('.product-card')].filter(c => !c.hidden).length, pressed: [...document.querySelectorAll('.filter__btn')].filter(c => c.getAttribute('aria-pressed') === 'true').map(c => c.textContent), status: document.querySelector('#filter-status').textContent }));
  check((await vis()).status === '', 'filter status is empty on load (nothing announced)');
  await p.click('.filter__btn[data-filter="Accessories"]'); let v = await vis();
  check(v.shown === 1 && v.pressed.join() === 'Accessories' && v.status === 'Showing 1 of 3 products in Accessories.', 'Accessories filter', JSON.stringify(v));
  await p.click('.filter__btn[data-filter="Electronics"]'); v = await vis();
  check(v.shown === 2 && v.status === 'Showing 2 of 3 products in Electronics.', 'Electronics filter', v.status);
  await p.focus('.filter__btn[data-filter="all"]'); await p.keyboard.press('Enter'); v = await vis();
  check(v.shown === 3 && v.status === 'Showing all 3 products.', 'All filter via keyboard (Enter)', v.status);
  await p.click('[data-filter-link="Accessories"]'); v = await vis(); check(v.shown === 1, 'category card pre-filters featured grid', v.status);
  await p.click('[data-filter-link="Apparel"]'); v = await vis(); check(v.shown === 3, 'category without products shows all', v.status);
  await p.close();

  // 4. nav aria-expanded
  p = await open(root, 'index.html', 375);
  const exp = () => p.getAttribute('.nav__toggle', 'aria-expanded');
  await p.focus('.nav__toggle'); await p.keyboard.press('Enter'); check(await exp() === 'true', 'Enter opens menu -> aria-expanded=true');
  await p.keyboard.press('Escape'); check(await exp() === 'false' && await p.evaluate(() => document.activeElement.classList.contains('nav__toggle')), 'Escape closes and refocuses the button');
  await p.keyboard.press('Space'); check(await exp() === 'true', 'Space opens menu');
  await p.mouse.click(300, 700); check(await exp() === 'false', 'click outside closes menu');
  await p.click('.nav__toggle'); await p.setViewportSize({ width: 1280, height: 900 }); await p.waitForTimeout(200);
  check(await exp() === 'false', 'growing to desktop resets aria-expanded to false');
  await p.close();

  // 5. newsletter
  p = await open(root, 'index.html', 375);
  const cases = [['', 'Enter your email address.'], ['   ', 'Enter your email address.'], ['abc', 'Add an “@” to the email address, like name@example.com.'], ['a@', 'Add the part after the “@”, like example.com.'], ['@b.com', 'Add the part before the “@”, like name.'], ['a@@b.com', 'Use only one “@” in the email address.'], ['a b@c.com', 'Remove the spaces from the email address.'], ['a@b', 'The part after the “@” needs a dot, like example.com.'], ['a@b..com', 'Check the domain after the “@”: no empty parts between dots and no unusual characters.'], ['a@b.com.', 'Check the domain after the “@”: no empty parts between dots and no unusual characters.'], ['a'.repeat(115) + '@b.com', 'That address is too long. Use 120 characters or fewer.'], ['ahmed@example.com', ''], ['first.last+tag@sub.example.co.uk', '']];
  for (const [input, expected] of cases) { const got = await p.evaluate(async v => (await import('/src/utils/validate.js')).getEmailError(v), input); check(got === expected, `validator ${JSON.stringify(input.length > 20 ? input.slice(0, 8) + '…' : input)}`, got === expected ? '' : `got ${JSON.stringify(got)}`); }
  await p.locator('#newsletter').scrollIntoViewIfNeeded();
  await p.fill('#newsletter-email', 'abc'); await p.click('.newsletter__form .btn'); await p.waitForTimeout(200);
  let f = await p.evaluate(() => ({ err: document.querySelector('#newsletter-error').textContent, invalid: document.querySelector('#newsletter-email').getAttribute('aria-invalid'), focus: document.activeElement.id, role: document.querySelector('#newsletter-error').getAttribute('role'), desc: document.querySelector('#newsletter-email').getAttribute('aria-describedby'), visible: !!document.querySelector('#newsletter-error').offsetHeight, noValidate: document.querySelector('.newsletter__form').noValidate }));
  check(f.err.startsWith('Add an') && f.invalid === 'true' && f.focus === 'newsletter-email' && f.role === 'alert' && f.desc.includes('newsletter-error') && f.visible && f.noValidate, 'invalid submit: specific, visible, role=alert, aria-invalid, described-by, focus on field', JSON.stringify(f));
  await p.fill('#newsletter-email', 'abc@example.com'); await p.waitForTimeout(100);
  f = await p.evaluate(() => ({ err: document.querySelector('#newsletter-error').textContent, invalid: document.querySelector('#newsletter-email').hasAttribute('aria-invalid') }));
  check(f.err === '' && !f.invalid, 'fixing the field clears the error immediately', JSON.stringify(f));
  await p.click('.newsletter__form .btn'); await p.waitForTimeout(200);
  f = await p.evaluate(() => ({ ok: document.querySelector('#newsletter-success').textContent, role: document.querySelector('#newsletter-success').getAttribute('role'), value: document.querySelector('#newsletter-email').value, btn: document.querySelector('.newsletter__form .btn').textContent, dis: document.querySelector('.newsletter__form .btn').disabled, err: document.querySelector('#newsletter-error').textContent }));
  check(f.ok === 'Thanks for subscribing! We sent a confirmation to abc@example.com.' && f.role === 'status' && f.value === '' && f.btn === 'Subscribed' && f.dis && f.err === '', 'valid submit: role=status success, field cleared, button locked', JSON.stringify(f));
  await p.type('#newsletter-email', 'x'); await p.waitForTimeout(100);
  f = await p.evaluate(() => ({ dis: document.querySelector('.newsletter__form .btn').disabled, btn: document.querySelector('.newsletter__form .btn').textContent, ok: document.querySelector('#newsletter-success').textContent }));
  check(!f.dis && f.btn === 'Subscribe' && f.ok === '', 'typing again re-enables the button and clears the success message', JSON.stringify(f));
  // same error twice is re-announced (text cleared then set again)
  await p.fill('#newsletter-email', 'abc'); const changes = await p.evaluate(() => new Promise(res => { const e = document.querySelector('#newsletter-error'); let n = 0; new MutationObserver(() => n++).observe(e, { childList: true, characterData: true, subtree: true }); const btn = document.querySelector('.newsletter__form .btn'); btn.click(); setTimeout(() => { btn.click(); setTimeout(() => res(n), 300); }, 250); }));
  check(changes >= 3, 'identical error submitted twice is re-announced (live-region mutations)', changes + ' mutations');
  // regression: an invalid submit followed by a valid one inside the re-announce window
  await p.reload(); await p.waitForTimeout(300);
  const raced = await p.evaluate(() => new Promise(res => { const f = document.querySelector('.newsletter__form'), i = document.querySelector('#newsletter-email'); i.value = 'bad'; f.requestSubmit(); i.value = 'ok@example.com'; f.requestSubmit(); setTimeout(() => res({ err: document.querySelector('#newsletter-error').textContent, ok: document.querySelector('#newsletter-success').textContent }), 300); }));
  check(raced.err === '' && raced.ok.startsWith('Thanks'), 'regression: stale error never appears after a successful submit', JSON.stringify(raced));
  const typed = await p.evaluate(() => new Promise(res => { const f = document.querySelector('.newsletter__form'), i = document.querySelector('#newsletter-email'); i.value = 'bad'; f.requestSubmit(); i.value = 'fixed@example.com'; i.dispatchEvent(new Event('input', { bubbles: true })); setTimeout(() => res(document.querySelector('#newsletter-error').textContent), 300); }));
  check(typed === '', 'regression: fixing the field inside the window leaves no stale error', JSON.stringify(typed));
  check(p.errs.length === 0, 'no console errors during form use', p.errs.join('|'));
  await p.close();

  // 6. comparison page
  p = await open(root, 'comparison.html', 375);
  await p.click('#highlight-diff-btn'); const n = await p.locator('.comparison-table__row--diff').count();
  check(n === 6 && await p.getAttribute('#highlight-diff-btn', 'aria-pressed') === 'true', 'comparison highlight marks differing rows', n + ' rows');
  check(p.errs.length === 0, 'no console errors on comparison', p.errs.join('|')); await p.close();
  await b.close(); console.log('FAILS:', fails); process.exit(fails ? 1 : 0);
})();
