// Layout-shift audit: measures Cumulative Layout Shift while the data-driven sections are
// rendered by script, at 375px and 1280px, at normal speed and with the CPU slowed 6x.
// Usage: node qa/cls.js [projectRoot]    Needs: playwright
const { chromium } = require('playwright'); const root = process.argv[2] || require('path').resolve(__dirname, '..');
const { siteBase } = require('./serve');
(async () => { const b = await chromium.launch();
 for (const [w, rate] of [[375, 1], [375, 6], [1280, 1], [1280, 6]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 800 } }); const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  await p.addInitScript(() => { window.__cls = 0; window.__shifts = []; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) { window.__cls += e.value; window.__shifts.push([Math.round(e.value*1000)/1000, (e.sources||[]).map(s => s.node && (s.node.className || s.node.nodeName)).join(',')]); } }).observe({ type: 'layout-shift', buffered: true }); });
  await p.goto((await siteBase(root)) + '/index.html'); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => ({ cls: Math.round(window.__cls * 1000) / 1000, shifts: window.__shifts.slice(0, 4), fcp: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0), cardsAtFCP: document.querySelectorAll('.product-card').length }));
  console.log(w, 'cpu x' + rate, JSON.stringify(r)); await ctx.close(); }
 await b.close(); })();
