import React, { useState, useEffect } from 'react';
import { UserPlus, Phone, Mail, GraduationCap, Loader2, CheckCircle2, Lock, School } from 'lucide-react';
import { getDb as db } from '../../../services/firebase';
import { ref, push, set, get } from 'firebase/database';
import { logActivity } from '../../../utils/activityLogger';
import { useAuth } from '../../../context/AuthContext';

const AddStudentForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    eduLevel: 'primary',
    grade: '1',
    classId: '',
  });

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const classesRef = ref(db, 'edu/sch/classes');
        const snapshot = await get(classesRef);
        if (snapshot.exists()) {
          const classesData = Object.entries(snapshot.val()).map(([id, data]: [string, any]) => ({
            id,
            ...data
          }));
          setClasses(classesData);
        }
      } catch (err) {
        console.error('Error fetching classes:', err);
      }
    };
    fetchClasses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Save to students database
      const studentRef = push(ref(db, SYS.USERS));
      const studentId = studentRef.key;
      const studentData = {
        ...formData,
        id: studentId,
        uid: studentId, // Using same ID for simplicity
        role: 'student',
        createdAt: new Date().toISOString(),
        status: 'approved'
      };
      
      await set(studentRef, studentData);

      // 2. Save to users database for login
      const userRef = ref(db, `sys/users/${studentId}`);
      await set(userRef, {
        ...studentData,
        fullName: `${formData.firstName} ${formData.lastName}`
      });
      
      // Log Activity
      if (profile) {
        await logActivity({
          type: 'student_added',
          userId: profile.uid,
          userName: profile.fullName || profile.firstName || 'مدير النظام',
          details: `تم إضافة الطالب الجديد: ${formData.firstName} ${formData.lastName} وتم إنشاء حساب دخول له`
        });
      }

      setDone(true);
      setTimeout(onSuccess, 2000);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إضافة الطالب');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-600 animate-bounce" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">تمت إضافة الطالب بنجاح!</h3>
        <p className="text-gray-500">يمكن للطالب الآن تسجيل الدخول باستخدام البريد/الهاتف وكلمة المرور المحددة.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">الاسم الأول</label>
          <div className="relative">
            <UserPlus className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              required
              className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              placeholder="مثال: أحمد"
              value={formData.firstName}
              onChange={(e) => setFormData({...formData, firstName: e.target.value})}
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">اسم العائلة</label>
          <div className="relative">
            <UserPlus className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              required
              className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              placeholder="مثال: علي"
              value={formData.lastName}
              onChange={(e) => setFormData({...formData, lastName: e.target.value})}
            />
          </div>
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
              className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-right"
              placeholder="student@example.com"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">رقم الهاتف</label>
          <div className="relative">
            <Phone className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="tel"
              required
              className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-right"
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
            className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-right"
            placeholder="حدد كلمة مرور للطالب"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
          />
        </div>
        <p className="text-[10px] text-gray-400 mr-2">سيستخدم الطالب هذه الكلمة لتسجيل الدخول لاحقاً.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">المرحلة</label>
          <div className="relative">
            <GraduationCap className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl appearance-none focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              value={formData.eduLevel}
              onChange={(e) => setFormData({...formData, eduLevel: e.target.value})}
            >
              <option value="primary">ابتدائي</option>
              <option value="middle">متوسط</option>
              <option value="high">ثانوي</option>
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">الصف</label>
          <select
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl appearance-none focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            value={formData.grade}
            onChange={(e) => setFormData({...formData, grade: e.target.value})}
          >
            {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700">الفصل الدراسي</label>
        <div className="relative">
          <School className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            required
            className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl appearance-none focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            value={formData.classId}
            onChange={(e) => setFormData({...formData, classId: e.target.value})}
          >
            <option value="">-- اختر الفصل --</option>
            {classes
              .filter(c => c.level === formData.eduLevel && c.grade === formData.grade)
              .map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))
            }
          </select>
        </div>
        {classes.filter(c => c.level === formData.eduLevel && c.grade === formData.grade).length === 0 && (
          <p className="text-[10px] text-amber-600 mr-2 italic">لا توجد فصول مضافة لهذه المرحلة وهذا الصف حالياً.</p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'إضافة الطالب للنظام'}
      </button>
    </form>
  );
};

export default AddStudentForm;
