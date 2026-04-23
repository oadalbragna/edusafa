import React, { useState, useEffect, useRef } from 'react';
import { 
  Mail, 
  Send, 
  MessageCircle, 
  LifeBuoy, 
  CheckCircle2, 
  Loader2,
  AlertCircle,
  Camera,
  MousePointer2,
  ListTodo,
  XCircle,
  PenTool,
  Save,
  Trash2,
  ArrowRight,
  Info,
  Maximize2,
  UploadCloud
} from 'lucide-react';
import { db } from '../../services/firebase';
import { SYS, EDU, COMM } from '../../constants/dbPaths';
import { TelegramService } from '../../services/telegram.service';
import { ref, push, set, serverTimestamp } from 'firebase/database';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { logActivity } from '../../utils/activityLogger';
import Modal from '../../components/common/Modal';

const PROBLEM_TYPES = [
  { id: 'technical', label: 'مشكلة تقنية (خطأ في النظام)', icon: AlertCircle, color: 'text-red-500' },
  { id: 'academic', label: 'استفسار أكاديمي', icon: BookOpen, color: 'text-blue-500' },
  { id: 'account', label: 'مشكلة في الحساب', icon: User, color: 'text-amber-500' },
  { id: 'payment', label: 'مشكلة في السداد', icon: CreditCard, color: 'text-emerald-500' },
  { id: 'suggestion', label: 'اقتراح تطويري', icon: Lightbulb, color: 'text-purple-500' }
];

import { BookOpen, User, CreditCard, Lightbulb } from 'lucide-react';

