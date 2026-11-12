/**
 * Shared ESLint config (flat config, ESLint 10).
 *
 * Base rules: every core rule ESLint marks as "recommended" (the same set @eslint/js ships), read
 * from ESLint itself so no extra package is needed. On top of that, the folder rules below enforce
 * the module boundaries in docs/ARCHITECTURE.md and the storage strategy in docs/STORAGE.md.
 */
import { builtinRules } from 'eslint/use-at-your-own-risk';

const recommended = Object.fromEntries(
  [...builtinRules]
    .filter(([, rule]) => rule.meta?.docs?.recommended && !rule.meta?.deprecated)
    .map(([name]) => [name, 'error']),
);

const browser = Object.fromEntries(
  [
    'window',
    'document',
    'location',
    'history',
    'navigator',
    'console',
    'fetch',
    'URL',
    'URLSearchParams',
    'AbortController',
    'Headers',
    'Request',
    'Response',
    'FormData',
    'localStorage',
    'sessionStorage',
    'setTimeout',
    'clearTimeout',
    'requestAnimationFrame',
    'HTMLElement',
    'IntersectionObserver',
    'getComputedStyle',
    'setInterval',
    'clearInterval',
    'Node',
    'Event',
    'CustomEvent',
    'Intl',
    'structuredClone',
    'matchMedia',
  ].map((g) => [g, 'readonly']),
);
const node = Object.fromEntries(
  [
    'process',
    'console',
    'Buffer',
    'URL',
    'URLSearchParams',
    'fetch',
    'setTimeout',
    'clearTimeout',
    'structuredClone',
  ].map((g) => [g, 'readonly']),
);
const commonjs = {
  require: 'readonly',
  module: 'writable',
  __dirname: 'readonly',
  __filename: 'readonly',
};

/** Builds a no-restricted-imports rule that forbids importing the given src/ folders. */
const forbid = (folders, why) => [
  'error',
  { patterns: [{ group: folders.flatMap((f) => [`../${f}/*`, `../${f}.js`]), message: why }] },
];

export default [
  { ignores: ['node_modules/', 'dist/', 'playwright-report/', 'test-results/', 'coverage/'] },
  {
    rules: {
      ...recommended,
      // Planned functions in src/ are stubs whose parameters document the signature.
      'no-unused-vars': ['error', { args: 'none', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    files: ['src/**/*.js'],
    languageOptions: { sourceType: 'module', globals: browser },
    rules: {
      // Only api/http.js talks to the network; only utils/storage.js touches Web Storage.
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Use src/api/http.js.' },
        { name: 'localStorage', message: 'Use src/utils/storage.js (see docs/STORAGE.md).' },
        { name: 'sessionStorage', message: 'Use src/utils/storage.js (see docs/STORAGE.md).' },
      ],
    },
  },
  { files: ['src/api/http.js'], rules: { 'no-restricted-globals': 'off' } },
  { files: ['src/utils/storage.js'], rules: { 'no-restricted-globals': 'off' } },
  {
    files: ['src/utils/**/*.js'],
    rules: {
      'no-restricted-imports': forbid(
        ['api', 'state', 'components', 'main'],
        'utils/ is the bottom layer: it imports nothing from the app.',
      ),
    },
  },
  {
    files: ['src/api/**/*.js'],
    rules: {
      'no-restricted-imports': forbid(
        ['state', 'components', 'main'],
        'api/ may only import utils/ (and api/).',
      ),
    },
  },
  {
    files: ['src/state/**/*.js'],
    rules: {
      'no-restricted-imports': forbid(
        ['api', 'components', 'main'],
        'state/ may only import utils/ (and state/); main.js passes API results in.',
      ),
    },
  },
  {
    files: ['src/components/**/*.js'],
    rules: {
      'no-restricted-imports': forbid(
        ['main'],
        'Components receive what they need from main.js; they never import it.',
      ),
    },
  },
  {
    files: ['**/*.mjs', 'tests/**/*.js', 'vite.config.js', 'vitest.config.js'],
    languageOptions: { sourceType: 'module', globals: { ...node, ...browser } },
  },
  {
    // The one classic script: runs in <head> before first paint (adds the "js" class).
    files: ['src/boot.js'],
    languageOptions: { sourceType: 'script' },
  },

  {
    // Phase 1 QA scripts and the URL setter: CommonJS Node scripts.
    // qa/ scripts also pass callbacks to page.evaluate(), which run in the browser.
    files: ['qa/**/*.js', 'scripts/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        ...node,
        ...commonjs,
        ...browser,
        CSS: 'readonly',
        NodeFilter: 'readonly',
        getComputedStyle: 'readonly',
        innerWidth: 'readonly',
        innerHeight: 'readonly',
        scrollY: 'readonly',
        performance: 'readonly',
        PerformanceObserver: 'readonly',
        MutationObserver: 'readonly',
        BrandStore: 'readonly',
      },
    },
  },
];
