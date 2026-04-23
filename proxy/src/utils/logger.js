/**
 * Telegram Media Proxy - Logger Utility
 * Comprehensive logging system with multiple levels and formatting
 */
export class Logger {
    constructor(enabled = true, level = 'info') {
        Object.defineProperty(this, "level", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "enabled", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "logs", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "maxHistorySize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 1000
        });
        this.enabled = enabled;
        this.level = level;
    }
    shouldLog(level) {
        const levels = ['debug', 'info', 'warn', 'error'];
        return levels.indexOf(level) >= levels.indexOf(this.level);
    }
    formatMessage(level, message, metadata) {
        const timestamp = new Date().toISOString();
        const meta = metadata ? ` ${JSON.stringify(metadata)}` : '';
        return `[${timestamp}] [${level.toUpperCase()}] ${message}${meta}`;
    }
    addHistory(level, message, metadata) {
        if (this.logs.length >= this.maxHistorySize) {
            this.logs.shift(); // Remove oldest entry
        }
        this.logs.push({
            timestamp: new Date().toISOString(),
            level: level,
            message,
            metadata
        });
    }
    debug(message, metadata) {
        if (!this.enabled || !this.shouldLog('debug'))
            return;
        console.debug(this.formatMessage('debug', message, metadata));
        this.addHistory('debug', message, metadata);
    }
    info(message, metadata) {
        if (!this.enabled || !this.shouldLog('info'))
            return;
        console.info(this.formatMessage('info', message, metadata));
        this.addHistory('info', message, metadata);
    }
    warn(message, metadata) {
        if (!this.enabled || !this.shouldLog('warn'))
            return;
        console.warn(this.formatMessage('warn', message, metadata));
        this.addHistory('warn', message, metadata);
    }
    error(message, metadata) {
        if (!this.enabled || !this.shouldLog('error'))
            return;
        console.error(this.formatMessage('error', message, metadata));
        this.addHistory('error', message, metadata);
    }
    getHistory() {
        return [...this.logs];
    }
    clearHistory() {
        this.logs = [];
    }
    setLevel(level) {
        this.level = level;
    }
    toggle(enabled) {
        this.enabled = enabled;
    }
}
// Default logger instance
export const logger = new Logger(process.env.PROXY_ENABLE_LOGGING !== 'false', process.env.PROXY_LOG_LEVEL || 'info');
