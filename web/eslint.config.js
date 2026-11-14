/**
 * ESLint for the React app (the legacy app has its own config at the root).
 * - typescript-eslint, type-aware (recommendedTypeChecked): no `any`, no unsafe use of untyped values.
 * - react-hooks: rules of hooks, and exhaustive-deps as an error (every effect declares its dependencies).
 * - react: stable list keys (jsx-key, no-array-index-key).
 */
import globals from 'globals';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['dist/', 'storybook-static/', 'coverage/', 'playwright-report/', 'test-results/'] },
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: '19.1' } },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'react/jsx-key': ['error', { checkFragmentShorthand: true, warnOnDuplicates: true }],
      'react/no-array-index-key': 'error',
      'react/jsx-no-target-blank': 'error',
      'react/no-danger': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
