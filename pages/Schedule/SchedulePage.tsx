import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  BookOpen, 
  MapPin, 
  User,
  Loader2,
  Filter,
  ChevronDown,
  Info,
  Edit,
  Eye,
  EyeOff,
  Users,
  Save,
  ShieldCheck
} from 'lucide-react';
import { getDb as db } from '../../services/firebase';
import { ref, onValue, push, set, remove, update } from 'firebase/database';
import { useAuth } from '../../context/AuthContext';
import { SYS, EDU } from '../../constants/dbPaths';
import Modal from '../../components/common/Modal';
import type { TimetableSlot, Class as ClassType } from '../../types';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
const DAY_LABELS: { [key: string]: string } = {
  'Sunday': 'الأحد',
  'Monday': 'الاثنين',
  'Tuesday': 'الثلاثاء',
  'Wednesday': 'الأربعاء',
  'Thursday': 'الخميس'
};

const SUBJECT_COLORS: { [key: string]: string } = {
  'رياضيات': 'bg-blue-50 text-blue-600 border-blue-100',
  'علوم': 'bg-emerald-50 text-emerald-600 border-emerald-100',
  'لغة عربية': 'bg-orange-50 text-orange-600 border-orange-100',
  'لغة إنجليزية': 'bg-purple-50 text-purple-600 border-purple-100',
  'إسلاميات': 'bg-amber-50 text-amber-600 border-amber-100',
  'default': 'bg-slate-50 text-slate-600 border-slate-100'
};

