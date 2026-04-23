/**
 * EduSafa Learning - Data Caching Service
 * 
 * Intelligent caching layer for Firebase data to reduce redundant reads
 * and improve performance
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in ms
}

interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  cleanupInterval: number;
}

class DataCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private config: CacheConfig;
  private cleanupTimer?: NodeJS.Timeout;
  private isEnabled: boolean = true;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: config.defaultTTL ?? 5 * 60 * 1000, // 5 minutes default
      maxSize: config.maxSize ?? 100, // 100 entries max
      cleanupInterval: config.cleanupInterval ?? 60 * 1000 // Cleanup every minute
    };

    // Load initial state from localStorage
    const savedState = localStorage.getItem('edu_cache_enabled');
    this.isEnabled = savedState !== null ? JSON.parse(savedState) : true;

    this.startCleanupTimer();
  }

  /**
   * Toggle cache state
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    localStorage.setItem('edu_cache_enabled', JSON.stringify(enabled));
    if (!enabled) {
      this.clear();
    }
  }

  /**
   * Check if cache is enabled
   */
  getEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Get data from cache
   */
  get<T>(key: string): T | null {
    if (!this.isEnabled) return null;
    
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set data in cache
   */
  set<T>(key: string, data: T, ttl?: number): void {
    if (!this.isEnabled) return;

    // Remove oldest entry if at capacity
    if (this.cache.size >= this.config.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.config.defaultTTL
    });
  }

  /**
   * Check if key exists in cache and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Remove item from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    const now = Date.now();
    const validEntries: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (now <= entry.timestamp + entry.ttl) {
        validEntries.push(key);
      }
    });

    return {
      size: validEntries.length,
      keys: validEntries
    };
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now > entry.timestamp + entry.ttl) {
        toDelete.push(key);
      }
    });

    toDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Start periodic cleanup
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Stop cleanup timer
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}

/**
 * Cache key generator for Firebase paths
 */
export function generateCacheKey(path: string, params?: Record<string, any>): string {
  if (!params) return `firebase:${path}`;
  const paramString = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return `firebase:${path}?${paramString}`;
}

/**
 * Cache TTL presets for different data types
 */
export const CacheTTL = {
  SHORT: 30 * 1000,      // 30 seconds - frequently changing data
  MEDIUM: 5 * 60 * 1000, // 5 minutes - standard data
  LONG: 15 * 60 * 1000,  // 15 minutes - relatively static data
  VERY_LONG: 60 * 60 * 1000, // 1 hour - configuration data
  PERMANENT: 24 * 60 * 60 * 1000 // 24 hours - rarely changing data
};

/**
 * Determine cache TTL based on Firebase path
 */
export function getTTLOrPath(path: string): number {
  // User data - short TTL (can change frequently)
  if (path.includes('users') || path.includes('status')) {
    return CacheTTL.SHORT;
  }
  
  // System configuration - long TTL
  if (path.includes('system/settings') || path.includes('branding')) {
    return CacheTTL.VERY_LONG;
  }
  
  // Educational content - medium TTL
  if (path.includes('courses') || path.includes('materials')) {
    return CacheTTL.MEDIUM;
  }
  
  // Messages and notifications - short TTL
  if (path.includes('messages') || path.includes('notifications')) {
    return CacheTTL.SHORT;
  }
  
  // Default
  return CacheTTL.MEDIUM;
}

// Export singleton instance
export const cache = new DataCache({
  defaultTTL: CacheTTL.MEDIUM,
  maxSize: 100,
  cleanupInterval: 60 * 1000
});

export default cache;
