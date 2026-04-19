import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Search, 
  RefreshCw,
  CheckCircle2,
  Edit,
  Eye,
  EyeOff,
  Users,
  ShieldCheck,
  Save
} from 'lucide-react';
import { getDb as db } from '../../../services/firebase';
import { SYS, EDU, COMM } from '../../constants/dbPaths';
import { ref, onValue, set, push, remove, update } from 'firebase/database';
import Modal from '../../../components/common/Modal';

const GlobalSubjects: React.FC = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const initialSubjectState = {
    name: '',
    code: '',
    level: 'primary', // primary, middle, high
    description: '',
    status: 'public' as 'public' | 'hidden' | 'teachers_only',
    isCertified: true
  };

  const [newSubject, setNewSubject] = useState(initialSubjectState);

  useEffect(() => {
    const subjectsRef = ref(db, 'edu/courses');
    const unsubscribe = onValue(subjectsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = Object.entries(snapshot.val()).map(([id, val]: any) => ({ ...val, id }));
        setSubjects(data);
      } else {
        setSubjects([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.name) return;

    try {
      if (editingSubject) {
        const subRef = ref(db, `edu/courses/${editingSubject.id}`);
        await update(subRef, { ...newSubject });
      } else {
        const subjectsRef = ref(db, 'edu/courses');
        const newRef = push(subjectsRef);
        await set(newRef, {
          ...newSubject,
          id: newRef.key,
          createdAt: new Date().toISOString()
        });
      }
      setIsModalOpen(false);
      setEditingSubject(null);
      setNewSubject(initialSubjectState);
    } catch (err) {
      alert('حدث خطأ أثناء الحفظ');
    }
  };

  const toggleCertified = async (id: string, currentStatus: boolean) => {
    try {
      await update(ref(db, `edu/courses/${id}`), {
        isCertified: !currentStatus
      });
    } catch (err) {
      alert('حدث خطأ أثناء التحديث');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('هل تريد حذف هذه المادة؟')) {
      await remove(ref(db, `edu/courses/${id}`));
    }
  };

  const toggleStatus = async (subject: any) => {
    const nextStatus = subject.status === 'hidden' ? 'public' : 'hidden';
    await update(ref(db, `edu/courses/${subject.id}`), { status: nextStatus });
  };

  const filtered = subjects.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10" dir="rtl">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <BookOpen className="text-blue-600" size={32} />
            إدارة المواد الدراسية
          </h1>
          <p className="text-slate-500 font-medium mt-1">التحكم المركزي في كافة المواد وتصنيف الاعتماد</p>
        </div>
        <button 
          onClick={() => {
            setEditingSubject(null);
            setNewSubject(initialSubjectState);
            setIsModalOpen(true);
          }}
          className="btn-premium btn-primary flex items-center gap-2 shadow-xl shadow-blue-100 px-8 py-4"
        >
          <Plus size={20} />
          <span>إضافة مادة جديدة</span>
        </button>
      </div>

      {/* Control Bar */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="ابحث في المواد أو الأكواد..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-12 pl-4 py-3.5 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold"
          />
        </div>
      </div>

      {/* Subjects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center">
            <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-500 font-bold">جاري تحميل القائمة...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full bg-white p-20 rounded-[3rem] text-center border-2 border-dashed border-slate-200">
            <BookOpen size={48} className="text-slate-200 mx-auto mb-4" />
            <h3 className="text-xl font-black text-slate-900">لا توجد مواد معتمدة</h3>
            <p className="text-slate-400 font-bold">ابدأ بإضافة المواد الدراسية التي تدرس في مدرستك.</p>
          </div>
        ) : (
          filtered.map((subject) => (
            <div key={subject.id} className="bg-white rounded-[2.5rem] p-6 border border-slate-200 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden flex flex-col h-full">
              <div className={`absolute top-0 right-0 w-2 h-full ${
                subject.status === 'hidden' ? 'bg-slate-400' : 
                subject.level === 'primary' ? 'bg-emerald-400' : 
                subject.level === 'middle' ? 'bg-blue-500' : 'bg-purple-500'
              }`}></div>
              
              <div className="flex justify-between items-start mb-6">
                <div className={`p-4 rounded-2xl transition-all shadow-inner ${
                  subject.status === 'hidden' ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
                }`}>
                  <BookOpen size={24} />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                   <button 
                    onClick={() => toggleStatus(subject)}
                    className={`p-2 rounded-xl transition-all ${subject.status === 'hidden' ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400'}`}
                    title={subject.status === 'hidden' ? 'إظهار' : 'إخفاء'}
                  >
                    {subject.status === 'hidden' ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                  <button 
                    onClick={() => {
                      setEditingSubject(subject);
                      setNewSubject({ ...subject });
                      setIsModalOpen(true);
                    }}
                    className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    <Edit size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(subject.id)}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-2 flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-slate-900">{subject.name}</h3>
                    <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md uppercase tracking-tighter">{subject.code || 'NO-CODE'}</span>
                  </div>
                  {subject.isCertified && (
                    <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full text-[8px] font-black border border-amber-100 animate-pulse">معتمدة ✨</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                      subject.level === 'primary' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {subject.level === 'primary' ? 'ابتدائي' : subject.level === 'middle' ? 'متوسط' : 'ثانوي'}
                    </span>
                    {subject.status === 'hidden' && (
                      <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded text-[10px] font-black flex items-center gap-1"><EyeOff size={10} /> مخفي</span>
                    )}
                  </div>
                  <button 
                    onClick={() => toggleCertified(subject.id, subject.isCertified)}
                    className={`text-[9px] font-black px-3 py-1 rounded-lg transition-all ${subject.isCertified ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                  >
                    {subject.isCertified ? 'إلغاء الاعتماد' : 'تفعيل الاعتماد'}
                  </button>
                </div>
                <p className="text-xs text-slate-400 font-bold mt-2 leading-relaxed line-clamp-2">
                  {subject.description || 'لا يوجد وصف مضاف لهذه المادة.'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Subject Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingSubject ? "تعديل المادة المعتمدة" : "إضافة مادة معتمدة"}>
        <form onSubmit={handleSave} className="space-y-6" dir="rtl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-700">اسم المادة</label>
              <input 
                type="text" 
                required
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold"
                placeholder="مثال: الرياضيات"
                value={newSubject.name}
                onChange={(e) => setNewSubject({...newSubject, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-700">كود المادة (اختياري)</label>
              <input 
                type="text" 
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold"
                placeholder="مثال: MATH101"
                value={newSubject.code}
                onChange={(e) => setNewSubject({...newSubject, code: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-black text-slate-700">المرحلة الدراسية</label>
                          <select 
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold appearance-none"
                            value={newSubject.level}
                            onChange={(e) => setNewSubject({...newSubject, level: e.target.value})}
                          >
                            <option value="primary">الابتدائية</option>
                            <option value="middle">المتوسطة</option>
                            <option value="high">الثانوية</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-black text-slate-700">حالة الاعتماد</label>
                          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                            <input 
                              type="checkbox" 
                              id="certified-check"
                              className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                              checked={newSubject.isCertified}
                              onChange={(e) => setNewSubject({...newSubject, isCertified: e.target.checked})}
                            />
                            <label htmlFor="certified-check" className="text-sm font-bold text-slate-700 cursor-pointer">مادة معتمدة</label>
                          </div>
                        </div>
                      </div>
            
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-700">حالة الظهور</label>
              <select 
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold appearance-none"
                value={newSubject.status}
                onChange={(e) => setNewSubject({...newSubject, status: e.target.value as any})}
              >
                <option value="public">متاح للجميع</option>
                <option value="teachers_only">للمعلمين فقط</option>
                <option value="hidden">مخفي</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-black text-slate-700">وصف المادة</label>
            <textarea 
              rows={3}
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm resize-none"
              placeholder="اكتب نبذة قصيرة عن المادة..."
              value={newSubject.description}
              onChange={(e) => setNewSubject({...newSubject, description: e.target.value})}
            />
          </div>

          <button 
            type="submit"
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-3"
          >
            {editingSubject ? <Save size={20} /> : <CheckCircle2 size={20} />}
            {editingSubject ? "حفظ التعديلات" : "اعتماد المادة في القائمة"}
          </button>
        </form>
      </Modal>

    </div>
  );
};

export default GlobalSubjects;