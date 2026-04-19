import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { viteTelegramProxyPlugin } from './proxy/src/vitePlugin'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env vars regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      // Telegram Media Proxy - enables /api/media endpoint in development
      viteTelegramProxyPlugin({
        botToken: env.VITE_TELEGRAM_BOT_TOKEN || env.PROXY_BOT_TOKEN,
        chatId: env.VITE_TELEGRAM_CHAT_ID || env.PROXY_CHAT_ID,
        cacheTTL: 600, // 10 minutes
        maxRetries: 3,
        rateLimitWindow: 60000, // 1 minute
        rateLimitMaxRequests: 30,
        enableLogging: env.VITE_VERBOSE_LOGGING === 'true',
        logLevel: (env.PROXY_LOG_LEVEL as any) || 'info'
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@components': path.resolve(__dirname, './components'),
        '@pages': path.resolve(__dirname, './pages'),
        '@services': path.resolve(__dirname, './services'),
        '@hooks': path.resolve(__dirname, './hooks'),
        '@context': path.resolve(__dirname, './context'),
        '@types': path.resolve(__dirname, './types'),
        '@utils': path.resolve(__dirname, './utils'),
        '@constants': path.resolve(__dirname, './constants'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
                return 'vendor-react';
              }
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('recharts')) {
                return 'vendor-charts';
              }
              if (id.includes('framer-motion')) {
                return 'vendor-animations';
              }
              return 'vendor';
            }
          },
          // Optimize chunk names for better caching
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        },
      },
      chunkSizeWarningLimit: 500,
      minify: 'esbuild',
      esbuild: {
        drop: ['console', 'debugger'],
      },
      // Enable CSS code splitting
      cssCodeSplit: true,
      // Optimize chunk loading
      target: 'esnext',
    },
    server: {
      port: 3000,
      host: true,
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'firebase/app',
        'firebase/database',
        'firebase/storage',
        'firebase/analytics',
        'lucide-react',
        'framer-motion',
        'clsx',
        'tailwind-merge',
      ],
      // Pre-bundle dependencies for faster dev server startup
      force: false,
    },
    // Enable module preloading
    preload: true,
    // Optimize base HTML
    html: {
      cspNonce: '',
    },
  }
})
