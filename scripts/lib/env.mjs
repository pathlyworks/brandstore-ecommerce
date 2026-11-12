/**
 * Build-time / serve-time environment for the browser code. Vite replaces `import.meta.env` itself;
 * the zero-dependency server (scripts/serve.mjs) and the build (scripts/build.mjs) use this instead, so
 * `VITE_API_BASE=http://localhost:4010 npm run start` (or `npm run build`) also points the site at the
 * TechSphere API. Only VITE_* variables are exposed, and only their values (never secrets).
 */

const MARKER = 'const env = import.meta.env ?? {};';

/**
 * The VITE_* variables to expose.
 * @param {Record<string, string | undefined>} environment usually process.env
 * @returns {Record<string, string>}
 */
export function viteEnv(environment) {
  return Object.fromEntries(
    Object.entries(environment).filter(([key, value]) => key.startsWith('VITE_') && value),
  );
}

/**
 * Rewrite src/config.js so `env` also contains the given variables.
 * @param {string} source the file's text
 * @param {Record<string, string>} vars
 * @returns {string}
 */
export function injectEnv(source, vars) {
  if (!Object.keys(vars).length || !source.includes(MARKER)) return source;
  return source.replace(
    MARKER,
    `const env = { ...(import.meta.env ?? {}), ...${JSON.stringify(vars)} };`,
  );
}
