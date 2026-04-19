/**
 * Telegram Media Proxy - Type Definitions
 * Portable type definitions for the proxy system
 */

export interface TelegramFile {
  file_id: string;
  file_path?: string;
  file_size?: number;
  file_unique_id?: string;
}

export interface TelegramResponse<T> {
  ok: boolean;
  result: T;
  description?: string;
  error_code?: number;
}

export interface CachedFileUrl {
  url: string;
  file_path: string;
  expiresAt: number;
  createdAt: number;
  attempts: number;
}

export interface ProxyConfig {
  botToken: string;
  chatId: string;
  cacheTTL: number; // milliseconds
  maxRetries: number;
  rateLimitWindow: number; // milliseconds
  rateLimitMaxRequests: number;
  enableLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface ProxyRequest {
  fileId: string;
  ip?: string;
  userAgent?: string;
  timestamp: number;
}

export interface ProxyResponse {
  status: number;
  headers?: Record<string, string>;
  stream?: ReadableStream<Uint8Array>;
  buffer?: Uint8Array;
  error?: string;
  cached?: boolean;
}

export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  metadata?: Record<string, any>;
}

export interface RateLimitEntry {
  count: number;
  resetAt: number;
}
