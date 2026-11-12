/** Loaded with `node --import`: registers the resolution hook that maps 'vitest' to the shim. */
import { register } from 'node:module';

register('./vitest-hook.mjs', import.meta.url);
