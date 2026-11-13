/**
 * Measures the legacy (vanilla JS) app for the React + TypeScript migration plan:
 * modules and types, duplicated UI patterns, where state lives, and what each page downloads.
 *   node scripts/audit-legacy.mjs         # writes docs/migration/audit.json and docs/migration/audit.md
 * Static analysis only: no browser, no network. Numbers in MIGRATION_PLAN.md come from this output.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, normalize, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const ROOT = process.cwd();
const rel = (p) => relative(ROOT, p).replaceAll('\\', '/');
const read = (p) => readFileSync(p, 'utf8');
const gz = (text) => gzipSync(text, { level: 9 }).length;

/** Every file under a folder with one of the extensions. */
function walk(dir, exts) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return walk(p, exts);
    return exts.includes(extname(p)) ? [p] : [];
  });
}

// ---- 1. Modules, size and typing ----------------------------------------------------------------
const files = walk(join(ROOT, 'src'), ['.js', '.ts']).filter((f) => !f.includes('/vendor/'));
const modules = files.map((f) => {
  const text = read(f);
  const functions = [...text.matchAll(/^(export\s+)?(async\s+)?function\s+(\w+)/gm)];
  const exported = functions.filter((m) => m[1]).length;
  const documented = functions.filter((m) => {
    const before = text.slice(Math.max(0, m.index - 600), m.index);
    const doc = before.slice(before.lastIndexOf('/**'));
    return (
      before.lastIndexOf('/**') !== -1 && /@param|@returns/.test(doc) && !doc.includes('*/\n\n')
    );
  }).length;
  return {
    file: rel(f),
    folder: rel(dirname(f)).replace(/^src\/?/, '') || '.',
    lines: text.split('\n').length,
    functions: functions.length,
    exported,
    jsdocTyped: documented,
    typescript: f.endsWith('.ts'),
    anyLike: (text.match(/\{(object|any|Function|\*)\}/g) || []).length,
  };
});
const byFolder = {};
for (const m of modules) {
  const f = (byFolder[m.folder] ??= {
    files: 0,
    lines: 0,
    functions: 0,
    jsdocTyped: 0,
    anyLike: 0,
  });
  f.files += 1;
  f.lines += m.lines;
  f.functions += m.functions;
  f.jsdocTyped += m.jsdocTyped;
  f.anyLike += m.anyLike;
}

// ---- 2. Pages: module graph and download size (no bundler: every module is a request) -----------
const IMPORT =
  /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
function graph(entry, seen = new Set()) {
  if (seen.has(entry)) return seen;
  seen.add(entry);
  for (const m of read(entry).matchAll(IMPORT)) {
    const spec = m[1] || m[2] || m[3];
    if (spec.startsWith('.')) graph(normalize(join(dirname(entry), spec)), seen);
  }
  return seen;
}
const pages = readdirSync(ROOT)
  .filter((f) => f.endsWith('.html'))
  .sort()
  .map((page) => {
    const html = read(join(ROOT, page));
    const entry = /<script type="module" src="([^"]+)"/.exec(html)?.[1];
    const css = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
    const js = entry ? [...graph(join(ROOT, entry))] : [];
    const jsText = js.map(read).join('\n');
    const cssText = css.map((c) => read(join(ROOT, c))).join('\n');
    return {
      page,
      entry,
      jsModules: js.length,
      jsRaw: Buffer.byteLength(jsText),
      jsGzip: gz(jsText),
      cssFiles: css.length,
      cssRaw: Buffer.byteLength(cssText),
      cssGzip: gz(cssText),
      htmlRaw: Buffer.byteLength(html),
      axios: js.some((f) => f.includes('vendor/axios')),
    };
  });
const axios = read(join(ROOT, 'src/vendor/axios.js'));

