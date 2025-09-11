import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/components': resolve(__dirname, 'src/components'),
      '@/systems': resolve(__dirname, 'src/systems'),
      '@/models': resolve(__dirname, 'src/models'),
      '@/utils': resolve(__dirname, 'src/utils'),
    },
  },
});