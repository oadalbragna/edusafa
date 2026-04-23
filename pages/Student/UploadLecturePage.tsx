import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowRight, UploadCloud, Video, FileText, Check,
  Loader2, X, ShieldCheck, AlertCircle, Info, Target,
  Layers, Hash, Calendar, Plus, Trash2, Link as LinkIcon,
  Image as ImageIcon, Headphones, AlignRight, ClipboardList,
  CheckCircle2
} from 'lucide-react';
import { ref, push, set, serverTimestamp, onValue, remove } from 'firebase/database';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/ToastProvider';
import { ImageProcessingService, FileCategory } from '../../services/api/ImageProcessingService';
import { Button, Input, Card, Badge, Modal } from '../../components/ui';
import { motion, AnimatePresence } from 'framer-motion';
// TODO: Create these services/components if they don't exist
// import { UnifiedUploadService } from '../../services/api/UnifiedUploadService';
// import { useUpload } from '../../context/UploadContext';
// import { useDashboardFilter } from '../../context/DashboardFilterContext';

interface Block {
    id: string;
    type: 'text' | 'image' | 'video' | 'audio' | 'pdf' | 'link';
    content?: string;
    url?: string;
    title?: string;
    fileId?: string;
}

interface UploadLecturePageProps {
  onBack: () => void;
  userData?: any;
  initialData?: any; 
  uploadContext?: {
      course_id: string;
      subject_name: string;
      schoolId?: string;
      stageId?: string;
      gradeId?: string;
      classId?: string;
      year?: string;
  };
}

