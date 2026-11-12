// Keyboard and focus audit: tab order, focus ring on every stop, skip link,
// deals previous/next buttons, mobile menu. Usage: node qa/keyboard.js [projectRoot]
// Needs: npm i -D playwright (and a Chromium build)
const { chromium } = require('playwright');
const root = process.argv[2] || require('path').resolve(__dirname, '..');
const desc = () => {
  const e = document.activeElement; if (!e || e === document.body) return null;
  const cs = getComputedStyle(e), r = e.getBoundingClientRect();
  const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) ? 'outline' : (cs.boxShadow !== 'none' ? 'shadow' : 'none');
  // ring may be drawn by a descendant/pseudo for category cards: report separately
  return { tag: e.tagName.toLowerCase(), cls: e.className || e.id, text: (e.getAttribute('aria-label') || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28),
    ring, outline: cs.outlineWidth + ' ' + cs.outlineColor, inView: r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth, w: Math.round(r.width), h: Math.round(r.height) };
};
(async () => {
  const b = await chromium.launch(); let fails = 0; const fail = (m) => { fails++; console.log('  FAIL', m); };
  for (const [pg, w] of [['index', 375], ['index', 1280], ['comparison', 375], ['comparison', 1280]]) {
    console.log(`\n== ${pg} @${w}`);
    const p = await b.newPage({ viewport: { width: w, height: 800 } });
    await p.goto('file://' + root + '/' + pg + '.html'); await p.waitForTimeout(900);
    const order = []; const seen = new Set();
    for (let i = 0; i < 60; i++) {
      await p.keyboard.press('Tab'); await p.waitForTimeout(450); const d = await p.evaluate(desc);
      if (!d) { order.push('<left document/body>'); break; }
      const key = d.tag + d.cls + d.text; if (seen.has(key)) { order.push('<cycle to ' + key + '>'); break; } seen.add(key);
      order.push(`${d.tag}.${d.cls}|${d.text}|ring:${d.ring}`);
      if (!d.inView) fail('not in view: ' + key);
      if (d.ring === 'none' && !/category-card__link/.test(d.cls)) fail('no focus ring: ' + key);
      if (d.h < 24 && !/category-card__link/.test(d.cls)) fail('target <24px: ' + key + ' ' + d.h);
    }
    console.log('STOPS', pg, w, order.length - (order[order.length-1].startsWith('<') ? 1 : 0), '| min target px', await p.evaluate(() => Math.round(Math.min(...[...document.querySelectorAll('a,button,input,[tabindex="0"]')].filter(e => e.getBoundingClientRect().width && getComputedStyle(e).visibility !== 'hidden').map(e => { const r = e.getBoundingClientRect(); return Math.min(r.width, r.height); })))));
    // vertical order: y positions must be non-decreasing-ish (DOM order == visual order)
    // shift-tab works (no trap)
    await p.keyboard.press('Shift+Tab'); const back = await p.evaluate(desc); console.log('shift+tab ->', back && back.text); if (!back) fail('shift+tab trapped/left');
    await p.close();
  }
  // skip link
  for (const pg of ['index', 'comparison']) {
    const p = await b.newPage({ viewport: { width: 375, height: 800 } });
    await p.goto('file://' + root + '/' + pg + '.html');
    await p.keyboard.press('Tab'); await p.waitForTimeout(300);
    const s = await p.evaluate(() => { const e = document.activeElement, r = e.getBoundingClientRect(); return { cls: e.className, onScreen: r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight, text: e.textContent.trim() }; });
    await p.keyboard.press('Enter'); await p.waitForTimeout(200);
    const after = await p.evaluate(() => ({ hash: location.hash, active: document.activeElement.id || document.activeElement.tagName }));
    await p.keyboard.press('Tab'); const next = await p.evaluate(desc);
    console.log(`\nskip link ${pg}:`, JSON.stringify(s), JSON.stringify(after), 'next tab ->', next.cls, '|', next.text);
    if (s.cls !== 'skip-link' || !s.onScreen) fail('skip link not first/visible');
    if (after.active !== 'main-content') fail('focus not moved to main');
    if (/logo|nav/.test(next.cls)) fail('next tab went back into header');
    await p.close();
  }
  // deals controls by keyboard
  for (const [w, rm] of [[375, 'no-preference'], [1280, 'no-preference'], [1280, 'reduce']]) {
    const p = await b.newPage({ viewport: { width: w, height: 800 }, reducedMotion: rm });
    await p.goto('file://' + root + '/index.html'); await p.waitForTimeout(600);
    const vis = await p.locator('[data-deals-controls]').isVisible();
    const nextB = p.locator('[data-deals-step="1"]'), prevB = p.locator('[data-deals-step="-1"]');
    const sl = () => p.evaluate(() => Math.round(document.querySelector('#deals-viewport').scrollLeft));
    const st = async () => ({ prev: await prevB.getAttribute('aria-disabled'), next: await nextB.getAttribute('aria-disabled') });
    console.log(`\ndeals @${w} motion:${rm} controls visible:${vis} start`, await sl(), JSON.stringify(await st()));
    if (!vis) { fail('controls hidden'); await p.close(); continue; }
    await nextB.focus(); let last = -1, presses = 0;
    for (let i = 0; i < 8; i++) { await p.keyboard.press(i % 2 ? 'Space' : 'Enter'); await p.waitForTimeout(rm === 'reduce' ? 150 : 700); presses++; const x = await sl(); if (x === last) break; last = x; }
    const end = await st(); const focusedStill = await p.evaluate(() => document.activeElement.dataset.dealsStep);
    console.log('after', presses, 'presses: scrollLeft', await sl(), JSON.stringify(end), 'focus still on next:', focusedStill === '1');
    if (end.next !== 'true') fail('did not reach end'); if (focusedStill !== '1') fail('focus lost at end');
    await prevB.focus(); for (let i = 0; i < 8; i++) { await p.keyboard.press('Enter'); await p.waitForTimeout(rm === 'reduce' ? 150 : 700); }
    console.log('back at start: scrollLeft', await sl(), JSON.stringify(await st())); if ((await st()).prev !== 'true') fail('did not return to start');
    // snap: scrollLeft aligns to an item edge
    const snapped = await p.evaluate(() => { const v = document.querySelector('#deals-viewport'); return [...v.querySelectorAll('.deals__item')].some(i => Math.abs(i.getBoundingClientRect().left - v.getBoundingClientRect().left) < 2); }); console.log('first item aligned to edge:', snapped);
    await p.close();
  }
  // mobile nav keyboard
  const p = await b.newPage({ viewport: { width: 375, height: 800 } });
  await p.goto('file://' + root + '/index.html');
  const closedTabbable = await p.evaluate(() => [...document.querySelectorAll('.nav__link')].map(a => getComputedStyle(a).visibility));
  await p.locator('.nav__toggle').focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
  await p.keyboard.press('Tab'); const first = await p.evaluate(desc);
  await p.keyboard.press('Escape'); const esc = await p.evaluate(() => ({ exp: document.querySelector('.nav__toggle').getAttribute('aria-expanded'), focus: document.activeElement.className }));
  console.log('\nnav: closed link visibility', closedTabbable.join(','), '| first tab after open ->', first.text, '| after Esc', JSON.stringify(esc));
  if (!closedTabbable.every(v => v === 'hidden')) fail('closed menu links are focusable'); if (esc.exp !== 'false' || !/nav__toggle/.test(esc.focus)) fail('Esc did not close/return focus');
  await b.close(); console.log('\nFAILS:', fails);
})();
