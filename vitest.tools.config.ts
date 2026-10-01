import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Generators that need to import TypeScript: the tree's design and calibration
 * tooling (`npm run tree:*`) and the HSV quotation file (`npm run hsv:quotes`).
 * They run as vitest files so they can import the real modules without extra
 * tooling; `npm test` never picks these up (its include is `tests/`).
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['scripts/**/*.tool.ts'],
    testTimeout: 600_000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
