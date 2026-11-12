// Debugger session for the Task 4 newsletter bug (see README, "Debugging log").
// Drives the Chrome DevTools Protocol `Debugger` domain, the interface behind the
// Sources panel: sets breakpoints, and on every pause evaluates watch expressions
// in the paused call frame. On the fixed code, pause 3 (the stale timer) never happens.
// To reproduce the bug itself, check out the commit before the fix.
// Usage: node qa/debug-newsletter.js [projectRoot]    Needs: playwright
const { chromium } = require('playwright'); const root = process.argv[2] || require('path').resolve(__dirname, '..');
const { siteBase } = require('./serve');
const lineOf = (src, needle) => src.split('\n').findIndex(l => l.includes(needle));
(async () => {
  const src = require('fs').readFileSync(root + '/src/components/newsletter.js', 'utf8');
  const bps = [
    ['B1 showError(): clearMessages + schedule timer', lineOf(src, "window.setTimeout(function () {")],
    ['B2 showSuccess(): confirm subscription', lineOf(src, "parts.success.textContent = 'Thanks")],
    ['B3 timer callback fires', lineOf(src, "parts.error.textContent = message;")],
  ];
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); const p = await ctx.newPage();
  await p.goto((await siteBase(root)) + '/index.html'); await p.waitForTimeout(300);
  const cdp = await ctx.newCDPSession(p); await cdp.send('Debugger.enable');
  const watch = ['message', 'parts.input.value', 'parts.error.textContent', 'parts.success.textContent', 'parts.input.getAttribute("aria-invalid")'];
  for (const [, line] of bps) await cdp.send('Debugger.setBreakpointByUrl', { urlRegex: 'newsletter\\.js$', lineNumber: line });
  console.log('breakpoints (1-based lines):', bps.map(([n, l]) => `${n} @ line ${l + 1}`).join('\n  '));
  const log = []; let n = 0;
  cdp.on('Debugger.paused', async (ev) => {
    const f = ev.callFrames[0]; const row = { pause: ++n, fn: f.functionName || '(anonymous timer callback)', line: f.location.lineNumber + 1, stack: ev.callFrames.slice(0, 3).map(c => c.functionName || '(anonymous)').join(' <- '), watch: {} };
    for (const w of watch) { try { const r = await cdp.send('Debugger.evaluateOnCallFrame', { callFrameId: f.callFrameId, expression: 'typeof parts === "undefined" ? undefined : (' + w + ')' }); row.watch[w] = r.result.value === undefined && r.result.type === 'undefined' ? '(n/a here)' : r.result.value; } catch (e) { row.watch[w] = '(n/a here)'; } }
    log.push(row); await cdp.send('Debugger.resume');
  });
  p.evaluate(() => { const f = document.querySelector('.newsletter__form'), i = document.querySelector('#newsletter-email');
    i.value = 'bad'; f.requestSubmit(); i.value = 'ok@example.com'; f.requestSubmit(); });
  await p.waitForTimeout(800);
  for (const r of log) { console.log(`\npause ${r.pause}: ${r.fn}() line ${r.line}\n  call stack: ${r.stack}`); for (const [k, v] of Object.entries(r.watch)) console.log(`  watch  ${k.padEnd(42)} = ${JSON.stringify(v)}`); }
  await b.close();
})();