const SchedulePage: React.FC = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const isTeacher = profile?.role === 'teacher';
  const isParent = profile?.role === 'parent';
  
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [childrenClasses, setChildrenClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [timetableSettings, setTimetableSettings] = useState<any>({});
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [newSlot, setNewSlot] = useState({
    subjectName: '',
    teacherName: '',
    day: 'Sunday' as any,
    startTime: '08:00',
    endTime: '09:00',
    room: ''
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      let clsData: ClassType[] = [];

      const classesRef = ref(db, EDU.SCH.CLASSES);
      onValue(classesRef, (snapshot) => {
        if (snapshot.exists()) {
          clsData = Object.values(snapshot.val()) as ClassType[];

          if (isAdmin) {
            setClasses(clsData);
            if (clsData.length > 0 && !selectedClassId) setSelectedClassId(clsData[0].id);
          } else if (isTeacher && profile) {
            const teacherClasses = clsData.filter(cls =>
              cls.subjects?.some(sub => sub.teacherId === profile.uid) &&
              !profile.blockedClasses?.includes(cls.id)
            );
            setClasses(teacherClasses);
            if (teacherClasses.length > 0 && !selectedClassId) setSelectedClassId(teacherClasses[0].id);
          } else if (!isParent) {
            setClasses(clsData);
            if (clsData.length > 0 && !selectedClassId) {
              if (profile?.classId) setSelectedClassId(profile.classId);
              else setSelectedClassId(clsData[0].id);
            }
          }
        }
      });

      if (isParent) {
        const usersRef = ref(db, SYS.USERS);
        onValue(usersRef, (snapshot) => {
          if (snapshot.exists()) {
            const allUsers = Object.values(snapshot.val());
            const foundChildren = allUsers.filter((u: any) =>
              u.uid === profile?.studentLink || u.parentUid === profile?.uid || u.parentEmail === profile?.email
            ) as any[];

            const parentClasses = foundChildren.map(child => {
              const cls = clsData.find(c => c.id === child.classId);
              return cls ? { ...cls, childName: child.firstName } : null;
            }).filter(Boolean);

            setChildrenClasses(parentClasses);
            const firstId = parentClasses[0]?.id;
            if (firstId && !selectedClassId) {
               setSelectedClassId(firstId);
            }
          }
        });
      }
    };

    fetchInitialData();

    // Fetch Timetable Slots
    const timetableRef = ref(db, EDU.TIMETABLE);
    onValue(timetableRef, (snapshot) => {
      if (snapshot.exists()) {
        setSlots(Object.values(snapshot.val()));
      } else {
        setSlots([]);
      }
      setLoading(false);
    });

    // Fetch Timetable Settings (Visibility)
    const settingsRef = ref(db, EDU.TIMETABLE_SETTINGS);
    onValue(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        setTimetableSettings(snapshot.val());
      }
    });

  }, [profile, selectedClassId, isParent]);

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId) return;

    try {
      if (editingSlot) {
        const slotRef = ref(db, `${EDU.TIMETABLE}/${editingSlot.id}`);
        await update(slotRef, { ...newSlot });
      } else {
        const slotRef = push(ref(db, EDU.TIMETABLE));
        await set(slotRef, {
          id: slotRef.key as string,
          classId: selectedClassId,
          subjectId: '',
          teacherId: '',
          ...newSlot
        });
      }
      setIsModalOpen(false);
      setEditingSlot(null);
      setNewSlot({ subjectName: '', teacherName: '', day: 'Sunday', startTime: '08:00', endTime: '09:00', room: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const deleteSlot = async (id: string) => {
    if (!isAdmin && !(isTeacher && profile?.permissions?.uploadEditDelete !== false)) return;
    if (window.confirm('حذف هذه الحصة؟')) {
      await remove(ref(db, `${EDU.TIMETABLE}/${id}`));
    }
  };

  const updateVisibility = async (classId: string, status: string) => {
    await set(ref(db, `${EDU.TIMETABLE_SETTINGS}/${classId}`), status);
  };

  const filteredSlots = slots.filter(s => s.classId === selectedClassId);
  const currentVisibility = timetableSettings[selectedClassId] || 'public';
  
  const canView = isAdmin || isTeacher || 
                 (currentVisibility === 'public') || 
                 (currentVisibility === 'teachers_only' && isTeacher);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="animate-spin text-blue-600 w-12 h-12" />
        <p className="text-slate-500 font-bold animate-pulse">جاري تحميل الجدول الزمني...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Calendar className="text-blue-600" size={32} />
            الجدول الزمني الدراسي
          </h1>
          <p className="text-slate-500 font-medium mt-1">تنظيم الحصص والمواعيد الأسبوعية لكافة الفصول</p>
        </div>
        {(isAdmin || (isTeacher && profile?.permissions?.uploadEditDelete !== false)) && (
          <button 
            onClick={() => {
              setEditingSlot(null);
              setNewSlot({ subjectName: '', teacherName: '', day: 'Sunday', startTime: '08:00', endTime: '09:00', room: '' });
              setIsModalOpen(true);
            }}
            className="btn-premium btn-primary flex items-center gap-2 shadow-xl shadow-blue-100 px-8 py-4"
          >
            <Plus size={20} />
            <span>إضافة حصة جديدة</span>
          </button>
        )}
      </div>

      {/* Selector & Visibility Control */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-6">
          <div className="flex items-center gap-3 min-w-fit">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Filter size={20} /></div>
            <span className="font-black text-slate-700">عرض الجدول لـ:</span>
          </div>
          <div className="relative flex-1 w-full">
            <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
            <select 
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              disabled={profile?.role === 'student'}
              className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-slate-900 appearance-none cursor-pointer disabled:opacity-70"
            >
              {isParent ? (
                childrenClasses.map(cls => (
                  <option key={cls.id} value={cls.id}>{`جدول ${cls.childName} (${cls.name} - الصف ${cls.grade})`}</option>
                ))
              ) : (
                classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name} - الصف {cls.grade}</option>
                ))
              )}
            </select>
          </div>
        </div>
        
        {isAdmin && (
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-3">
             <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={18} className="text-blue-600" />
                <span className="text-xs font-black text-slate-500 uppercase">خصوصية الجدول</span>
             </div>
             <div className="flex gap-2">
                <button 
                  onClick={() => updateVisibility(selectedClassId, 'public')}
                  className={`flex-1 p-3 rounded-xl transition-all ${currentVisibility === 'public' ? 'bg-green-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                  title="ظاهر للجميع"
                >
                  <Eye size={20} className="mx-auto" />
                </button>
                <button 
                  onClick={() => updateVisibility(selectedClassId, 'teachers_only')}
                  className={`flex-1 p-3 rounded-xl transition-all ${currentVisibility === 'teachers_only' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                  title="للمعلمين فقط"
                >
                  <Users size={20} className="mx-auto" />
                </button>
                <button 
                  onClick={() => updateVisibility(selectedClassId, 'hidden')}
                  className={`flex-1 p-3 rounded-xl transition-all ${currentVisibility === 'hidden' ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                  title="مخفي"
                >
                  <EyeOff size={20} className="mx-auto" />
                </button>
             </div>
          </div>
        )}

        {!isAdmin && (
          <div className="bg-blue-600 rounded-[2.5rem] p-6 text-white flex items-center gap-4 shadow-xl shadow-blue-100">
             <Info className="shrink-0 opacity-80" size={32} />
             <p className="text-xs font-bold leading-relaxed">يتم تحديث الجدول لحظياً لجميع الطلاب والمعلمين المرتبطين بهذا الفصل.</p>
          </div>
        )}
      </div>

      {/* Timetable Grid */}
      {!canView ? (
        <div className="py-24 bg-white rounded-[3.5rem] border border-slate-100 shadow-sm text-center space-y-6">
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
            <ShieldCheck className="w-12 h-12" />
          </div>
          <div className="space-y-2">
            <p className="text-slate-800 font-black text-2xl">هذا الجدول غير متاح حالياً</p>
            <p className="text-slate-400 text-sm font-bold">يرجى التواصل مع الإدارة لمزيد من التفاصيل</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {DAYS.map(day => (
            <div key={day} className="space-y-4">
              <div className="bg-slate-900 p-4 rounded-2xl text-center shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1 h-full bg-blue-500"></div>
                <h3 className="font-black text-white tracking-widest uppercase text-xs">{DAY_LABELS[day]}</h3>
              </div>
              
              <div className="space-y-3 min-h-[400px] p-2 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200/50">
                {filteredSlots
                  .filter(s => s.day === day)
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map(slot => {
                    const colorStyle = SUBJECT_COLORS[slot.subjectName] || SUBJECT_COLORS['default'];
                    const canManage = isAdmin || (isTeacher && profile?.permissions?.uploadEditDelete !== false);
                    return (
                      <div key={slot.id} className={`p-5 rounded-[2rem] border transition-all hover:scale-[1.02] shadow-sm relative group ${colorStyle}`}>
                        {canManage && (
                          <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button 
                              onClick={() => {
                                setEditingSlot(slot);
                                setNewSlot({ ...slot });
                                setIsModalOpen(true);
                              }}
                              className="p-1.5 bg-white rounded-full text-blue-500 hover:bg-blue-50 shadow-sm"
                            >
                              <Edit size={12} />
                            </button>
                            <button 
                              onClick={() => deleteSlot(slot.id)}
                              className="p-1.5 bg-white rounded-full text-slate-300 hover:text-red-500 shadow-sm"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-white/50 rounded-lg"><BookOpen size={14} /></div>
                            <span className="font-black text-sm">{slot.subjectName}</span>
                          </div>
                          <div className="flex items-center gap-2 opacity-80 text-[11px] font-bold">
                            <Clock size={12} />
                            <span>{slot.startTime} - {slot.endTime}</span>
                          </div>
                          <div className="pt-2 mt-2 border-t border-current/10 flex items-center justify-between opacity-70">
                            <div className="flex items-center gap-1 text-[10px] font-bold">
                              <User size={10} />
                              <span>{slot.teacherName}</span>
                            </div>
                            {slot.room && (
                              <div className="flex items-center gap-1 text-[10px] font-bold">
                                <MapPin size={10} />
                                <span>{slot.room}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                
                {filteredSlots.filter(s => s.day === day).length === 0 && (
                  <div className="py-20 text-center text-slate-300 italic text-xs px-4">
                    يوم دراسي خالٍ
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Slot Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingSlot ? "تعديل حصة دراسية" : "إضافة حصة دراسية"}>
        <form onSubmit={handleAddSlot} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-700">المادة الدراسية</label>
              <input type="text" required className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={newSlot.subjectName} onChange={(e) => setNewSlot({ ...newSlot, subjectName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-700">المعلم</label>
              <input type="text" required className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={newSlot.teacherName} onChange={(e) => setNewSlot({ ...newSlot, teacherName: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-700">اليوم</label>
              <select className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={newSlot.day} onChange={(e) => setNewSlot({ ...newSlot, day: e.target.value as any })}>
                {DAYS.map(d => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-700">القاعة</label>
              <input type="text" className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={newSlot.room} onChange={(e) => setNewSlot({ ...newSlot, room: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-700 text-right block">من</label>
              <input type="time" required className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={newSlot.startTime} onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-700 text-right block">إلى</label>
              <input type="time" required className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={newSlot.endTime} onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })} />
            </div>
          </div>
          <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
            <Save size={20} />
            {editingSlot ? "حفظ التعديلات" : "تثبيت في الجدول"}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default SchedulePage;