/** Resolution hook: maps '@playwright/test' to the local stand-in (see run.mjs). */
const SHIM = new URL('./shim.mjs', import.meta.url).href;

export async function resolve(specifier, context, next) {
  if (specifier === '@playwright/test') return { url: SHIM, shortCircuit: true };
  return next(specifier, context);
}
