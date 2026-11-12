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
    'AbortSignal',
    'atob',
    'btoa',
    'TextDecoder',
    'TextEncoder',
    'DOMException',
    'HTMLInputElement',
    'KeyboardEvent',
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
  {
    ignores: [
      'node_modules/',
      'src/vendor/',
      'dist/',
      'playwright-report/',
      'test-results/',
      'coverage/',
    ],
  },
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
      // Nothing is logged except a feature that fails to start (main.js): no tokens or passwords in logs.
      'no-console': ['error', { allow: ['error'] }],
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
  {
    // Pure state logic: no DOM, storage, network or clock. Persistence is in src/state/stores.js.
    files: [
      'src/state/cart.js',
      'src/state/saved.js',
      'src/state/recent.js',
      'src/state/session.js',
      'src/utils/jwt.js',
      'src/utils/cart-math.js',
      'src/utils/money.js',
    ],
    rules: {
      'no-restricted-globals': [
        'error',
        ...[
          'window',
          'document',
          'localStorage',
          'sessionStorage',
          'fetch',
          'XMLHttpRequest',
          'navigator',
          'location',
          'history',
          'Date',
        ].map((name) => ({
          name,
          message: 'Pure state logic: no DOM, storage, network or clock here.',
        })),
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '../utils/storage.js',
                '../utils/dom.js',
                '../api/*',
                './stores.js',
                './storage.js',
                './dom.js',
              ],
              message: 'Pure state logic must not import storage, DOM or API modules.',
            },
          ],
        },
      ],
    },
  },

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
