/**
 * Telegram Media Proxy - Rate Limiter
 * Protects against abuse and spam
 */
import { logger } from './logger';
export class RateLimiter {
    constructor(windowMs = 60000, maxRequests = 30) {
        Object.defineProperty(this, "limits", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        Object.defineProperty(this, "windowMs", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "maxRequests", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "cleanupInterval", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.windowMs = windowMs;
        this.maxRequests = maxRequests;
        // Clean up expired entries every 5 minutes
        this.cleanupInterval = setInterval(() => this.cleanup(), 300000);
    }
    isAllowed(identifier) {
        const now = Date.now();
        const entry = this.limits.get(identifier);
        if (!entry || entry.resetAt <= now) {
            // First request or window expired
            this.limits.set(identifier, {
                count: 1,
                resetAt: now + this.windowMs
            });
            logger.debug('Rate limit: new window', { identifier, maxRequests: this.maxRequests });
            return true;
        }
        if (entry.count >= this.maxRequests) {
            logger.warn('Rate limit exceeded', { identifier, count: entry.count, maxRequests: this.maxRequests });
            return false;
        }
        entry.count++;
        logger.debug('Rate limit: request counted', { identifier, count: entry.count });
        return true;
    }
    getRemainingRequests(identifier) {
        const entry = this.limits.get(identifier);
        if (!entry || entry.resetAt <= Date.now()) {
            return this.maxRequests;
        }
        return Math.max(0, this.maxRequests - entry.count);
    }
    getResetTime(identifier) {
        const entry = this.limits.get(identifier);
        if (!entry) {
            return Date.now() + this.windowMs;
        }
        return entry.resetAt;
    }
    reset(identifier) {
        this.limits.delete(identifier);
        logger.info('Rate limit reset', { identifier });
    }
    cleanup() {
        const now = Date.now();
        let cleaned = 0;
        this.limits.forEach((entry, key) => {
            if (entry.resetAt <= now) {
                this.limits.delete(key);
                cleaned++;
            }
        });
        if (cleaned > 0) {
            logger.debug('Rate limiter cleanup', { cleanedEntries: cleaned, remaining: this.limits.size });
        }
    }
    dispose() {
        clearInterval(this.cleanupInterval);
        this.limits.clear();
        logger.info('Rate limiter disposed');
    }
    getSize() {
        return this.limits.size;
    }
}
