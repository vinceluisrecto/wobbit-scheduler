import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Allow intentionally unused args like Express's `_next`.
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  globalIgnores([
    '.next/**',
    'dist/**',
    'next-env.d.ts',
    'playwright-report/**',
    'test-results/**',
  ]),
]);
