/**
 * Records the demo video (docs/demo/brandstore-demo.mp4): the happy path and three failure paths, in a
 * real browser against the TechSphere API kit's server, with on-screen captions.
 *   node scripts/record-demo.mjs            # needs Python 3.9+ (the API), Chromium and ffmpeg
 * The captions are drawn on top of the page by this script only; the app itself is unchanged.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { serve } from './serve.mjs';
import { startTechsphere } from '../tests/support/techsphere-server.mjs';

const OUT = 'docs/demo';
const RAW = join(OUT, 'raw');
const SIZE = { width: 1280, height: 720 };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const api = await startTechsphere();
const site = await serve('.', 0, { env: { VITE_API_BASE: api.url } });
rmSync(RAW, { recursive: true, force: true });
mkdirSync(RAW, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: SIZE, recordVideo: { dir: RAW, size: SIZE } });
const page = await context.newPage();

const started = Date.now();
const chapters = [];

/** A caption bar at the bottom of the frame (re-added after every navigation). */
async function caption(title, text = '', hold = 4500) {
  const s = Math.round((Date.now() - started) / 1000);
  chapters.push(
    `| ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} | ${title} | ${text} |`,
  );
  await page.evaluate(
    ([t, s]) => {
      let bar = document.getElementById('demo-caption');
      if (!bar) {
        bar = document.createElement('div');
        bar.id = 'demo-caption';
        bar.style.cssText =
          'position:fixed;left:0;right:0;bottom:0;z-index:99999;padding:14px 28px;background:rgba(17,24,39,.92);' +
          'color:#fff;font:600 20px/1.35 system-ui,sans-serif;box-shadow:0 -4px 16px rgba(0,0,0,.25)';
        document.body.append(bar);
      }
      bar.replaceChildren();
      const strong = document.createElement('div');
      strong.textContent = t;
      const small = document.createElement('div');
      small.textContent = s;
      small.style.cssText = 'font-weight:400;font-size:16px;opacity:.85;margin-top:2px';
      bar.append(strong, small);
    },
    [title, text],
  );
  await wait(hold);
}

/** Outline the element about to be used, then act on it, so viewers can follow. */
async function point(locator, action = (l) => l.click()) {
  await locator.scrollIntoViewIfNeeded();
  await locator.evaluate((el) => {
    el.style.outline = '4px solid #f59e0b';
    el.style.outlineOffset = '3px';
  });
  await wait(1200);
  await action(locator);
  await wait(1500);
}

/** Go to a page and wait for it to settle. */
async function go(path, title, text, hold) {
  await page.goto(site.url + path);
  await wait(1200);
  await caption(title, text, hold);
}

// ---- Intro ---------------------------------------------------------------------------------
await go(
  '/index.html',
  'BrandStore — demo',
  `Plain HTML, CSS and ES modules on the TechSphere API (VITE_API_BASE=${api.url}). Happy path, then three failure paths.`,
  7000,
);

// ---- Happy path ----------------------------------------------------------------------------
await go(
  '/catalog.html',
  'Happy path 1/6 · Catalog',
  'Products come from GET /products (8 a page; the app shows "Showing 1–8 of 24").',
  6000,
);
await point(
  page.getByRole('searchbox', { name: 'Search products' }).or(page.getByLabel('Search products')),
  (l) => l.pressSequentially('orbit', { delay: 180 }),
);
await caption(
  'Happy path 2/6 · Search',
  'Debounced search, sent as ?search=orbit; the address bar keeps the view (shareable, survives reload).',
  5000,
);
await point(page.getByRole('radio', { name: /^Audio/ }));
await caption(
  'Filter by category',
  'Category "Audio": the counts, the list and the URL update together.',
  4500,
);
await point(page.getByLabel('Sort by'), (l) => l.selectOption('price_desc'));
await caption(
  'Sort',
  'Price: high to low — the API sorts; prices that arrive as numbers or as "EGP 13,999" are both read as integer cents.',
  5000,
);
await point(page.getByRole('region', { name: 'Products' }).getByRole('link').first());
await caption(
  'Happy path 3/6 · Product page',
  'Gallery, stock status, specifications, quantity stepper limited by stock.',
  5000,
);
await point(page.getByRole('button', { name: /Increase/ }).first());
await point(page.getByRole('button', { name: 'Add to cart' }));
await caption(
  'Added to the cart',
  'Announced in a live region ("Added 2 × …") and counted in the menu badge.',
  5000,
);
await point(page.getByRole('link', { name: 'View cart' }));
await caption(
  'Happy path 4/6 · Cart',
  'Kept in localStorage; prices and stock re-checked with the API on load. Totals use integer cents.',
  5500,
);
await point(page.getByRole('button', { name: /^Decrease quantity/ }).first());
await caption(
  'Every change is announced',
  'Screen readers hear: "Quantity of … is now 1. Cart total: EGP … for 1 item."',
  5500,
);
await point(page.getByRole('button', { name: 'Place order' }));
await caption(
  'Happy path 5/6 · Checkout needs an account',
  'Signed out: the app asks you to sign in and brings you back to the cart (no token in the URL).',
  5000,
);
await point(page.getByRole('textbox', { name: 'Email' }), (l) =>
  l.pressSequentially('student@techsphere.test', { delay: 60 }),
);
await point(page.getByLabel('Password', { exact: true }), (l) =>
  l.pressSequentially('Passw0rd!', { delay: 90 }),
);
await point(page.getByRole('button', { name: 'Sign in' }));
await caption(
  'Back in the cart, signed in',
  'The JWT is kept in sessionStorage and sent only as "Authorization: Bearer …".',
  4500,
);
await point(page.getByRole('button', { name: 'Place order' }));
await caption(
  'Order placed',
  'POST /orders → 201. The order number is announced and the cart is emptied.',
  6000,
);
await go(
  '/account.html',
  'Happy path 6/6 · Account',
  'GET /account/orders pages by offset (5 a page); four date formats from the API shown as one.',
  6000,
);
await point(page.getByRole('button', { name: /Next/ }));
await caption(
  'Next page',
  'Page 2 = offset 5. Order history and the address book are behind the Bearer token.',
  4500,
);
await point(page.getByRole('button', { name: 'Sign out' }));
await caption('Signed out', 'Token and account data cleared; the cart stays on the device.', 4500);