const UploadLecturePage: React.FC<UploadLecturePageProps> = ({ onBack, userData, uploadContext, initialData }) => {
  const { startUpload, setProgress } = useUpload();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  // Removed local upload state in favor of UploadContext

  // Core Metadata
  const [lectureData, setLectureData] = useState({
      title: initialData?.title || '',
      lectureNumber: initialData?.lectureNumber || '',
      unit: initialData?.unit || '',
      description: initialData?.description || '',
      publishDate: initialData?.publishDate || new Date().toISOString().split('T')[0],
      assignmentId: initialData?.assignmentId || ''
  });

  // Content States
  const [objectives, setObjectives] = useState<string[]>(initialData?.objectives || ['']);
  const [blocks, setBlocks] = useState<Block[]>(initialData?.blocks || []);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [existingLectures, setExistingLectures] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);

  // UI Tabs for Management
  const [activeView, setActiveView] = useState<'upload' | 'manage' | 'supervision'>('upload');
  const [isAddingSupervisor, setIsAddingSupervisor] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [permLevel, setPermLevel] = useState('edit'); 
  const [internalEditingId, setInternalEditingId] = useState<string | null>(null);

  const isEdit = !!initialData || !!internalEditingId;

  const resetForm = () => {
      setLectureData({
          title: '',
          lectureNumber: '',
          unit: '',
          description: '',
          publishDate: new Date().toISOString().split('T')[0],
          assignmentId: ''
      });
      setObjectives(['']);
      setBlocks([]);
      setInternalEditingId(null);
      addToast('تم تصفير النموذج لرفع درس جديد', 'info');
  };

  useEffect(() => {
    const courseId = uploadContext?.course_id || initialData?.course_id;
    if (courseId) {
        const univ = uploadContext?.university_id || initialData?.university_id;
        const coll = uploadContext?.college_id || initialData?.college_id;
        const dept = uploadContext?.department_id || initialData?.department_id;
        const batch = uploadContext?.batch_id || initialData?.batch_id;
        const sem = uploadContext?.semester_id || initialData?.semester_id;

        const basePath = (univ && coll && dept && batch && sem) 
          ? `edu/hub/${univ}/${coll}/${dept}/batches/${batch}/semesters/${sem}/courses/${courseId}`
          : `edu/${courseId}`; 

        const assignmentsPath = (univ && coll && dept && batch && sem) 
            ? `edu/hub/${univ}/${coll}/${dept}/batches/${batch}/semesters/${sem}/courses/${courseId}/assignments`
            : `edu/assignments/${courseId}`;

        onValue(ref(db, assignmentsPath), snap => {
            if (snap.exists()) setAssignments(Object.values(snap.val()));
        });

        onValue(ref(db, `${basePath}/lectures`), snap => {
            if (snap.exists()) {
                const list = Object.entries(snap.val()).map(([id, v]: any) => ({ id, ...v }));
                setExistingLectures(list.sort((a,b) => b.timestamp - a.timestamp));
            } else {
                setExistingLectures([]);
            }
        });

        onValue(ref(db, `edu/course_supervisions/${courseId}`), snap => {
            if (snap.exists()) setSupervisors(Object.values(snap.val()));
            else setSupervisors([]);
        });
    }

    onValue(ref(db, 'sys/users/teachers'), snap => {
        if (snap.exists()) setDoctors(Object.values(snap.val()));
    });
  }, [uploadContext, initialData]);

  const handleEditInternal = (lec: any) => {
      setLectureData({
          title: lec.title || '',
          lectureNumber: lec.lectureNumber || '',
          unit: lec.unit || '',
          description: lec.description || '',
          publishDate: lec.publishDate || new Date().toISOString().split('T')[0],
          assignmentId: lec.assignmentId || ''
      });
      setObjectives(lec.objectives || ['']);
      setBlocks(lec.blocks || []);
      setInternalEditingId(lec.id);
      setActiveView('upload');
      addToast('تم تحميل بيانات المحاضرة للتعديل', 'info');
  };

  const handleEditSupervision = (sup: any) => {
      setSelectedDoctor(sup.doctorId);
      setPermLevel(sup.permLevel || 'edit');
      setIsAddingSupervisor(true);
  };

  const handleAddObjective = () => setObjectives([...objectives, '']);
  const handleRemoveObjective = (index: number) => setObjectives(objectives.filter((_, i) => i !== index));
  const handleObjectiveChange = (index: number, val: string) => {
      const newObjs = [...objectives];
      newObjs[index] = val;
      setObjectives(newObjs);
  };

  const handleAddBlock = (type: Block['type']) => {
      setBlocks([...blocks, { id: Math.random().toString(36).substr(2, 9), type, content: '', url: '', title: '' }]);
  };

  const handleRemoveBlock = (id: string) => setBlocks(blocks.filter(b => b.id !== id));

  const handleFileUpload = (index: number, type: 'image' | 'video' | 'audio' | 'pdf') => {
      startUpload(
          UnifiedUploadService.upload({ 
              type,
              token: `lec_${Math.random().toString(36).substr(2, 9)}`,
              onProgress: (p) => setProgress(p)
          }),
          {
              onComplete: (result) => {
                  const newBlocks = [...blocks];
                  newBlocks[index].url = result.url;
                  newBlocks[index].title = result.fileName;
                  newBlocks[index].fileId = result.fileId;
                  setBlocks(newBlocks);
                  
                  UnifiedUploadService.clearCache();
                  addToast('تم رفع ومعالجة الملف بنجاح ✅', 'success');
              }
          }
      );
  };

  const handleAddSupervisor = async () => {
    const courseId = uploadContext?.course_id || initialData?.course_id;
    if (!selectedDoctor || !courseId) return;

    const doc = doctors.find(d => d.uid === selectedDoctor);
    const perms = permLevel === 'full' ? ['publish', 'edit', 'delete'] :
                  permLevel === 'edit' ? ['publish', 'edit'] :
                  permLevel === 'add_only' ? ['publish'] : ['view'];

    await set(ref(db, `edu/course_supervisions/${courseId}/${selectedDoctor}`), {
        doctorId: selectedDoctor,
        doctorName: doc?.name,
        permissions: perms,
        permLevel,
        courseId,
        assignedBy: userData?.name || 'Admin',
        assignedAt: Date.now()
    });
    addToast('تمت إضافة/تحديث المشرف بنجاح ✅', 'success');
    setIsAddingSupervisor(false);
    setSelectedDoctor('');
    setPermLevel('edit');
  };

  const handleRemoveLecture = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه المحاضرة نهائياً؟")) return;
    const courseId = uploadContext?.course_id || initialData?.course_id;
    const univ = uploadContext?.university_id || initialData?.university_id;
    const coll = uploadContext?.college_id || initialData?.college_id;
    const dept = uploadContext?.department_id || initialData?.department_id;
    const batch = uploadContext?.batch_id || initialData?.batch_id;
    const sem = uploadContext?.semester_id || initialData?.semester_id;

    const path = (univ && coll && dept && batch && sem)
        ? `edu/hub/${univ}/${coll}/${dept}/batches/${batch}/semesters/${sem}/courses/${courseId}/lectures/${id}`
        : `edu/lectures/${courseId}/${id}`;

    await remove(ref(db, path));
    addToast('تم حذف المحاضرة بنجاح 🗑️', 'info');
  };

  const { 
    filter, setFilter, resetFilter, isFilterActive, approvedPaths,
    isSelectorOpen, setIsSelectorOpen 
  } = useDashboardFilter();

  const handleFinalPublish = async () => {
    const univ = uploadContext?.university_id || filter?.university_id;
    const dept = uploadContext?.department_id || filter?.department_id;

    if (!univ || !dept) {
        setIsSelectorOpen(true);
        return addToast("يرجى إكمال مسار المادة (الجامعة والقسم) عبر لوحة الفلترة التي فُتحت الآن أولاً", 'warning');
    }
    
    if (!lectureData.title || !lectureData.lectureNumber) return addToast("يرجى إكمال البيانات الأساسية للدرس (العنوان ورقم الدرس)", 'warning');
    
    setLoading(true);
    try {
        const courseId = uploadContext?.course_id || initialData?.course_id || 'general';
        const coll = uploadContext?.college_id || filter?.college_id;
        const batch = uploadContext?.batch_id || filter?.batch_id;
        const sem = uploadContext?.semester_id || filter?.semester_id;

        const baseLecturesPath = (univ && coll && dept && batch && sem)
            ? `edu/hub/${univ}/${coll}/${dept}/batches/${batch}/semesters/${sem}/courses/${courseId}/lectures`
            : `edu/lectures/${courseId}`;

        const lectureId = internalEditingId || (isEdit ? initialData.id : push(ref(db, baseLecturesPath)).key);
        const lectureRef = ref(db, `${baseLecturesPath}/${lectureId}`);
        
        await set(lectureRef, {
            ...initialData,
            ...lectureData,
            id: lectureId,
            objectives: objectives.filter(o => o.trim() !== ''),
            blocks: blocks,
            course_id: courseId,
            university_id: univ,
            college_id: coll,
            department_id: dept,
            batch_id: batch,
            semester_id: sem,
            timestamp: initialData?.timestamp || serverTimestamp(),
            instructor_id: initialData?.instructor_id || userData?.uid || 'system',
            last_edited_at: serverTimestamp()
        });

        addToast(isEdit ? "تم تحديث الدرس بنجاح ✨" : "تم نشر المحتوى التعليمي بنجاح ✨", 'success');
        if (internalEditingId) {
            setInternalEditingId(null);
            setActiveView('manage');
        } else {
            onBack();
        }
    } catch (e: any) {
        addToast(e.message || "حدث خطأ أثناء الرفع، يرجى المحاولة لاحقاً", 'error');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-gray-950 flex flex-col pb-32" dir="rtl">
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-6 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-5">
                <Button variant="secondary" onClick={onBack} className="p-3 rounded-2xl"><ArrowRight className="w-5 h-5" /></Button>
                <div>
                    <h1 className="text-xl font-black text-gray-800 dark:text-white tracking-tight">استوديو التحكم بالمادة</h1>
                    <p className="text-[10px] text-primary font-black uppercase tracking-widest mt-1">المادة: {uploadContext?.subject_name || initialData?.subject_name || 'عام'}</p>
                </div>
            </div>
            
            <div className="flex bg-gray-50 dark:bg-gray-800 p-1.5 rounded-2xl shadow-inner gap-1">
                <button 
                    onClick={() => {
                        if (isEdit) resetForm();
                        setActiveView('upload');
                    }} 
                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${activeView === 'upload' ? 'bg-primary text-white' : 'text-gray-400'}`}
                >
                    {isEdit ? 'إنهاء التعديل / جديد' : 'رفع جديد'}
                </button>
                <button onClick={() => setActiveView('manage')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${activeView === 'manage' ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}>إدارة المحاضرات ({existingLectures.length})</button>
                {userData?.role === 'admin' && (
                    <button onClick={() => setActiveView('supervision')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${activeView === 'supervision' ? 'bg-emerald-600 text-white' : 'text-gray-400'}`}>الإشراف</button>
                )}
            </div>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-5xl mx-auto w-full py-10 space-y-10">
        {activeView === 'upload' && (
          <div className="space-y-10 animate-fade-in">
            <section className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center"><Info className="w-5 h-5" /></div>
                    <h2 className="text-xl font-black text-gray-800 dark:text-white italic">البيانات الأساسية للدرس</h2>
                </div>
                <Card className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 border-none shadow-xl">
                    <Input label="عنوان الدرس" value={lectureData.title} onChange={e => setLectureData({...lectureData, title: e.target.value})} placeholder="مثال: مصفوفات البيانات المتقدمة" icon={<AlignRight className="w-5 h-5" />} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="رقم الدرس" type="number" value={lectureData.lectureNumber} onChange={e => setLectureData({...lectureData, lectureNumber: e.target.value})} placeholder="1" icon={<Hash className="w-5 h-5" />} />
                        <Input label="اسم الوحدة" value={lectureData.unit} onChange={e => setLectureData({...lectureData, unit: e.target.value})} placeholder="الوحدة الأولى" icon={<Layers className="w-5 h-5" />} />
                    </div>
                    <Input label="تاريخ النشر" type="date" value={lectureData.publishDate} onChange={e => setLectureData({...lectureData, publishDate: e.target.value})} icon={<Calendar className="w-5 h-5" />} />
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-gray-400 uppercase mr-1">ارتباط بواجب (اختياري)</label>
                        <select 
                            className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-bold text-sm"
                            value={lectureData.assignmentId}
                            onChange={e => setLectureData({...lectureData, assignmentId: e.target.value})}
                        >
                            <option value="">لا يوجد واجب مرتبط</option>
                            {assignments.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-[11px] font-black text-gray-400 uppercase mr-1">وصف موجز</label>
                        <textarea value={lectureData.description} onChange={e => setLectureData({...lectureData, description: e.target.value})} className="w-full p-5 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-medium text-xs h-24 dark:text-white" placeholder="اكتب ملخصاً بسيطاً عما سيتم شرحه في هذا الدرس..." />
                    </div>
                </Card>
            </section>

            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center"><Target className="w-5 h-5" /></div>
                        <h2 className="text-xl font-black text-gray-800 dark:text-white italic">أهداف الدرس</h2>
                    </div>
                    <Button variant="secondary" onClick={handleAddObjective} className="text-[10px] font-black uppercase"><Plus className="w-4 h-4 ml-1" /> إضافة هدف</Button>
                </div>
                <Card className="p-8 space-y-4 border-none shadow-xl">
                    {objectives.map((obj, i) => (
                        <div key={i} className="flex gap-3">
                            <Input value={obj} onChange={e => handleObjectiveChange(i, e.target.value)} placeholder={`الهدف رقم ${i+1}...`} className="flex-1" />
                            {objectives.length > 1 && (
                                <button onClick={() => handleRemoveObjective(i)} className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all"><X className="w-5 h-5" /></button>
                            )}
                        </div>
                    ))}
                </Card>
            </section>

            <section className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-indigo-500/10 text-indigo-500 rounded-xl flex items-center justify-center"><Layers className="w-5 h-5" /></div>
                    <h2 className="text-xl font-black text-gray-800 dark:text-white italic">محتوى الدرس (Blocks)</h2>
                </div>
                <div className="space-y-6">
                    <AnimatePresence>
                        {blocks.map((block, index) => (
                            <motion.div key={block.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                                <Card className="p-6 relative border-r-4 border-primary">
                                    <button onClick={() => handleRemoveBlock(block.id)} className="absolute top-4 left-4 text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                            {block.type === 'text' && <AlignRight className="w-4 h-4" />}
                                            {block.type === 'video' && <Video className="w-4 h-4" />}
                                            {block.type === 'image' && <ImageIcon className="w-4 h-4" />}
                                            {block.type === 'audio' && <Headphones className="w-4 h-4" />}
                                            {block.type === 'pdf' && <FileText className="w-4 h-4" />}
                                            {block.type === 'link' && <LinkIcon className="w-4 h-4" />}
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">مكون {block.type}</span>
                                    </div>
                                    {block.type === 'text' && <textarea value={block.content} onChange={e => { const b = [...blocks]; b[index].content = e.target.value; setBlocks(b); }} className="w-full p-4 bg-gray-50 rounded-xl outline-none font-medium text-xs h-32" placeholder="اكتب الشرح هنا..." />}
                                    {['video', 'audio', 'pdf', 'image'].includes(block.type) && (
                                        <div className="space-y-4">
                                            <Input label="عنوان الملف" value={block.title} onChange={e => { const b = [...blocks]; b[index].title = e.target.value; setBlocks(b); }} placeholder="عنوان توضيحي..." />
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {!block.url ? (
                                                    <button 
                                                        onClick={() => handleFileUpload(index, block.type as any)}
                                                        disabled={false}
                                                        className="h-32 border-2 border-dashed border-primary/20 rounded-2xl flex flex-col items-center justify-center hover:bg-primary/5 transition-all cursor-pointer group"
                                                    >
                                                        <div className="flex flex-col items-center gap-2 text-primary group-hover:scale-110 transition-transform">
                                                            <UploadCloud className="w-8 h-8" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest">رفع ملف (حتى 50GB)</span>
                                                        </div>
                                                    </button>
                                                ) : (
                                                    <div className="h-32 p-6 bg-emerald-500/10 border-2 border-emerald-500/20 rounded-2xl flex flex-col items-center justify-center gap-2">
                                                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                                        <span className="text-[10px] font-black text-emerald-600 uppercase">تم الرفع بنجاح</span>
                                                    </div>
                                                )}

                                                <div className="h-32 p-6 bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <LinkIcon className="w-4 h-4 text-indigo-500" />
                                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">أو وضع رابط خارجي (للملفات الضخمة)</span>
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        placeholder="https://t.me/lecture_link..." 
                                                        value={block.url || ''} 
                                                        onChange={e => { const b = [...blocks]; b[index].url = e.target.value; setBlocks(b); }}
                                                        className="w-full p-3 bg-white dark:bg-gray-900 rounded-xl text-[10px] font-bold border border-gray-100 dark:border-gray-700 outline-none focus:border-indigo-500 transition-all"
                                                    />
                                                </div>
                                            </div>

                                            {block.url && (
                                                <div className="p-4 bg-indigo-500/5 backdrop-blur-xl rounded-xl flex items-center justify-between border border-indigo-500/10">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                                                            <Target className="w-4 h-4 text-indigo-500" />
                                                        </div>
                                                        <span className="text-[10px] font-bold text-indigo-600 truncate max-w-[400px]">{block.url}</span>
                                                    </div>
                                                    <button onClick={() => { const b = [...blocks]; b[index].url = ''; setBlocks(b); }} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"><X className="w-4 h-4" /></button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {block.type === 'link' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Input label="عنوان الرابط" value={block.title} onChange={e => { const b = [...blocks]; b[index].title = e.target.value; setBlocks(b); }} placeholder="مثال: مرجع خارجي" />
                                            <Input label="رابط URL" value={block.url} onChange={e => { const b = [...blocks]; b[index].url = e.target.value; setBlocks(b); }} placeholder="https://..." icon={<LinkIcon className="w-4 h-4" />} />
                                        </div>
                                    )}
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    <div className="flex flex-wrap gap-3 bg-white dark:bg-gray-900 p-6 rounded-[2rem] border-2 border-dashed border-gray-100 dark:border-gray-800">
                        {['text', 'video', 'audio', 'pdf', 'image', 'link'].map(type => (
                            <button key={type} onClick={() => handleAddBlock(type as any)} className="flex-1 min-w-[100px] py-4 bg-gray-50 dark:bg-gray-800 rounded-xl flex flex-col items-center gap-2 hover:bg-primary hover:text-white transition-all text-gray-400">
                                {type === 'text' && <AlignRight className="w-5 h-5" />}
                                {type === 'video' && <Video className="w-5 h-5" />}
                                {type === 'audio' && <Headphones className="w-5 h-5" />}
                                {type === 'pdf' && <FileText className="w-5 h-5" />}
                                {type === 'image' && <ImageIcon className="w-5 h-5" />}
                                {type === 'link' && <LinkIcon className="w-5 h-5" />}
                                <span className="text-[9px] font-black uppercase">{type === 'text' ? 'نص' : type}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </section>
          </div>
        )}

        {activeView === 'manage' && (
          <div className="space-y-6 animate-fade-in">
             <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-indigo-500/10 text-indigo-500 rounded-xl flex items-center justify-center"><ClipboardList className="w-5 h-5" /></div>
                <h2 className="text-xl font-black text-gray-800 dark:text-white italic">المحاضرات المرفوعة مسبقاً</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {existingLectures.map(lec => (
                    <Card key={lec.id} className="p-6 border-none shadow-lg bg-white dark:bg-gray-900 rounded-3xl group flex flex-col justify-between">
                        <div className="space-y-4">
                            <div className="flex justify-between items-start">
                                <Badge variant="primary">L: {lec.lectureNumber}</Badge>
                                <span className="text-[10px] text-gray-400 font-bold">{new Date(lec.timestamp).toLocaleDateString('ar-EG')}</span>
                            </div>
                            <h3 className="text-lg font-black text-gray-800 dark:text-white group-hover:text-indigo-600 transition-colors">{lec.title}</h3>
                            <p className="text-xs text-gray-400 line-clamp-2 italic">{lec.description}</p>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <Button onClick={() => handleEditInternal(lec)} className="flex-1 py-3 text-[9px] font-black uppercase rounded-xl">تعديل المحتوى</Button>
                            <button onClick={() => handleRemoveLecture(lec.id)} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    </Card>
                ))}
                {existingLectures.length === 0 && <div className="col-span-full py-20 text-center opacity-30 italic font-black">لا توجد محاضرات مرفوعة لهذه المادة</div>}
            </div>
          </div>
        )}

        {activeView === 'supervision' && userData?.role === 'admin' && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center"><ShieldCheck className="w-5 h-5" /></div>
                    <h2 className="text-xl font-black text-gray-800 dark:text-white italic">نظام الإشراف الأكاديمي</h2>
                </div>
                <Button onClick={() => { setSelectedDoctor(''); setPermLevel('edit'); setIsAddingSupervisor(true); }} className="py-4 px-8 rounded-2xl font-black text-sm bg-emerald-600 shadow-glow"><Plus className="w-5 h-5 ml-2" /> تعيين مشرف جديد</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {supervisors.map(sup => (
                    <Card key={sup.doctorId} className="p-6 border-none shadow-lg bg-white dark:bg-gray-900 rounded-[2rem] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500/20 group-hover:bg-emerald-500 transition-colors" />
                        <div className="space-y-4">
                            <h4 className="text-lg font-black text-gray-800 dark:text-white">{sup.doctorName}</h4>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="primary" className="bg-emerald-100 text-emerald-600 border-none text-[8px] uppercase">{sup.permLevel?.toUpperCase() || 'EDIT ACCESS'}</Badge>
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold italic">أُضيف بواسطة: {sup.assignedBy} • {new Date(sup.assignedAt).toLocaleDateString()}</p>
                            
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <button onClick={() => handleEditSupervision(sup)} className="py-2.5 bg-gray-50 dark:bg-gray-800 text-indigo-600 text-[9px] font-black uppercase rounded-lg hover:bg-indigo-600 hover:text-white transition-all">تعديل الصلاحية</button>
                                <button onClick={() => remove(ref(db, `edu/course_supervisions/${sup.courseId}/${sup.doctorId}`))} className="py-2.5 bg-red-50 text-red-500 text-[9px] font-black uppercase rounded-lg hover:bg-red-500 hover:text-white transition-all">سحب الصلاحية</button>
                            </div>
                        </div>
                    </Card>
                ))}
                {supervisors.length === 0 && <div className="col-span-full py-20 text-center bg-gray-50 dark:bg-gray-900 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-gray-800 opacity-30 italic font-black">لا يوجد مشرفون مشاركون حالياً</div>}
            </div>
          </div>
        )}

        {activeView === 'upload' && (
            <div className="p-6 bg-indigo-50 dark:bg-indigo-900/10 rounded-[2rem] border border-indigo-100 dark:border-indigo-900/20 flex items-start gap-4">
                <ShieldCheck className="w-8 h-8 text-indigo-500 shrink-0" />
                <div className="text-right">
                    <h4 className="text-sm font-black text-indigo-700 italic tracking-tight">معايير الجودة والأمان</h4>
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold leading-relaxed mt-1">
                        يتم تخزين كافة المكونات المرفوعة بشكل مشفر. يرجى التأكد من أن المحتوى يتوافق مع المعايير الأكاديمية للمنصة قبل النشر النهائي.
                    </p>
                </div>
            </div>
        )}
      </main>

      {activeView === 'upload' && (
          <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
            <div className="max-w-5xl mx-auto flex items-center gap-4">
                <Button 
                    onClick={handleFinalPublish}
                    disabled={loading || !lectureData.title || !lectureData.lectureNumber}
                    className="flex-1 py-5 text-lg shadow-glow font-black"
                    icon={loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Check className="w-6 h-6" />}
                >
                    {loading ? (isEdit ? 'جاري حفظ التعديلات...' : 'جاري بناء المحاضرة...') : (isEdit ? 'حفظ كافة التعديلات الآن' : 'نشر المحتوى التعليمي للطلاب الآن')}
                </Button>
            </div>
          </footer>
      )}

      <Modal isOpen={isAddingSupervisor} onClose={() => setIsAddingSupervisor(false)} title="تعيين مشرف جديد على المادة">
          <div className="space-y-8 p-2 text-right">
              <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">اختر المعلم من القائمة</label>
                  <select 
                    className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none font-black text-sm border-2 border-transparent focus:border-emerald-500/20"
                    value={selectedDoctor}
                    onChange={e => setSelectedDoctor(e.target.value)}
                  >
                      <option value="">بحث وتحديد معلم...</option>
                      {doctors.map(d => <option key={d.uid} value={d.uid}>{d.name} ({d.specialization})</option>)}
                  </select>
              </div>

              <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">تحديد مستوى الصلاحية (Permission Level)</label>
                  <div className="grid grid-cols-2 gap-4">
                      {[
                        { id: 'full', label: 'إدارة كاملة', desc: 'تعديل، إضافة وحذف' },
                        { id: 'edit', label: 'تعديل ونشر', desc: 'إضافة وتعديل فقط' },
                        { id: 'add_only', label: 'إضافة فقط', desc: 'لا يسمح بالتعديل أو الحذف' },
                        { id: 'view_only', label: 'مشاهدة فقط', desc: 'بدون أي صلاحيات تعديل' }
                      ].map(p => (
                          <button 
                            key={p.id} 
                            onClick={() => setPermLevel(p.id)}
                            className={`p-5 rounded-2xl border-2 text-right transition-all flex flex-col gap-2 ${permLevel === p.id ? 'border-emerald-500 bg-emerald-50/50 shadow-lg' : 'border-gray-50 dark:border-gray-800'}`}
                          >
                              <span className={`text-[11px] font-black ${permLevel === p.id ? 'text-emerald-700' : 'text-gray-400'}`}>{p.label}</span>
                              <span className="text-[8px] font-bold text-gray-400 italic leading-none">{p.desc}</span>
                          </button>
                      ))}
                  </div>
              </div>

              <Button onClick={handleAddSupervisor} className="w-full py-5 text-lg font-black bg-emerald-600 shadow-glow rounded-[1.8rem]">تأكيد تعيين المشرف</Button>
          </div>
      </Modal>


    </div>
  );
};

export default UploadLecturePage;
