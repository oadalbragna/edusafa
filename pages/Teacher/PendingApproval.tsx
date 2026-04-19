import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Clock,
  Mail,
  RefreshCw,
  LogOut,
  CheckCircle2,
  Lock,
  Send,
  Loader2,
  MessageCircle,
  BookOpen,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDb as db } from '../../services/firebase';
import { SYS, EDU, COMM } from '../../constants/dbPaths';
import { ref, push, set, serverTimestamp, onValue } from 'firebase/database';

const PendingApproval: React.FC = () => {
  const { profile, loading, logout, isStudentPending } = useAuth();
  const navigate = useNavigate();
  const [supportMessage, setSupportMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [latestStatus, setLatestStatus] = useState<string>('pending');

  // Check for status updates in real-time
  useEffect(() => {
    if (!profile?.uid) return;
    
    const userRef = ref(db, `sys/users/${profile.uid}`);
    const unsub = onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setLatestStatus(data.status || 'pending');
        
        // If approved, redirect to appropriate dashboard
        if (data.status === 'approved') {
          // Update localStorage
          const updatedProfile = { ...profile, status: 'approved' };
          localStorage.setItem('edu_user_profile', JSON.stringify(updatedProfile));
          
          // Redirect based on role
          if (profile.role === 'student') {
            navigate('/student', { replace: true });
          } else if (profile.role === 'teacher') {
            navigate('/teacher', { replace: true });
          } else if (profile.role === 'parent') {
            navigate('/parent', { replace: true });
          }
        }
      }
    });

    return () => unsub();
  }, [profile, navigate]);

  useEffect(() => {
    if (!loading && !profile) {
      navigate('/login', { replace: true });
    }
  }, [profile, loading, navigate]);

  const handleContactAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !supportMessage.trim()) return;

    setIsSending(true);
    try {
      const ticketRef = push(ref(db, 'sys/maintenance/support_tickets'));
      await set(ticketRef, {
        id: ticketRef.key,
        senderId: profile.uid,
        senderName: profile.fullName || `${profile.firstName} ${profile.lastName}`,
        senderRole: profile.role,
        subject: 'طلب تفعيل حساب',
        content: supportMessage,
        status: 'new',
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString()
      });
      setSent(true);
      setSupportMessage('');
      setTimeout(() => setSent(false), 5000);
    } catch (err) {
      alert('فشل إرسال الرسالة');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans" dir="rtl">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-10 items-stretch">
        
        {/* Status Section */}
        <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 flex flex-col items-center space-y-8 animate-in fade-in zoom-in-95 duration-700">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-blue-500 rounded-[2.5rem] blur-2xl opacity-20 animate-pulse"></div>
            <div className="relative w-28 h-28 bg-white rounded-[2.5rem] shadow-inner flex items-center justify-center text-blue-600 border border-blue-50">
              <ShieldCheck size={56} />
            </div>
            <div className="absolute -bottom-2 -left-2 w-10 h-10 bg-amber-500 rounded-full border-4 border-white flex items-center justify-center text-white shadow-lg">
               <Clock size={20} />
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">بانتظار مراجعة الإدارة</h1>
            <p className="text-lg text-slate-500 font-medium leading-relaxed">
              مرحباً {profile?.firstName}، تم استلام طلب انضمامك كـ{
                profile?.role === 'student' ? 'طالب' :
                profile?.role === 'teacher' ? 'معلم' :
                profile?.role === 'parent' ? 'ولي أمر' : 'مستخدم'
              } في <span className="text-blue-600 font-bold">EduSafa</span>. حسابك حالياً قيد المراجعة والتدقيق.
            </p>
            {profile?.role === 'student' && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                <p className="text-sm font-bold text-amber-800 text-right">
                  تنبيه: لا يمكنك استخدام المنصة حتى يتم تفعيل حسابك من قبل الإدارة. سيتم إشعارك عند التفعيل.
                </p>
              </div>
            )}
          </div>

          {/* Process Timeline Simplified */}
          <div className="w-full space-y-4 text-right">
             <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                   <CheckCircle2 size={16} />
                </div>
                <p className="font-bold text-slate-700 text-sm">إنشاء الحساب بنجاح</p>
             </div>
             <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 animate-pulse">
                   <Clock size={16} />
                </div>
                <p className="font-bold text-slate-700 text-sm">التدقيق والمراجعة الإدارية (جاري)</p>
             </div>
             <div className="flex items-center gap-4 opacity-40">
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                   <Lock size={16} />
                </div>
                <p className="font-bold text-slate-700 text-sm">تفعيل كامل الصلاحيات</p>
             </div>
          </div>

          <div className="flex flex-col gap-3 w-full pt-4">
             <button 
               onClick={() => window.location.reload()}
               className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 flex items-center justify-center gap-2 transition-all active:scale-95"
             >
                <RefreshCw size={20} />
                تحديث الحالة
             </button>
             <button 
               onClick={logout}
               className="w-full py-4 bg-slate-100 text-red-500 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-red-50 transition-all"
             >
                <LogOut size={20} />
                تسجيل الخروج
             </button>
          </div>
        </div>

        {/* Contact Admin Section */}
        <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl text-right space-y-8 animate-in slide-in-from-left-4 duration-700 flex flex-col">
           <div className="space-y-2">
              <div className="flex items-center gap-3">
                 <div className="p-3 bg-white/10 text-blue-400 rounded-2xl backdrop-blur-md border border-white/5">
                    <MessageCircle size={24} />
                 </div>
                 <h3 className="text-2xl font-black text-white">راسل الإدارة</h3>
              </div>
              <p className="text-slate-400 font-medium text-sm pr-1">يمكنك طلب استعجال التفعيل أو إرسال استفسارك مباشرة للمسؤولين.</p>
           </div>

           {sent ? (
             <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center border border-emerald-500/30 animate-in zoom-in">
                   <CheckCircle2 size={40} />
                </div>
                <p className="text-xl font-black text-emerald-400">تم إرسال رسالتك!</p>
                <p className="text-sm text-slate-400 font-bold">سنقوم بمراجعة طلبك والرد عليك قريباً.</p>
             </div>
           ) : (
             <form onSubmit={handleContactAdmin} className="space-y-4 flex-1 flex flex-col">
                <div className="flex-1">
                   <textarea 
                     required
                     value={supportMessage}
                     onChange={e => setSupportMessage(e.target.value)}
                     className="w-full h-full min-h-[250px] p-6 bg-white/5 border border-white/10 rounded-[2rem] outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all font-bold text-white text-sm resize-none leading-relaxed placeholder:text-slate-600 shadow-inner"
                     placeholder="اكتب رسالتك للإدارة هنا..."
                   />
                </div>
                <button 
                  type="submit"
                  disabled={isSending || !supportMessage.trim()}
                  className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-blue-700 transition-all disabled:opacity-50 shadow-xl shadow-blue-900/20 active:scale-[0.98]"
                >
                   {isSending ? <Loader2 className="animate-spin" size={24} /> : <Send size={24} className="rotate-180" />}
                   إرسال الرسالة الآن
                </button>
             </form>
           )}

           <div className="p-5 bg-white/5 rounded-3xl border border-white/10 flex items-start gap-4">
              <ShieldCheck className="text-blue-400 shrink-0 mt-0.5" size={20} />
              <p className="text-[11px] font-bold text-slate-400 leading-relaxed">
                 تحذير: سيتم حظر أي حساب يسيء استخدام خاصية المراسلة. نرجو التواصل بمهنية.
              </p>
           </div>
        </div>

      </div>
    </div>
  );
};

export default PendingApproval;
