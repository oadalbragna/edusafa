import React, { useState } from 'react';
import { LayoutGrid, Loader2, CheckCircle2, UploadCloud, ImageIcon, Film } from 'lucide-react';
import { db } from '../../../services/firebase';
import { TelegramService } from '../../../services/telegram.service';
import { ref, push, set } from 'firebase/database';
import { useNavigate } from 'react-router-dom';

const AddClassForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [upStatus, setUpStatus] = useState<{ [key: string]: boolean }>({ cover: false, anim: false });
  const [done, setDone] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    level: 'primary' as 'primary' | 'middle' | 'high',
    grade: '1',
    status: 'public' as 'public' | 'hidden' | 'coming_soon' | 'teachers_only' | 'admin_only',
    animationUrl: '',
    coverImage: ''
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'coverImage' | 'animationUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const type = field === 'coverImage' ? 'cover' : 'anim';
    setUpStatus(prev => ({ ...prev, [type]: true }));
    try {
      const res = await TelegramService.uploadFile(file, 'class_media');
      if (res.success && res.url) {
        setFormData(prev => ({ ...prev, [field]: res.url! }));
      } else alert(res.error || "فشل الرفع");
    } catch (err) { alert("فشل الرفع"); } finally { setUpStatus(prev => ({ ...prev, [type]: false })); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Use grade as the primary key
      const classKey = formData.grade.trim();
      const path = `edu/sch/classes/${formData.level}/${classKey}`;
      const classRef = ref(db, path);
      
      await set(classRef, { 
        ...formData, 
        id: classKey, // Store the grade as the id
        createdAt: new Date().toISOString(), 
        subjects: [] 
      });
      
      setDone(true);
      setTimeout(() => { onSuccess(); navigate(`/admin/classes`); }, 1500);
    } catch (err) { alert('حدث خطأ أثناء إضافة الفصل'); } finally { setLoading(false); }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center"><CheckCircle2 className="w-10 h-10 text-blue-600 animate-bounce" /></div>
        <h3 className="text-xl font-bold text-gray-900">تم إنشاء الفصل بنجاح!</h3>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4 bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 block">اسم الفصل الدراسي</label>
          <div className="relative">
            <LayoutGrid className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" required className="w-full pr-12 pl-4 py-4 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="مثال: فصل المتميزين / أول" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 block">المرحلة</label>
            <select className="w-full px-4 py-4 bg-white border border-gray-200 rounded-2xl outline-none" value={formData.level} onChange={(e) => setFormData({...formData, level: e.target.value as any})}>
              <option value="primary">ابتدائي</option><option value="middle">متوسط</option><option value="high">ثانوي</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 block">الصف</label>
            <input type="text" required className="w-full px-4 py-4 bg-white border border-gray-200 rounded-2xl outline-none" placeholder="مثال: الأول" value={formData.grade} onChange={(e) => setFormData({...formData, grade: e.target.value})} />
          </div>
          <div className="col-span-1 md:col-span-2 space-y-2">
            <label className="text-sm font-bold text-gray-700 block">حالة ظهور الفصل</label>
            <select className="w-full px-4 py-4 bg-white border border-gray-200 rounded-2xl outline-none" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value as any})}>
              <option value="public">متاح للجميع</option><option value="coming_soon">قريباً</option><option value="teachers_only">للمعلمين فقط</option><option value="admin_only">للإدارة فقط</option><option value="hidden">مخفي</option>
            </select>
          </div>

          <div className="col-span-1 md:col-span-2 space-y-4 pt-4 border-t border-gray-100">
            <h4 className="text-sm font-black text-gray-900">الهوية البصرية للفصل</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative group">
                <input type="file" id="cover-up" className="hidden" accept="image/*" onChange={e => handleUpload(e, 'coverImage')} />
                <label htmlFor="cover-up" className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${formData.coverImage ? 'border-green-400 bg-green-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                  {upStatus.cover ? <Loader2 className="animate-spin text-blue-600" /> : formData.coverImage ? <CheckCircle2 className="text-green-500" /> : <div className="text-center"><ImageIcon className="mx-auto text-slate-300 mb-1" size={20} /><span className="text-[10px] font-bold text-slate-500">رفع صورة الغلاف</span></div>}
                </label>
              </div>
              <div className="relative group">
                <input type="file" id="anim-up" className="hidden" accept="image/gif" onChange={e => handleUpload(e, 'animationUrl')} />
                <label htmlFor="anim-up" className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${formData.animationUrl ? 'border-green-400 bg-green-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                  {upStatus.anim ? <Loader2 className="animate-spin text-blue-600" /> : formData.animationUrl ? <CheckCircle2 className="text-green-500" /> : <div className="text-center"><Film className="mx-auto text-slate-300 mb-1" size={20} /><span className="text-[10px] font-bold text-slate-500">رفع صورة متحركة GIF</span></div>}
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button type="submit" disabled={loading || upStatus.cover || upStatus.anim} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg active:scale-[0.98] disabled:bg-gray-400">
        {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'إنشاء الفصل والمتابعة'}
      </button>
    </form>
  );
};

export default AddClassForm;