const SupportPage: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reportMode, setReportMode] = useState<'form' | 'record'>('form');
  
  // Advanced State
  const [formData, setFormData] = useState({
    type: 'technical',
    subject: '',
    content: '',
    steps: [] as { action: string, timestamp: string, path: string }[],
    screenshot: null as File | null,
    screenshotUrl: '',
    annotations: [] as { x: number, y: number, text: string }[]
  });

  const [isRecording, setIsRecordMode] = useState(false);
  const recordBuffer = useRef<any[]>([]);

  // Recording Logic
  useEffect(() => {
    if (isRecording) {
      const handleClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const action = `نقر على: ${target.innerText || target.tagName || 'عنصر غير مسمى'}`;
        recordBuffer.current.push({
          action,
          timestamp: new Date().toLocaleTimeString(),
          path: window.location.pathname
        });
        setFormData(prev => ({ ...prev, steps: [...recordBuffer.current] }));
      };

      window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
    }
  }, [isRecording]);

  const startRecording = () => {
    setIsRecordMode(true);
    recordBuffer.current = [];
    setFormData(prev => ({ ...prev, steps: [] }));
    alert('بدأ نظام التسجيل الذكي. انتقل الآن للصفحة التي بها المشكلة وقم بالخطوات، سنقوم بتسجيل كل نقرة تقوم بها.');
  };

  const stopRecording = () => {
    setIsRecordMode(false);
    alert(`تم تسجيل ${recordBuffer.current.length} خطوة بنجاح.`);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    try {
      const res = await TelegramService.uploadFile(file, 'support');
      if (res.success && res.url) {
        setFormData(prev => ({ ...prev, screenshot: file, screenshotUrl: res.url! }));
      }
    } catch (err) {
      alert('فشل رفع الصورة');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    try {
      const supportRef = ref(db, 'sys/maintenance/support_tickets');
      const newTicketRef = push(supportRef);
      await set(newTicketRef, {
        id: newTicketRef.key,
        senderId: profile.uid,
        senderName: profile.fullName || `${profile.firstName} ${profile.lastName}`,
        senderRole: profile.role,
        type: formData.type,
        subject: formData.subject,
        content: formData.content,
        steps: formData.steps,
        screenshotUrl: formData.screenshotUrl,
        status: 'new',
        priority: formData.type === 'technical' || formData.type === 'payment' ? 'high' : 'normal',
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString()
      });

      await logActivity({
        type: 'support_ticket_created',
        userId: profile.uid,
        userName: profile.fullName || profile.firstName || 'User',
        details: `فتح بلاغ مطور (${formData.type}): ${formData.subject}`
      });

      setSubmitted(true);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إرسال البلاغ.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-6 text-center space-y-8 animate-in zoom-in-95 duration-500" dir="rtl">
        <div className="w-24 h-24 bg-green-50 text-green-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 size={48} />
        </div>
        <div className="space-y-3">
          <h1 className="text-4xl font-black text-slate-900">تم استلام بلاغك المطور!</h1>
          <p className="text-slate-500 font-bold text-lg">فريق التقنية سيقوم بتحليل الخطوات المسجلة والصورة المرفقة لحل المشكلة فوراً.</p>
        </div>
        <button onClick={() => navigate('/')} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95">العودة للرئيسية</button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-10 px-6 space-y-10 animate-in fade-in duration-700" dir="rtl">
      
      {/* Recording Overlay */}
      {isRecording && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[1000] bg-red-600 text-white p-4 rounded-3xl shadow-2xl flex items-center gap-6 animate-pulse border-4 border-white">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-white rounded-full"></div>
            <span className="font-black text-sm uppercase tracking-widest">جاري تسجيل خطواتك... ({formData.steps.length})</span>
          </div>
          <button onClick={stopRecording} className="bg-white text-red-600 px-6 py-2 rounded-xl font-black text-xs hover:bg-red-50 transition-all shadow-lg">إنهاء التسجيل</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-slate-100 pb-10">
        <div className="space-y-2 text-right">
          <div className="inline-flex p-3 bg-blue-50 text-blue-600 rounded-xl mb-2">
            <LifeBuoy size={24} />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">نظام البلاغات المطور</h1>
          <p className="text-slate-500 font-medium">أبلغ عن المشكلة بدقة عبر تسجيل الخطوات أو إرفاق صور توضيحية.</p>
        </div>
        <div className="flex gap-3">
           <button 
             onClick={startRecording}
             disabled={isRecording}
             className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black transition-all shadow-xl ${isRecording ? 'bg-slate-100 text-slate-400' : 'bg-red-50 text-red-600 hover:bg-red-100 shadow-red-100'}`}
           >
             <MousePointer2 size={20} />
             <span>تسجيل مشكلة لحظية</span>
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Form */}
        <div className="lg:col-span-7 space-y-8">
          <form onSubmit={handleSubmit} className="bg-white p-8 md:p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-8">
            
            {/* Problem Type Selector */}
            <div className="space-y-4">
              <label className="text-sm font-black text-slate-700 flex items-center gap-2">
                <ListTodo size={18} className="text-blue-600" />
                حدد نوع المشكلة التي تواجهك
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PROBLEM_TYPES.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: type.id })}
                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-right ${
                      formData.type === type.id 
                      ? 'bg-blue-50 border-blue-600 shadow-lg shadow-blue-100' 
                      : 'bg-slate-50 border-transparent hover:bg-white hover:border-slate-200'
                    }`}
                  >
                    <div className={`p-3 rounded-xl bg-white shadow-sm ${type.color}`}>
                      <type.icon size={20} />
                    </div>
                    <span className={`font-black text-xs ${formData.type === type.id ? 'text-blue-900' : 'text-slate-600'}`}>{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-black text-slate-700">موضوع البلاغ</label>
              <input 
                type="text" 
                required
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700"
                placeholder="عنوان مختصر للمشكلة"
                value={formData.subject}
                onChange={e => setFormData({...formData, subject: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-black text-slate-700">وصف المشكلة بالتفصيل</label>
              <textarea 
                required
                rows={5}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl outline-none font-bold text-slate-700 resize-none leading-relaxed"
                placeholder="ماذا حدث؟ وما هو السلوك المتوقع؟"
                value={formData.content}
                onChange={e => setFormData({...formData, content: e.target.value})}
              />
            </div>

            <div className="space-y-4">
              <label className="text-sm font-black text-slate-700 flex items-center gap-2">
                <Camera size={18} className="text-blue-600" />
                إرفاق لقطة شاشة (Screenshot)
              </label>
              <div className="relative group">
                <input type="file" id="support-file" className="hidden" accept="image/*" onChange={handleFileChange} />
                <label 
                  htmlFor="support-file"
                  className={`flex flex-col items-center justify-center w-full py-10 border-2 border-dashed rounded-[2.5rem] cursor-pointer transition-all ${
                    formData.screenshotUrl ? 'border-green-400 bg-green-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-blue-400'
                  }`}
                >
                  {loading ? (
                    <Loader2 className="animate-spin text-blue-600" size={32} />
                  ) : formData.screenshotUrl ? (
                    <div className="text-center space-y-3">
                      <div className="relative inline-block">
                        <img src={formData.screenshotUrl} className="w-48 h-24 object-cover rounded-2xl shadow-lg border-2 border-white" alt="Screenshot" />
                        <button 
                          onClick={(e) => { e.preventDefault(); setFormData({ ...formData, screenshotUrl: '' }); }}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg"
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                      <p className="text-[10px] font-black text-green-700 uppercase">تم رفع الصورة بنجاح</p>
                    </div>
                  ) : (
                    <>
                      <div className="p-4 bg-white text-blue-600 rounded-2xl shadow-sm border border-slate-100 mb-2">
                        <UploadCloud size={32} />
                      </div>
                      <span className="font-black text-slate-700">اضغط لرفع لقطة الشاشة</span>
                      <span className="text-[10px] text-slate-400 font-bold mt-1 italic">سيساعدنا هذا في تشخيص المشكلة بصرياً</span>
                    </>
                  )}
                </label>
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 className="animate-spin" size={24} /> : <Send size={24} className="rotate-180" />}
              <span>إرسال البلاغ المطور الآن</span>
            </button>
          </form>
        </div>

        {/* Right Column: Steps & Instructions */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Recording Status */}
          <div className="bg-slate-900 p-8 rounded-[3rem] text-white space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full -ml-16 -mt-16 blur-2xl"></div>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black flex items-center gap-3">
                <MousePointer2 className="text-red-500" />
                سجل الخطوات المتبعة
              </h3>
              {formData.steps.length > 0 && (
                <button 
                  onClick={() => setFormData({ ...formData, steps: [] })}
                  className="p-2 bg-white/10 rounded-lg hover:bg-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {formData.steps.length === 0 ? (
                <div className="py-10 text-center space-y-4 bg-white/5 rounded-[2rem] border border-white/5 border-dashed">
                   <p className="text-slate-400 font-bold text-sm">لا توجد خطوات مسجلة بعد.</p>
                   <p className="text-[10px] text-slate-500 leading-relaxed px-6">انقر على "تسجيل مشكلة لحظية" وسنقوم بتوثيق كل تحركاتك في المنصة حتى تضغط إيقاف.</p>
                </div>
              ) : (
                formData.steps.map((step, idx) => (
                  <div key={idx} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-start gap-4 animate-in slide-in-from-right-4">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-black text-xs shrink-0">{idx + 1}</div>
                    <div className="space-y-1">
                      <p className="font-black text-sm">{step.action}</p>
                      <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>{step.timestamp}</span>
                        <span className="text-blue-400">{step.path}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {formData.steps.length > 0 && !isRecording && (
              <div className="pt-4 border-t border-white/10 flex items-center gap-3 text-xs font-bold text-emerald-400 italic">
                <CheckCircle2 size={14} />
                سيتم إرفاق هذه الخطوات مع البلاغ لمساعدة المبرمجين.
              </div>
            )}
          </div>

          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Info className="text-blue-600" size={20} />
              كيف يعمل النظام المطور؟
            </h3>
            <div className="space-y-4">
              {[
                { title: 'التسجيل اللحظي', desc: 'يقوم بحفظ كل نقرة تقوم بها في المنصة لتمثيل المشكلة بدقة.' },
                { title: 'لقطة الشاشة', desc: 'ارفع صورة للمكان الذي ظهر فيه الخطأ أو الرسالة المزعجة.' },
                { title: 'البلاغ اللحظي', desc: 'يصل بلاغك فوراً للقسم المختص (تقني، مالي، أو أكاديمي).' }
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center font-black text-[10px] shrink-0 border border-slate-100">{i+1}</div>
                  <div className="space-y-1">
                    <p className="font-black text-sm text-slate-800">{item.title}</p>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default SupportPage;