/** Module resolution hook: `import ... from 'vitest'` resolves to ./vitest-shim.mjs (see that file). */

/**
 * @param {string} specifier
 * @param {object} context
 * @param {Function} nextResolve
 * @returns {Promise<object>}
 */
export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'vitest')
    return { url: new URL('./vitest-shim.mjs', import.meta.url).href, shortCircuit: true };
  return nextResolve(specifier, context);
}