// ---- 3. Duplicated UI patterns -----------------------------------------------------------------
/** The text of the first block that starts with `open` up to `close` (markup shared by every page). */
function block(html, open, close) {
  const i = html.indexOf(open);
  if (i < 0) return null;
  return html.slice(i, html.indexOf(close, i) + close.length);
}
const htmlPages = pages.map((p) => ({ page: p.page, html: read(join(ROOT, p.page)) }));
const sharedBlocks = ['<header', '<footer'].map((open) => {
  const close = open === '<header' ? '</header>' : '</footer>';
  const blocks = htmlPages
    .map(({ page, html }) => ({ page, text: block(html, open, close) }))
    .filter((b) => b.text);
  const variants = new Set(
    blocks.map((b) =>
      b.text
        .replace(/\s+/g, ' ')
        .replace(/ aria-current="page"/g, '')
        .replace(/ nav__link--current/g, ''),
    ),
  );
  return {
    block: open.slice(1),
    pages: blocks.length,
    linesEach: Math.round(
      blocks.reduce((s, b) => s + b.text.split('\n').length, 0) / blocks.length,
    ),
    copies: blocks.length,
    distinctVersions: variants.size,
  };
});
const headCommon = htmlPages.map(({ html }) => (html.match(/<meta |<link /g) || []).length);
const src = Object.fromEntries(files.map((f) => [rel(f), read(f)]));
const filesWith = (re) =>
  Object.entries(src)
    .filter(([, t]) => re.test(t))
    .map(([f]) => f)
    .sort();
