/**
 * Production Server - Express server with Telegram Media Proxy
 * Used for production deployment
 * 
 * This server:
 * 1. Serves the built React app
 * 2. Provides /api/media endpoint via the proxy
 * 3. Handles CORS, rate limiting, and security
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { MediaHandler } from '../proxy/src/middleware/mediaHandler';
import { ProxyConfig } from '../proxy/src/types';
import { logger } from '../proxy/src/utils/logger';
import { getTelegramConfig } from '../proxy/src/config/telegram';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// Configuration - Using centralized Telegram config
// ============================================================================

const envConfig = getTelegramConfig();

const config: ProxyConfig = {
  botToken: process.env.PROXY_BOT_TOKEN || envConfig.botToken || '',
  chatId: process.env.PROXY_CHAT_ID || envConfig.chatId || '',
  cacheTTL: parseInt(process.env.PROXY_CACHE_TTL || '600') * 1000,
  maxRetries: parseInt(process.env.PROXY_MAX_RETRIES || '3'),
  rateLimitWindow: parseInt(process.env.PROXY_RATE_LIMIT_WINDOW || '60000'),
  rateLimitMaxRequests: parseInt(process.env.PROXY_RATE_LIMIT_MAX_REQUESTS || '30'),
  enableLogging: process.env.PROXY_ENABLE_LOGGING !== 'false',
  logLevel: (process.env.PROXY_LOG_LEVEL as any) || 'warn'
};

// Validate configuration
if (!config.botToken || !config.chatId) {
  console.error('❌ Missing required Telegram configuration:');
  console.error('   - VITE_TELEGRAM_BOT_TOKEN or PROXY_BOT_TOKEN');
  console.error('   - VITE_TELEGRAM_CHAT_ID or PROXY_CHAT_ID');
  console.error('   Please set these variables in your .env file');
  process.exit(1);
}

logger.info('✅ Telegram credentials loaded successfully');

// ============================================================================
// Middleware
// ============================================================================

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

// ============================================================================
// Telegram Media Proxy Endpoint
// ============================================================================

const mediaHandler = new MediaHandler(config);

app.get('/api/media', async (req, res) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    
    // Create Request object
    const protocol = req.protocol;
    const host = req.get('host');
    const fullUrl = `${protocol}://${host}${req.originalUrl}`;
    
    const request = new Request(fullUrl, {
      method: 'GET',
      headers: new Headers(req.headers as Record<string, string>)
    });

    // Handle the request
    const response = await mediaHandler.handle(request, clientIp);
    
    // Set status code
    res.status(response.status);
    
    // Set headers
    for (const [key, value] of response.headers.entries()) {
      res.setHeader(key, value);
    }
    
    // Stream the response
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
    logger.error('Production server error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    proxy: mediaHandler.getStats()
  });
});

// ============================================================================
// Serve Static Files (React app)
// ============================================================================

app.use(express.static(path.join(__dirname, 'dist')));

// Handle React Router - send all other requests to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ============================================================================
// Start Server
// ============================================================================

app.listen(PORT, () => {
  logger.info('🚀 Production server started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'production',
    endpoint: '/api/media',
    cacheTTL: `${config.cacheTTL / 1000}s`,
    rateLimit: `${config.rateLimitMaxRequests} requests per ${config.rateLimitWindow / 1000}s`
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing server');
  mediaHandler.dispose();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing server');
  mediaHandler.dispose();
  process.exit(0);
});

export default app;
