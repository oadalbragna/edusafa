import React, { useState, useEffect } from 'react';
import {
  ArrowRight, Send, Download, Upload, Link as LinkIcon,
  FileText, ShieldCheck, Loader2, Copy, Check, MessageSquare,
  ExternalLink, Trash2, RefreshCw, Smartphone, Bot, CheckCircle2,
  Layers, BookOpen, Image as ImageIcon, Video, FilePlus, Save, History,
  Globe, Cpu, Monitor, Palette, Code, GraduationCap, Mic, ClipboardList, Share2, Database, Lock,
  Zap
} from 'lucide-react';
import { ref, get, update, push, serverTimestamp, set } from 'firebase/database';
import { getDb } from './services/firebase';

import { SYS } from './constants/dbPaths';

interface TelegramBridgeProps {
  onBack: () => void;
}

interface UploadHistory {
  id: string;
  name: string;
  fileId: string;
  category: string;
  url: string;
  directUrl: string;
  timestamp: number;
}

type StorageCategory = 'lectures' | 'recordings' | 'private_chats' | 'group_chats' | 'replies' | 'assignments' | 'general';

const TelegramBridge: React.FC<TelegramBridgeProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<'upload' | 'download' | 'history'>('upload');

  const [botToken, setBotToken] = useState(localStorage.getItem('tg_bot_token') || '8300515932:AAFOj6scD2bqKamDbII87hTANq1PTzJZZmU');
  const [chatId, setChatId] = useState(localStorage.getItem('tg_chat_id') || '1086351274');
  const [useMasking, setUseMasking] = useState(true);

  useEffect(() => {
    // Fetch global masking status from Firebase
    const maskRef = ref(db, SYS.SYSTEM.MASKING_ACTIVE);
    get(maskRef).then(snap => {
      if (snap.exists()) setUseMasking(snap.val());
    });
  }, []);

  const [fileCategory, setFileCategory] = useState<StorageCategory>('lectures');
  const [targetId, setTargetId] = useState('');
  const [fileId, setFileId] = useState('');
  const [safeLink, setSafeLink] = useState('');
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [history, setHistory] = useState<UploadHistory[]>(JSON.parse(localStorage.getItem('tg_upload_history') || '[]'));

  const saveConfig = async () => {
    try {
      localStorage.setItem('tg_bot_token', botToken);
      localStorage.setItem('tg_chat_id', chatId);
      localStorage.setItem('tg_use_masking', String(useMasking));

      // Update global setting in Firebase
      await set(ref(db, SYS.SYSTEM.MASKING_ACTIVE), useMasking);

      alert('تم حفظ الإعدادات وتحديث حالة نظام التمويه بنجاح');
    } catch (err) {
      alert('فشل في حفظ الإعدادات السحابية');
    }
  };

  const generateSafeLink = async (fileName: string, tgFileId: string, directUrl: string) => {
    try {
        const shortId = `f_${Math.random().toString(36).substring(2, 12)}`;
        const updates: any = {};
        
        const safeLinkPath = `meta_data/safe_links/${shortId}`;
        const safeLinkData = {
            id: shortId,
            name: fileName,
            direct_url: directUrl,
            tele_file_id: tgFileId,
            category: fileCategory,
            target_id: targetId || 'unassigned',
            timestamp: serverTimestamp()
        };
        updates[safeLinkPath] = safeLinkData;

        const metaPath = `meta_data/cloud_storage/${fileCategory}/${shortId}`;
        updates[metaPath] = safeLinkData;

        await update(ref(db), updates);

        const platformSafeUrl = useMasking 
          ? `${window.location.origin}/api/media?f=${shortId}`
          : directUrl;
        return { shortId, platformSafeUrl };
    } catch (e) {
        console.error("Safe Link Error:", e);
        return null;
    }
  };

  const uploadToTelegram = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !botToken || !chatId) {
        alert('يرجى إكمال إعدادات البوت أولاً');
        return;
    }

    if (!useMasking) {
        alert('⚠️ يجب تفعيل خيار "تمويه الروابط" لتتمكن من استخدام الجسر والرفع.');
        return;
    }
    
    setLoading(true);
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('document', file);

    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      
      if (data.ok) {
        const result = data.result.document;
        const fId = result.file_id;
        const fileInfo = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fId}`);
        const fileRes = await fileInfo.json();
        
        if (fileRes.ok) {
            const directUrl = `https://api.telegram.org/file/bot${botToken}/${fileRes.result.file_path}`;
            const safeData = await generateSafeLink(file.name, fId, directUrl);
            
            if (safeData) {
                setSafeLink(safeData.platformSafeUrl);
                setFileId(fId);
                setUploadResult(result);

                const newItem: UploadHistory = {
                    id: safeData.shortId,
                    name: file.name,
                    fileId: fId,
                    category: fileCategory,
                    url: safeData.platformSafeUrl,
                    directUrl: directUrl,
                    timestamp: Date.now()
                };
                const newHistory = [newItem, ...history].slice(0, 20);
                setHistory(newHistory);
                localStorage.setItem('tg_upload_history', JSON.stringify(newHistory));
            }
        }
      } else alert(`فشل الرفع: ${data.description}`);
    } catch (e) { alert('خطأ في الاتصال بالشبكة'); } finally { setLoading(false); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-gray-50 dark:bg-gray-950 min-h-screen pb-24 animate-fade-in" dir="rtl">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 p-4 pt-10 sticky top-0 z-30 shadow-sm border-b flex items-center justify-between">
        <button onClick={onBack} className="p-2.5 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-primary hover:text-white transition-all"><ArrowRight className="w-5 h-5 rotate-180" /></button>
        <div className="text-right">
          <h1 className="text-lg font-black text-gray-800 dark:text-white">جسر تيليجرام الآمن</h1>
          <p className="text-[9px] text-primary font-black uppercase tracking-widest mt-1">Direct Media Sync v3.0</p>
        </div>
        <div className="w-12 h-12 bg-primary/10 rounded-[1.5rem] flex items-center justify-center text-primary shadow-inner"><Lock className="w-7 h-7" /></div>
      </div>

      <div className="p-4 space-y-6">
        {/* Settings Box */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-[2rem] border shadow-sm space-y-4">
           <div className="flex justify-between items-center border-b pb-2">
              <button onClick={saveConfig} className="text-[10px] font-black text-blue-600 hover:underline">حفظ الإعدادات</button>
              <h3 className="font-black text-xs text-gray-400 uppercase tracking-wider">Secure Config</h3>
           </div>
           <div className="grid grid-cols-1 gap-3">
              <input type="password" value={botToken} onChange={e => setBotToken(e.target.value)} placeholder="Bot Token..." className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl text-left font-mono text-[10px] border-none outline-none dark:text-white" />
              <input type="text" value={chatId} onChange={e => setChatId(e.target.value)} placeholder="Chat ID" className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl text-left font-mono text-[10px] border-none outline-none dark:text-white" />
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-black text-gray-600 dark:text-gray-300">تمويه روابط التحميل (/api/media)</span>
                </div>
                <button onClick={() => setUseMasking(!useMasking)} className={`w-10 h-5 rounded-full transition-all relative ${useMasking ? 'bg-primary' : 'bg-gray-300'}`}>
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${useMasking ? 'left-1' : 'left-6'}`}></div>
                </button>
              </div>
           </div>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-gray-200 dark:bg-gray-800 p-1 rounded-2xl">
           <button onClick={() => setActiveMode('upload')} className={`flex-1 py-3 rounded-xl text-[10px] font-black flex items-center justify-center gap-1.5 transition-all ${activeMode === 'upload' ? 'bg-white dark:bg-gray-700 shadow-md text-primary' : 'text-gray-500'}`}><Upload className="w-3.5 h-3.5" /> الرفع الآمن</button>
           <button onClick={() => setActiveMode('history')} className={`flex-1 py-3 rounded-xl text-[10px] font-black flex items-center justify-center gap-1.5 transition-all ${activeMode === 'history' ? 'bg-white dark:bg-gray-700 shadow-md text-primary' : 'text-gray-500'}`}><History className="w-3.5 h-3.5" /> الأرشيف المقنع</button>
        </div>

        {activeMode === 'upload' && (
            <div className="space-y-6 animate-slide-up">
                <div className="bg-white dark:bg-gray-800 p-5 rounded-[2.5rem] border shadow-sm space-y-5">
                    <h3 className="font-black text-xs text-gray-400 text-right">تصنيف الملف (Metadata)</h3>
                    <div className="grid grid-cols-3 gap-2">
                        {['lectures', 'recordings', 'private_chats', 'group_chats', 'replies', 'assignments'].map(cat => (
                            <button key={cat} onClick={() => setFileCategory(cat as any)} className={`p-3 rounded-2xl border-2 text-[9px] font-black transition-all ${fileCategory === cat ? 'border-primary bg-primary/5 text-primary' : 'border-transparent bg-gray-50 dark:bg-gray-900 text-gray-400'}`}>{cat.replace('_', ' ').toUpperCase()}</button>
                        ))}
                    </div>
                </div>

                                <div className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] border shadow-sm">
                                    <label className={`w-full h-44 border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center transition-colors group ${!useMasking ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-60' : 'border-primary/20 bg-primary/5 cursor-pointer hover:bg-primary/10'}`}>
                                        <input type="file" className="hidden" onChange={uploadToTelegram} disabled={loading || !useMasking} />
                                        <div className={`w-12 h-12 rounded-2xl shadow-sm flex items-center justify-center transition-transform mb-3 ${!useMasking ? 'bg-gray-200 text-gray-400' : 'bg-white dark:bg-gray-800 text-primary group-hover:scale-110'}`}>
                                           {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <ShieldCheck className="w-6 h-6" />}
                                        </div>
                                        <span className={`text-xs font-black ${!useMasking ? 'text-gray-400' : 'text-primary'}`}>
                                          {!useMasking ? 'نظام الرفع معطل (فعل التمويه)' : 'رفع الملف وإخفاء المصدر'}
                                        </span>
                                    </label>
                

                    {safeLink && (
                        <div className="mt-6 space-y-3 animate-scale-in">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-3xl border border-blue-100 text-right">
                                <h5 className="font-black text-blue-700 dark:text-blue-300 text-xs mb-3 flex items-center justify-end gap-2">رابط التحميل المباشر (Direct /media) <Globe className="w-4 h-4" /></h5>
                                <div className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-blue-100 flex justify-between items-center"><button onClick={() => copyToClipboard(safeLink)} className="text-primary hover:scale-110 transition-transform">{isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</button><span className="text-[9px] font-mono text-gray-600 dark:text-gray-300 truncate max-w-[200px]">{safeLink}</span></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}

        {activeMode === 'history' && (
            <div className="space-y-3 animate-slide-up">
                <h3 className="text-right text-[10px] font-black text-gray-400 uppercase px-2">سجل الروابط المباشرة</h3>
                {history.map(item => (
                    <div key={item.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between group">
                        <div className="flex gap-2"><button onClick={() => copyToClipboard(item.url)} className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-500 hover:scale-105 transition-all"><LinkIcon className="w-4 h-4" /></button><button onClick={() => { setHistory(history.filter(h => h.id !== item.id)); localStorage.setItem('tg_upload_history', JSON.stringify(history.filter(h => h.id !== item.id))); }} className="p-2 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button></div>
                        <div className="text-right flex-1 px-3"><h4 className="text-xs font-black text-gray-800 dark:text-white truncate max-w-[150px]">{item.name}</h4><span className="text-[8px] text-primary font-black mt-1 block uppercase tracking-tighter">Direct: {item.id}</span></div>
                        <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center text-primary shrink-0 shadow-inner"><Zap className="w-5 h-5" /></div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default TelegramBridge;