const patterns = [
  { pattern: 'Product image <img> built by hand', files: filesWith(/dom\.el\('img'/) },
  { pattern: 'Price formatting at the call site (formatMoney)', files: filesWith(/formatMoney\(/) },
  { pattern: 'Error / retry box (role="alert", "Try again")', files: filesWith(/Try again/) },
  {
    pattern: 'Live status region written by hand (textContent on a status element)',
    files: filesWith(/role.*status|say\(/),
  },
  { pattern: 'Pagination (Previous / Next)', files: filesWith(/Previous|'Next'|Next page/) },
  { pattern: 'HTTP client', files: filesWith(/export function createHttpClient|axios\.create/) },
  {
    pattern: 'Two API formats (our mock and TechSphere) switched by a dialect flag',
    files: filesWith(/dialect/),
  },
  {
    pattern: 'Store created per page (createCartStore)',
    files: filesWith(/createCartStore\(/).filter((f) => f.startsWith('src/pages')),
  },
  { pattern: 'Focus restore after re-render', files: filesWith(/focusKey|\.focus\(\)/) },
];

// ---- 4. State: where it lives ------------------------------------------------------------------
const storageKeys = [
  ...read(join(ROOT, 'src/utils/storage.js')).matchAll(/(\w+): '(brandstore:[^']+)'/g),
].map(([, name, key]) => {
  const areaMatch = new RegExp(`area: '(\\w+)',\\s*key: KEYS\\.${name}\\b`).exec(
    read(join(ROOT, 'src/state/stores.js')),
  );
  const users = Object.entries(src)
    .filter(
      ([f, t]) =>
        f.startsWith('src/pages') &&
        new RegExp(`create${name[0].toUpperCase()}${name.slice(1)}Store\\(`).test(t),
    )
    .map(([f]) => f.replace('src/pages/', ''));
  return { name, key, area: areaMatch?.[1] ?? '?', pagesCreatingAStore: users };
});
const urlState = filesWith(
  /history\.(push|replace)State|URLSearchParams\(window\.location|location\.search/,
);
const moduleState = Object.entries(src)
  .filter(([f, t]) => f.startsWith('src/components') && /^\s*let \w+ = /m.test(t))
  .map(([f]) => f);

// ---- 5. Tests to port --------------------------------------------------------------------------
const tests = ['unit', 'integration', 'dom', 'e2e/specs', 'e2e'].map((dir) => {
  const list = readdirSync(join(ROOT, 'tests', dir)).filter((f) =>
    /\.(test|spec)\.js$|journeys\.mjs$/.test(f),
  );
  const cases = list.reduce(
    (n, f) =>
      n + (read(join(ROOT, 'tests', dir, f)).match(/^\s*(it|test|journey)\(/gm) || []).length,
    0,
  );
  return { dir: `tests/${dir}`, files: list.length, cases, list };
});

const audit = {
  generatedAt: new Date().toISOString(),
  modules,
  byFolder,
  pages,
  axios: { raw: Buffer.byteLength(axios), gzip: gz(axios) },
  sharedBlocks,
  headTagsPerPage: headCommon,
  patterns,
  storageKeys,
  urlState,
  moduleState,
  tests,
};
writeFileSync('docs/migration/audit.json', `${JSON.stringify(audit, null, 2)}\n`);

// ---- Markdown ----------------------------------------------------------------------------------
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const t = (head, rows) =>
  `| ${head.join(' | ')} |\n| ${head.map(() => ':---').join(' | ')} |\n${rows.map((r) => `| ${r.join(' | ')} |`).join('\n')}\n`;
const totalFns = modules.reduce((s, m) => s + m.functions, 0);
const typedFns = modules.reduce((s, m) => s + m.jsdocTyped, 0);
const md = `# Legacy app audit (generated)

Generated by \`node scripts/audit-legacy.mjs\` on ${audit.generatedAt.slice(0, 10)}: static analysis of \`src/\`, the HTML pages and \`tests/\`.
Read with \`docs/migration/MIGRATION_PLAN.md\`, which draws its conclusions from these numbers.

## 1. Modules and typing

${modules.length} modules, ${modules.reduce((s, m) => s + m.lines, 0)} lines, ${totalFns} named functions, **${modules.filter((m) => m.typescript).length} TypeScript files**.
${typedFns} of ${totalFns} functions (${Math.round((100 * typedFns) / totalFns)}%) carry JSDoc \`@param\`/\`@returns\`, but nothing checks them (no \`tsc\`, no \`// @ts-check\`);
${modules.reduce((s, m) => s + m.anyLike, 0)} JSDoc types are \`{object}\`, \`{any}\`, \`{Function}\` or \`{*}\`, i.e. untyped in practice.

${t(
  [
    'Folder',
    'Files',
    'Lines',
    'Functions',
    'With JSDoc types',
    'Loose types ({object}, {Function} …)',
  ],
  Object.entries(byFolder)
    .sort()
    .map(([f, v]) => [
      `\`src/${f === '.' ? '' : f}\``,
      v.files,
      v.lines,
      v.functions,
      v.jsdocTyped,
      v.anyLike,
    ]),
)}
## 2. What each page downloads (no bundler: one request per module)

${t(
  ['Page', 'JS modules (requests)', 'JS raw', 'JS gzip', 'CSS files', 'CSS gzip', 'Axios'],
  pages.map((p) => [
    p.page,
    p.jsModules,
    kb(p.jsRaw),
    kb(p.jsGzip),
    p.cssFiles,
    kb(p.cssGzip),
    p.axios ? 'yes' : '',
  ]),
)}
Axios (\`src/vendor/axios.js\`): ${kb(audit.axios.raw)} raw, ${kb(audit.axios.gzip)} gzip, loaded by ${pages.filter((p) => p.axios).length} pages next to the fetch client in \`api/http.js\`.

## 3. Duplicated UI patterns

Shared markup copied into every HTML page:

${t(
  ['Block', 'Pages with a copy', 'Lines per copy', 'Distinct versions (ignoring aria-current)'],
  sharedBlocks.map((b) => [`<${b.block}>`, b.copies, b.linesEach, b.distinctVersions]),
)}
The same UI concern implemented in several modules:

${t(
  ['Pattern', 'Modules', 'Where'],
  patterns.map((p) => [
    p.pattern,
    p.files.length,
    p.files.map((f) => `\`${f.replace('src/', '')}\``).join(', '),
  ]),
)}
## 4. Where state lives

${t(
  ['Key', 'Storage', 'Pages that create their own store for it'],
  storageKeys.map((s) => [`\`${s.key}\``, s.area, s.pagesCreatingAStore.join(', ') || '—']),
)}
Also in the URL (catalog query, product id): ${urlState.map((f) => `\`${f.replace('src/', '')}\``).join(', ')}.
Module-level \`let\` state in components: ${moduleState.map((f) => `\`${f.replace('src/', '')}\``).join(', ') || 'none'}.

## 5. Tests to port

${t(
  ['Folder', 'Files', 'Test cases'],
  tests.map((x) => [`\`${x.dir}\``, x.files, x.cases]),
)}
`;
writeFileSync('docs/migration/audit.md', md);
console.log(md);
