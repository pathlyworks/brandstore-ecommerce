/**
 * Copies third-party browser code into src/vendor/ so the site can load it as a plain ES module
 * (no bundler). Run after `npm install` or after upgrading Axios:  npm run vendor
 * Axios: node_modules/axios/dist/esm/axios.min.js -> src/vendor/axios.js (source-map comment removed,
 * because the map file is not shipped).
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const axiosDir = dirname(require.resolve('axios/package.json'));
const { version } = JSON.parse(await readFile(join(axiosDir, 'package.json'), 'utf8'));
const code = (await readFile(join(axiosDir, 'dist/esm/axios.min.js'), 'utf8')).replace(
  /\n\/\/# sourceMappingURL=.*\n?$/,
  '\n',
);
await mkdir(join(root, 'src/vendor'), { recursive: true });
await writeFile(join(root, 'src/vendor/axios.js'), code);
console.log(`src/vendor/axios.js <- axios ${version} (${code.length} bytes)`);
