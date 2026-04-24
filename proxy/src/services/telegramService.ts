/**
 * Telegram Media Proxy - Telegram Service
 * Core service for interacting with Telegram Bot API
 * Handles file retrieval, URL generation, caching, and error recovery
 */

import { CachedFileUrl, ProxyConfig, TelegramFile, TelegramResponse } from '../types';
import { logger } from '../utils/logger';

export class TelegramService {
  private config: ProxyConfig;
  private cache: Map<string, CachedFileUrl> = new Map();
  private cacheCleanupInterval: NodeJS.Timeout;

  constructor(config: ProxyConfig) {
    this.config = config;
    
    // Only validate if credentials are provided
    if (config.botToken && config.chatId) {
      this.validateConfig();
    }
    
    // Cache cleanup every 2 minutes
    this.cacheCleanupInterval = setInterval(() => this.cleanupCache(), 120000);
    
    logger.info('TelegramService initialized', { 
      cacheTTL: `${config.cacheTTL / 1000}s`,
      maxRetries: config.maxRetries,
      hasCredentials: !!(config.botToken && config.chatId)
    });
  }

  private validateConfig() {
    if (!this.config.botToken) {
      throw new Error('Telegram bot token is required. Set PROXY_BOT_TOKEN environment variable.');
    }
    if (!this.config.chatId) {
      throw new Error('Telegram chat ID is required. Set PROXY_CHAT_ID environment variable.');
    }
  }

  /**
   * Get file information from Telegram API
   */
  async getFile(fileId: string): Promise<TelegramFile> {
    logger.debug('Getting file info from Telegram', { fileId });
    
    const url = `https://api.telegram.org/bot${this.config.botToken}/getFile?file_id=${encodeURIComponent(fileId)}`;
    
    try {
      const response = await fetch(url);
      const data: TelegramResponse<TelegramFile> = await response.json();
      
      if (!data.ok) {
        throw new Error(`Telegram API error: ${data.description || 'Unknown error'}`);
      }
      
      logger.debug('File info retrieved', { fileId, hasPath: !!data.result.file_path });
      return data.result;
    } catch (error) {
      logger.error('Failed to get file from Telegram', { fileId, error: error.message });
      throw error;
    }
  }

  /**
   * Get direct download URL for a file from Telegram
   */
  async getDirectUrl(fileId: string): Promise<string> {
    const fileInfo = await this.getFile(fileId);
    
    if (!fileInfo.file_path) {
      throw new Error(`File path not available for file_id: ${fileId}`);
    }
    
    return `https://api.telegram.org/file/bot${this.config.botToken}/${fileInfo.file_path}`;
  }

  /**
   * Get cached URL or fetch new one
   * Implements smart caching with TTL and auto-refresh on failure
   */
  async getCachedUrl(fileId: string): Promise<CachedFileUrl> {
    const cached = this.cache.get(fileId);
    const now = Date.now();
    
    // Return cached URL if still valid
    if (cached && cached.expiresAt > now) {
      logger.debug('Cache hit', { fileId, age: `${(now - cached.createdAt) / 1000}s` });
      return cached;
    }
    
    // Cache expired or doesn't exist - fetch new URL
    logger.debug('Cache miss or expired', { fileId });
    return await this.refreshUrl(fileId);
  }

  /**
   * Refresh URL from Telegram API with retry logic
   */
  private async refreshUrl(fileId: string, retryCount: number = 0): Promise<CachedFileUrl> {
    try {
      const fileInfo = await this.getFile(fileId);
      
      if (!fileInfo.file_path) {
        throw new Error('File path not available');
      }
      
      const url = `https://api.telegram.org/file/bot${this.config.botToken}/${fileInfo.file_path}`;
      const now = Date.now();
      
      const cachedUrl: CachedFileUrl = {
        url,
        file_path: fileInfo.file_path,
        expiresAt: now + this.config.cacheTTL,
        createdAt: now,
        attempts: retryCount + 1
      };
      
      this.cache.set(fileId, cachedUrl);
      
      logger.info('URL refreshed successfully', { 
        fileId, 
        ttl: `${this.config.cacheTTL / 1000}s`,
        attempts: cachedUrl.attempts 
      });
      
      return cachedUrl;
    } catch (error) {
      logger.warn('Failed to refresh URL', { fileId, retryCount, maxRetries: this.config.maxRetries, error: error.message });
      
      // Check if we have a cached URL that's slightly expired (grace period)
      const cached = this.cache.get(fileId);
      const gracePeriod = 60000; // 1 minute grace period
      if (cached && cached.expiresAt < Date.now() + gracePeriod) {
        logger.info('Using expired cache during retry', { fileId });
        return cached;
      }
      
      // Retry if under max attempts
      if (retryCount < this.config.maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff, max 5s
        logger.debug('Retrying with backoff', { fileId, retryCount, delay });
        await this.sleep(delay);
        return this.refreshUrl(fileId, retryCount + 1);
      }
      
      throw error;
    }
  }

