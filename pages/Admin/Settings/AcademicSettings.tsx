import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  BookOpen, 
  GraduationCap, 
  Save, 
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Eye,
  EyeOff,
  Users,
  ShieldCheck,
  Settings as SettingsIcon,
  Globe
} from 'lucide-react';
import { db } from '../../../services/firebase';
import { SYS, EDU, COMM } from '../../../constants/dbPaths';
import { ref, onValue, set, update } from 'firebase/database';

const AcademicSettings: React.FC = () => {
  const [settings, setAcademicSettings] = useState({
    currentYear: '2025-2026',
    currentSemester: '1',
    levels: ['primary', 'middle', 'high'],
    examPeriods: [] as any[],
    visibility: {
      curriculum: 'public',
      timetable: 'public',
      grades: 'public',
      announcements: 'public',
      academic_info: 'public'
    }
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<any>(null);

  useEffect(() => {
    const settingsRef = ref(db, 'edu/academic_settings');
    const unsubscribe = onValue(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setAcademicSettings(prev => ({ 
          ...prev, 
          ...data,
          visibility: { ...prev.visibility, ...(data.visibility || {}) }
        }));
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await set(ref(db, 'edu/academic_settings'), settings);
      setMessage({ type: 'success', text: 'تم حفظ الإعدادات الأكاديمية بنجاح!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'فشل في حفظ الإعدادات' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const updateVisibility = (key: string, value: string) => {
    setAcademicSettings(prev => ({
      ...prev,
      visibility: { ...prev.visibility, [key]: value }
    }));
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <RefreshCw className="w-10 h-10 text-blue-600 animate-spin" />
    </div>
  );

  const VisibilityButton = ({ section, value, icon: Icon, label }: any) => {
    const isActive = settings.visibility[section as keyof typeof settings.visibility] === value;
    return (
      <button 
        onClick={() => updateVisibility(section, value)}
        className={`flex-1 p-3 rounded-xl transition-all flex items-center justify-center gap-2 border ${
          isActive 
          ? 'bg-blue-600 text-white border-blue-600 shadow-lg' 
          : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'
        }`}
        title={label}
      >
        <Icon size={18} />
        <span className="text-[10px] font-black uppercase tracking-tighter">{label}</span>
      </button>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10" dir="rtl">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <GraduationCap className="text-blue-600" size={32} />
            الضبط الأكاديمي والتقويم
          </h1>
          <p className="text-slate-500 font-medium mt-1">إدارة العام الدراسي، الفصول، وفترات الاختبارات</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="btn-premium btn-primary flex items-center gap-2 px-10 py-4 shadow-xl shadow-blue-100"
        >
          {isSaving ? <RefreshCw size={20} className="animate-spin" /> : <Save size={20} />}
          <span>حفظ التغييرات</span>
        </button>
      </div>

      {message && (
        <div className={`p-5 rounded-[2rem] flex items-center gap-3 border animate-in slide-in-from-top-4 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
        }`}>
          <CheckCircle2 size={20} />
          <span className="font-black">{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Main Settings */}
        <div className="bg-white rounded-[3rem] p-8 border border-slate-200 shadow-sm space-y-8">
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Calendar className="text-blue-600" size={20} />
            العام الدراسي الحالي
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-700">السنة الأكاديمية</label>
              <input 
                type="text" 
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold"
                value={settings.currentYear}
                onChange={(e) => setAcademicSettings({...settings, currentYear: e.target.value})}
                placeholder="مثال: 2025-2026"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-700">الفصل الدراسي الحالي</label>
              <select 
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold appearance-none"
                value={settings.currentSemester}
                onChange={(e) => setAcademicSettings({...settings, currentSemester: e.target.value})}
              >
                <option value="1">الفصل الدراسي الأول</option>
                <option value="2">الفصل الدراسي الثاني</option>
                <option value="summer">دورة صيفية</option>
              </select>
            </div>
          </div>
        </div>

        {/* Global Visibility Control */}
        <div className="bg-white rounded-[3rem] p-8 border border-slate-200 shadow-sm space-y-8">
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <ShieldCheck className="text-blue-600" size={20} />
            التحكم في ظهور الأقسام (للجميع)
          </h3>
          
          <div className="space-y-4">
            {[
              { id: 'curriculum', label: 'المناهج الدراسية' },
              { id: 'timetable', label: 'الجدول الزمني' },
              { id: 'grades', label: 'رصد الدرجات' },
              { id: 'announcements', label: 'التعميمات' },
              { id: 'academic_info', label: 'المعلومات الأكاديمية' }
            ].map((section) => (
              <div key={section.id} className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 flex flex-col md:flex-row items-center gap-4">
                <span className="font-black text-slate-800 text-sm min-w-[140px]">{section.label}</span>
                <div className="flex gap-2 w-full">
                  <VisibilityButton section={section.id} value="public" icon={Globe} label="عام" />
                  <VisibilityButton section={section.id} value="teachers_only" icon={Users} label="للمعلمين" />
                  <VisibilityButton section={section.id} value="hidden" icon={EyeOff} label="مخفي" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info Card */}
        <div className="lg:col-span-2 p-8 bg-blue-600 rounded-[3rem] text-white shadow-2xl shadow-blue-200 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -ml-32 -mt-32 blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div className="p-6 bg-white/10 rounded-[2.5rem] backdrop-blur-md border border-white/20">
              <SettingsIcon size={40} className="animate-spin-slow" />
            </div>
            <div>
              <h4 className="text-2xl font-black mb-2">إدارة الخصوصية والظهور</h4>
              <p className="text-blue-100 font-bold leading-relaxed max-w-2xl text-sm">
                يمكنك الآن التحكم الكامل في متى يرى الطلاب أو المعلمون الأقسام المختلفة في المنصة. عند ضبط قسم على "مخفي" لن يظهر في واجهات المستخدم العادية، وعند ضبطه "للمعلمين فقط" سيظهر فقط لذوي صلاحية التدريس والإدارة.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AcademicSettings;