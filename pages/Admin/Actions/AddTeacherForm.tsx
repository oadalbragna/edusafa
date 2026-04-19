import React, { useState, useEffect } from 'react';
import { UserPlus, BookOpen, Mail, ShieldCheck, Loader2, CheckCircle2, Lock, School, X, Plus } from 'lucide-react';
import { getDb as db } from '../../../services/firebase';
import { ref, push, set, get } from 'firebase/database';
import { SYS, EDU } from '../../../constants/dbPaths';
import { logActivity } from '../../../utils/activityLogger';
import { useAuth } from '../../../context/AuthContext';

const AddTeacherForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [globalSubjects, setGlobalSubjects] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    inviteCode: 'EDU2026',
    selectedClasses: [] as string[],
    selectedSubjects: [] as string[],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const classesRef = ref(db, 'edu/sch/classes');
        const subjectsRef = ref(db, 'edu/courses');
        
        const [classesSnap, subjectsSnap] = await Promise.all([
          get(classesRef),
          get(subjectsRef)
        ]);

        if (classesSnap.exists()) {
          setClasses(Object.entries(classesSnap.val()).map(([id, data]: [string, any]) => ({ id, ...data })));
        }
        if (subjectsSnap.exists()) {
          setGlobalSubjects(Object.entries(subjectsSnap.val()).map(([id, data]: [string, any]) => ({ id, ...data })));
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };
    fetchData();
  }, []);

  const toggleSelection = (id: string, field: 'selectedClasses' | 'selectedSubjects') => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(id) 
        ? prev[field].filter(item => item !== id)
        : [...prev[field], id]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.selectedClasses.length === 0 || formData.selectedSubjects.length === 0) {
      alert('يرجى اختيار فصل واحد ومادة واحدة على الأقل');
      return;
    }
    setLoading(true);
    try {
      const teacherRef = push(ref(db, SYS.USERS));
      const teacherId = teacherRef.key;
      
      const teacherData = {
        ...formData,
        id: teacherId,
        uid: teacherId,
        role: 'teacher',
        status: 'approved',
        createdAt: new Date().toISOString(),
        // Prepare class requests structure used in other parts of the app
        classRequests: formData.selectedClasses.reduce((acc, classId) => {
          acc[classId] = { status: 'approved', requestedAt: new Date().toISOString() };
          return acc;
        }, {} as any)
      };

      await set(teacherRef, teacherData);

      // Save to users for login
      const userRef = ref(db, `sys/users/${teacherId}`);
      await set(userRef, teacherData);

      // Log Activity
      if (profile) {
        await logActivity({
          type: 'teacher_added',
          userId: profile.uid,
          userName: profile.fullName || profile.firstName || 'مدير النظام',
          details: `تم إضافة المعلم الجديد: ${formData.fullName} وتعيين الفصول والمواد له`
        });
      }

      setDone(true);
      setTimeout(onSuccess, 2000);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إضافة المعلم');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-purple-600 animate-bounce" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">تمت إضافة المعلم بنجاح!</h3>
        <p className="text-gray-500">يمكن للمعلم الآن تسجيل الدخول مباشرة والبدء في إدارة فصوله.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700">الاسم الكامل للمعلم</label>
        <div className="relative">
          <UserPlus className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            required
            className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
            placeholder="مثال: أ. محمد محمود"
            value={formData.fullName}
            onChange={(e) => setFormData({...formData, fullName: e.target.value})}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">البريد الإلكتروني</label>
          <div className="relative">
            <Mail className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              required
              className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all text-right"
              placeholder="teacher@school.com"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">رقم الهاتف</label>
          <div className="relative">
            <ShieldCheck className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="tel"
              required
              className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all text-right"
              placeholder="09xxxxxxxx"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700">كلمة المرور للحساب</label>
        <div className="relative">
          <Lock className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            required
            className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all text-right"
            placeholder="حدد كلمة مرور للمعلم"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
          />
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-black text-gray-700 flex items-center gap-2">
          <School className="w-5 h-5 text-purple-600" /> الفصول التي سيشرف عليها
        </label>
        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-gray-50 rounded-2xl border border-gray-100">
          {classes.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => toggleSelection(c.id, 'selectedClasses')}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                formData.selectedClasses.includes(c.id)
                ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                : 'bg-white text-gray-500 border-gray-200 hover:border-purple-300'
              }`}
            >
              {formData.selectedClasses.includes(c.id) ? <X size={14} /> : <Plus size={14} />}
              {c.name} ({c.level === 'primary' ? 'ابتدائي' : 'متوسط'} - {c.grade})
            </button>
          ))}
          {classes.length === 0 && <p className="text-xs text-gray-400 italic p-2">لا توجد فصول مضافة حالياً.</p>}
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-black text-gray-700 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" /> المواد التي سيشرف عليها
        </label>
        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-gray-50 rounded-2xl border border-gray-100">
          {globalSubjects.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => toggleSelection(s.name, 'selectedSubjects')}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                formData.selectedSubjects.includes(s.name)
                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'
              }`}
            >
              {formData.selectedSubjects.includes(s.name) ? <X size={14} /> : <Plus size={14} />}
              {s.name}
            </button>
          ))}
          {globalSubjects.length === 0 && <p className="text-xs text-gray-400 italic p-2">لا توجد مواد معتمدة مضافة حالياً.</p>}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-purple-200 flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'إضافة المعلم وتفعيل حسابه'}
      </button>
    </form>
  );
};

export default AddTeacherForm;
