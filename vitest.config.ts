import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/setup.ts',
        'tests/**/*.test.ts',
        'scripts/',
        'dist/',
        'build/',
        'copy/'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './components'),
      '@pages': path.resolve(__dirname, './pages'),
      '@services': path.resolve(__dirname, './services'),
      '@hooks': path.resolve(__dirname, './hooks'),
      '@context': path.resolve(__dirname, './context'),
      '@types': path.resolve(__dirname, './types'),
      '@utils': path.resolve(__dirname, './utils'),
      '@constants': path.resolve(__dirname, './constants'),
      '@tests': path.resolve(__dirname, './tests'),
    },
  },
});
