/**
 * Telegram Media Proxy - Media Handler
 * Main handler for /api/media endpoint
 * Streams files from Telegram while hiding the real URL
 */

import { TelegramService } from '../services/telegramService';
import { RateLimiter } from '../utils/rateLimiter';
import { logger } from '../utils/logger';
import { ProxyConfig, ProxyResponse } from '../types';

// MIME type mapping for common file extensions
const MIME_TYPES: Record<string, string> = {
  'pdf': 'application/pdf',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'gif': 'image/gif',
  'webp': 'image/webp',
  'svg': 'image/svg+xml',
  'mp4': 'video/mp4',
  'webm': 'video/webm',
  'mp3': 'audio/mpeg',
  'wav': 'audio/wav',
  'ogg': 'audio/ogg',
  'doc': 'application/msword',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'xls': 'application/vnd.ms-excel',
  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'ppt': 'application/vnd.ms-powerpoint',
  'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'zip': 'application/zip',
  'rar': 'application/x-rar-compressed',
  'txt': 'text/plain',
  'html': 'text/html',
  'css': 'text/css',
  'js': 'application/javascript',
  'json': 'application/json',
  'xml': 'application/xml'
};

export class MediaHandler {
  private telegramService: TelegramService;
  private rateLimiter: RateLimiter;
  private config: ProxyConfig;

  constructor(config: ProxyConfig) {
    this.config = config;
    this.telegramService = new TelegramService(config);
    this.rateLimiter = new RateLimiter(config.rateLimitWindow, config.rateLimitMaxRequests);
    
    logger.info('MediaHandler initialized');
  }

  /**
   * Handle media request
   * Returns a Response object that can be directly returned from fetch handler
   */
  async handle(request: Request, clientIp?: string): Promise<Response> {
    const startTime = Date.now();
    
    try {
      // Rate limiting
      if (clientIp && !this.rateLimiter.isAllowed(clientIp)) {
        const remaining = this.rateLimiter.getRemainingRequests(clientIp);
        const resetTime = this.rateLimiter.getResetTime(clientIp);
        
        logger.warn('Rate limit exceeded', { ip: clientIp });
        
        return new Response('Too Many Requests. Try again later.', {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': this.config.rateLimitMaxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTime.toString()
          }
        });
      }

      // Parse URL and extract file_id (shortId)
      const url = new URL(request.url);
      const shortId = url.searchParams.get('f') || url.searchParams.get('file') || url.searchParams.get('file_id');
      
      if (!shortId) {
        logger.warn('Missing file_id parameter', { url: request.url });
        return new Response('Missing file_id parameter.', { status: 400 });
      }

      // PRODUCTION FIX: If the shortId isn't a direct Telegram file_id,
      // try to resolve it from Firebase safe_links meta-data first.
      let finalFileId = shortId;
      if (shortId.startsWith('f_')) {
        const resolvedId = await this.resolveShortIdFromFirebase(shortId);
        if (resolvedId) {
          finalFileId = resolvedId;
          logger.info('Resolved shortId to tele_file_id', { shortId, finalFileId });
        }
      }

      // Validate file_id
      if (!TelegramService.isValidFileId(finalFileId)) {
        logger.warn('Invalid file_id format', { finalFileId });
        return new Response('Invalid file_id format', { status: 400 });
      }

      logger.info('Media request', { fileId: finalFileId, ip: clientIp });

      // Get file stream from Telegram
      const { stream, contentType, contentLength, status, headers: telegramHeaders } = await this.telegramService.streamFile(finalFileId, request.headers);

      // Determine content type from file path or default to application/octet-stream
      const fileExt = fileId.split('.').pop()?.toLowerCase() || '';
      const detectedContentType = contentType || MIME_TYPES[fileExt] || 'application/octet-stream';

      // Build response headers
      const headers = new Headers();
      headers.set('Content-Type', detectedContentType);
      headers.set('Cache-Control', `public, max-age=${Math.floor(this.config.cacheTTL / 1000)}`);
      headers.set('X-Content-Type-Options', 'nosniff');
      
      // Copy relevant headers from Telegram (especially Content-Range)
      telegramHeaders.forEach((value, key) => {
        headers.set(key, value);
      });

      // Ensure Accept-Ranges is set
      headers.set('Accept-Ranges', 'bytes');
      
      // Add rate limit info to headers
      if (clientIp) {
        headers.set('X-RateLimit-Limit', this.config.rateLimitMaxRequests.toString());
        headers.set('X-RateLimit-Remaining', this.rateLimiter.getRemainingRequests(clientIp).toString());
        headers.set('X-RateLimit-Reset', this.rateLimiter.getResetTime(clientIp).toString());
      }

      // Log successful response
      const duration = Date.now() - startTime;
      logger.info('Media served successfully', { 
        fileId, 
        duration: `${duration}ms`,
        contentType: detectedContentType,
        contentLength,
        status,
        cached: true
      });

      // Return streaming response
      return new Response(stream as any, {
        status,
        headers
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Media handler error', { 
        error: error.message, 
        stack: error.stack,
        duration: `${duration}ms`,
        url: request.url 
      });

      // Return appropriate error response
      if (error.message.includes('404') || error.message.includes('not found')) {
        return new Response('File not found', {
          status: 404,
          headers: { 'Content-Type': 'text/plain' }
        });
      }

      if (error.message.includes('403') || error.message.includes('forbidden')) {
        return new Response('Access forbidden. File may have expired.', {
          status: 403,
          headers: { 'Content-Type': 'text/plain' }
        });
      }

      return new Response('Internal server error', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  }

  /**
   * Helper to resolve shortId to tele_file_id from Firebase
   */
  private async resolveShortIdFromFirebase(shortId: string): Promise<string | null> {
    try {
      // Lazy initialize Firebase if needed (in a real project, use firebase-admin)
      // Since this proxy runs on Node, we use firebase-admin or standard REST API
      // Here we use REST API for portability in serverless environments
      const FIREBASE_URL = 'https://edusafa-default-rtdb.firebaseio.com'; // Replace with actual URL
      const response = await fetch(`${FIREBASE_URL}/sys/meta_data/safe_links/${shortId}.json`);
      const data = await response.json();
      
      return data?.tele_file_id || null;
    } catch (e) {
      logger.error('Failed to resolve shortId from Firebase', { shortId, error: e.message });
      return null;
    }
  }
  getStats() {
    return {
      cache: this.telegramService.getCacheStats(),
      rateLimiter: {
        activeClients: this.rateLimiter.getSize()
      }
    };
  }

  /**
   * Clear cache
   */
  clearCache(fileId?: string) {
    this.telegramService.clearCache(fileId);
  }

  /**
   * Dispose resources
   */
  dispose() {
    this.telegramService.dispose();
    this.rateLimiter.dispose();
    logger.info('MediaHandler disposed');
  }
}
