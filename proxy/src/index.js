/**
 * Telegram Media Proxy
 * Main entry point - exports all public APIs
 *
 * This module is designed to be:
 * - Portable: Easy to copy between projects
 * - Extensible: Clean architecture for future additions
 * - Production-ready: Caching, rate limiting, error handling
 */
// Core services
export { TelegramService } from './src/services/telegramService';
// Middleware
export { MediaHandler } from './src/middleware/mediaHandler';
export { securityMiddleware } from './src/middleware/security';
// Utils
export { Logger, logger } from './src/utils/logger';
export { RateLimiter } from './src/utils/rateLimiter';
// Vite plugin
export { viteTelegramProxyPlugin, ViteTelegramProxyOptions } from './src/vitePlugin';
// Configuration - SINGLE SOURCE OF TRUTH for Telegram credentials
export { getTelegramConfig, validateTelegramConfig, logConfigStatus, telegramConfig } from './src/config/telegram';
