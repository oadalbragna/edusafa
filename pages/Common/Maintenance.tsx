import React, { useState, useEffect } from 'react';
import * as Lucide from 'lucide-react';
import { getDb as db } from '../../services/firebase';
import { ref, onValue } from 'firebase/database';

const Maintenance: React.FC = () => {
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    const settingsRef = ref(db, 'sys/system/settings');
    const unsubscribe = onValue(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.val());
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-center font-sans" dir="rtl">
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400 rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-2xl w-full space-y-10 animate-in fade-in zoom-in-95 duration-1000">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-red-500 rounded-[3rem] blur-2xl opacity-20 animate-pulse"></div>
          <div className="relative w-32 h-32 bg-white rounded-[3rem] shadow-2xl flex items-center justify-center text-red-600 border border-red-50">
            <Lucide.ShieldAlert size={64} className="animate-bounce" />
          </div>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-tight">
            نحن بصدد تحسين <span className="text-blue-600">{settings?.name || 'المنصة'}</span>
          </h1>
          <p className="text-xl text-slate-500 font-bold max-w-lg mx-auto leading-relaxed">
            نعتذر عن الانقطاع المؤقت؛ فريقنا يعمل الآن على تحديث الأنظمة لتقديم تجربة تعليمية سودانية أكثر تميزاً واحترافية.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 flex items-center gap-5 group hover:border-blue-200 transition-all">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
              <Lucide.Mail size={24} />
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">البريد الإلكتروني</p>
              <p className="text-sm font-black text-slate-800">{settings?.contactEmail || 'support@edusafa.com'}</p>
            </div>
          </div>

          <div className="p-6 bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 flex items-center gap-5 group hover:border-green-200 transition-all">
            <div className="p-4 bg-green-50 text-green-600 rounded-2xl group-hover:bg-green-600 group-hover:text-white transition-all shadow-inner">
              <Lucide.Phone size={24} />
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">الدعم الفني المباشر</p>
              <p className="text-sm font-black text-slate-800">{settings?.contactPhone || '+249 900 000 000'}</p>
            </div>
          </div>
        </div>

        {settings?.social && (
          <div className="bg-white/50 backdrop-blur-md p-8 rounded-[3rem] border border-white shadow-sm space-y-6">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">تواصل معنا عبر منصاتنا</h3>
            <div className="flex justify-center gap-4">
              {settings.social.facebook && (
                <a href={settings.social.facebook} target="_blank" rel="noopener noreferrer" className="p-4 bg-white rounded-2xl text-blue-600 shadow-md hover:scale-110 transition-transform">
                  <Lucide.Facebook size={24} />
                </a>
              )}
              {settings.social.twitter && (
                <a href={settings.social.twitter} target="_blank" rel="noopener noreferrer" className="p-4 bg-white rounded-2xl text-blue-400 shadow-md hover:scale-110 transition-transform">
                  <Lucide.Twitter size={24} />
                </a>
              )}
              {settings.social.instagram && (
                <a href={settings.social.instagram} target="_blank" rel="noopener noreferrer" className="p-4 bg-white rounded-2xl text-pink-600 shadow-md hover:scale-110 transition-transform">
                  <Lucide.Instagram size={24} />
                </a>
              )}
              {settings.social.youtube && (
                <a href={settings.social.youtube} target="_blank" rel="noopener noreferrer" className="p-4 bg-white rounded-2xl text-red-600 shadow-md hover:scale-110 transition-transform">
                  <Lucide.Youtube size={24} />
                </a>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row items-center justify-center gap-4">
          <button 
            onClick={() => window.location.reload()}
            className="flex items-center gap-3 px-10 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-200 hover:bg-blue-700 hover:-translate-y-1 active:scale-95 transition-all w-full md:w-auto"
          >
            <Lucide.RefreshCw size={20} />
            <span>تحديث الصفحة</span>
          </button>
          <a 
            href={`https://wa.me/${String(settings?.contactPhone || '').replace(/\D/g, '')}`}
            className="flex items-center gap-3 px-10 py-4 bg-white text-green-600 border-2 border-green-100 rounded-2xl font-black shadow-lg hover:bg-green-50 transition-all w-full md:w-auto"
          >
            <Lucide.MessageCircle size={20} />
            <span>واتساب المنصة</span>
          </a>
        </div>

        <p className="pt-10 text-xs text-slate-400 font-bold tracking-widest uppercase flex items-center justify-center gap-2">
          <Lucide.Globe size={14} />
          {settings?.footerText || `© ${new Date().getFullYear()} EduSafa Learning Platform - Sudan`}
        </p>
      </div>
    </div>
  );
};

export default Maintenance;
