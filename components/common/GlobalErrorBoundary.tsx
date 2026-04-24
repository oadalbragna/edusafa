import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-slate-50">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="text-red-600" size={40} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">عذراً، حدث خطأ غير متوقع</h1>
          <p className="text-slate-500 font-bold mb-8">نحن نعمل على إصلاح المشكلة، يرجى محاولة تحديث الصفحة.</p>
          <button 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-lg"
          >
            <RefreshCw size={18} /> تحديث النظام
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
