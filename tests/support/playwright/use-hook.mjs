/** Loaded with `node --import`: maps '@playwright/test' to the local stand-in. */
import { register } from 'node:module';

register('./hook.mjs', import.meta.url);
