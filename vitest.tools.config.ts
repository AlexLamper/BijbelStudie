import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Design and calibration tooling for the tree (`npm run tree:*`). Runs as
 * vitest files so it can import the TypeScript generator without extra
 * tooling; `npm test` never picks these up (its include is `tests/`).
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['scripts/levensboom/**/*.tool.ts'],
    testTimeout: 600_000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
