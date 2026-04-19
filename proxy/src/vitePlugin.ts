/**
 * Telegram Media Proxy - Vite Plugin
 * Adds /api/media endpoint to Vite dev server for localhost development
 * This solves the localhost problem by proxying requests through Vite
 */

import { Plugin } from 'vite';
import { MediaHandler } from './middleware/mediaHandler';
import { ProxyConfig } from './types';
import { logger } from './utils/logger';
import { getTelegramConfig } from './config/telegram';

export interface ViteTelegramProxyOptions {
  /** Telegram Bot Token (overrides env var) */
  botToken?: string;
  /** Telegram Chat ID (overrides env var) */
  chatId?: string;
  /** Cache TTL in seconds (default: 600 = 10 minutes) */
  cacheTTL?: number;
  /** Max retry attempts (default: 3) */
  maxRetries?: number;
  /** Rate limit window in ms (default: 60000 = 1 minute) */
  rateLimitWindow?: number;
  /** Max requests per window (default: 30) */
  rateLimitMaxRequests?: number;
  /** Enable logging (default: true) */
  enableLogging?: boolean;
  /** Log level (default: 'info') */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export function viteTelegramProxyPlugin(options: ViteTelegramProxyOptions = {}): Plugin {
  // Load from centralized config
  const envConfig = getTelegramConfig();
  
  // Priority: explicit options > centralized config > empty
  const botToken = options.botToken || envConfig.botToken || '';
  const chatId = options.chatId || envConfig.chatId || '';
  
  const config: ProxyConfig = {
    botToken,
    chatId,
    cacheTTL: (options.cacheTTL || 600) * 1000, // Convert to ms
    maxRetries: options.maxRetries || 3,
    rateLimitWindow: options.rateLimitWindow || 60000,
    rateLimitMaxRequests: options.rateLimitMaxRequests || 30,
    enableLogging: options.enableLogging !== false,
    logLevel: options.logLevel || 'info'
  };

  let mediaHandler: MediaHandler | null = null;

  return {
    name: 'vite-telegram-proxy',
    
    apply: 'serve', // Only apply during development
    
    configureServer(server) {
      // Only initialize if we have valid credentials
      if (!config.botToken || !config.chatId) {
        console.warn('⚠️  Telegram Media Proxy disabled: Missing credentials');
        console.warn('   Set VITE_TELEGRAM_BOT_TOKEN and VITE_TELEGRAM_CHAT_ID in .env');
        console.warn('   Get bot token from @BotFather on Telegram');
        console.warn('   Get chat ID by adding bot to a group and checking /getUpdates');
        return; // Don't initialize the proxy
      }

      // Initialize media handler
      mediaHandler = new MediaHandler(config);
      logger.info('Vite Telegram Proxy Plugin initialized', {
        endpoint: '/api/media',
        cacheTTL: `${config.cacheTTL / 1000}s`,
        botTokenMasked: config.botToken.substring(0, 10) + '...' + config.botToken.substring(config.botToken.length - 4)
      });

      // Add /api/media endpoint
      server.middlewares.use(async (req, res, next) => {
        // Only handle /api/media requests
        if (!req.url || !req.url.startsWith('/api/media')) {
          return next();
        }

        // Skip non-GET requests
        if (req.method !== 'GET') {
          res.writeHead(405, { 'Content-Type': 'text/plain' });
          res.end('Method Not Allowed');
          return;
        }

        try {
          // Get client IP for rate limiting
          const clientIp = req.socket.remoteAddress || req.connection.remoteAddress || 'unknown';
          
          // Create Request object
          const protocol = server.config.server.https ? 'https' : 'http';
          const host = req.headers.host || 'localhost';
          const fullUrl = `${protocol}://${host}${req.url}`;
          
          const request = new Request(fullUrl, {
            method: 'GET',
            headers: new Headers(req.headers as Record<string, string>)
          });

          // Handle the request
          const response = await mediaHandler.handle(request, clientIp);
          
          // Write response
          res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
          
          if (response.body) {
            const reader = response.body.getReader();
            
            const write = async () => {
              const { done, value } = await reader.read();
              if (done) {
                res.end();
                return;
              }
              res.write(value);
              await write();
            };
            
            await write();
          } else {
            res.end();
          }
          
        } catch (error) {
          logger.error('Vite proxy error', { error: error.message });
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal Server Error');
        }
      });

      // Add cleanup on server close
      server.httpServer?.on('close', () => {
        if (mediaHandler) {
          mediaHandler.dispose();
        }
      });
    }
  };
}

// Default export for easier import
export default viteTelegramProxyPlugin;
