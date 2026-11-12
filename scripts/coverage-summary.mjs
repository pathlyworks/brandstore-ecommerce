/**
 * Line coverage of src/state and src/utils, per folder and per file, from either report:
 *   node scripts/coverage-summary.mjs coverage/coverage-summary.json   # Vitest (npm run test:coverage)
 *   node scripts/coverage-summary.mjs coverage/lcov.info               # Node (npm run coverage:node)
 * Prints a Markdown table (also to the GitHub Actions job summary when GITHUB_STEP_SUMMARY is set)
 * and exits with 1 when either folder is below 80% of lines.
 */
import { appendFileSync, readFileSync } from 'node:fs';
import { relative } from 'node:path';

const FOLDERS = ['src/state', 'src/utils'];
const MIN = 80;
const input = process.argv[2] || 'coverage/coverage-summary.json';
const text = readFileSync(input, 'utf8');

/** { file: { found, hit } } from an lcov or Istanbul json-summary report. */
function readReport() {
  const files = {};
  if (input.endsWith('.json')) {
    for (const [file, data] of Object.entries(JSON.parse(text))) {
      if (file !== 'total') files[file] = { found: data.lines.total, hit: data.lines.covered };
    }
    return files;
  }
  let current = null;
  for (const line of text.split('\n')) {
    if (line.startsWith('SF:')) current = files[line.slice(3)] = { found: 0, hit: 0 };
    else if (line.startsWith('LF:')) current.found = Number(line.slice(3));
    else if (line.startsWith('LH:')) current.hit = Number(line.slice(3));
  }
  return files;
}

const pct = ({ found, hit }) => (found ? (100 * hit) / found : 100);
const rows = Object.entries(readReport())
  .map(([file, data]) => [relative('.', file).replaceAll('\\', '/'), data])
  .filter(([file]) => FOLDERS.some((f) => file.startsWith(`${f}/`)))
  .sort(([a], [b]) => a.localeCompare(b));

let ok = true;
const lines = [
  `Line coverage (${input})`,
  '',
  '| Folder / file | Lines | Covered |',
  '| :--- | ---: | ---: |',
];
for (const folder of FOLDERS) {
  const own = rows.filter(([file]) => file.startsWith(`${folder}/`));
  const sum = own.reduce((s, [, d]) => ({ found: s.found + d.found, hit: s.hit + d.hit }), {
    found: 0,
    hit: 0,
  });
  ok &&= pct(sum) >= MIN && own.length > 0;
  lines.push(`| **${folder}/** | ${sum.hit} / ${sum.found} | **${pct(sum).toFixed(2)}%** |`);
  for (const [file, d] of own)
    lines.push(`| ${file} | ${d.hit} / ${d.found} | ${pct(d).toFixed(2)}% |`);
}
lines.push('', ok ? `Both folders are at or above ${MIN}%.` : `A folder is below ${MIN}%.`);
const report = lines.join('\n');
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${report}\n`);
process.exit(ok ? 0 : 1);
