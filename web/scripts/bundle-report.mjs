/**
 * Bundle analysis for Advanced Task 5 (before and after): reads a Vite build's .vite/manifest.json and reports
 * every chunk (raw and gzip bytes), the JavaScript a first visit downloads (the entry and its static imports),
 * and what each lazily loaded route adds on top.
 *
 *   node web/scripts/bundle-report.mjs <dist-dir> <label>
 *
 * Output: docs/evidence/task5/bundle/<label>.json and a table on stdout.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const [distArg, label] = process.argv.slice(2);
if (!distArg || !label) throw new Error('usage: bundle-report.mjs <dist-dir> <label>');
const dist = resolve(distArg);
const manifest = JSON.parse(readFileSync(join(dist, '.vite/manifest.json'), 'utf8'));

const size = (file) => {
  const buf = readFileSync(join(dist, file));
  return { raw: buf.length, gzip: gzipSync(buf, { level: 9 }).length };
};
const graph = (key, seen = new Set()) => {
  if (seen.has(key)) return seen;
  seen.add(key);
  for (const next of manifest[key]?.imports ?? []) graph(next, seen);
  return seen;
};
const total = (keys) =>
  [...keys]
    .map((k) => size(manifest[k].file))
    .reduce((a, b) => ({ raw: a.raw + b.raw, gzip: a.gzip + b.gzip }), { raw: 0, gzip: 0 });

const entry = Object.keys(manifest).find((k) => manifest[k].isEntry);
const initial = graph(entry);
const chunks = Object.entries(manifest)
  .filter(([, c]) => c.file.endsWith('.js'))
  .map(([key, c]) => ({ key, file: c.file, dynamic: Boolean(c.isDynamicEntry), ...size(c.file) }))
  .sort((a, b) => b.raw - a.raw);
const lazy = chunks
  .filter((c) => c.dynamic)
  .map((c) => {
    const extra = [...graph(c.key)].filter((k) => !initial.has(k));
    return { route: c.key, adds: total(extra) };
  });

const report = {
  label,
  initialJs: { chunks: [...initial].map((k) => manifest[k].file), ...total(initial) },
  css: (manifest[entry].css ?? []).map((f) => ({ file: f, ...size(f) })),
  lazyRoutes: lazy,
  chunks,
};
const out = join(fileURLToPath(new URL('../../', import.meta.url)), 'docs/evidence/task5/bundle');
mkdirSync(out, { recursive: true });
writeFileSync(join(out, `${label}.json`), `${JSON.stringify(report, null, 2)}\n`);

const kb = (n) => `${(n / 1024).toFixed(1)} kB`;
console.log(
  `${label}: first visit downloads ${kb(report.initialJs.raw)} JS (${kb(report.initialJs.gzip)} gzip)`,
);
for (const c of chunks)
  console.log(
    `  ${c.dynamic ? 'lazy ' : 'eager'} ${kb(c.raw).padStart(9)} ${kb(c.gzip).padStart(9)}  ${c.file}`,
  );
