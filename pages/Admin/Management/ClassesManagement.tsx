import React, { useState, useEffect } from 'react';
import {
  LayoutGrid,
  List,
  Plus,
  Search,
  Users,
  BookOpen,
  GraduationCap,
  Layers,
  ChevronDown,
  Trash2,
  Edit,
  Archive,
  AlertTriangle,
  RefreshCw,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Users as UsersIcon,
  ShieldCheck,
  Save,
  Filter
} from 'lucide-react';
import { db } from '../../../services/firebase';
import { ref, onValue, remove, update } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import type { Class } from '../../../types';
import { EDU } from '../../../constants/dbPaths';
import Modal from '../../../components/common/Modal';

const ClassesManagement: React.FC = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([]);
  const [curricula, setCurricula] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');

  // Modals state
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editClass, setEditClass] = useState({
    name: '',
    grade: '',
    level: 'primary' as any,
    status: 'public' as any
  });

  useEffect(() => {
    const classesRef = ref(db, 'edu/sch/classes');
    const currRef = ref(db, EDU.CURRICULA);

    onValue(classesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const flattenedClasses: Class[] = [];
        
        // Traverse hierarchical structure: level -> grade
        Object.keys(data).forEach(level => {
          if (typeof data[level] === 'object') {
            Object.keys(data[level]).forEach(grade => {
              // Now data[level][grade] IS the class object itself
              const classData = data[level][grade];
              flattenedClasses.push({
                ...classData,
                id: grade, // grade IS the class id
                level,
                grade
              });
            });
          }
        });
        setClasses(flattenedClasses);
      } else {
        setClasses([]);
      }
    });

    onValue(currRef, (snapshot) => {
      if (snapshot.exists()) {
        setCurricula(Object.values(snapshot.val()));
      } else {
        setCurricula([]);
      }
      setLoading(false);
    });
  }, []);

  const deleteClass = async (id: string) => {
    if (!selectedClass) return;

    const hasStudents = selectedClass.students && selectedClass.students.length > 0;
    const hasSubjects = selectedClass.subjects && selectedClass.subjects.length > 0;
    const hasCurricula = curricula.some(c => c.classId === id);

    if (hasStudents || hasSubjects || hasCurricula) {
      alert('⚠️ عذراً، لا يمكنك حذف هذا الفصل!\n\nيحتوي الفصل على بيانات نشطة (طلاب، مواد، أو مقررات دراسية). يرجى تفريغ الفصل من محتوياته أولاً لضمان سلامة البيانات.');
      setIsDeleteModalOpen(false);
      return;
    }

    try {
      await remove(ref(db, `edu/sch/classes/${selectedClass.level}/${selectedClass.grade}`));
      setIsDeleteModalOpen(false);
    } catch (err) {
      alert('حدث خطأ أثناء حذف الفصل');
    }
  };

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) return;
    try {
      await update(ref(db, `edu/sch/classes/${selectedClass.level}/${selectedClass.grade}`), editClass);
      setIsEditModalOpen(false);
    } catch (err) {
      alert('حدث خطأ أثناء تحديث بيانات الفصل');
    }
  };

  const updateClassStatus = async (id: string, status: string) => {
    const cls = classes.find(c => c.id === id);
    if (!cls) return;
    try {
      await update(ref(db, `edu/sch/classes/${cls.level}/${cls.grade}`), { status });
    } catch (err) {
      alert('حدث خطأ أثناء تحديث حالة الفصل');
    }
  };

  const filteredClasses = classes.filter(cls => {
    const matchesSearch = cls.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         cls.grade.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = filterLevel === 'all' || cls.level === filterLevel;
    return matchesSearch && matchesLevel;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold animate-pulse">جاري تحميل الفصول الدراسية...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Layers className="text-blue-600" />
            مركز إدارة الفصول
          </h1>
          <p className="text-slate-500 font-medium mt-1">تحكم كامل في البيئة التعليمية والمستويات الدراسية</p>
        </div>
        <button 
          onClick={() => navigate('/admin/add-class')}
          className="btn-premium btn-primary flex items-center gap-2 group shadow-xl shadow-blue-100 px-8 py-4"
        >
          <Plus size={20} />
          <span>إضافة فصل جديد</span>
        </button>
      </div>

      {/* Control Bar */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="ابحث عن فصل أو مستوى دراسي..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-12 pl-4 py-3.5 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-bold text-slate-900"
            />
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="p-3.5 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all"
            title="تحديث البيانات"
          >
            <RefreshCw size={20} />
          </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <div className="relative group flex-1">
            <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
            <select 
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="w-full lg:w-48 pr-10 pl-10 py-3.5 bg-slate-50 border-transparent rounded-2xl focus:bg-white outline-none transition-all text-sm font-bold text-slate-900 appearance-none cursor-pointer"
            >
              <option value="all">كل المراحل</option>
              <option value="primary">الابتدائية</option>
              <option value="middle">المتوسطة</option>
              <option value="high">الثانوية</option>
            </select>
          </div>
          <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100 justify-center">
            <button 
              onClick={() => setViewType('grid')}
              className={`p-2.5 rounded-xl transition-all flex-1 sm:flex-none flex justify-center ${viewType === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <LayoutGrid size={20} />
            </button>
            <button 
              onClick={() => setViewType('list')}
              className={`p-2.5 rounded-xl transition-all flex-1 sm:flex-none flex justify-center ${viewType === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <List size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {viewType === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {filteredClasses.map((cls) => (
            <div 
              key={cls.id} 
              className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all group relative overflow-hidden flex flex-col h-full"
            >
              <div className={`h-24 relative overflow-hidden ${
                cls.status === 'hidden' ? 'bg-slate-400' : cls.level === 'primary' ? 'bg-emerald-500' : cls.level === 'middle' ? 'bg-blue-500' : 'bg-purple-500'
              }`}>
                {(cls.animationUrl || cls.coverImage) && (
                  <img 
                    src={cls.animationUrl || cls.coverImage} 
                    alt={cls.name}
                    className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                <div className="absolute top-4 left-4 flex gap-1">
                   <button 
                      onClick={() => navigate(`/admin/class/${cls.id}`)}
                      className="p-2 bg-white/20 backdrop-blur-md text-white rounded-xl hover:bg-blue-600 transition-all"
                      title="إدارة الفصل"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => updateClassStatus(cls.id, cls.status === 'hidden' ? 'public' : 'hidden')}
                      className={`p-2 rounded-xl transition-colors ${cls.status === 'hidden' ? 'bg-emerald-500 text-white' : 'bg-white/20 backdrop-blur-md text-white hover:bg-amber-500'}`}
                      title={cls.status === 'hidden' ? 'إظهار الفصل' : 'إخفاء الفصل'}
                    >
                      {cls.status === 'hidden' ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                </div>
              </div>

              <div className="p-6 pt-0 -mt-8 relative z-10 flex-1 flex flex-col">
                <div className="flex justify-between items-end mb-4">
                  <div 
                    className={`p-4 rounded-2xl cursor-pointer shadow-xl transition-all hover:scale-110 ${
                      cls.level === 'primary' ? 'bg-white text-emerald-600' : 'bg-white text-blue-600'
                    }`}
                    onClick={() => navigate(`/admin/class/${cls.id}`)}
                  >
                    <GraduationCap size={28} />
                  </div>
                  <div className="flex gap-1 pb-2">
                    <button 
                      onClick={() => {setSelectedClass(cls); setIsDeleteModalOpen(true);}}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

              <div className="space-y-4 flex-1">
                <div className="cursor-pointer" onClick={() => navigate(`/admin/class/${cls.id}`)}>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">{cls.name}</h4>
                    {cls.status === 'hidden' && <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded text-[8px] font-black uppercase">مخفي</span>}
                    {cls.status === 'teachers_only' && <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded text-[8px] font-black uppercase">للمعلمين</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md">
                      {cls.level === 'primary' ? 'الابتدائية' : 'المتوسطة'}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md">
                      الصف {cls.grade}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-50">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-slate-50 rounded-lg text-slate-400"><Users size={14} /></div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold leading-none">الطلاب</p>
                      <p className="text-sm font-black text-slate-700">{cls.students?.length || 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-slate-50 rounded-lg text-slate-400"><BookOpen size={14} /></div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold leading-none">المواد</p>
                      <p className="text-sm font-black text-slate-700">{cls.subjects?.length || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-4">
                  <button 
                    onClick={() => navigate(`/admin/class/${cls.id}`)}
                    className="py-3 bg-slate-50 text-slate-600 font-black text-[10px] rounded-xl hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <BookOpen size={14} /> إدارة المحتوى
                  </button>
                  <button 
                    onClick={() => navigate(`/admin/slider?classId=${cls.id}`)}
                    className="py-3 bg-slate-50 text-amber-600 font-black text-[10px] rounded-xl hover:bg-amber-600 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <ImageIcon size={14} /> إدارة السلايدر
                  </button>
                </div>
              </div>
            </div>
          </div>
          ))}
        </div>
      ) : (
        /* List View remains similar but with added status icons */
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
                    <table className="w-full text-right min-w-[800px]">
                      <thead className="bg-slate-50 border-b border-slate-200">              <tr>
                <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">اسم الفصل</th>
                <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">المرحلة</th>
                <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">الصف</th>
                <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-center">الحالة</th>
                <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-center">الطلاب</th>
                <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">التحكم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClasses.map((cls) => (
                <tr key={cls.id} className="hover:bg-blue-50/20 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <GraduationCap size={20} />
                      </div>
                      <span className="font-black text-slate-900">{cls.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 font-bold text-slate-500">
                    {cls.level === 'primary' ? 'ابتدائي' : 'متوسط'}
                  </td>
                  <td className="px-8 py-5 font-bold text-slate-500">
                    الصف {cls.grade}
                  </td>
                  <td className="px-8 py-5 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black ${
                      cls.status === 'public' ? 'bg-green-50 text-green-600' : cls.status === 'hidden' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {cls.status === 'public' ? 'ظاهر' : cls.status === 'hidden' ? 'مخفي' : 'للمعلمين'}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-center font-black text-slate-700">{cls.students?.length || 0}</td>
                  <td className="px-8 py-5">
                    <div className="flex gap-2">
                      <button onClick={() => navigate(`/admin/class/${cls.id}`)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="إدارة الفصل"><Edit size={18} /></button>
                      <button onClick={() => {setSelectedClass(cls); setIsDeleteModalOpen(true);}} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="حذف الفصل"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="تعديل بيانات الفصل">
        <form onSubmit={handleUpdateClass} className="space-y-6">
           <div className="space-y-2">
              <label className="text-sm font-black text-slate-700">اسم الفصل الدراسي</label>
              <input type="text" required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={editClass.name} onChange={e => setEditClass({...editClass, name: e.target.value})} />
           </div>
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700">الصف الدراسي</label>
                <input type="text" required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={editClass.grade} onChange={e => setEditClass({...editClass, grade: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700">المرحلة</label>
                <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={editClass.level} onChange={e => setEditClass({...editClass, level: e.target.value as any})}>
                  <option value="primary">الابتدائية</option>
                  <option value="middle">المتوسطة</option>
                  <option value="high">الثانوية</option>
                </select>
              </div>
           </div>
           <div className="space-y-2">
              <label className="text-sm font-black text-slate-700">حالة الظهور</label>
              <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={editClass.status} onChange={e => setEditClass({...editClass, status: e.target.value as any})}>
                <option value="public">ظاهر للجميع (عام)</option>
                <option value="teachers_only">للمعلمين فقط</option>
                <option value="coming_soon">قريباً</option>
                <option value="admin_only">للإدارة فقط</option>
                <option value="hidden">مخفي تماماً</option>
              </select>
           </div>
           <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-100 flex items-center justify-center gap-2">
             <Save size={20} /> حفظ التعديلات
           </button>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="حذف الفصل الدراسي">
        {selectedClass && (
          <div className="space-y-6 text-center">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle size={40} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">حذف فصل "{selectedClass.name}"؟</h3>
              <p className="text-slate-500 font-bold mt-2">
                سيؤدي هذا الإجراء إلى إزالة الفصل بالكامل من النظام. يرجى التأكد من عدم وجود طلاب مرتبطين به قبل الحذف.
              </p>
            </div>
            <div className="flex gap-3 pt-4">
              <button onClick={() => deleteClass(selectedClass.id)} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-100 hover:bg-red-700 transition-all">تأكيد الحذف</button>
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-all">إلغاء</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ClassesManagement;