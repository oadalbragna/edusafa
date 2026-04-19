/**
 * Telegram Media Proxy - Logger Utility
 * Comprehensive logging system with multiple levels and formatting
 */

import { LogEntry } from '../types';

export class Logger {
  private level: 'debug' | 'info' | 'warn' | 'error';
  private enabled: boolean;
  private logs: LogEntry[] = [];
  private maxHistorySize = 1000;

  constructor(enabled: boolean = true, level: 'debug' | 'info' | 'warn' | 'error' = 'info') {
    this.enabled = enabled;
    this.level = level;
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  private formatMessage(level: string, message: string, metadata?: Record<string, any>): string {
    const timestamp = new Date().toISOString();
    const meta = metadata ? ` ${JSON.stringify(metadata)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${meta}`;
  }

  private addHistory(level: string, message: string, metadata?: Record<string, any>) {
    if (this.logs.length >= this.maxHistorySize) {
      this.logs.shift(); // Remove oldest entry
    }
    this.logs.push({
      timestamp: new Date().toISOString(),
      level: level as any,
      message,
      metadata
    });
  }

  debug(message: string, metadata?: Record<string, any>) {
    if (!this.enabled || !this.shouldLog('debug')) return;
    console.debug(this.formatMessage('debug', message, metadata));
    this.addHistory('debug', message, metadata);
  }

  info(message: string, metadata?: Record<string, any>) {
    if (!this.enabled || !this.shouldLog('info')) return;
    console.info(this.formatMessage('info', message, metadata));
    this.addHistory('info', message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>) {
    if (!this.enabled || !this.shouldLog('warn')) return;
    console.warn(this.formatMessage('warn', message, metadata));
    this.addHistory('warn', message, metadata);
  }

  error(message: string, metadata?: Record<string, any>) {
    if (!this.enabled || !this.shouldLog('error')) return;
    console.error(this.formatMessage('error', message, metadata));
    this.addHistory('error', message, metadata);
  }

  getHistory(): LogEntry[] {
    return [...this.logs];
  }

  clearHistory() {
    this.logs = [];
  }

  setLevel(level: 'debug' | 'info' | 'warn' | 'error') {
    this.level = level;
  }

  toggle(enabled: boolean) {
    this.enabled = enabled;
  }
}

// Default logger instance
export const logger = new Logger(
  process.env.PROXY_ENABLE_LOGGING !== 'false',
  (process.env.PROXY_LOG_LEVEL as any) || 'info'
);
