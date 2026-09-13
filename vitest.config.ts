import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// package.json sets "type": "module", so __dirname does not exist here.
const rootDir = fileURLToPath(new URL('./', import.meta.url));

export default defineConfig({
  resolve: {
    // Mirrors the "@/*" -> "./*" alias in tsconfig.json
    alias: {
      '@': rootDir,
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
