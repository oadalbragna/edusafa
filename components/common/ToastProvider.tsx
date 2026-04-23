/**
 * EduSafa Learning - Toast Notification System
 * 
 * Replaces alert() with beautiful, non-blocking notifications
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  addToast: (message: string, type?: ToastType) => void; // Added for compatibility
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  dismissToast: (id: string) => void;
  dismissAll: () => void;
}

// ============================================================================
// Context
// ============================================================================

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

// ============================================================================
// Provider Component
// ============================================================================

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = {
      id,
      duration: 5000,
      ...toast
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-dismiss
    if (newToast.duration !== 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, newToast.duration);
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    showToast({ type, title: message });
  }, [showToast]);

  const showSuccess = useCallback((title: string, message?: string) => {
    showToast({ type: 'success', title, message });
  }, [showToast]);

  const showError = useCallback((title: string, message?: string) => {
    showToast({ type: 'error', title, message, duration: 8000 });
  }, [showToast]);

  const showInfo = useCallback((title: string, message?: string) => {
    showToast({ type: 'info', title, message });
  }, [showToast]);

  const showWarning = useCallback((title: string, message?: string) => {
    showToast({ type: 'warning', title, message, duration: 8000 });
  }, [showToast]);

  return (
    <ToastContext.Provider value={{
      showToast,
      addToast,
      showSuccess,
      showError,
      showInfo,
      showWarning,
      dismissToast,
      dismissAll
    }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};

// ============================================================================
// Container Component
// ============================================================================

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 w-full max-w-md px-4 pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

// ============================================================================
// Toast Item Component
// ============================================================================

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    warning: AlertTriangle
  };

  const styles = {
    success: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      icon: 'text-emerald-600',
      title: 'text-emerald-900',
      message: 'text-emerald-700'
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-600',
      title: 'text-red-900',
      message: 'text-red-700'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-600',
      title: 'text-blue-900',
      message: 'text-blue-700'
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: 'text-amber-600',
      title: 'text-amber-900',
      message: 'text-amber-700'
    }
  };

  const Icon = icons[toast.type];
  const style = styles[toast.type];

  return (
    <div
      className={`pointer-events-auto ${style.bg} ${style.border} border rounded-2xl shadow-lg shadow-black/5 p-4 flex gap-3 items-start animate-in slide-in-from-top fade-in duration-300`}
      role="alert"
    >
      <Icon className={`w-5 h-5 ${style.icon} shrink-0 mt-0.5`} />
      
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-sm ${style.title} leading-tight`}>
          {toast.title}
        </p>
        {toast.message && (
          <p className={`text-xs ${style.message} mt-1 leading-relaxed`}>
            {toast.message}
          </p>
        )}
      </div>
      
      <button
        onClick={() => onDismiss(toast.id)}
        className={`shrink-0 p-1 ${style.icon} hover:bg-white/50 rounded-lg transition-colors`}
        aria-label="إغلاق"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// ============================================================================
// Hook for easy access
// ============================================================================

export const useToastNotification = () => {
  const toast = useToast();
  
  return {
    success: toast.showSuccess,
    error: toast.showError,
    info: toast.showInfo,
    warning: toast.showWarning,
    dismiss: toast.dismissToast,
    dismissAll: toast.dismissAll
  };
};

export default ToastProvider;
