import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Image, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Link as LinkIcon, 
  Save, 
  RefreshCw, 
  UploadCloud,
  CheckCircle2,
  Edit,
  Globe,
  LayoutGrid,
  Filter,
  XCircle
} from 'lucide-react';
import { db } from '../../../services/firebase';
import { SYS, EDU, COMM } from '../../constants/dbPaths';
import { TelegramService } from '../../../services/telegram.service';
import { ref, onValue, push, set, remove, update } from 'firebase/database';
import { useAuth } from '../../../context/AuthContext';
import Modal from '../../../components/common/Modal';
import type { SliderItem, Class } from '../../../types';

const SliderManagement: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filterClassId = searchParams.get('classId');
  
  const [slides, setSlides] = useState<SliderItem[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const initialNewSlideState = {
    title: '',
    subtitle: '',
    linkType: 'internal' as 'internal' | 'external',
    targetLink: '',
    order: 0,
    active: true,
    assignedTo: filterClassId ? [filterClassId] : 'all' as 'all' | string[]
  };

  const [currentSlide, setCurrentSlide] = useState<Partial<SliderItem>>(initialNewSlideState);

  useEffect(() => {
    // Update initial state if filterClassId changes
    if (!isEditing && !isModalOpen) {
      setCurrentSlide({
        ...initialNewSlideState,
        assignedTo: filterClassId ? [filterClassId] : 'all'
      });
    }
  }, [filterClassId, isEditing, isModalOpen]);

  useEffect(() => {
    const sliderRef = ref(db, 'sys/system/slider');
    const classesRef = ref(db, 'edu/sch/classes');

    const unsubSlider = onValue(sliderRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = Object.values(snapshot.val()) as SliderItem[];
        setSlides(data.sort((a, b) => a.order - b.order));
      } else {
        setSlides([]);
      }
      setLoading(false);
    });

    const unsubClasses = onValue(classesRef, (snapshot) => {
      if (snapshot.exists()) {
        setClasses(Object.values(snapshot.val()));
      } else {
        setClasses([]);
      }
    });

    return () => {
      unsubSlider();
      unsubClasses();
    };
  }, []);

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setCurrentSlide(initialNewSlideState);
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (slide: SliderItem) => {
    setIsEditing(true);
    setCurrentSlide(slide);
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  const handleSaveSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !isEditing) {
      alert('يرجى اختيار صورة أولاً');
      return;
    }

    setUploading(true);
    try {
      let imageUrl = currentSlide.imageUrl;

      // 1. Upload new image if selected
      if (selectedFile) {
        const res = await TelegramService.uploadFile(selectedFile, 'slider');
        if (!res.success || !res.url) {
          throw new Error(res.error || "فشل رفع الصورة");
        }
        imageUrl = res.url;
      }

      // 2. Save to RTDB
      if (isEditing && currentSlide.id) {
        const slideRef = ref(db, `sys/system/slider/${currentSlide.id}`);
        await update(slideRef, { ...currentSlide, imageUrl });
      } else {
        const slideRef = push(ref(db, 'sys/system/slider'));
        const slideData: SliderItem = {
          ...currentSlide as any,
          id: slideRef.key as string,
          imageUrl: imageUrl as string
        };
        await set(slideRef, slideData);
      }
      
      setIsModalOpen(false);
      setSelectedFile(null);
      setCurrentSlide(initialNewSlideState);
    } catch (err) {
      console.error(err);
      alert('فشل في حفظ البيانات');
    } finally {
      setUploading(false);
    }
  };

  const deleteSlide = async (id: string) => {
    if (window.confirm('هل تريد حذف هذه الشريحة؟')) {
      await remove(ref(db, `sys/system/slider/${id}`));
    }
  };

  const toggleStatus = async (id: string, current: boolean) => {
    await update(ref(db, `sys/system/slider/${id}`), { active: !current });
  };

  const toggleClassAssignment = (classId: string) => {
    const currentAssigned = Array.isArray(currentSlide.assignedTo) ? currentSlide.assignedTo : [];
    if (currentAssigned.includes(classId)) {
      setCurrentSlide({
        ...currentSlide,
        assignedTo: currentAssigned.filter(id => id !== classId)
      });
    } else {
      setCurrentSlide({
        ...currentSlide,
        assignedTo: [...currentAssigned, classId]
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <RefreshCw className="animate-spin text-blue-600 w-12 h-12" />
        <p className="text-slate-500 font-bold">جاري تحميل بيانات السلايدر...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Image className="text-blue-600" size={32} />
            إدارة الصور المتحركة (Slider)
          </h1>
          <p className="text-slate-500 font-medium mt-1">التحكم في الإعلانات والتنبيهات التي تظهر في الفصول</p>
        </div>
        <div className="flex gap-3">
          {filterClassId && (
            <button 
              onClick={() => setSearchParams({})}
              className="flex items-center gap-2 px-6 py-4 bg-amber-50 text-amber-600 rounded-2xl font-bold border border-amber-100 hover:bg-amber-100 transition-all"
            >
              <XCircle size={20} />
              <span>إزالة فلتر الفصل</span>
            </button>
          )}
          <button 
            onClick={handleOpenAddModal}
            className="btn-premium btn-primary flex items-center gap-2 px-8 py-4 shadow-xl shadow-blue-100"
          >
            <Plus size={20} />
            <span>إضافة شريحة جديدة</span>
          </button>
        </div>
      </div>

      {filterClassId && (
        <div className="bg-blue-50 border border-blue-100 p-6 rounded-[2rem] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 text-white rounded-xl">
              <Filter size={24} />
            </div>
            <div>
              <p className="text-xs font-black text-blue-400 uppercase tracking-widest leading-none mb-1">فلتر نشط</p>
              <h4 className="text-lg font-black text-blue-900">
                عرض الشرائح الخاصة بـ: {classes.find(c => c.id === filterClassId)?.name || 'تحميل...'}
              </h4>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {slides
          .filter(slide => {
            if (!filterClassId) return true;
            return slide.assignedTo === 'all' || (Array.isArray(slide.assignedTo) && slide.assignedTo.includes(filterClassId));
          })
          .map((slide) => (
          <div key={slide.id} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden group flex flex-col h-full">
            <div className="relative h-48 overflow-hidden">
              <img src={slide.imageUrl} alt={slide.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                <p className="text-white font-bold text-sm">{slide.subtitle}</p>
              </div>
              <div className="absolute top-4 left-4 flex gap-2">
                <button 
                  onClick={() => toggleStatus(slide.id, slide.active)}
                  className={`p-2 rounded-xl backdrop-blur-md shadow-lg transition-all ${slide.active ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-600'}`}
                  title={slide.active ? "إخفاء" : "عرض"}
                >
                  <CheckCircle2 size={18} />
                </button>
                <button 
                  onClick={() => handleOpenEditModal(slide)}
                  className="p-2 bg-blue-500 text-white rounded-xl backdrop-blur-md shadow-lg hover:bg-blue-600 transition-all"
                  title="تعديل"
                >
                  <Edit size={18} />
                </button>
                <button 
                  onClick={() => deleteSlide(slide.id)}
                  className="p-2 bg-red-500 text-white rounded-xl backdrop-blur-md shadow-lg hover:bg-red-600 transition-all"
                  title="حذف"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-black text-slate-900">{slide.title}</h3>
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${slide.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {slide.active ? 'ظاهر' : 'مخفي'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                  <Globe size={14} className="text-blue-500" />
                  <span>
                    {slide.assignedTo === 'all' 
                      ? 'يظهر لجميع الفصول' 
                      : `مخصص لـ ${slide.assignedTo?.length || 0} فصل`}
                  </span>
                </div>
              </div>
              
              <div className="pt-4 border-t border-slate-50 flex items-center justify-between text-xs font-bold text-slate-400">
                <div className="flex items-center gap-2">
                  {slide.linkType === 'external' ? <ExternalLink size={14} /> : <LinkIcon size={14} />}
                  <span className="truncate max-w-[150px]">{slide.targetLink || 'بدون رابط'}</span>
                </div>
                <span className="bg-slate-50 px-2 py-1 rounded-md">الترتيب: {slide.order}</span>
              </div>
            </div>
          </div>
        ))}
        
        {slides.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-4 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
            <Image className="w-16 h-16 mx-auto text-slate-200" />
            <p className="text-slate-400 font-bold">لا توجد شرائح حالياً، ابدأ بإضافة أول إعلان للمنصة.</p>
          </div>
        )}
      </div>

      {/* Add/Edit Slide Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? "تعديل الشريحة" : "إضافة شريحة للسلايدر"}>
        <form onSubmit={handleSaveSlide} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-black text-slate-700 text-right block">صورة الشريحة</label>
            <div className="relative group">
              <input 
                type="file" 
                className="hidden" 
                id="slide-file" 
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && setSelectedFile(e.target.files[0])}
              />
              <label 
                htmlFor="slide-file"
                className={`flex flex-col items-center justify-center w-full py-6 border-2 border-dashed rounded-3xl cursor-pointer transition-all ${
                  selectedFile || currentSlide.imageUrl ? 'border-green-400 bg-green-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-blue-400'
                }`}
              >
                {selectedFile || currentSlide.imageUrl ? (
                  <>
                    {selectedFile ? (
                       <CheckCircle2 className="text-green-500 mb-2" size={32} />
                    ) : (
                      <img src={currentSlide.imageUrl} className="w-20 h-10 object-cover rounded-lg mb-2" alt="Current" />
                    )}
                    <span className="text-xs font-black text-green-700">{selectedFile ? selectedFile.name : 'تم اختيار صورة مسبقاً (انقر لتغييرها)'}</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="text-blue-600 mb-2" size={32} />
                    <span className="text-sm font-black text-slate-700">اختر صورة جذابة (1200x400)</span>
                  </>
                )}
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-black text-slate-700 text-right block">العنوان الرئيسي</label>
            <input type="text" required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" placeholder="مثال: رحلة تعليمية جديدة" value={currentSlide.title} onChange={e => setCurrentSlide({...currentSlide, title: e.target.value})} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-black text-slate-700 text-right block">وصف فرعي (اختياري)</label>
            <input type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" placeholder="وصف قصير يظهر تحت العنوان" value={currentSlide.subtitle} onChange={e => setCurrentSlide({...currentSlide, subtitle: e.target.value})} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-black text-slate-700 text-right block font-black">يظهر لـ:</label>
            <div className="flex gap-4 mb-4">
              <button 
                type="button" 
                onClick={() => setCurrentSlide({...currentSlide, assignedTo: 'all'})}
                className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 border-2 transition-all ${currentSlide.assignedTo === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-100'}`}
              >
                <Globe size={18} />
                جميع الفصول
              </button>
              <button 
                type="button" 
                onClick={() => setCurrentSlide({...currentSlide, assignedTo: []})}
                className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 border-2 transition-all ${Array.isArray(currentSlide.assignedTo) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-100'}`}
              >
                <LayoutGrid size={18} />
                فصول مخصصة
              </button>
            </div>

            {Array.isArray(currentSlide.assignedTo) && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 max-h-48 overflow-y-auto grid grid-cols-2 gap-2">
                {classes.map(cls => (
                  <label key={cls.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 cursor-pointer hover:border-blue-400 transition-all">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded-lg text-blue-600 border-slate-300 focus:ring-blue-500"
                      checked={(currentSlide.assignedTo as string[]).includes(cls.id)}
                      onChange={() => toggleClassAssignment(cls.id)}
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-900">{cls.name}</span>
                      <span className="text-[10px] font-bold text-slate-400">الصف {cls.grade}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-700 text-right block">نوع الرابط</label>
              <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold appearance-none" value={currentSlide.linkType} onChange={e => setCurrentSlide({...currentSlide, linkType: e.target.value as any})}>
                <option value="internal">داخلي (داخل المنصة)</option>
                <option value="external">خارجي (رابط URL)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-700 text-right block">الترتيب</label>
              <input type="number" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={currentSlide.order} onChange={e => setCurrentSlide({...currentSlide, order: parseInt(e.target.value)})} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-black text-slate-700 text-right block">رابط التوجه</label>
            <input type="text" required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-left" placeholder={currentSlide.linkType === 'internal' ? 'مثال: /academic' : 'https://example.com'} dir="ltr" value={currentSlide.targetLink} onChange={e => setCurrentSlide({...currentSlide, targetLink: e.target.value})} />
          </div>

          <button 
            type="submit" 
            disabled={uploading}
            className={`w-full py-4 rounded-2xl font-black shadow-lg transition-all flex items-center justify-center gap-3 ${
              uploading ? 'bg-slate-100 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {uploading ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
            <span>{uploading ? 'جاري حفظ البيانات...' : isEditing ? 'تحديث الشريحة' : 'حفظ الشريحة الجديدة'}</span>
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default SliderManagement;