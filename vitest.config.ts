import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'packages/**/tests/**/*.{test,spec}.{ts,tsx}',
      'apps/**/tests/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: ['apps/**/tests/e2e/**', '**/node_modules/**', '**/dist/**'],
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});
