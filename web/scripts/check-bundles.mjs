/**
 * After `vite build`: prove the admin area's code never ships to shoppers (Advanced Task 4).
 *
 * Reads dist/.vite/manifest.json and fails unless:
 * 1. src/features/admin/AdminRoute.tsx is its own chunk, loaded only by a dynamic import;
 * 2. that chunk is not in the static import graph of the entry (index.html), i.e. not in what every page
 *    loads or preloads, and dist/index.html does not reference it;
 * 3. the admin module's marker string appears in that chunk and in no other file of dist/.
 * Also lists the other lazily loaded chunks (checkout) and the entry size.
 *
 * Run: npm run build -w web && npm run check:bundles -w web
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const manifest = JSON.parse(readFileSync(join(dist, '.vite/manifest.json'), 'utf8'));
const ADMIN = 'src/features/admin/AdminRoute.tsx';
const MARKER = 'brandstore-admin-summary';
const problems = [];

const entryKey = Object.keys(manifest).find((key) => manifest[key].isEntry);
if (!entryKey) throw new Error('No entry in the Vite manifest');

/** Chunks every page loads: the entry and everything it imports statically. */
const eager = new Set();
(function walk(key) {
  if (eager.has(key)) return;
  eager.add(key);
  for (const next of manifest[key]?.imports ?? []) walk(next);
})(entryKey);

const admin = manifest[ADMIN];
if (!admin)
  problems.push(`${ADMIN} is not a chunk of its own (is it imported statically somewhere?)`);
else {
  if (!admin.isDynamicEntry) problems.push(`${ADMIN} is not loaded by a dynamic import`);
  if (eager.has(ADMIN)) problems.push(`${ADMIN} is in the entry's static import graph`);
  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  if (html.includes(admin.file)) problems.push(`dist/index.html references ${admin.file}`);
  const holders = readdirSync(join(dist, 'assets'))
    .filter((f) => f.endsWith('.js'))
    .filter((f) => readFileSync(join(dist, 'assets', f), 'utf8').includes(MARKER))
    .map((f) => `assets/${f}`);
  if (holders.length !== 1 || holders[0] !== admin.file)
    problems.push(`the admin marker is in ${JSON.stringify(holders)}, expected only ${admin.file}`);
}

const kb = (file) => `${(statSync(join(dist, file)).size / 1024).toFixed(1)} kB`;
console.log(
  `Entry ${manifest[entryKey].file}: ${kb(manifest[entryKey].file)}; eagerly loaded chunks: ${eager.size}`,
);
for (const [key, chunk] of Object.entries(manifest)) {
  if (chunk.isDynamicEntry) console.log(`  lazy  ${key} → ${chunk.file} (${kb(chunk.file)})`);
}

if (problems.length) {
  console.error(`\nAdmin code would ship to shoppers:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(
  `\nOK: ${ADMIN} is a separate lazy chunk (${admin.file}) that only an admin downloads.`,
);
