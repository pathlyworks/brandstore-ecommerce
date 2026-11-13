/**
 * tests/support/page.js — put a real page of the site (its <body>, without scripts) into the test
 * document, so integration tests run the components against the actual markup.
 */

/**
 * The HTML of a page at the project root.
 * @param {string} file e.g. "catalog.html"
 * @returns {Promise<string>}
 */
async function readPage(file) {
  if (typeof process !== 'undefined' && process.versions?.node) {
    // A path from the project root (where npm runs). Not `new URL(file, import.meta.url)`: Vite rewrites
    // that pattern into a site URL ("/catalog.html") when Vitest transforms this file.
    const { readFile } = await import('node:fs/promises');
    const { join } = await import('node:path');
    return readFile(join(process.cwd(), file), 'utf8');
  }
  // In a real browser (npm run test:browser): the harness keeps the unmocked fetch for this.
  const response = await (globalThis.__unmockedFetch || fetch)(`/${file}`);
  return response.text();
}

/**
 * Replace the test document's body with the page's body.
 * @param {string} file
 */
export async function loadPage(file) {
  const parsed = new DOMParser().parseFromString(await readPage(file), 'text/html');
  parsed.querySelectorAll('script').forEach((script) => script.remove());
  document.title = parsed.title;
  document.body.replaceChildren(
    ...[...parsed.body.childNodes].map((n) => document.importNode(n, true)),
  );
}
