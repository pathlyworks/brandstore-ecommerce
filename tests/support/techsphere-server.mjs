/**
 * Starts the official TechSphere mock API (api/techsphere/server.py, from the API kit) on a free port for
 * tests, with the grader's control endpoints (/__reset, /__log, /__control) switched on.
 * Needs Python 3.9+; `findPython()` returns null when it is not installed (those tests are then skipped).
 */
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';

const KIT = fileURLToPath(new URL('../../api/techsphere/', import.meta.url));

/** The Python command, or null. */
export function findPython() {
  for (const cmd of ['python3', 'python']) {
    const r = spawnSync(cmd, ['--version'], { encoding: 'utf8' });
    if (r.status === 0 && /Python 3\.(9|1\d)/.test(r.stdout + r.stderr)) return cmd;
  }
  return null;
}

/** A free TCP port on 127.0.0.1. */
function freePort() {
  return new Promise((done) => {
    const probe = createServer().listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => done(port));
    });
  });
}

/**
 * @returns {Promise<{ url: string, stop: () => void, reset: () => Promise<void>, log: () => Promise<object[]>,
 *   control: (body: object) => Promise<void> }>}
 */
export async function startTechsphere() {
  const python = findPython();
  if (!python) throw new Error('Python 3.9+ is needed for the TechSphere API');
  const port = await freePort();
  const child = spawn(python, ['server.py', String(port), '--grader'], {
    cwd: KIT,
    stdio: 'ignore',
  });
  const url = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i += 1) {
    const ok = await fetch(`${url}/categories`).then(
      (r) => r.ok,
      () => false,
    );
    if (ok) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  const post = (path, body) =>
    fetch(`${url}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
  return {
    url,
    stop: () => child.kill(),
    reset: async () => void (await post('/__reset')),
    log: async () => (await (await fetch(`${url}/__log`)).json()).requests,
    control: async (body) => void (await post('/__control', body)),
  };
}
