import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, Loader2, ArrowRight, AlertCircle, Smartphone, RotateCcw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLogin } from '../../hooks/useLogin';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthInput } from '../../components/auth/AuthInput';
import { db } from '../../services/firebase';
import { ref, get } from 'firebase/database';
import { SYS } from '../../constants/dbPaths';
import { clearAllPlatformCache, forceFullRefresh } from '../../utils/cacheManager';

const Login: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [appUrl, setAppUrl] = useState<string | null>(null);
  const [showCacheCleared, setShowCacheCleared] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const {
    identifier,
    setIdentifier,
    password,
    setPassword,
    error,
    loading,
    handleLogin
  } = useLogin();

  const handleClearCache = () => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      '⚠️ هل أنت متأكد من مسح جميع البيانات؟\n\n' +
      'سيتم حذف:\n' +
      '• جميع البيانات المخزنة\n' +
      '• معلومات تسجيل الدخول\n' +
      '• الإعدادات المحفوظة\n' +
      '• الكاش بالكامل\n\n' +
      'سيتم إعادة تحميل الصفحة تلقائياً.'
    );

    if (!confirmed) return;

    setClearingCache(true);
    setShowCacheCleared(false);

    try {
      // Clear ALL platform cache
      clearAllPlatformCache();
      
      // Show success message
      setShowCacheCleared(true);
      
      // Force full refresh after short delay
      setTimeout(() => {
        forceFullRefresh();
      }, 1500);
    } catch (error) {
      console.error('Cache clear failed:', error);
      setClearingCache(false);
      alert('❌ حدث خطأ أثناء مسح البيانات');
    }
  };

  useEffect(() => {
    if (db) {
      get(ref(db, SYS.SYSTEM.SETTINGS + '/appDownloadUrl')).then(snap => {
        if (snap.exists()) setAppUrl(snap.val());
      });
    }
  }, []);

  useEffect(() => {
    if (user && profile) {
      if (profile.role === 'admin' || profile.role === 'super_admin') navigate('/admin');
      else if (profile.role === 'teacher') {
        if (profile.status === 'pending') navigate('/pending-approval');
        else navigate('/teacher');
      }
      else if (profile.role === 'student') {
        if (profile.status === 'pending' || !profile.status) navigate('/pending-approval');
        else navigate('/student');
      }
      else if (profile.role === 'parent') navigate('/parent');
      else navigate('/');
    }
  }, [user, profile, navigate]);

  return (
    <AuthLayout
      title="تسجيل الدخول"
      subtitle="مرحباً بك مجدداً، يرجى إدخال بياناتك للمتابعة"
      isLogin
    >
      {error && (
        <div className="p-4 bg-red-50 border-r-4 border-red-500 text-red-700 rounded-xl text-sm font-bold flex items-center gap-3 animate-in slide-in-from-top-2">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-6">
        <AuthInput
          label="البريد الإلكتروني أو الهاتف"
          icon={User}
          type="text"
          required
          placeholder="name@school.com"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          dir="ltr"
        />

        <div className="space-y-2">
          <div className="flex justify-between items-center px-1">
            <label className="text-[13px] font-black text-slate-700 block">كلمة المرور</label>
            <a href="#" className="text-xs font-bold text-brand-600 hover:text-brand-700 transition-colors">نسيت كلمة المرور؟</a>
          </div>
          <AuthInput
            icon={Lock}
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-500 hover:bg-brand-600 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-brand-500/20 disabled:opacity-50 flex items-center justify-center gap-3 active:scale-[0.98]"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>جاري الدخول...</span>
            </>
          ) : (
            <>
              <span>دخول للنظام</span>
              <ArrowRight size={18} className="rotate-180" />
            </>
          )}
        </button>
      </form>

      <div className="pt-8 text-center space-y-4">
        {showCacheCleared ? (
          <div className="p-4 md:p-6 bg-green-50 border-2 border-green-200 text-green-700 rounded-2xl font-bold flex items-center justify-center gap-2 md:gap-3 animate-in zoom-in-95">
            <AlertCircle size={20} className="shrink-0" />
            <div className="text-center">
              <p className="text-sm md:text-base">تم مسح جميع البيانات بنجاح!</p>
              <p className="text-xs md:text-sm mt-1">جاري إعادة التحميل...</p>
            </div>
          </div>
        ) : (
          <>
            <p className="text-slate-400 text-sm font-bold">ليس لديك حساب؟</p>
            <Link
              to="/legal-consent"
              className="mt-4 inline-flex items-center gap-2 px-6 md:px-8 py-2.5 md:py-3 bg-slate-50 hover:bg-brand-50 text-brand-600 font-black rounded-xl transition-all border border-slate-100 hover:border-brand-100 text-sm md:text-base"
            >
              إنشاء حساب جديد
            </Link>
          </>
        )}

        {/* Clear ALL Cache Button */}
        {!showCacheCleared && (
          <button
            onClick={handleClearCache}
            disabled={clearingCache}
            className={`
              mt-4 w-full md:w-auto md:inline-flex items-center justify-center gap-2 
              px-5 md:px-6 py-3 md:py-3.5 
              bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 
              text-white font-bold rounded-xl md:rounded-2xl 
              transition-all shadow-lg shadow-amber-500/20 hover:shadow-xl 
              disabled:opacity-50 disabled:cursor-not-allowed 
              text-sm md:text-base
              flex
            `}
            title="مسح جميع البيانات المخزنة وإعادة تحميل الصفحة"
          >
            {clearingCache ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>جاري مسح البيانات...</span>
              </>
            ) : (
              <>
                <RotateCcw size={18} />
                <span>مسح جميع البيانات وإعادة تحميل</span>
              </>
            )}
          </button>
        )}

        {/* Info text */}
        <p className="text-[10px] md:text-xs text-slate-400 max-w-md mx-auto">
          💡 هذا الزر يمسح <strong>جميع</strong> البيانات المخزنة في المتصفح (localStorage, sessionStorage, Cookies, Service Worker Cache)
        </p>
      </div>

      {appUrl && (
        <div className="mt-10 pt-8 border-t border-slate-100/50">
          <a
            href={appUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 bg-slate-900 rounded-[1.5rem] hover:bg-black transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                <Smartphone size={20} />
              </div>
              <div className="text-right">
                <p className="text-[13px] font-black text-white leading-none">تحميل تطبيق المنصة</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">نسخة APK للأندرويد</p>
              </div>
            </div>
            <ArrowRight size={16} className="text-white/30 group-hover:text-white rotate-180 transition-all" />
          </a>
        </div>
      )}
    </AuthLayout>
  );
};

export default Login;
