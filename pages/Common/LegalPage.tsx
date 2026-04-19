import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  ShieldCheck,
  FileText,
  ChevronRight,
  Scale,
  Info,
  Clock,
  ArrowRight
} from 'lucide-react';
import { getDb as db } from '../../services/firebase';
import { ref, get } from 'firebase/database';
import { SYS } from '../../constants/dbPaths';

const LegalPage: React.FC = () => {
  const location = useLocation();
  const [type, setType] = useState<'terms' | 'privacy'>('terms');
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    // Determine type from hash or state
    const path = location.pathname;
    if (path.includes('privacy')) setType('privacy');
    else setType('terms');

    const fetchPolicy = async () => {
      setLoading(true);
      try {
        const settingsRef = ref(db, SYS.SYSTEM.SETTINGS);
        const snapshot = await get(settingsRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          setContent(type === 'terms' ? data.termsAndConditions : data.privacyPolicy);
          setLastUpdated(data.lastUpdated);
        }
      } catch (err) {
        console.error("Error fetching policy:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPolicy();
  }, [type, location.pathname]);

  const renderContent = (text: string) => {
    if (!text) return (
      <div className="py-20 text-center">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300 mb-4">
          <Info size={40} />
        </div>
        <p className="text-slate-400 font-bold">المحتوى غير متوفر حالياً</p>
      </div>
    );

    // Process text to HTML safely - escape HTML entities first
    const escapeHtml = (str: string) => {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    };

    let processed = escapeHtml(text)
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-black text-slate-900 border-b-2 border-blue-100">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-blue-600 font-bold bg-blue-50/50 px-1 rounded">$1</em>')
      .replace(/#(.*?)#/g, '<mark class="bg-gradient-to-r from-yellow-100 to-yellow-200 px-1.5 py-0.5 rounded-md font-black text-slate-900 shadow-sm">$1</mark>')
      .replace(/(EduSafa|إيدوسافا|المنصة التعليمية)/g, '<span class="text-blue-600 font-black decoration-blue-500/30 decoration-wavy underline underline-offset-4">$1</span>')
      .replace(/^(.*?)[:：]/gm, '<h5 class="text-slate-900 font-black mb-2 mt-4 flex items-center gap-2"><span class="w-1.5 h-4 bg-blue-500 rounded-full"></span>$1:</h5>')
      .replace(/\n/g, '<br />');

    return (
      <div
        className="prose prose-slate max-w-none text-right leading-relaxed text-slate-700 font-medium text-lg"
        dangerouslySetInnerHTML={{ __html: processed }}
      />
    );
  };

  return (
    <div className="min-h-screen bg-[#fcfdfe] font-sans" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors">
            <ArrowRight size={20} />
            <span className="font-bold text-sm">العودة للرئيسية</span>
          </Link>
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                <Scale size={20} />
             </div>
             <h1 className="text-xl font-black text-slate-900">المركز القانوني</h1>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Navigation Tabs */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-12">
          <Link 
            to="/terms"
            className={`flex-1 py-4 rounded-xl text-center font-black text-sm transition-all ${type === 'terms' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            الشروط والأحكام
          </Link>
          <Link 
            to="/privacy"
            className={`flex-1 py-4 rounded-xl text-center font-black text-sm transition-all ${type === 'privacy' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            سياسة الخصوصية
          </Link>
        </div>

        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-8 md:p-12 border-b border-slate-50 bg-slate-50/30">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
               <div className="space-y-2">
                 <h2 className="text-3xl font-black text-slate-900">
                    {type === 'terms' ? 'شروط وأحكام الاستخدام' : 'سياسة الخصوصية وحماية البيانات'}
                 </h2>
                 <p className="text-slate-500 font-medium">يرجى قراءة هذه البنود بعناية قبل استخدام المنصة</p>
               </div>
               {lastUpdated && (
                 <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-100 shadow-sm self-start">
                    <Clock size={14} className="text-blue-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                       آخر تحديث: {new Date(lastUpdated).toLocaleDateString('ar-SA')}
                    </span>
                 </div>
               )}
            </div>
          </div>

          <div className="p-8 md:p-12">
            {loading ? (
              <div className="py-20 flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold">جاري تحميل البيانات...</p>
              </div>
            ) : renderContent(content)}
          </div>

          <div className="p-8 bg-blue-600 text-white flex flex-col md:flex-row items-center justify-between gap-6">
             <div className="flex items-center gap-4 text-right">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                   <ShieldCheck size={24} />
                </div>
                <div>
                   <p className="font-black">التزامنا تجاهكم</p>
                   <p className="text-xs text-blue-100 font-medium">نحن نلتزم بأعلى معايير الأمان وحماية الخصوصية في EduSafa</p>
                </div>
             </div>
             <button className="px-8 py-3 bg-white text-blue-600 rounded-xl font-black text-sm hover:bg-blue-50 transition-all active:scale-95">
                تواصل مع القسم القانوني
             </button>
          </div>
        </div>
      </main>

      <footer className="max-w-4xl mx-auto px-6 pb-12 text-center">
         <p className="text-slate-400 text-xs font-bold">
            جميع الحقوق محفوظة © {new Date().getFullYear()} منصة EduSafa التعليمية
         </p>
      </footer>
    </div>
  );
};

export default LegalPage;
