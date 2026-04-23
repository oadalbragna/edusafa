/**
 * Telegram Media Proxy - CORS & Security Middleware
 * Handles CORS headers, security headers, and request validation
 * Note: This is a reference implementation for Express.js
 * For Vite plugin, security headers are set in the media handler
 */
export function getSecurityHeaders(options = {}) {
    const { allowedOrigins = ['*'], allowCredentials = true, maxAge = 86400 // 24 hours
     } = options;
    const headers = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'no-referrer'
    };
    if (allowedOrigins.includes('*')) {
        headers['Access-Control-Allow-Origin'] = '*';
    }
    if (allowCredentials) {
        headers['Access-Control-Allow-Credentials'] = 'true';
    }
    headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With';
    headers['Access-Control-Max-Age'] = maxAge.toString();
    return headers;
}
