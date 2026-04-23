import React from 'react';
import { Clock, ShieldCheck, Mail, LogOut, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

const PendingApproval: React.FC = () => {
  const { profile, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-500">
        {/* Header Decor */}
        <div className="h-32 bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-24 h-24 bg-white rounded-full -translate-x-12 -translate-y-12" />
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-white rounded-full translate-x-16 translate-y-16" />
          </div>
          <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 z-10">
            <Clock className="text-white animate-pulse" size={40} />
          </div>
        </div>

        <div className="p-8 text-center">
          <h1 className="text-2xl font-black text-slate-900 mb-2">بانتظار مراجعة الإدارة</h1>
          <p className="text-slate-500 font-bold mb-8 leading-relaxed">
            مرحباً <span className="text-blue-600">{profile?.fullName || profile?.firstName || 'dhdd'}</span>، تم استلام طلب انضمامك كـ{profile?.role === 'student' ? 'طالب' : 'معلم'} في EduSafa. حسابك حالياً قيد المراجعة والتدقيق.
          </p>

          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-right group hover:bg-blue-50 transition-colors">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900">الأمان والتحقق</p>
                <p className="text-[10px] text-slate-500 font-bold">نقوم بمراجعة البيانات لضمان بيئة تعليمية آمنة.</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-right group hover:bg-blue-50 transition-colors">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                <Mail size={20} />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900">تنبيهات البريد</p>
                <p className="text-[10px] text-slate-500 font-bold">سنرسل لك إشعاراً فور تفعيل حسابك من قبل الإدارة.</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 group"
            >
              <RefreshCw className="group-hover:rotate-180 transition-transform duration-500" size={20} />
              تحديث الحالة
            </button>
            
            <button
              onClick={logout}
              className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
            >
              <LogOut size={20} />
              تسجيل الخروج
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="bg-slate-50 p-4 border-t border-slate-100 text-center">
          <Link to="/support" className="text-xs font-black text-blue-600 hover:underline flex items-center justify-center gap-1">
            هل تواجه مشكلة؟ تواصل مع الدعم الفني
            <ChevronLeft size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};

// Simple Refresh Icon if Lucide doesn't export it in this context
const RefreshCw = ({ className, size }: { className?: string, size?: number }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size || 24} 
    height={size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
  </svg>
);

export default PendingApproval;
