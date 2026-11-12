// Text contrast audit from the rendered DOM (WCAG 1.4.3). Skips visually-hidden
// text and disabled controls (exempt). Usage: node qa/contrast.js [projectRoot]
const { chromium } = require('playwright'); const root = process.argv[2] || require('path').resolve(__dirname, '..');
const { siteBase } = require('./serve');
(async () => { const b = await chromium.launch(); const all = [];
 for (const pg of ['index', 'comparison']) for (const w of [375, 1280]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce' });
  await p.goto((await siteBase(root)) + '/' + pg + '.html'); await p.waitForTimeout(500);
  if (w === 375) { await p.click('.nav__toggle'); await p.waitForTimeout(100); }
  const res = await p.evaluate(() => {
    const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return [0,0,0,0]; const a = m[1].split(/[ ,/]+/).map(Number); return [a[0], a[1], a[2], a[3] === undefined ? 1 : a[3]]; };
    const over = (top, bot) => { const a = top[3]; return [top[0]*a+bot[0]*(1-a), top[1]*a+bot[1]*(1-a), top[2]*a+bot[2]*(1-a), 1]; };
    const lum = (c) => { const f = c.slice(0,3).map(v => { v/=255; return v<=.03928 ? v/12.92 : ((v+.055)/1.055)**2.4; }); return .2126*f[0]+.7152*f[1]+.0722*f[2]; };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); };
    const bgOf = (el, gradEnd) => { const chain = []; for (let e = el; e; e = e.parentElement) chain.push(e); let bg = [255,255,255,1];
      for (const e of chain.reverse()) { const cs = getComputedStyle(e); if (cs.backgroundImage.includes('gradient')) { bg = gradEnd ? [37,99,235,1] : [30,58,138,1]; } const c = parse(cs.backgroundColor); if (c[3] > 0) bg = over(c, bg); } return bg; };
    const out = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    while (walker.nextNode()) { const n = walker.currentNode; if (!n.textContent.trim()) continue; const el = n.parentElement; if (seen.has(el)) continue; seen.add(el);
      const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') continue; if (el.closest('.u-visually-hidden') || el.matches('.u-visually-hidden')) continue; if (el.closest('[aria-disabled="true"], :disabled')) continue; const r = el.getBoundingClientRect(); if (!r.width) continue;
      const fg0 = parse(cs.color); const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight) >= 700; const large = size >= 24 || (size >= 18.66 && bold);
      let worst = 99; for (const g of [0, 1]) { const bg = bgOf(el, g); const fg = over(fg0, bg); worst = Math.min(worst, ratio(fg, bg)); }
      out.push({ t: n.textContent.trim().slice(0, 30), cls: el.className, r: Math.round(worst*100)/100, need: large ? 3 : 4.5 }); }
    // non-text: control borders and focus ring colours against their surface
    return out; });
  all.push(...res.map(x => ({ ...x, page: pg + '@' + w }))); await p.close(); }
 const min = all.reduce((m, x) => x.r < m.r ? x : m, all[0]); const bad = all.filter(x => x.r < x.need);
 console.log('text nodes checked:', all.length, '| lowest ratio:', min.r, JSON.stringify(min.t), min.cls, '| below threshold:', bad.length); bad.forEach(x => console.log('  LOW', x.page, x.r, 'need', x.need, JSON.stringify(x.t), x.cls));
 await b.close(); })();
