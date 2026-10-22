import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Vitest covers frontend code. Backend tests run with Jest (see jest.config.mjs).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/setup/vitest.ts'],
    include: ['tests/unit/{components,hooks,api,utils}/**/*.test.{ts,tsx}'],
  },
});
