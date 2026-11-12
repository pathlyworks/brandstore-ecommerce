// Pre-flight audit for the accessibility + SEO baseline. These are OUR OWN checks, written to
// cover the same ground as Lighthouse (accessibility, SEO) and axe-core. They are NOT a
// Lighthouse score and NOT an axe scan; run those tools on the live URL (see docs/RUNBOOK.md).
// Every rule names the Lighthouse / axe rule it mirrors.
//   node qa/preflight.js [projectRoot] [--release]
// --release additionally fails while the placeholder site URL is still in the files.
// Needs: playwright + a Chromium build.
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const { siteBase } = require('./serve');
const root = process.argv.find((a, i) => i >= 2 && !a.startsWith('--')) || path.resolve(__dirname, '..');
const release = process.argv.includes('--release');
const PLACEHOLDER_HOST = 'https://brandstore.example';
const allPages = fs.readdirSync(root).filter(f => f.endsWith('.html')).sort();
const pages = allPages.filter(f => f !== '404.html'); // indexable pages (SEO checks)
let fails = 0, passes = 0; const out = [];
const check = (ok, rule, msg) => { ok ? passes++ : fails++; out.push(`${ok ? 'PASS' : 'FAIL'}  ${rule}  ${msg}`); };
const read = (f) => fs.existsSync(path.join(root, f)) ? fs.readFileSync(path.join(root, f), 'utf8') : null;

