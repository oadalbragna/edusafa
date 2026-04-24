import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  UserCheck, 
  UserX, 
  Clock, 
  Mail, 
  BookOpen, 
  Loader2,
  AlertTriangle,
  Users,
  GraduationCap,
  UserCircle,
  School,
  CheckCircle2,
  XCircle,
  MessageCircle
} from 'lucide-react';
import { db } from '../../../services/firebase';
import { SYS, EDU, COMM } from '../../../constants/dbPaths';
import { ref, onValue, update, get } from 'firebase/database';
import { logActivity } from '../../../utils/activityLogger';
import { useAuth } from '../../../context/AuthContext';
import Modal from '../../../components/common/Modal';

export const TeacherRequests: React.FC = () => {
  const { profile: adminProfile } = useAuth();
  const [userRequests, setUserRequests] = useState<any[]>([]);
  const [classRequests, setClassRequests] = useState<any[]>([]);
  const [classes, setClasses] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'users' | 'classes'>('users');

  // Rejection Modal State
  const [rejectionTarget, setRejectionTarget] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    const usersRef = ref(db, 'sys/users');
    const classReqRef = ref(db, 'edu/sch/teacher_class_requests');
    const classesRef = ref(db, 'edu/sch/classes');

    // 1. Fetch Classes (Flattened for names)
    get(classesRef).then(snap => {
      if (snap.exists()) {
        const data = snap.val();
        const flattenedClasses: any = {};
        Object.keys(data).forEach(level => {
          Object.keys(data[level]).forEach(grade => {
            Object.keys(data[level][grade]).forEach(id => {
              flattenedClasses[id] = data[level][grade][id];
            });
          });
        });
        setClasses(flattenedClasses);
      }
    });

    // ... (rest of logic)
    // 3. Fetch Pending Class Requests
    const unsubClassReqs = onValue(classReqRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const allReqs = Object.keys(data).map(key => ({ ...data[key], id: key }));
        setClassRequests(allReqs.filter((r: any) => r.status === 'pending'));
      } else setClassRequests([]);
      setLoading(false);
    });

    return () => {
      unsubUsers();
      unsubClassReqs();
    };
  }, []);

  const handleUserAction = async (user: any, status: 'approved' | 'rejected') => {
    try {
      await update(ref(db, `sys/users/${user.uid}`), {
        status,
        approvedAt: status === 'approved' ? new Date().toISOString() : null
      });

      if (adminProfile) {
        await logActivity({
          type: status === 'approved' ? 'user_approved' : 'user_rejected',
          userId: adminProfile.uid,
          userName: adminProfile.fullName || adminProfile.firstName || 'Admin',
          details: `قام بـ ${status === 'approved' ? 'قبول' : 'رفض'} حساب ${user.role === 'teacher' ? 'المعلم' : 'الطالب'}: ${user.fullName || user.firstName}`,
          targetId: user.uid,
          targetName: user.fullName || user.firstName
        });
      }
    } catch (err) {
      alert('حدث خطأ');
    }
  };

  const handleClassAction = async (req: any, status: 'approved' | 'rejected') => {
    if (status === 'rejected' && !rejectionReason) {
      setRejectionTarget(req);
      return;
    }

    try {
      await update(ref(db, `edu/sch/teacher_class_requests/${req.id}`), {
        status,
        rejectionReason: status === 'rejected' ? rejectionReason : null,
        reviewedBy: adminProfile?.uid,
        reviewedAt: new Date().toISOString()
      });

      if (adminProfile) {
        await logActivity({
          type: status === 'approved' ? 'user_approved' : 'user_rejected',
          userId: adminProfile.uid,
          userName: adminProfile.fullName || 'Admin',
          details: `قام بـ ${status === 'approved' ? 'قبول' : 'رفض'} إشراف المعلم ${req.teacherName} على فصل ${classes[req.classId]?.name || req.classId}`,
          targetId: req.teacherId
        });
      }
      setRejectionTarget(null);
      setRejectionReason('');
    } catch (err) {
      alert('فشل في معالجة الطلب');
    }
  };

  const [roleFilter, setRoleFilter] = useState<'all' | 'teacher' | 'student' | 'parent'>('all');

  const filteredUsers = userRequests.filter(req => 
    (roleFilter === 'all' || req.role === roleFilter) &&
    ((req.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
     (req.email || '').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredClasses = classRequests.filter(req => 
    (req.teacherName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (classes[req.classId]?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <ShieldCheck className="text-blue-600" size={32} />
            مركز إدارة القبول والتراخيص
          </h1>
          <p className="text-slate-500 font-medium mt-1">مراجعة حسابات الكادر وتفويض فصول المعلمين</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
          <button onClick={() => setViewMode('users')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${viewMode === 'users' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>الحسابات الجديدة ({userRequests.length})</button>
          <button onClick={() => setViewMode('classes')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${viewMode === 'classes' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-400'}`}>طلبات الفصول ({classRequests.length})</button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {(['all', 'teacher', 'student', 'parent'] as const).map(role => (
          <button 
            key={role}
            onClick={() => setRoleFilter(role)}
            className={`px-6 py-3 rounded-xl text-xs font-black transition-all border ${
              roleFilter === role 
              ? 'bg-slate-900 text-white shadow-xl' 
              : 'bg-white text-slate-500 hover:bg-slate-50 border-slate-200'
            }`}
          >
            {role === 'all' ? 'الكل' : role === 'teacher' ? 'المعلمون' : role === 'student' ? 'الطلاب' : 'أولياء الأمور'}
            <span className="ml-2 opacity-60">({userRequests.filter(r => role === 'all' || r.role === role).length})</span>
          </button>
        ))}
      </div>

      {viewMode === 'users' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.length === 0 ? (
            <div className="col-span-full py-20 bg-white rounded-[3rem] border border-slate-100 text-center space-y-4">
               <Users size={40} className="text-slate-200 mx-auto" />
               <h3 className="text-xl font-black text-slate-800">لا توجد طلبات حسابات جديدة</h3>
            </div>
          ) : (
            filteredUsers.map((req) => (
              <div key={req.uid} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all relative group">
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl shadow-inner ${req.role === 'teacher' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>{(req.fullName || req.firstName || '?')[0]}</div>
                  <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase">طلب {req.role}</span>
                </div>
                <div className="space-y-4 mb-8">
                  <h3 className="text-xl font-black text-slate-900">{req.fullName || `${req.firstName} ${req.lastName}`}</h3>
                  <div className="flex items-center gap-2 text-slate-500 font-bold text-xs"><Mail size={14} /><span>{req.email}</span></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => handleUserAction(req, 'approved')} className="py-4 bg-blue-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100"><UserCheck size={18} /> قبول</button>
                  <button onClick={() => handleUserAction(req, 'rejected')} className="py-4 bg-white text-red-500 border border-red-100 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-red-50"><UserX size={18} /> رفض</button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.length === 0 ? (
            <div className="col-span-full py-20 bg-white rounded-[3rem] border border-slate-100 text-center space-y-4">
               <School size={40} className="text-slate-200 mx-auto" />
               <h3 className="text-xl font-black text-slate-800">لا توجد طلبات إشراف معلقة</h3>
            </div>
          ) : (
            filteredClasses.map((req) => (
              <div key={req.id} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all relative group">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 font-black text-2xl shadow-inner">{req.teacherName[0]}</div>
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-tighter">طلب إشراف فصل</span>
                </div>
                <div className="space-y-4 mb-8">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">{classes[req.classId]?.name || 'فصل غير معروف'}</h3>
                    <p className="text-xs font-bold text-slate-400">الصف {classes[req.classId]?.grade} - {classes[req.classId]?.level}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                    <UserCircle size={18} className="text-blue-500" />
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase">المعلم المتقدم</p>
                      <p className="text-sm font-black text-slate-800">{req.teacherName}</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => handleClassAction(req, 'approved')} className="py-4 bg-green-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-green-700 shadow-lg shadow-green-100"><CheckCircle2 size={18} /> قبول</button>
                  <button onClick={() => setRejectionTarget(req)} className="py-4 bg-white text-red-500 border border-red-100 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-red-50"><XCircle size={18} /> رفض</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Rejection Modal */}
      <Modal isOpen={!!rejectionTarget} onClose={() => setRejectionTarget(null)} title="توضيح سبب الرفض">
        <div className="space-y-6" dir="rtl">
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3">
            <AlertTriangle className="text-red-600 shrink-0" size={20} />
            <p className="text-xs font-bold text-red-700">يرجى كتابة الملاحظات للمعلم ليتمكن من تعديل طلبه وإعادة التقديم.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-black text-slate-700 mr-2">ملاحظات الإدارة</label>
            <textarea 
              rows={4}
              className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm resize-none"
              placeholder="مثال: يرجى إرفاق شهادة التخصص لهذه المادة..."
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
            />
          </div>
          <button 
            onClick={() => handleClassAction(rejectionTarget, 'rejected')}
            disabled={!rejectionReason}
            className="w-full py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg hover:bg-red-700 disabled:opacity-50 transition-all active:scale-95"
          >
            تأكيد الرفض مع الملاحظات
          </button>
        </div>
      </Modal>
    </div>
  );
};
export default TeacherRequests;
