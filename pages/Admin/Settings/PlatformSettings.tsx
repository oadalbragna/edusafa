import React, { useState, useEffect } from 'react';
import * as Lucide from 'lucide-react';
import { db } from '../../../services/firebase';
import { ref, get, set, update } from 'firebase/database';
import type { PlatformSettings } from '../../../types';
import PolicyEditor from '../../../components/Admin/Settings/PolicyEditor';

const PlatformSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<PlatformSettings & { 
    social?: any, 
    footerText?: string,
    maintenanceScope?: 'admin_only' | 'staff_only' | 'selective_classes',
    allowedClasses?: string[],
    branding?: {
      logoUrl: string;
      bannerUrl: string;
      primaryColor: string;
      secondaryColor: string;
    }
  }>({
    name: 'EduSafa',
    maintenanceMode: false,
    maintenanceScope: 'admin_only',
    allowedClasses: [],
    allowRegistration: true,
    contactEmail: '',
    contactPhone: '',
    address: '',
    termsAndConditions: '',
    privacyPolicy: '',
    social: { facebook: '', twitter: '', instagram: '', youtube: '' },
    footerText: 'جميع الحقوق محفوظة منصة EduSafa ٢٠٢٦',
    branding: {
      logoUrl: '/assets/icons/icon.png',
      bannerUrl: '',
      primaryColor: '#123B5A',
      secondaryColor: '#D4AF37'
    }
  });

  const handleBrandingChange = (field: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      branding: { ...prev.branding!, [field]: value }
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'bannerUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      handleBrandingChange(field, reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [activeEditor, setActiveEditor] = useState<'terms' | 'privacy' | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const settingsRef = ref(db, 'sys/system/settings');
        const settingsSnap = await get(settingsRef);
        if (settingsSnap.exists()) {
          setSettings(prev => ({ ...prev, ...settingsSnap.val() }));
        }

        const classesRef = ref(db, 'edu/sch/classes');
        const classesSnap = await get(classesRef);
        if (classesSnap.exists()) {
          setClasses(Object.values(classesSnap.val()));
        }
      } catch (err) {
        console.error("Error fetching settings data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleClassToggle = (classId: string) => {
    setSettings(prev => {
      const current = prev.allowedClasses || [];
      const updated = current.includes(classId) 
        ? current.filter(id => id !== classId)
        : [...current, classId];
      return { ...prev, allowedClasses: updated };
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setSettings(prev => ({
        ...prev,
        [parent]: { ...(prev as any)[parent], [child]: value }
      }));
    } else {
      setSettings(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleToggle = (name: keyof PlatformSettings) => {
    setSettings(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const settingsRef = ref(db, 'sys/system/settings');
      
      await set(settingsRef, {
        ...settings,
        lastUpdated: new Date().toISOString()
      });
      
      setMessage({ type: 'success', text: 'تم تحديث إعدادات المنصة والهوية بنجاح!' });
      setActiveEditor(null);
    } catch (err) {
      setMessage({ type: 'error', text: 'فشل في حفظ التعديلات' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Lucide.RefreshCw className="animate-spin text-blue-600 w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            {activeEditor ? (
              <>
                <Lucide.FileText className="text-blue-600" size={32} />
                {activeEditor === 'terms' ? 'تحرير الشروط والأحكام' : 'تحرير سياسة الخصوصية'}
              </>
            ) : (
              <>
                <Lucide.Settings className="text-blue-600" size={32} />
                إعدادات النظام والمنصة
              </>
            )}
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            {activeEditor ? 'تعديل بنود السياسات الرسمية للمنصة' : 'التحكم في هوية المنصة، بيانات التواصل، والحالة التشغيلية'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeEditor && (
            <button 
              onClick={() => setActiveEditor(null)}
              className="px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all active:scale-95"
            >
              إلغاء
            </button>
          )}
          <button 
            onClick={saveSettings}
            disabled={saving}
            className="btn-premium btn-primary flex items-center gap-2 px-10 py-4 shadow-xl shadow-blue-100"
          >
            {saving ? <Lucide.RefreshCw className="animate-spin w-5 h-5" /> : <Lucide.Save size={20} />}
            <span>{saving ? 'جاري الحفظ...' : 'حفظ كافة التعديلات'}</span>
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-5 rounded-[2rem] flex items-center gap-3 border animate-in slide-in-from-top-4 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
        }`}>
          <div className={`p-2 rounded-xl ${message.type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white`}>
             <Lucide.Info size={20} />
          </div>
          <span className="font-black">{message.text}</span>
        </div>
      )}

      {activeEditor ? (
        <div className="max-w-4xl mx-auto space-y-6">
          <PolicyEditor 
            title={activeEditor === 'terms' ? 'بنود الشروط والأحكام' : 'سياسة الخصوصية والاستخدام'}
            value={activeEditor === 'terms' ? (settings.termsAndConditions || '') : (settings.privacyPolicy || '')}
            onChange={(val) => setSettings(prev => ({
              ...prev,
              [activeEditor === 'terms' ? 'termsAndConditions' : 'privacyPolicy']: val
            }))}
          />
          <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-200 flex items-start gap-4">
            <div className="p-3 bg-white rounded-2xl shadow-sm text-blue-600">
              <Lucide.ShieldCheck size={24} />
            </div>
            <div>
              <p className="font-black text-slate-800 text-sm">تأكد من الحفظ قبل المغادرة</p>
              <p className="text-xs text-slate-500 font-bold mt-1">لا يتم تفعيل التغييرات على المنصة إلا بعد الضغط على زر "حفظ كافة التعديلات" في الأعلى.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-[3rem] p-8 border border-slate-200 shadow-sm space-y-8">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Lucide.Palette className="text-blue-600" size={20} /> الهوية البصرية والشعار
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-sm font-black text-slate-700 block">شعار المنصة الرسمي (Logo)</label>
                  <div className="relative group w-32 h-32 mx-auto md:mx-0">
                    <div className="w-full h-full rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden group-hover:border-blue-400 transition-all">
                      {settings.branding?.logoUrl ? (
                        <img src={settings.branding.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                      ) : (
                        <Lucide.Image className="text-slate-300" size={32} />
                      )}
                    </div>
                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-all cursor-pointer rounded-2xl text-white font-bold text-[10px] gap-2">
                      <Lucide.UploadCloud size={16} /> تغيير الشعار
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logoUrl')} />
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-black text-slate-700 block">صورة الغلاف / البانر (Banner)</label>
                  <div className="relative group w-full h-32">
                    <div className="w-full h-full rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden group-hover:border-blue-400 transition-all">
                      {settings.branding?.bannerUrl ? (
                        <img src={settings.branding.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                      ) : (
                        <Lucide.Image className="text-slate-300" size={32} />
                      )}
                    </div>
                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-all cursor-pointer rounded-2xl text-white font-bold text-[10px] gap-2">
                      <Lucide.UploadCloud size={16} /> رفع بانر جديد
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'bannerUrl')} />
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700">اللون الأساسي (Primary)</label>
                  <div className="flex gap-3 items-center">
                    <input type="color" value={settings.branding?.primaryColor} onChange={(e) => handleBrandingChange('primaryColor', e.target.value)} className="w-12 h-12 rounded-xl cursor-pointer border-none p-0 bg-transparent" />
                    <input type="text" value={settings.branding?.primaryColor} onChange={(e) => handleBrandingChange('primaryColor', e.target.value)} className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700">اللون الذهبي / التميز (Accent)</label>
                  <div className="flex gap-3 items-center">
                    <input type="color" value={settings.branding?.secondaryColor} onChange={(e) => handleBrandingChange('secondaryColor', e.target.value)} className="w-12 h-12 rounded-xl cursor-pointer border-none p-0 bg-transparent" />
                    <input type="text" value={settings.branding?.secondaryColor} onChange={(e) => handleBrandingChange('secondaryColor', e.target.value)} className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[3rem] p-8 border border-slate-200 shadow-sm space-y-8">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Lucide.Globe className="text-blue-600" size={20} /> الهوية والمعلومات الأساسية
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700">اسم المنصة التعليمية</label>
                  <input type="text" name="name" value={settings.name} onChange={handleInputChange} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700">البريد الإلكتروني الرسمي</label>
                  <div className="relative">
                    <Lucide.Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="email" name="contactEmail" value={settings.contactEmail} onChange={handleInputChange} className="w-full pr-12 pl-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700">رقم الهاتف للدعم</label>
                  <div className="relative">
                    <Lucide.Phone className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" name="contactPhone" value={settings.contactPhone} onChange={handleInputChange} className="w-full pr-12 pl-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700">عنوان المقر الرئيسي</label>
                  <div className="relative">
                    <Lucide.MapPin className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" name="address" value={settings.address} onChange={handleInputChange} className="w-full pr-12 pl-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[3rem] p-8 border border-slate-200 shadow-sm space-y-8">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Lucide.MessageSquare className="text-blue-600" size={20} /> قنوات التواصل الاجتماعي
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <Lucide.Facebook className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-600" size={18} />
                  <input type="text" name="social.facebook" placeholder="Facebook URL" value={settings.social?.facebook} onChange={handleInputChange} className="w-full pr-12 pl-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xs" dir="ltr" />
                </div>
                <div className="relative">
                  <Lucide.Twitter className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-400" size={18} />
                  <input type="text" name="social.twitter" placeholder="Twitter URL" value={settings.social?.twitter} onChange={handleInputChange} className="w-full pr-12 pl-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xs" dir="ltr" />
                </div>
                <div className="relative">
                  <Lucide.Instagram className="absolute right-4 top-1/2 -translate-y-1/2 text-pink-600" size={18} />
                  <input type="text" name="social.instagram" placeholder="Instagram URL" value={settings.social?.instagram} onChange={handleInputChange} className="w-full pr-12 pl-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xs" dir="ltr" />
                </div>
                <div className="relative">
                  <Lucide.Youtube className="absolute right-4 top-1/2 -translate-y-1/2 text-red-600" size={18} />
                  <input type="text" name="social.youtube" placeholder="Youtube URL" value={settings.social?.youtube} onChange={handleInputChange} className="w-full pr-12 pl-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xs" dir="ltr" />
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-8">
            <div className="bg-red-50 rounded-[3rem] p-8 border border-red-100 shadow-sm space-y-6">
              <h3 className="text-lg font-black text-red-900 flex items-center gap-2">
                <Lucide.ShieldAlert className="text-red-600" size={20} /> حالة المنصة الحرجة
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-5 bg-white rounded-3xl border border-red-100">
                  <div>
                    <p className="font-black text-slate-900 text-sm">وضع الصيانة</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">منع دخول غير المديرين</p>
                  </div>
                  <button onClick={() => handleToggle('maintenanceMode')} className={`w-14 h-7 rounded-full transition-all relative ${settings.maintenanceMode ? 'bg-red-500' : 'bg-slate-200'}`}>
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${settings.maintenanceMode ? 'left-1' : 'left-8'}`}></div>
                  </button>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-[3rem] p-8 border border-slate-200 shadow-sm space-y-6">
               <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                 <Lucide.FileText className="text-blue-600" size={20} /> السياسات القانونية
               </h3>
               <button onClick={() => setActiveEditor('terms')} className="w-full py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-600 text-xs flex items-center justify-center gap-2 hover:bg-slate-100 transition-all">
                  <Lucide.FileText size={16} /> تعديل الشروط والأحكام
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlatformSettingsPage;
