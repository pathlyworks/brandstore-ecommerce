// Layout audit: horizontal overflow at 4 widths, minimum target size, reduced-motion
// computed values. Usage: node qa/layout.js [projectRoot]
const { chromium } = require('playwright');
const root = process.argv[2] || require('path').resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch(); let fails = 0;
  for (const w of [375, 768, 1024, 1440]) for (const pg of ['index', 'comparison']) {
    const p = await b.newPage({ viewport: { width: w, height: 900 } });
    await p.goto('file://' + root + '/' + pg + '.html'); await p.waitForTimeout(800);
    const o = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
      small: [...document.querySelectorAll('a,button,input,[tabindex="0"]')].filter(e => e.getBoundingClientRect().width && getComputedStyle(e).visibility !== 'hidden' && Math.min(e.getBoundingClientRect().width, e.getBoundingClientRect().height) < 44).map(e => e.className) }));
    const ok = o.sw === o.cw && o.small.length === 0; if (!ok) fails++;
    console.log(ok ? 'PASS' : 'FAIL', pg, w, `scrollWidth ${o.sw} / clientWidth ${o.cw}`, o.small.length ? 'targets<44: ' + o.small : '');
    await p.close();
  }
  const r = await b.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  await r.goto('file://' + root + '/index.html');
  const v = await r.evaluate(() => ({ heroAnimation: getComputedStyle(document.querySelector('.hero__title')).animationName,
    btnTransition: getComputedStyle(document.querySelector('.btn')).transitionDuration, scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior }));
  const ok = v.heroAnimation === 'none' && /^(0s,? ?)+$/.test(v.btnTransition) && v.scrollBehavior === 'auto'; if (!ok) fails++;
  console.log(ok ? 'PASS' : 'FAIL', 'reduced motion', JSON.stringify(v));
  await b.close(); console.log('FAILS:', fails); process.exit(fails ? 1 : 0);
})();
