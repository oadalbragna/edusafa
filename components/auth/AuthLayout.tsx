import React from 'react';
import { ShieldCheck, LayoutGrid, X } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  isLogin?: boolean;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle, isLogin }) => {
  return (
    <div className="min-h-screen bg-[#fcfdfe] flex flex-col lg:flex-row font-sans" dir="rtl">
      {/* Visual Side (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-600/20 to-indigo-900/40 z-10"></div>
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-brand-500 rounded-full blur-[120px] opacity-20 animate-pulse"></div>

        <div className="relative z-20 text-right p-16 space-y-8 max-w-2xl">
          <div className="inline-flex p-3 bg-white rounded-3xl shadow-2xl border border-white/20 group hover:scale-105 transition-transform duration-500">
            <img src="/assets/icons/icon.png" alt="EduSafa Logo" className="w-16 h-16 object-contain" />
          </div>
          <div className="space-y-4">
            <h2 className="text-5xl font-black text-white leading-tight">
              {isLogin ? (
                <>مرحباً بك مجدداً<br />في EduSafa</>
              ) : (
                <>ابدأ رحلتك<br />التعليمية اليوم</>
              )}
            </h2>
            <p className="text-slate-400 text-xl font-medium leading-relaxed">
              {isLogin
                ? "منصة متطورة لإدارة العملية التعليمية بأحدث التقنيات الرقمية."
                : "انضم إلى مجتمعنا التعليمي المتطور واستفد من أفضل الأدوات الرقمية."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-12">
            <div className="p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/5">
              <ShieldCheck className="text-emerald-400 mb-3" size={24} />
              <h4 className="text-white font-bold text-sm">أمان متقدم</h4>
              <p className="text-slate-500 text-xs mt-1">تشفير كامل وحماية لبياناتك</p>
            </div>
            <div className="p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/5">
              <LayoutGrid className="text-brand-400 mb-3" size={24} />
              <h4 className="text-white font-bold text-sm">واجهة ذكية</h4>
              <p className="text-slate-500 text-xs mt-1">سهولة في الوصول والاستخدام</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Side */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 lg:p-20 bg-white">
        <div className="max-w-md w-full space-y-10 animate-in fade-in duration-700">
          <div className="space-y-3 text-center lg:text-right">
            <div className="lg:hidden flex justify-center mb-8">
               <div className="w-20 h-20 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/20 p-3">
                 <img src="/assets/icons/icon.png" alt="EduSafa" className="w-full h-full object-contain" />
               </div>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{title}</h1>
            <p className="text-slate-500 font-bold text-sm">{subtitle}</p>
          </div>

          {children}

          <div className="text-center pt-8 border-t border-slate-50">
              <p className="text-[11px] text-slate-300 font-bold tracking-widest uppercase">صنع بـ ♥ بواسطة مبارك عزوز 🌿</p>
          </div>
        </div>
      </div>
    </div>
  );
};
