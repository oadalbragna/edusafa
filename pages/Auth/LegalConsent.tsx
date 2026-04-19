import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  FileText,
  CheckCircle2,
  ArrowRight,
  Info,
  Scale,
  Clock,
  ExternalLink
} from 'lucide-react';
import { db } from '../../services/firebase';
import { ref, get } from 'firebase/database';
import { SYS } from '../../constants/dbPaths';
import { AuthLayout } from '../../components/auth/AuthLayout';

const LegalConsent: React.FC = () => {
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState({ terms: '', privacy: '' });
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms');

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        if (db) {
          const settingsRef = ref(db, SYS.SYSTEM.SETTINGS);
          const snapshot = await get(settingsRef);
          if (snapshot.exists()) {
            const data = snapshot.val();
            setPolicies({
              terms: data.termsAndConditions || '',
              privacy: data.privacyPolicy || ''
            });
          }
        }
      } catch (err) {
        console.error("Error fetching policies:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPolicies();
  }, []);

  const renderContent = (text: string) => {
    if (!text) return (
      <div className="py-12 text-center space-y-4">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
          <Info size={32} />
        </div>
        <p className="text-slate-400 font-bold text-sm italic">المحتوى قيد التحديث...</p>
      </div>
    );

    let processed = text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-black text-slate-900 border-b-2 border-blue-100">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-blue-600 font-bold bg-blue-50/50 px-1 rounded">$1</em>')
      .replace(/#(.*?)#/g, '<mark class="bg-gradient-to-r from-yellow-100 to-yellow-200 px-1.5 py-0.5 rounded-md font-black text-slate-900 shadow-sm">$1</mark>')
      .replace(/(EduSafa|إيدوسافا|المنصة التعليمية)/g, '<span class="text-blue-600 font-black decoration-blue-500/30 decoration-wavy underline underline-offset-4">$1</span>')
      .replace(/^(.*?)[:：]/gm, '<h5 class="text-slate-900 font-black mb-2 mt-4 flex items-center gap-2 text-sm"><span class="w-1.5 h-3 bg-blue-500 rounded-full"></span>$1:</h5>')
      .replace(/\n/g, '<br />');

    return (
      <div
        className="prose prose-slate max-w-none text-right leading-relaxed text-slate-600 font-medium text-[13px]"
        dangerouslySetInnerHTML={{ __html: processed }}
      />
    );
  };

  return (
    <AuthLayout
      title="مرحباً بك في EduSafa"
      subtitle="يرجى مراجعة شروط الاستخدام وسياسة الخصوصية للمتابعة"
    >
      <div className="space-y-6">
        {/* Policy Box */}
        <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm flex flex-col h-[400px]">
          {/* Tabs */}
          <div className="flex bg-slate-50 border-b border-slate-100">
            <button
              onClick={() => setActiveTab('terms')}
              className={`flex-1 py-4 text-xs font-black transition-all ${activeTab === 'terms' ? 'bg-white text-blue-600 shadow-[0_-2px_0_inset_#2563eb]' : 'text-slate-400 hover:text-slate-600'}`}
            >
              شروط الخدمة
            </button>
            <button
              onClick={() => setActiveTab('privacy')}
              className={`flex-1 py-4 text-xs font-black transition-all ${activeTab === 'privacy' ? 'bg-white text-blue-600 shadow-[0_-2px_0_inset_#2563eb]' : 'text-slate-400 hover:text-slate-600'}`}
            >
              سياسة الخصوصية
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide bg-white/50">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">جاري التحميل...</p>
              </div>
            ) : (
              renderContent(activeTab === 'terms' ? policies.terms : policies.privacy)
            )}
          </div>

          <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
             <Link to={activeTab === 'terms' ? '/terms' : '/privacy'} target="_blank" className="text-[10px] font-black text-blue-600 flex items-center gap-1 hover:underline">
               <ExternalLink size={12} /> عرض في صفحة كاملة
             </Link>
             <span className="text-[10px] text-slate-400 font-bold italic">تم التحديث في مارس ٢٠٢٦</span>
          </div>
        </div>

        {/* Agreement Checkbox */}
        <label className="flex items-start gap-4 p-5 bg-blue-50/30 border border-blue-100/50 rounded-2xl cursor-pointer hover:bg-blue-50 transition-all group active:scale-[0.99]">
          <div className="relative mt-1">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="peer sr-only"
            />
            <div className="w-6 h-6 border-2 border-blue-200 rounded-lg bg-white peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all"></div>
            <CheckCircle2 size={16} className="absolute top-1 left-1 text-white scale-0 peer-checked:scale-100 transition-transform" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-black text-slate-900 leading-none">أقر بأنني قرأت وأوافق على البنود أعلاه</p>
            <p className="text-[11px] text-slate-500 font-medium">بضغطك هنا، أنت توافق على قوانين استخدام منصة EduSafa</p>
          </div>
        </label>

        {/* Action Buttons */}
        <div className="flex flex-col gap-4">
          <button
            onClick={() => navigate('/register')}
            disabled={!agreed}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-500/20 disabled:opacity-30 disabled:shadow-none flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            <span>متابعة لإنشاء الحساب</span>
            <ArrowRight size={18} className="rotate-180" />
          </button>

          <button
            onClick={() => navigate('/login')}
            className="w-full text-slate-400 hover:text-slate-600 font-black text-sm py-2 transition-all"
          >
            العودة لتسجيل الدخول
          </button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default LegalConsent;
