import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Search, 
  Plus, 
  FileText, 
  Download, 
  MoreVertical,
  Loader2, 
  Trash2, 
  Layout, 
  FileVideo, 
  FileImage, 
  FileAudio, 
  Paperclip, 
  File, 
  UploadCloud, 
  CheckCircle2,
  Edit,
  Eye,
  EyeOff,
  Users,
  ShieldCheck,
  Save
} from 'lucide-react';
import { db } from '../../services/firebase';
import { SYS, EDU, COMM } from '../../constants/dbPaths';
import { TelegramService } from '../../services/telegram.service';
import { ref, onValue, push, set, remove, update } from 'firebase/database';
import { useAuth } from '../../context/AuthContext';
import { logActivity } from '../../utils/activityLogger';
import Modal from '../../components/common/Modal';
import type { CurriculumItem, Class as ClassType, DocumentType } from '../../types';

interface ExtendedCurriculumItem extends CurriculumItem {
  status?: 'public' | 'hidden' | 'teachers_only';
}

const AcademicCurriculum: React.FC = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const isTeacher = profile?.role === 'teacher';
  const isStudent = profile?.role === 'student';
  const isParent = profile?.role === 'parent';
  
  const [curricula, setCurricula] = useState<ExtendedCurriculumItem[]>([]);
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [globalSubjects, setGlobalSubjects] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ExtendedCurriculumItem | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<'primary' | 'middle' | 'high' | ''>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [newItem, setNewItem] = useState({
    title: '',
    classId: '',
    subject: '',
    description: '',
    type: 'pdf' as DocumentType,
    status: 'public' as 'public' | 'hidden' | 'teachers_only'
  });

  const filteredClassesForAdd = classes.filter(c => {
    const matchesLevel = !selectedLevel || c.level === selectedLevel;
    if (isAdmin) return matchesLevel;
    if (isTeacher) {
      const isAssignedToClass = (c as any).teacherId === profile?.uid;
      const isAssignedToSubject = c.subjects?.some(s => s.teacherId === profile?.uid);
      return matchesLevel && (isAssignedToClass || isAssignedToSubject);
    }
    return false;
  });

  const getDocIcon = (type: DocumentType) => {
    switch (type) {
      case 'video': return <FileVideo size={28} />;
      case 'image': return <FileImage size={28} />;
      case 'audio': return <FileAudio size={28} />;
      case 'attachment': return <Paperclip size={28} />;
      case 'pdf': return <FileText size={28} />;
      default: return <File size={28} />;
    }
  };

  const getDocBadge = (type: DocumentType) => {
    const labels: Record<DocumentType, string> = {
      pdf: 'مستند PDF',
      video: 'مقطع فيديو',
      image: 'صورة توضيحية',
      audio: 'ملف صوتي',
      attachment: 'مرفقات أخرى'
    };
    return labels[type] || 'ملف';
  };

  useEffect(() => {
    const curriculumRef = ref(db, 'edu/curricula');
    const unsubCurricula = onValue(curriculumRef, (snapshot) => {
      if (snapshot.exists()) {
        setCurricula(Object.values(snapshot.val()));
      } else {
        setCurricula([]);
      }
      setLoading(false);
    });

    const classesRef = ref(db, 'edu/sch/classes');
    const unsubClasses = onValue(classesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const allClasses: ClassType[] = [];
        Object.keys(data).forEach(level => {
          Object.keys(data[level]).forEach(grade => {
             allClasses.push({ ...data[level][grade], level, grade });
          });
        });
        setClasses(allClasses);
      } else {
        setClasses([]);
      }
    });

    const gsRef = ref(db, 'edu/courses');
    const unsubGS = onValue(gsRef, (snapshot) => {
      if (snapshot.exists()) setGlobalSubjects(Object.values(snapshot.val()));
      else setGlobalSubjects([]);
    });

    if (isParent) {
      const usersRef = ref(db, 'sys/users');
      onValue(usersRef, (snapshot) => {
        if (snapshot.exists()) {
          const allUsers = Object.values(snapshot.val());
          const foundChildren = allUsers.filter((u: any) => 
            u.uid === profile?.studentLink || u.parentUid === profile?.uid || u.parentEmail === profile?.email
          );
          setChildren(foundChildren);
          if (foundChildren.length > 0) setSelectedChild(foundChildren[0]);
        }
      });
    }

    return () => {
      unsubCurricula();
      unsubClasses();
    };
  }, [profile, isParent]);

  const handleSaveCurriculum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid || !newItem.classId) {
      alert('يرجى إكمال كافة البيانات');
      return;
    }

    if (!editingItem && !selectedFile) {
      alert('يرجى اختيار ملف للرفع');
      return;
    }

    const selectedClass = classes.find(c => c.id === newItem.classId);
    if (!selectedClass) return;

    setIsUploading(true);
    try {
      let fileLink = editingItem?.fileLink || '';
      
      if (selectedFile) {
        const res = await TelegramService.uploadFile(selectedFile, 'curricula', selectedClass.id);
        if (!res.success || !res.url) throw new Error(res.error || "فشل رفع الملف");
        fileLink = res.url;
      }

      if (editingItem) {
        const curriculumRef = ref(db, `edu/curricula/${editingItem.id}`);
        await update(curriculumRef, {
          title: newItem.title,
          classId: selectedClass.id,
          level: selectedClass.level,
          grade: selectedClass.grade,
          subject: newItem.subject,
          fileLink,
          type: newItem.type,
          description: newItem.description,
          status: newItem.status
        });
      } else {
        const curriculumRef = push(ref(db, 'edu/curricula'));
        const item: ExtendedCurriculumItem = {
          id: curriculumRef.key as string,
          title: newItem.title,
          classId: selectedClass.id,
          level: selectedClass.level,
          grade: selectedClass.grade,
          subject: newItem.subject,
          fileLink,
          type: newItem.type,
          description: newItem.description,
          uploadedBy: profile.fullName || profile.firstName || 'Unknown',
          createdAt: new Date().toISOString(),
          status: newItem.status
        };
        await set(curriculumRef, item);
      }

      setIsAddModalOpen(false);
      setEditingItem(null);
      setSelectedFile(null);
      setNewItem({ title: '', classId: '', subject: '', description: '', type: 'pdf', status: 'public' });
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setIsUploading(false);
    }
  };

  const deleteCurriculum = async (id: string) => {
    if (!isAdmin) return;
    if (window.confirm('هل أنت متأكد من حذف هذا المنهج؟')) {
      await remove(ref(db, `edu/curricula/${id}`));
    }
  };

  const filteredData = curricula.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         item.subject.toLowerCase().includes(searchQuery.toLowerCase());
    
    const visibility = item.status || 'public';
    if (visibility === 'hidden' && !isAdmin && !isTeacher) return false;
    if (visibility === 'teachers_only' && !isAdmin && !isTeacher) return false;

    if (isStudent) return matchesSearch && item.classId === profile?.classId;
    if (isParent && selectedChild) return matchesSearch && item.classId === selectedChild.classId;

    const matchesLevel = filterLevel === 'all' || item.level === filterLevel;
    return matchesSearch && matchesLevel;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="animate-spin text-blue-600 w-12 h-12" />
        <p className="text-slate-500 font-bold animate-pulse">جاري جلب المناهج الدراسية...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <BookOpen className="text-blue-600" size={32} />
            {isStudent ? 'مكتبة فصلي الدراسية' : isParent ? 'مناهج الأبناء الدراسية' : 'المكتبة الأكاديمية والمناهج'}
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            {isStudent ? 'جميع المناهج والمقررات الخاصة بفصلك في مكان واحد' : isParent ? 'استعرض المناهج والمواد التعليمية المقررة لأبنائك' : 'مركز الموارد التعليمية الموحد للمعلمين والمشرفين'}
          </p>
        </div>

        {(isAdmin || isTeacher) && (
          <button 
            onClick={() => {
              setEditingItem(null);
              setNewItem({ title: '', classId: '', subject: '', description: '', type: 'pdf', status: 'public' });
              setIsAddModalOpen(true);
            }}
            className="btn-premium btn-primary flex items-center gap-2 shadow-xl shadow-blue-100 px-8 py-4"
          >
            <Plus size={20} />
            <span>إضافة منهج جديد</span>
          </button>
        )}
      </div>

      {/* Control Bar */}
      {!(isStudent || isParent) && (
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="البحث في العناوين أو المواد..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-12 pl-4 py-3.5 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-bold text-slate-900"
            />
          </div>
          <div className="flex gap-2 w-full lg:w-auto">
            <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100">
              {['all', 'primary', 'middle', 'high'].map(l => (
                <button
                  key={l}
                  onClick={() => setFilterLevel(l)}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${filterLevel === l ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {l === 'all' ? 'الكل' : l === 'primary' ? 'ابتدائي' : l === 'middle' ? 'متوسط' : 'ثانوي'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredData.map((item) => (
          <div key={item.id} className="bg-white rounded-[2.5rem] p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all group relative overflow-hidden flex flex-col h-full">
            <div className={`absolute top-0 right-0 w-2 h-full ${item.level === 'primary' ? 'bg-emerald-400' : item.level === 'middle' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
            
            <div className="flex justify-between items-start mb-6">
              <div className="p-4 bg-slate-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                {getDocIcon(item.type)}
              </div>
              <div className="flex items-center gap-1">
                {(isAdmin || (isTeacher && profile?.uid === (item as any).uploadedByUid)) && (
                  <>
                    <button 
                      onClick={() => {
                        setEditingItem(item);
                        setNewItem({ ...item, status: item.status || 'public' });
                        setSelectedLevel(item.level as any);
                        setIsAddModalOpen(true);
                      }}
                      className="p-2 text-slate-300 hover:text-blue-500 transition-colors"
                    >
                      <Edit size={18} />
                    </button>
                    {isAdmin && (
                      <button onClick={() => deleteCurriculum(item.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </>
                )}
                <div className="p-2">
                  {item.status === 'hidden' ? <EyeOff size={16} className="text-red-400" /> : item.status === 'teachers_only' ? <Users size={16} className="text-amber-400" /> : null}
                </div>
              </div>
            </div>

            <div className="space-y-4 flex-1 flex flex-col">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${item.level === 'primary' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>{item.level}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md">الصف {item.grade}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-purple-50 text-purple-600 rounded-md">{getDocBadge(item.type)}</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">{item.title}</h3>
                <p className="text-slate-500 font-bold text-sm mt-1">مادة: {item.subject}</p>
                {item.description && <p className="text-slate-400 text-xs mt-3 line-clamp-2">{item.description}</p>}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-auto">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-black text-slate-400">{item.uploadedBy.charAt(0)}</div>
                  <span className="text-xs font-bold text-slate-400">بواسطة {item.uploadedBy}</span>
                </div>
                <a href={item.fileLink} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"><Download size={18} /></a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={editingItem ? 'تعديل المنهج' : 'إضافة منهج جديد'}>
        <form onSubmit={handleSaveCurriculum} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">عنوان المنهج</label>
            <input type="text" required className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">المرحلة</label>
              <select className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={selectedLevel} onChange={e => setSelectedLevel(e.target.value as any)}>
                <option value="">اختر المرحلة</option>
                <option value="primary">ابتدائي</option>
                <option value="middle">متوسط</option>
                <option value="high">ثانوي</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">الفصل</label>
              <select required className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={newItem.classId} onChange={e => setNewItem({...newItem, classId: e.target.value})}>
                <option value="">اختر الفصل</option>
                {filteredClassesForAdd.map(c => <option key={c.id} value={c.id}>{c.name} - {c.grade}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">المادة</label>
              <select 
                required 
                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" 
                value={newItem.subject} 
                onChange={e => setNewItem({...newItem, subject: e.target.value})}
              >
                <option value="">اختر المادة</option>
                {newItem.classId && (() => {
                  const selectedClass = classes.find(c => c.id === newItem.classId);
                  const classSubjects = selectedClass?.subjects || [];
                  const relevantGlobal = globalSubjects.filter(gs => gs.level === selectedClass?.level);
                  
                  // If teacher, filter by their assigned subjects
                  const teacherSubjects = isTeacher 
                    ? classSubjects.filter(s => s.teacherId === profile?.uid)
                    : classSubjects;

                  return (
                    <>
                      <optgroup label="مواد الفصل الدراسي">
                        {teacherSubjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </optgroup>
                      <optgroup label="المواد المعتمدة العامة">
                        {relevantGlobal.map(gs => <option key={gs.id} value={gs.name}>{gs.name}</option>)}
                      </optgroup>
                    </>
                  );
                })()}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">الخصوصية</label>
              <select className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={newItem.status} onChange={e => setNewItem({...newItem, status: e.target.value as any})}>
                <option value="public">عام (للجميع)</option>
                <option value="teachers_only">للمعلمين فقط</option>
                <option value="hidden">مخفي (للإدارة)</option>
              </select>
            </div>
          </div>

          {!editingItem && (
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">رفع الملف</label>
              <input type="file" required id="cur-file" className="hidden" onChange={e => e.target.files?.[0] && setSelectedFile(e.target.files[0])} />
              <label htmlFor="cur-file" className={`flex flex-col items-center justify-center w-full py-8 border-2 border-dashed rounded-[2rem] cursor-pointer ${selectedFile ? 'border-green-400 bg-green-50' : 'bg-slate-50'}`}>
                {selectedFile ? <span className="font-black text-green-700">{selectedFile.name}</span> : <UploadCloud size={32} className="text-blue-600" />}
              </label>
            </div>
          )}

          <button type="submit" disabled={isUploading} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black flex items-center justify-center gap-2">
            {isUploading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
            {editingItem ? 'حفظ التعديلات' : 'تأكيد الإضافة'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default AcademicCurriculum;