// ---- Failure path 1: wrong password --------------------------------------------------------
await go('/login.html', 'Failure path 1 · Wrong password', 'POST /auth/login answers 401.', 3500);
await point(page.getByRole('textbox', { name: 'Email' }), (l) =>
  l.pressSequentially('student@techsphere.test', { delay: 50 }),
);
await point(page.getByLabel('Password', { exact: true }), (l) =>
  l.pressSequentially('wrong-pass', { delay: 90 }),
);
await point(page.getByRole('button', { name: 'Sign in' }));
await caption(
  'One clear message, focus moved to it',
  '"The email or password is incorrect." The password never appears in a URL or a log.',
  6500,
);

// ---- Failure path 2: 429 rate limit --------------------------------------------------------
await api.control({ fail: { path: '/products', status: 429, times: 2 } });
await go(
  '/catalog.html',
  'Failure path 2 · The API rate-limits (429)',
  'The API kit is told to answer 429 to the next requests for /products.',
  6000,
);
await caption(
  'What the shopper sees',
  '"Too many requests — wait a moment, then try again", with a Try again button. Nothing breaks.',
  6000,
);
await point(
  page.getByRole('region', { name: 'Products' }).getByRole('button', { name: 'Try again' }),
);
await caption('Recovered', 'The API answers again; the products load without a page reload.', 5000);

// ---- Failure path 3: empty cart, missing image, null specs -----------------------------------
await go(
  '/cart.html',
  'Failure path 3 · Checkout with an empty cart',
  'The button is aria-disabled (still focusable) and says why.',
  4000,
);
// aria-disabled keeps the button focusable and clickable for people; Playwright needs force for it.
await point(page.getByRole('button', { name: 'Place order' }), (l) => l.click({ force: true }));
await caption(
  'No request is sent',
  '"Your cart is empty. Add a product before you check out." — handled before the API.',
  6000,
);
await go(
  '/product.html?id=p-010',
  'Edge case · A product whose image is missing',
  'The API has no loadable image for p-010: the placeholder is shown, with the product name as alt text — never a broken image.',
  7000,
);
await go(
  '/catalog.html?page=9',
  'Edge case · Page 9 of 3',
  'The API pages by 8; a page past the end moves to the last page ("Showing 17–24 of 24").',
  7000,
);

// ---- Close -----------------------------------------------------------------------------------
await caption(
  'Tested on every pull request',
  'Vitest (unit, jsdom + MSW), Playwright in Chromium, Firefox and WebKit, Lighthouse. README → "Run the tests".',
  7000,
);

await context.close();
await browser.close();
api.stop();
site.close();

const [webm] = readdirSync(RAW).filter((f) => f.endsWith('.webm'));
renameSync(join(RAW, webm), join(OUT, 'brandstore-demo.webm'));
rmSync(RAW, { recursive: true, force: true });
execFileSync('ffmpeg', [
  '-y',
  '-loglevel',
  'error',
  '-i',
  join(OUT, 'brandstore-demo.webm'),
  '-c:v',
  'libx264',
  '-preset',
  'veryfast',
  '-crf',
  '30',
  '-pix_fmt',
  'yuv420p',
  '-movflags',
  '+faststart',
  join(OUT, 'brandstore-demo.mp4'),
]);
rmSync(join(OUT, 'brandstore-demo.webm'));
writeFileSync(
  join(OUT, 'chapters.md'),
  `# Demo chapters (brandstore-demo.mp4)\n\nRecorded by scripts/record-demo.mjs against the TechSphere API kit's server.\n\n| Time | Caption | Detail |\n| :--- | :--- | :--- |\n${chapters.join('\n')}\n`,
);
console.log(`Wrote ${join(OUT, 'brandstore-demo.mp4')} and chapters.md`);
