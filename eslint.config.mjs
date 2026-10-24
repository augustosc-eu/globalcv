import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Unused code hides bugs; allow the conventional `_` prefix for intentional ones.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      // React Compiler advisory rule. The flagged effects read browser-only
      // state (localStorage, matchMedia) after hydration, which is the
      // SSR-safe pattern; kept visible as warnings rather than CI failures.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    // @react-pdf/renderer's <Image> is not an HTML img and has no alt prop.
    files: ['src/lib/pdf/**/*.tsx'],
    rules: { 'jsx-a11y/alt-text': 'off' },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'tmp/**',
    'next-env.d.ts',
    'public/pdf.worker.min.mjs',
    'src/lib/empty-module.js',
  ]),
]);
