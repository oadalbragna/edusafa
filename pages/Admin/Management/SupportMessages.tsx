import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Search, 
  CheckCircle2, 
  Clock, 
  User, 
  RefreshCw,
  Mail,
  Trash2,
  AlertCircle,
  MousePointer2,
  Camera,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Tag
} from 'lucide-react';
import { db } from '../../../services/firebase';
import { SYS, EDU, COMM } from '../../constants/dbPaths';
import { ref, onValue, update, remove } from 'firebase/database';

const SupportMessages: React.FC = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);

  useEffect(() => {
    const supportRef = ref(db, 'sys/maintenance/support_tickets');
    const unsubscribe = onValue(supportRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = Object.entries(snapshot.val()).map(([id, val]: any) => ({
          id,
          ...val
        })).sort((a, b) => b.timestamp - a.timestamp);
        setMessages(data);
      } else {
        setMessages([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await update(ref(db, `sys/maintenance/support_tickets/${id}`), { status });
  };

  const deleteMessage = async (id: string) => {
    if (window.confirm('حذف هذه الرسالة؟')) {
      await remove(ref(db, `sys/maintenance/support_tickets/${id}`));
    }
  };

  const filtered = messages.filter(m => 
    (m.subject?.toLowerCase().includes(searchTerm.toLowerCase()) || 
     m.senderName?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterStatus === 'all' || m.status === filterStatus)
  );

  const getPriorityColor = (priority: string) => {
    return priority === 'high' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100';
  };

  const getTypeLabel = (type: string) => {
    const types: any = {
      technical: 'مشكلة تقنية',
      academic: 'استفسار أكاديمي',
      account: 'حساب مستخدم',
      payment: 'أمور مالية',
      suggestion: 'اقتراح'
    };
    return types[type] || 'عام';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10" dir="rtl">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Mail className="text-blue-600" size={32} />
            مركز البلاغات المطور
          </h1>
          <p className="text-slate-500 font-medium mt-1">متابعة وحل مشكلات المستخدمين بدقة تقنية عالية</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="ابحث في المواضيع، الأسماء، أو الأكواد..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-12 pl-4 py-3.5 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold"
          />
        </div>
        <div className="flex gap-2 w-full lg:w-auto">
          {['all', 'new', 'pending', 'resolved'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`flex-1 lg:flex-none px-6 py-3 rounded-2xl text-xs font-black transition-all ${
                filterStatus === s ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              {s === 'all' ? 'الكل' : s === 'new' ? 'جديد' : s === 'pending' ? 'قيد الحل' : 'مكتمل'}
            </button>
          ))}
        </div>
      </div>

      {/* Messages List */}
      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-500 font-bold">جاري تحميل البلاغات...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white p-20 rounded-[3rem] text-center border-2 border-dashed border-slate-200">
            <ShieldAlert size={48} className="text-slate-200 mx-auto mb-4" />
            <h3 className="text-xl font-black text-slate-900">صندوق الوارد فارغ</h3>
            <p className="text-slate-400 font-bold">لا توجد بلاغات حالية تتوافق مع البحث.</p>
          </div>
        ) : (
          filtered.map((msg) => (
            <div key={msg.id} className={`bg-white rounded-[2.5rem] border transition-all overflow-hidden ${expandedTicket === msg.id ? 'ring-2 ring-blue-500 shadow-2xl' : 'border-slate-200 shadow-sm'}`}>
              <div className="p-8 cursor-pointer" onClick={() => setExpandedTicket(expandedTicket === msg.id ? null : msg.id)}>
                <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${msg.status === 'new' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-400'}`}>
                      <AlertCircle size={28} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-xl font-black text-slate-900">{msg.subject}</h3>
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getPriorityColor(msg.priority)}`}>
                          {msg.priority === 'high' ? 'أولوية قصوى' : 'عادي'}
                        </span>
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[9px] font-black flex items-center gap-1"><Tag size={10} /> {getTypeLabel(msg.type)}</span>
                      </div>
                      <p className="text-sm font-bold text-blue-600">المرسل: {msg.senderName} ({msg.senderRole})</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{new Date(msg.timestamp).toLocaleString('ar-SA')}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={(e) => {e.stopPropagation(); updateStatus(msg.id, 'pending');}} className="flex-1 md:flex-none p-3 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 shadow-sm"><Clock size={20} /></button>
                    <button onClick={(e) => {e.stopPropagation(); updateStatus(msg.id, 'resolved');}} className="flex-1 md:flex-none p-3 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 shadow-sm"><CheckCircle2 size={20} /></button>
                    <button onClick={(e) => {e.stopPropagation(); deleteMessage(msg.id);}} className="flex-1 md:flex-none p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 shadow-sm"><Trash2 size={20} /></button>
                    <div className="p-3 text-slate-300">
                      {expandedTicket === msg.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </div>
              </div>

              {expandedTicket === msg.id && (
                <div className="px-8 pb-8 space-y-8 animate-in slide-in-from-top-4 duration-300">
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">وصف المشكلة من المستخدم</h4>
                    <p className="text-slate-700 font-bold leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Visual Evidence */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <Camera className="text-blue-600" size={18} />
                        لقطة الشاشة المرفقة
                      </h4>
                      {msg.screenshotUrl ? (
                        <div className="relative group rounded-3xl overflow-hidden border border-slate-200 shadow-lg">
                          <img src={msg.screenshotUrl} alt="Visual evidence" className="w-full h-auto object-cover" />
                          <a href={msg.screenshotUrl} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-2 font-black text-sm">
                            <ExternalLink size={20} />
                            فتح الصورة بالحجم الكامل
                          </a>
                        </div>
                      ) : (
                        <div className="p-10 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 text-center text-slate-400 font-bold text-xs italic">
                          لم يتم إرفاق لقطة شاشة
                        </div>
                      )}
                    </div>

                    {/* Step Recording */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <MousePointer2 className="text-red-500" size={18} />
                        تسجيل الخطوات (Smart Record)
                      </h4>
                      {msg.steps && msg.steps.length > 0 ? (
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                          {msg.steps.map((step: any, idx: number) => (
                            <div key={idx} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-start gap-4 shadow-sm">
                              <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px] shrink-0">{idx + 1}</div>
                              <div className="space-y-1">
                                <p className="font-black text-xs text-slate-800">{step.action}</p>
                                <div className="flex items-center gap-3 text-[9px] font-bold text-slate-400 uppercase">
                                  <span>{step.timestamp}</span>
                                  <span className="text-blue-500">{step.path}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-10 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 text-center text-slate-400 font-bold text-xs italic">
                          لم يتم تسجيل خطوات لهذا البلاغ
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

    </div>
  );
};

export default SupportMessages;