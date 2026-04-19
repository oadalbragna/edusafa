/**
 * EduSafa Learning - Centralized Error Handler
 * 
 * Unified error handling, logging, and reporting
 */

export enum ErrorType {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NETWORK = 'NETWORK',
  DATABASE = 'DATABASE',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN'
}

export interface AppError {
  type: ErrorType;
  message: string;
  code?: string;
  stack?: string;
  context?: Record<string, any>;
  timestamp: string;
  userId?: string;
}

export interface ErrorHandlerConfig {
  enableLogging: boolean;
  enableReporting: boolean;
  silentMode: boolean;
}

class ErrorHandler {
  private config: ErrorHandlerConfig;
  private errorListeners: Set<(error: AppError) => void> = new Set();

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = {
      enableLogging: config.enableLogging ?? true,
      enableReporting: config.enableReporting ?? false,
      silentMode: config.silentMode ?? false
    };
  }

  /**
   * Handle an error
   */
  handle(error: unknown, context?: Record<string, any>): AppError {
    const appError = this.normalizeError(error, context);
    
    if (this.config.enableLogging) {
      this.logError(appError);
    }

    if (this.config.enableReporting) {
      this.reportError(appError);
    }

    this.notifyListeners(appError);

    return appError;
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(error: AppError): string {
    const messages: Record<ErrorType, string> = {
      [ErrorType.AUTHENTICATION]: 'بيانات الدخول غير صحيحة. يرجى المحاولة مرة أخرى.',
      [ErrorType.AUTHORIZATION]: 'ليس لديك الصلاحية للوصول إلى هذا المورد.',
      [ErrorType.NETWORK]: 'حدث خطأ في الاتصال. يرجى التحقق من الإنترنت والمحاولة مرة أخرى.',
      [ErrorType.DATABASE]: 'حدث خطأ في قاعدة البيانات. يرجى المحاولة مرة أخرى لاحقاً.',
      [ErrorType.VALIDATION]: 'البيانات المدخلة غير صحيحة. يرجى التحقق والمحاولة مرة أخرى.',
      [ErrorType.NOT_FOUND]: 'العنصر المطلوب غير موجود.',
      [ErrorType.SERVER]: 'حدث خطأ في الخادم. يرجى المحاولة مرة أخرى لاحقاً.',
      [ErrorType.UNKNOWN]: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.'
    };

    return messages[error.type] || messages[ErrorType.UNKNOWN];
  }

  /**
   * Add error listener
   */
  addListener(listener: (error: AppError) => void): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  /**
   * Update configuration
   */
  configure(config: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Normalize different error types to AppError
   */
  private normalizeError(error: unknown, context?: Record<string, any>): AppError {
    const timestamp = new Date().toISOString();

    if (error instanceof Error) {
      return {
        type: this.classifyError(error),
        message: error.message,
        stack: error.stack,
        context,
        timestamp
      };
    }

    if (typeof error === 'string') {
      return {
        type: ErrorType.UNKNOWN,
        message: error,
        context,
        timestamp
      };
    }

    return {
      type: ErrorType.UNKNOWN,
      message: 'حدث خطأ غير متوقع',
      context,
      timestamp
    };
  }

  /**
   * Classify error type
   */
  private classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase();

    if (message.includes('auth') || message.includes('authentication')) {
      return ErrorType.AUTHENTICATION;
    }

    if (message.includes('permission') || message.includes('authorization') || message.includes('forbidden')) {
      return ErrorType.AUTHORIZATION;
    }

    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return ErrorType.NETWORK;
    }

    if (message.includes('database') || message.includes('firebase')) {
      return ErrorType.DATABASE;
    }

    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorType.VALIDATION;
    }

    if (message.includes('not found') || message.includes('404')) {
      return ErrorType.NOT_FOUND;
    }

    if (message.includes('server') || message.includes('500')) {
      return ErrorType.SERVER;
    }

    return ErrorType.UNKNOWN;
  }

  /**
   * Log error to console
   */
  private logError(error: AppError): void {
    if (this.config.silentMode) return;

    console.group(`❌ [${error.type}] ${error.timestamp}`);
    console.error('Message:', error.message);
    if (error.code) console.error('Code:', error.code);
    if (error.context) console.error('Context:', JSON.stringify(error.context, null, 2));
    if (error.stack) console.error('Stack:', error.stack);
    console.groupEnd();
  }

  /**
   * Report error to external service (e.g., Sentry)
   */
  private reportError(error: AppError): void {
    // TODO: Integrate with Sentry or similar service
    // For now, just log to a file or send to backend
    console.log('Reporting error to external service:', error);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(error: AppError): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (e) {
        console.error('Error listener threw error:', e);
      }
    });
  }
}

/**
 * Firebase-specific error handler
 */
export function handleFirebaseError(error: any, operation?: string): AppError {
  const errorHandler = new ErrorHandler();
  
  const context = {
    operation,
    code: error?.code,
    path: error?.path
  };

  // Firebase-specific error classification
  if (error?.code === 'PERMISSION_DENIED') {
    return errorHandler.handle(new Error('ليس لديك الصلاحية للوصول إلى هذا المورد'), {
      ...context,
      type: ErrorType.AUTHORIZATION
    });
  }

  if (error?.code === 'NETWORK_ERROR') {
    return errorHandler.handle(new Error('حدث خطأ في الاتصال. يرجى التحقق من الإنترنت.'), {
      ...context,
      type: ErrorType.NETWORK
    });
  }

  return errorHandler.handle(error, context);
}

/**
 * Async error handler wrapper
 */
export function withErrorHandling<T>(
  fn: () => Promise<T>,
  fallbackValue?: T,
  context?: Record<string, any>
): Promise<T | undefined> {
  return fn().catch((error) => {
    const errorHandler = new ErrorHandler();
    errorHandler.handle(error, context);
    return fallbackValue;
  });
}

// Export singleton instance
export const errorHandler = new ErrorHandler({
  enableLogging: true,
  enableReporting: false,
  silentMode: false
});

export default errorHandler;