  /**
   * Stream file directly from Telegram (memory efficient)
   */
  async streamFile(fileId: string, requestHeaders?: Headers): Promise<{
    stream: ReadableStream<Uint8Array>;
    contentType?: string;
    contentLength?: number;
    status: number;
    headers: Headers;
  }> {
    const cachedUrl = await this.getCachedUrl(fileId);
    
    logger.debug('Streaming file', { fileId, url: cachedUrl.url });
    
    // Extract range header if present
    const fetchHeaders = new Headers();
    if (requestHeaders && requestHeaders.has('range')) {
      fetchHeaders.set('range', requestHeaders.get('range')!);
    }
    
    let response = await fetch(cachedUrl.url, { headers: fetchHeaders });
    
    if (!response.ok && response.status !== 206) {
      // If streaming fails and URL might be expired, try refreshing
      if (response.status === 404 || response.status === 403) {
        logger.warn('Stream failed with expired URL, refreshing', { fileId, status: response.status });
        this.cache.delete(fileId); // Clear cache
        const freshUrl = await this.refreshUrl(fileId);
        
        response = await fetch(freshUrl.url, { headers: fetchHeaders });
        if (!response.ok && response.status !== 206) {
          throw new Error(`Failed to stream file after refresh: ${response.status} ${response.statusText}`);
        }
      } else {
        throw new Error(`Failed to stream file: ${response.status} ${response.statusText}`);
      }
    }
    
    const responseHeaders = new Headers();
    // Copy relevant headers from Telegram response
    const headersToCopy = ['content-type', 'content-length', 'content-range', 'accept-ranges'];
    headersToCopy.forEach(h => {
      if (response.headers.has(h)) {
        responseHeaders.set(h, response.headers.get(h)!);
      }
    });

    return {
      stream: response.body!,
      contentType: response.headers.get('content-type') || undefined,
      contentLength: parseInt(response.headers.get('content-length') || '0', 10),
      status: response.status,
      headers: responseHeaders
    };
  }

  /**
   * Validate file_id format
   */
  static isValidFileId(fileId: string): boolean {
    // Telegram file IDs are typically base64-like strings
    // Basic validation: non-empty, reasonable length, valid characters
    const fileIdPattern = /^[A-Za-z0-9_-]{10,200}$/;
    return fileIdPattern.test(fileId);
  }

  /**
   * Clear cache for a specific file or all files
   */
  clearCache(fileId?: string) {
    if (fileId) {
      this.cache.delete(fileId);
      logger.info('Cache cleared for file', { fileId });
    } else {
      this.cache.clear();
      logger.info('All cache cleared');
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    let active = 0;
    let expired = 0;
    
    this.cache.forEach((entry) => {
      if (entry.expiresAt > now) {
        active++;
      } else {
        expired++;
      }
    });
    
    return {
      total: this.cache.size,
      active,
      expired,
      ttl: `${this.config.cacheTTL / 1000}s`
    };
  }

  /**
   * Send a document to Telegram chat (for upload functionality)
   */
  async sendDocument(fileName: string, fileBuffer: Uint8Array): Promise<{ fileId: string; fileName: string }> {
    const formData = new FormData();
    formData.append('chat_id', this.config.chatId);
    
    // Convert Uint8Array to Blob for FormData
    const blob = new Blob([fileBuffer as BlobPart], { type: 'application/octet-stream' });
    formData.append('document', blob, fileName);
    
    const url = `https://api.telegram.org/bot${this.config.botToken}/sendDocument`;
    
    logger.debug('Sending document to Telegram', { fileName, size: fileBuffer.length });
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData
    });
    
    const data: TelegramResponse<any> = await response.json();
    
    if (!data.ok) {
      throw new Error(`Failed to send document: ${data.description}`);
    }
    
    const result = data.result;
    const fileData = result.document || result.video || result.audio || (result.photo ? result.photo[result.photo.length - 1] : null) || result.voice;
    
    if (!fileData || !fileData.file_id) {
      throw new Error('Invalid Telegram response: file_id not found');
    }

    logger.info('Document sent to Telegram', { fileId: fileData.file_id, fileName });
    
    return {
      fileId: fileData.file_id,
      fileName: fileData.file_name || fileName
    };
  }

  /**
   * Delete a message from Telegram chat
   */
  async deleteMessage(messageId: number): Promise<boolean> {
    const url = `https://api.telegram.org/bot${this.config.botToken}/deleteMessage`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.config.chatId,
          message_id: messageId
        })
      });
      
      const data: TelegramResponse<boolean> = await response.json();
      return data.ok;
    } catch (error) {
      logger.error('Failed to delete message', { messageId, error: error.message });
      return false;
    }
  }

  /**
   * Cleanup expired cache entries
   */
  private cleanupCache() {
    const now = Date.now();
    let cleaned = 0;
    
    this.cache.forEach((entry, key) => {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
        cleaned++;
      }
    });
    
    if (cleaned > 0) {
      logger.debug('Cache cleanup', { cleaned, remaining: this.cache.size });
    }
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Dispose resources
   */
  dispose() {
    clearInterval(this.cacheCleanupInterval);
    this.cache.clear();
    logger.info('TelegramService disposed');
  }
}
