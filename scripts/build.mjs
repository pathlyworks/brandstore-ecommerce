/**
 * Production build: copies the deployable site into dist/ and verifies it. No bundler is needed:
 * browsers load the ES modules in src/ directly. (Vite is used only as the dev server.)
 *
 * Checks, failing the build on any problem:
 *  - every local <script src>, <link href> and <img src> in each page exists in dist/
 *  - every static `import ... from './x.js'` reachable from a page entry resolves to a file
 * Also writes dist/_headers from netlify.toml so a drag-and-drop deploy of dist/ keeps the
 * security headers.
 */
import { cp, mkdir, readFile, readdir, rm, writeFile, access } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist');
const COPY = [
  'index.html',
  'comparison.html',
  '404.html',
  'css',
  'src',
  'assets',
  'favicon.svg',
  'apple-touch-icon.png',
  'og-image.png',
  'robots.txt',
  'sitemap.xml',
  '.nojekyll',
];
const problems = [];

/** True when the path exists. */
const exists = (p) =>
  access(p).then(
    () => true,
    () => false,
  );

/** Walk the static import graph from one entry module, recording missing files. */
async function walkImports(file, seen) {
  if (seen.has(file)) return;
  seen.add(file);
  if (!(await exists(file))) {
    problems.push(`missing module ${relative(out, file)}`);
    return;
  }
  const code = await readFile(file, 'utf8');
  for (const m of code.matchAll(
    /^\s*(?:import|export)\s[^'"]*?from\s+['"](\.{1,2}\/[^'"]+)['"]/gm,
  )) {
    await walkImports(resolve(dirname(file), m[1]), seen);
  }
}

/** Check one HTML page's local references and module graph. */
async function checkPage(page, modules) {
  const html = await readFile(join(out, page), 'utf8');
  for (const m of html.matchAll(/\s(?:src|href)="([^"#:?]+)"/g)) {
    if (!(await exists(join(out, m[1])))) problems.push(`${page}: ${m[1]} not found`);
  }
  for (const m of html.matchAll(/<script type="module" src="([^"]+)"/g)) {
    await walkImports(join(out, m[1]), modules);
  }
}

/** Turn the [[headers]] values in netlify.toml into a Netlify _headers file. */
async function writeHeaders() {
  const toml = await readFile(join(root, 'netlify.toml'), 'utf8');
  const values = [...toml.matchAll(/^\s+([A-Z][A-Za-z-]+) = "(.*)"$/gm)].map(
    (m) => `  ${m[1]}: ${m[2]}`,
  );
  await writeFile(join(out, '_headers'), `/*\n${values.join('\n')}\n`);
  return values.length;
}

await rm(out, { recursive: true, force: true });
await mkdir(out);
for (const item of COPY) {
  if (await exists(join(root, item)))
    await cp(join(root, item), join(out, item), { recursive: true });
}
const modules = new Set();
for (const page of (await readdir(out)).filter((f) => f.endsWith('.html')))
  await checkPage(page, modules);
const headers = await writeHeaders();

console.log(
  `dist/: ${COPY.length} items copied, ${modules.size} modules reachable from the pages, ${headers} headers in _headers`,
);
for (const p of problems) console.log(`  - ${p}`);
console.log(problems.length ? `BUILD FAILED: ${problems.length} problems` : 'BUILD OK');
process.exit(problems.length ? 1 : 0);
