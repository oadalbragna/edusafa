import React, { useState, useEffect } from 'react';
import { 
  Megaphone, 
  Plus, 
  Trash2, 
  Users, 
  Clock, 
  CheckCircle2, 
  Loader2,
  Eye,
  EyeOff,
  Send,
  Image as ImageIcon,
  UploadCloud,
  Edit,
  Save,
  ShieldCheck
} from 'lucide-react';
import { db } from '../../../services/firebase';
import { SYS, EDU, COMM } from '../../../constants/dbPaths';
import { TelegramService } from '../../../services/telegram.service';
import { ref, push, set, onValue, remove, update, serverTimestamp, get } from 'firebase/database';
import { logActivity } from '../../../utils/activityLogger';
import { useAuth } from '../../../context/AuthContext';
import Modal from '../../../components/common/Modal';

const Announcements: React.FC = () => {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnn, setEditingAnn] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const initialAnnState = {
    title: '',
    content: '',
    imageUrl: '',
    targetScope: 'global' as 'global' | 'level' | 'grade' | 'class',
    level: 'primary',
    grade: '1',
    classId: '',
    priority: 'normal',
    status: 'public'
  };

  const [newAnn, setNewAnn] = useState(initialAnnState);
  const [classes, setClasses] = useState<any[]>([]);

  useEffect(() => {
    // Fetch classes for targeting
    const classesRef = ref(db, 'edu/sch/classes');
    get(classesRef).then(snap => {
        if (snap.exists()) {
            const data = snap.val();
            const flattened: any[] = [];
            Object.keys(data).forEach(level => {
                Object.keys(data[level]).forEach(grade => {
                    Object.keys(data[level][grade]).forEach(classId => {
                        flattened.push({ ...data[level][grade][classId], id: classId, level, grade });
                    });
                });
            });
            setClasses(flattened);
        }
    });

    const annRef = ref(db, 'edu/announcements');
    const unsubscribe = onValue(annRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const announcementsList: any[] = [];
        
        // Recursive fetch to get all announcements
        const traverse = (obj: any) => {
            Object.keys(obj).forEach(key => {
                if (obj[key].title) announcementsList.push({ ...obj[key], id: key });
                else traverse(obj[key]);
            });
        };
        traverse(data);
        announcementsList.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setAnnouncements(announcementsList);
      } else setAnnouncements([]);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await TelegramService.uploadFile(file, 'announcements');
      if (res.success && res.url) {
        setNewAnn(prev => ({ ...prev, imageUrl: res.url! }));
      } else alert(res.error || "فشل رفع الصورة");
    } catch (err) { alert("فشل رفع الصورة"); } finally { setUploading(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let path = 'edu/announcements/global';
      if (newAnn.targetScope === 'level') path = `edu/announcements/${newAnn.level}`;
      else if (newAnn.targetScope === 'grade') path = `edu/announcements/${newAnn.level}/${newAnn.grade}`;
      else if (newAnn.targetScope === 'class') {
          // Find class by level/grade
          const cls = classes.find(c => c.level === newAnn.level && c.grade === newAnn.grade);
          path = cls ? `edu/announcements/${cls.level}/${cls.grade}` : 'edu/announcements/global';
      }

      if (editingAnn) {
        await update(ref(db, `${path}/${editingAnn.id}`), { ...newAnn, updatedAt: new Date().toISOString() });
      } else {
        const annRef = push(ref(db, path));
        await set(annRef, {
          ...newAnn,
          id: annRef.key,
          timestamp: serverTimestamp(),
          createdAt: new Date().toISOString(),
          author: profile?.fullName || profile?.firstName || 'الإدارة'
        });
      }

      setIsModalOpen(false);
      setEditingAnn(null);
      setNewAnn(initialAnnState);
    } catch (err) { alert('حدث خطأ أثناء الحفظ'); }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا التعميم؟')) {
      await remove(ref(db, `sys/announcements/${id}`));
    }
  };

  const toggleStatus = async (ann: any) => {
    const nextStatus = ann.status === 'hidden' ? 'public' : 'hidden';
    await update(ref(db, `sys/announcements/${ann.id}`), { status: nextStatus });
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <Megaphone className="text-blue-600" size={32} />
            إدارة التعميمات والإعلانات
          </h1>
          <p className="text-slate-500 font-medium mt-1">تواصل مع جميع أفراد المنصة بضغطة زر واحدة</p>
        </div>
        <button 
          onClick={() => {
            setEditingAnn(null);
            setNewAnn(initialAnnState);
            setIsModalOpen(true);
          }} 
          className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2"
        >
          <Plus size={20} /> إنشاء تعميم جديد
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {announcements.length === 0 ? (
            <div className="bg-white p-20 rounded-[3rem] text-center border border-slate-100 shadow-sm space-y-4">
               <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200 shadow-inner"><Megaphone size={40} /></div>
               <h3 className="text-xl font-black text-slate-800">لا توجد تعميمات منشورة</h3>
            </div>
          ) : (
            announcements.map((ann) => (
              <div key={ann.id} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all relative group overflow-hidden">
                <div className={`absolute top-0 right-0 w-2 h-full ${ann.status === 'hidden' ? 'bg-slate-400' : ann.priority === 'urgent' ? 'bg-red-500' : ann.priority === 'high' ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-2xl ${ann.priority === 'urgent' ? 'bg-red-50 text-red-600' : ann.priority === 'high' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}><Megaphone size={24} /></div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900">{ann.title}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-widest"><Clock size={12} /> {new Date(ann.createdAt).toLocaleDateString('ar-SA')}</span>
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-black text-slate-500">
                          موجه لـ: {ann.target}
                        </span>
                        {ann.status === 'hidden' && (
                          <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded text-[10px] font-black flex items-center gap-1"><EyeOff size={10} /> مخفي</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={() => toggleStatus(ann)}
                      className={`p-2.5 rounded-xl transition-all ${ann.status === 'hidden' ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400'}`}
                      title={ann.status === 'hidden' ? 'إظهار' : 'إخفاء'}
                    >
                      {ann.status === 'hidden' ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                    <button 
                      onClick={() => {
                        setEditingAnn(ann);
                        setNewAnn({ ...ann });
                        setIsModalOpen(true);
                      }}
                      className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                    >
                      <Edit size={18} />
                    </button>
                    <button onClick={() => handleDelete(ann.id)} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                  </div>
                </div>
                <p className="text-slate-600 leading-relaxed font-medium mb-6 whitespace-pre-wrap">{ann.content}</p>
                {ann.imageUrl && (
                  <div className="mb-6 rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm">
                    <img src={ann.imageUrl} alt={ann.title} className="w-full h-auto max-h-[400px] object-cover hover:scale-105 transition-transform duration-700" />
                  </div>
                )}
                <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                   <div className="flex items-center gap-2 text-slate-400 font-bold text-xs"><Users size={14} /> <span>المسؤول: {ann.author}</span></div>
                   <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${ann.priority === 'urgent' ? 'bg-red-100 text-red-600' : ann.priority === 'high' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>{ann.priority === 'urgent' ? 'عاجل جداً' : ann.priority === 'high' ? 'أولوية عالية' : 'عادي'}</div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-8">
           <div className="bg-slate-900 p-8 rounded-[3rem] text-white space-y-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full -ml-16 -mt-16 blur-2xl"></div>
              <div className="flex items-center gap-3"><CheckCircle2 className="text-blue-400" /><h3 className="text-xl font-black">نظام التعميمات</h3></div>
              <div className="space-y-4">
                 <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex justify-between items-center"><span className="text-slate-400 font-bold text-sm">إجمالي المنشور</span><span className="text-2xl font-black">{announcements.length}</span></div>
                 <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex justify-between items-center"><span className="text-slate-400 font-bold text-sm">مخفي حالياً</span><span className="text-2xl font-black text-amber-400">{announcements.filter(a => a.status === 'hidden').length}</span></div>
              </div>
           </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingAnn ? "تعديل التعميم" : "إنشاء تعميم جديد"}>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-black text-slate-700">عنوان الإعلان</label>
            <input type="text" required placeholder="مثال: موعد بدء اختبارات الفصل الأول" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={newAnn.title} onChange={e => setNewAnn({...newAnn, title: e.target.value})} />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-700">الجمهور المستهدف</label>
              <select className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold appearance-none" value={newAnn.target} onChange={e => setNewAnn({...newAnn, target: e.target.value})}>
                <option value="all">الجميع</option>
                <option value="students">الطلاب فقط</option>
                <option value="teachers">المعلمين فقط</option>
                <option value="parents">أولياء الأمور فقط</option>
                <option value="primary">الابتدائي</option>
                <option value="middle">المتوسط</option>
                <option value="high">الثانوي</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-700">الأولوية والظهور</label>
              <div className="flex gap-2">
                <select className="flex-1 px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold appearance-none" value={newAnn.priority} onChange={e => setNewAnn({...newAnn, priority: e.target.value})}>
                  <option value="normal">عادية</option>
                  <option value="high">عالية</option>
                  <option value="urgent">عاجل جداً</option>
                </select>
                <select className="flex-1 px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold appearance-none" value={newAnn.status} onChange={e => setNewAnn({...newAnn, status: e.target.value as any})}>
                  <option value="public">ظاهر</option>
                  <option value="hidden">مخفي</option>
                  <option value="teachers_only">للمعلمين فقط</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-black text-slate-700">محتوى التعميم</label>
            <textarea required rows={4} placeholder="اكتب تفاصيل الإعلان هنا..." className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold resize-none" value={newAnn.content} onChange={e => setNewAnn({...newAnn, content: e.target.value})}></textarea>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-black text-slate-700">صورة توضيحية</label>
            <div className="relative group">
              <input type="file" id="ann-img" className="hidden" accept="image/*" onChange={handleImageUpload} />
              <label htmlFor="ann-img" className={`flex flex-col items-center justify-center w-full py-6 border-2 border-dashed rounded-[2rem] cursor-pointer transition-all ${newAnn.imageUrl ? 'border-green-400 bg-green-50' : 'bg-slate-50'}`}>
                {uploading ? <Loader2 className="animate-spin text-blue-600" /> : newAnn.imageUrl ? <div className="flex flex-col items-center"><CheckCircle2 className="text-green-500 mb-1" size={24} /><span className="text-[10px] font-black text-green-700">تم الرفع</span></div> : <div className="flex flex-col items-center"><UploadCloud size={24} className="text-blue-600 mb-1" /><span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">رفع صورة</span></div>}
              </label>
            </div>
          </div>

          <button type="submit" disabled={uploading} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 flex items-center justify-center gap-3 hover:bg-blue-700 transition-all active:scale-[0.98]">
            <Save size={20} /> {editingAnn ? 'حفظ التغييرات' : 'نشر التعميم الآن'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Announcements;