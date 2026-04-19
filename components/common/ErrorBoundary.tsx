import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    // Here you could send the error to a logging service
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 text-right" dir="rtl">
          <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl border border-red-100 p-10 space-y-8 relative overflow-hidden">
            {/* Decorative background */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
            
            <div className="relative z-10 text-center space-y-6">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-red-100 text-red-600 rounded-3xl animate-pulse">
                <AlertTriangle size={48} />
              </div>
              
              <div className="space-y-2">
                <h1 className="text-3xl font-black text-slate-900">حدث خطأ غير متوقع</h1>
                <p className="text-slate-500 font-medium leading-relaxed">
                  نعتذر منك، حدث خلل برمجي أثناء تحميل هذه الصفحة. لقد تم تسجيل الخطأ وسيعمل فريقنا على إصلاحه قريباً.
                </p>
              </div>

              {import.meta.env.MODE === 'development' && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left overflow-auto max-h-40">
                  <p className="text-xs font-mono text-red-500">{this.state.error?.toString()}</p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 pt-4">
                <button
                  onClick={this.handleReload}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95"
                >
                  <RefreshCw size={20} />
                  إعادة المحاولة
                </button>
                <button
                  onClick={this.handleReset}
                  className="w-full py-4 bg-white text-slate-600 border border-slate-200 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all active:scale-95"
                >
                  <Home size={20} />
                  العودة للرئيسية
                </button>
              </div>

              <div className="pt-6 flex items-center justify-center gap-2 text-slate-400">
                <ShieldAlert size={16} />
                <span className="text-xs font-bold uppercase tracking-widest">EduSafa Safety System</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
