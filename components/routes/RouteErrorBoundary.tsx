/**
 * EduSafa Learning - Route Error Boundary
 * 
 * Catches errors in individual routes and displays user-friendly error page
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { useNavigate, useRouteError } from 'react-router-dom';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log error
    console.error('Route Error:', error, errorInfo);
    
    // Call parent error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorPage
          error={this.state.error}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Error Page Component
 */
interface ErrorPageProps {
  error: Error | null;
  onReset: () => void;
}

const ErrorPage: React.FC<ErrorPageProps> = ({ error, onReset }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>

        <h1 className="text-2xl font-black text-slate-900 mb-2">
          حدث خطأ غير متوقع
        </h1>

        <p className="text-slate-500 font-medium text-sm mb-6 leading-relaxed">
          نعتذر عن الإزعاج. حدث خطأ تقني أثناء تحميل الصفحة.
        </p>

        {error && (
          <div className="bg-slate-50 rounded-xl p-4 mb-6 text-right">
            <p className="text-xs font-mono text-slate-600 break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={onReset}
            className="w-full bg-brand-500 text-white py-3.5 rounded-xl font-bold text-sm
                       hover:bg-brand-600 transition-all active:scale-95
                       flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            إعادة المحاولة
          </button>

          <button
            onClick={() => navigate(-1)}
            className="w-full bg-slate-100 text-slate-700 py-3.5 rounded-xl font-bold text-sm
                       hover:bg-slate-200 transition-all active:scale-95
                       flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4 rotate-180" />
            العودة للخلف
          </button>

          <button
            onClick={() => navigate('/')}
            className="w-full bg-white border border-slate-200 text-slate-600 py-3.5 rounded-xl font-bold text-sm
                       hover:bg-slate-50 transition-all active:scale-95
                       flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            الصفحة الرئيسية
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Hook for handling errors in functional components
 */
export function useRouteErrorHandler(onError?: (error: Error) => void) {
  const error = useRouteError() as Error;

  React.useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  return error;
}

export default RouteErrorBoundary;