(async () => {
  const b = await chromium.launch(); const meta = {};
  for (const pg of allPages) {
    const tag = pg;
    for (const w of [375, 1280]) {
      const p = await b.newPage({ viewport: { width: w, height: 900 } });
      await p.goto((await siteBase(root)) + '/' + pg); await p.waitForTimeout(500);
      const d = await p.evaluate(() => {
        const q = (s) => [...document.querySelectorAll(s)];
        const named = (el) => (el.getAttribute('aria-label') || '').trim() || (el.getAttribute('aria-labelledby') ? el.getAttribute('aria-labelledby').split(/\s+/).map(i => (document.getElementById(i) || {}).textContent || '').join(' ').trim() : '') || (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`) ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`).textContent.trim() : '') || (el.closest('label') ? el.closest('label').textContent.trim() : '') || (el.textContent || '').trim() || (el.querySelector('img[alt]') ? el.querySelector('img[alt]').alt.trim() : '') || (el.getAttribute('title') || '').trim();
        const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden'; };
        const heads = q('h1,h2,h3,h4,h5,h6').filter(visible).map(h => ({ l: +h.tagName[1], t: h.textContent.trim().slice(0, 30) }));
        const ids = q('[id]').map(e => e.id); const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
        const refs = []; q('[aria-labelledby],[aria-describedby],[aria-controls]').forEach(e => ['aria-labelledby', 'aria-describedby', 'aria-controls'].forEach(a => (e.getAttribute(a) || '').split(/\s+/).filter(Boolean).forEach(id => { if (!document.getElementById(id)) refs.push(a + '->' + id); })));
        const interactive = q('a[href],button,input:not([type=hidden]),select,textarea,[role=button],[tabindex="0"]').filter(visible);
        const unnamed = interactive.filter(e => !named(e)).map(e => e.tagName + '.' + e.className);
        const hiddenFocusable = q('[aria-hidden="true"] a, [aria-hidden="true"] button, [aria-hidden="true"] input').map(e => e.className);
        const imgs = q('img'); const noAlt = imgs.filter(i => !i.hasAttribute('alt')).map(i => i.src);
        const badTab = q('[tabindex]').filter(e => Number(e.getAttribute('tabindex')) > 0).length;
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let total = 0, small = 0;
        while (walker.nextNode()) { const n = walker.currentNode; const t = n.textContent.trim(); if (!t) continue; const el = n.parentElement; if (!visible(el) || el.closest('.u-visually-hidden')) continue; total += t.length; if (parseFloat(getComputedStyle(el).fontSize) < 12) small += t.length; }
        const badLinks = q('a').filter(a => { const h = a.getAttribute('href'); return !h || /^javascript:/i.test(h); }).length;
        const mv = (document.querySelector('meta[name=viewport]') || {}).content || '';
        const roles = q('[role]').map(e => e.getAttribute('role')); const validRoles = ['alert','status','group','region','button','list','listitem','navigation','banner','main','contentinfo','img','presentation','none','carousel'];
        return { lang: document.documentElement.lang, title: document.title, mv, heads, dup, refs, unnamed, hiddenFocusable, noAlt, badTab, smallPct: total ? Math.round(small / total * 100) : 0, badLinks, badRoles: roles.filter(r => !validRoles.includes(r)),
          landmarks: { main: q('main').length, header: q('body > header').length, footer: q('body > footer').length, navs: q('nav').length, navsUnlabelled: q('nav:not([aria-label]):not([aria-labelledby])').length },
          skip: (() => { const a = document.querySelector('a.skip-link'); return a ? { first: q('a[href],button,input').find(visible || (() => true)) === a || q('a[href],button,input')[0] === a, target: !!document.querySelector(a.getAttribute('href')) } : null; })(),
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      });
      const id = `${tag}@${w}`;
      check(d.lang === 'en', 'html-has-lang (axe) / html-lang-valid', id);
      check(d.title.trim().length > 0, 'document-title (axe/Lighthouse)', `${id} "${d.title}"`);
      check(!/user-scalable\s*=\s*(no|0)/i.test(d.mv) && !/maximum-scale\s*=\s*[0-4](\.|,|$)/i.test(d.mv), 'meta-viewport (axe/Lighthouse): zoom not blocked', `${id} "${d.mv}"`);
      check(d.landmarks.main === 1 && d.landmarks.header === 1 && d.landmarks.footer === 1, 'landmark-one-main / region (axe): 1 main, banner, contentinfo', `${id} ${JSON.stringify(d.landmarks)}`);
      check(d.landmarks.navsUnlabelled === 0, 'landmark-unique (axe): every nav labelled', id);
      const h1 = d.heads.filter(h => h.l === 1).length; check(h1 === 1, 'page-has-heading-one / single h1', `${id} h1 count ${h1}`);
      let skipped = null; d.heads.forEach((h, i) => { if (i > 0 && h.l > d.heads[i - 1].l + 1 && !skipped) skipped = `${d.heads[i - 1].t}(h${d.heads[i - 1].l}) -> ${h.t}(h${h.l})`; });
      check(!skipped, 'heading-order (axe): no skipped levels', `${id} ${skipped || d.heads.map(h => 'h' + h.l).join('')}`);
      check(d.dup.length === 0, 'duplicate-id (axe)', `${id} ${d.dup.join(',')}`);
      check(d.refs.length === 0, 'aria-valid-attr-value (axe): ids referenced exist', `${id} ${d.refs.join(',')}`);
      check(d.unnamed.length === 0, 'link-name / button-name / label (axe, Lighthouse): every control has a name', `${id} ${d.unnamed.join(',')}`);
      check(d.noAlt.length === 0, 'image-alt (axe/Lighthouse)', `${id} ${d.noAlt.join(',')}`);
      check(d.hiddenFocusable.length === 0, 'aria-hidden-focus (axe)', id);
      check(d.badTab === 0, 'tabindex (axe): none above 0', id);
      check(d.badRoles.length === 0, 'aria-roles (axe): known roles', `${id} ${d.badRoles.join(',')}`);
      check(d.skip && d.skip.first && d.skip.target, 'bypass / skip-link (axe, Lighthouse): first focusable, target exists', `${id} ${JSON.stringify(d.skip)}`);
      check(d.smallPct <= 40, 'font-size (Lighthouse SEO): at least 60% of text is 12px or larger', `${id} ${d.smallPct}% under 12px`);
      check(d.badLinks === 0, 'crawlable-anchors (Lighthouse SEO)', id);
      check(d.overflow <= 0, 'reflow (WCAG 1.4.10): no horizontal scroll', `${id} overflow ${d.overflow}px`);
      if (w === 375) meta[pg] = d;
      await p.close();
    }
    // reflow at 320px and text enlarged to 200%
    for (const [label, vw, fs] of [['320px reflow', 320, null], ['200% text', 1280, '200%']]) {
      const p = await b.newPage({ viewport: { width: vw, height: 900 } }); await p.goto((await siteBase(root)) + '/' + pg); await p.waitForTimeout(400);
      if (fs) await p.addStyleTag({ content: `html{font-size:${fs} !important}` });
      await p.waitForTimeout(200);
      const o = await p.evaluate(() => ({ over: document.documentElement.scrollWidth - document.documentElement.clientWidth, clipped: [...document.querySelectorAll('h1,h2,h3,p,a,button,label')].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > innerWidth + 1) && !e.closest('[data-scroll-region], .table-scroll, .deals__viewport'); }).map(e => e.className || e.tagName).slice(0, 3) }));
      check(o.over <= 0 && o.clipped.length === 0, `resize-text / reflow (WCAG 1.4.4, 1.4.10): ${label}`, `${pg} overflow ${o.over}px ${o.clipped.join(',')}`); await p.close();
    }
  }
  await b.close();

  // ---- SEO / sharing (static) ----
  const titles = [], descs = [];
  for (const pg of allPages) { // title, description, Open Graph and h1 rules apply to every page, 404 included
    const is404 = pg === '404.html';
    const h = read(pg); const t = (h.match(/<title>([^<]*)<\/title>/) || [])[1] || ''; const dsc = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
    titles.push(t); descs.push(dsc);
    check((h.match(/<h1[\s>]/g) || []).length === 1, 'single h1 per page (source HTML)', pg);
    check(t.length >= 10 && t.length <= 70, 'document-title length 10-70 (SEO best practice)', `${pg} ${t.length} chars`);
    check(dsc.length >= 50 && dsc.length <= 160, 'meta-description (Lighthouse SEO): present, 50-160 chars', `${pg} ${dsc.length} chars`);
    const og = (p2) => (h.match(new RegExp(`<meta property="${p2}" content="([^"]*)"`)) || [])[1];
    for (const k of ['og:title', 'og:description', 'og:type', 'og:url', 'og:image', 'og:image:alt', 'og:site_name']) check(!!og(k), `open-graph ${k}`, pg);
    check(/<meta name="twitter:card" content="summary_large_image"/.test(h), 'twitter:card', pg);
    if (is404) check(/<meta name="robots" content="noindex"/.test(h), '404 page is noindex (kept out of search results)', pg);
    else { const can = (h.match(/<link rel="canonical" href="([^"]*)"/) || [])[1]; check(!!can && /^https:\/\//.test(can), 'canonical (Lighthouse SEO): absolute https URL', `${pg} ${can}`);
    check(/<link rel="icon"/.test(h), 'favicon link', pg);
    check(!/noindex/i.test(h), 'is-crawlable (Lighthouse SEO): no noindex', pg); }
    // og:image sits in the site root, whatever the URL prefix (GitHub Pages adds /repo/)
    const ogi = og('og:image'); if (ogi) { const f = path.basename(new URL(ogi).pathname); const buf = fs.existsSync(path.join(root, f)) ? fs.readFileSync(path.join(root, f)) : null; const okp = buf && buf.slice(1, 4).toString() === 'PNG' && buf.readUInt32BE(16) === 1200 && buf.readUInt32BE(20) === 630; check(okp, 'og:image file exists and is a 1200x630 PNG', `${pg} ${f}`); }
    if (release) check(!h.includes(PLACEHOLDER_HOST), 'release: placeholder site URL replaced', pg);
  }
  check(new Set(titles).size === titles.length, 'unique <title> per page', titles.join(' | '));
  check(new Set(descs).size === descs.length, 'unique meta description per page', `${descs.length} pages`);
  const robots = read('robots.txt'); check(!!robots && /User-agent:\s*\*/i.test(robots) && /Sitemap:\s*https:\/\//i.test(robots), 'robots.txt (Lighthouse SEO): valid, lists the sitemap', robots ? 'present' : 'missing');
  const sm = read('sitemap.xml'); const locs = sm ? [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]) : [];
  check(locs.length === pages.length && pages.every(pg => locs.some(l => l.endsWith(pg === 'index.html' ? '/' : '/' + pg) )), 'sitemap.xml lists every page', `${locs.length} urls`);
  check(fs.existsSync(path.join(root, '404.html')), 'custom 404 page present', '');
  // internal links resolve
  const broken = []; for (const pg of pages) { const h = read(pg); for (const m of h.matchAll(/(?:href|src)="([^"#:][^"]*?)(#[^"]*)?"/g)) { const f = m[1].split('?')[0]; if (/^(https?:|mailto:|tel:)/.test(f)) continue; if (!fs.existsSync(path.join(root, f))) broken.push(pg + ':' + f); } for (const m of h.matchAll(/href="(?:[\w.]+)?#([\w-]+)"/g)) { if (!new RegExp(`id="${m[1]}"`).test(read(m[0].match(/href="([\w.]+)#/) ? m[0].match(/href="([\w.]+)#/)[1] : pg) || '')) broken.push(pg + ':#' + m[1]); } }
  check(broken.length === 0, 'internal links, files and anchors resolve', broken.join(','));
  out.forEach(l => console.log(l)); console.log(`\npassed ${passes}, failed ${fails}`); process.exit(fails ? 1 : 0);
})();
