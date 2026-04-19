import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Shield,
  Save,
  Camera,
  CheckCircle2,
  Clock,
  Briefcase,
  MapPin,
  Loader2,
  Users,
  Copy,
  RefreshCw,
  Link,
  QrCode
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { TelegramService } from '../../services/telegram.service';
import { ref, update, get } from 'firebase/database';
import { SYS } from '../../constants/dbPaths';
import { generateParentInviteCode, getStudentParents } from '../../utils/parentInviteCodes';

const ProfilePage: React.FC = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [inviteCode, setInviteCode] = useState<string>('');
  const [generatingCode, setGeneratingCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkedParents, setLinkedParents] = useState<Array<{ uid: string; email: string; fullName?: string; phone?: string }>>([]);
  const [loadingParents, setLoadingParents] = useState(false);
// ...
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.uid) return;

    setUploading(true);
    try {
      const res = await TelegramService.uploadFile(file, 'profiles', profile.uid);
      if (res.success && res.url) {
        await update(ref(db, SYS.user(profile.uid)), {
          photoURL: res.url
        });
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      alert("فشل رفع الصورة");
    } finally {
      setUploading(false);
    }
  };

  // Load existing invite code and parents
  useEffect(() => {
    if (profile?.role === 'student' && profile?.uid) {
      // Set current invite code if exists
      setInviteCode(profile.parentInviteCode || '');

      // Load linked parents
      setLoadingParents(true);
      getStudentParents(profile.uid).then(parents => {
        setLinkedParents(parents);
        setLoadingParents(false);
      }).catch(() => {
        setLoadingParents(false);
      });
    }
  }, [profile?.uid, profile?.role, profile?.parentInviteCode]);

  // Generate new invite code
  const handleGenerateCode = async () => {
    if (!profile?.uid) return;
    
    setGeneratingCode(true);
    try {
      const newCode = await generateParentInviteCode(profile.uid, 7);
      setInviteCode(newCode);
      setCopied(false);
    } catch (error: any) {
      alert(error.message || 'فشل إنشاء الرمز');
    } finally {
      setGeneratingCode(false);
    }
  };

  // Copy code to clipboard
  const handleCopyCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  const [formData, setFormData] = useState({
    fullName: profile?.fullName || profile?.firstName + ' ' + profile?.lastName || '',
    phone: profile?.phone || '',
    address: profile?.address || ''
  });

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid) return;

    setLoading(true);
    try {
      await update(ref(db, SYS.user(profile.uid)), formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تحديث البيانات');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-700 pb-10" dir="rtl">
      {/* Header Profile Card */}
      <div className="bg-white rounded-[3.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative group">
        <div className="h-40 bg-gradient-to-r from-blue-600 to-indigo-700 relative">
           <div className="absolute top-0 right-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
        </div>
        <div className="px-10 pb-10 -mt-16 relative z-10 flex flex-col md:flex-row items-end gap-8 text-right">
          <div className="relative group/avatar">
            <div className="w-40 h-40 bg-white p-2 rounded-[3rem] shadow-2xl overflow-hidden">
              {profile?.photoURL ? (
                <img src={profile.photoURL} alt="profile" className="w-full h-full object-cover rounded-[2.5rem]" />
              ) : (
                <div className="w-full h-full bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-blue-600 font-black text-5xl border border-slate-100">
                  {profile?.fullName?.[0] || profile?.firstName?.[0]}
                </div>
              )}
            </div>
            <label className="absolute bottom-4 left-4 p-3 bg-blue-600 text-white rounded-2xl shadow-lg border-4 border-white hover:scale-110 transition-all opacity-0 group-hover/avatar:opacity-100 cursor-pointer">
              {uploading ? <Loader2 className="animate-spin" size={20} /> : <Camera size={20} />}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
            </label>
          </div>
          <div className="flex-1 space-y-2 mb-4">
            <div className="flex items-center gap-3">
               <h1 className="text-3xl font-black text-slate-900">{profile?.fullName || `${profile?.firstName} ${profile?.lastName}`}</h1>
               <span className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
                 {profile?.role === 'admin' ? 'مدير نظام' : profile?.role === 'teacher' ? 'معلم' : 'طالب'}
               </span>
            </div>
            <p className="text-slate-400 font-bold flex items-center gap-2">
              <Mail size={16} />
              {profile?.email}
            </p>
          </div>
          <div className="hidden lg:flex gap-4 mb-6">
             <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100 text-center px-8">
                <span className="block text-slate-400 font-black text-[10px] uppercase tracking-tighter mb-1">تاريخ الانضمام</span>
                <span className="font-black text-slate-800 text-sm">{new Date(profile?.createdAt || '').toLocaleDateString('ar-SA')}</span>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Settings Form */}
        <div className="lg:col-span-2 space-y-8">
          <form onSubmit={handleUpdate} className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-slate-100 space-y-8">
            <div className="flex items-center justify-between border-b border-slate-50 pb-6">
               <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                 <User className="text-blue-600" />
                 تعديل المعلومات الشخصية
               </h3>
               {success && (
                 <div className="flex items-center gap-2 text-green-600 font-black text-sm animate-in fade-in slide-in-from-left-2">
                    <CheckCircle2 size={18} />
                    تم الحفظ بنجاح
                 </div>
               )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-sm font-black text-slate-700 mr-2">الاسم الكامل</label>
                <div className="relative">
                  <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
                  <input 
                    type="text" 
                    className="w-full pr-12 pl-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 font-bold transition-all"
                    value={formData.fullName}
                    onChange={e => setFormData({...formData, fullName: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-black text-slate-700 mr-2">رقم الهاتف</label>
                <div className="relative">
                  <Phone className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
                  <input 
                    type="tel" 
                    className="w-full pr-12 pl-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 font-bold transition-all"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="col-span-full space-y-3">
                <label className="text-sm font-black text-slate-700 mr-2">العنوان / السكن</label>
                <div className="relative">
                  <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
                  <input 
                    type="text" 
                    className="w-full pr-12 pl-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 font-bold transition-all"
                    value={formData.address}
                    placeholder="المدينة، الحي..."
                    onChange={e => setFormData({...formData, address: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-3 active:scale-95 disabled:bg-slate-300"
            >
              {loading ? <Clock className="animate-spin" /> : <Save size={20} />}
              حفظ التغييرات
            </button>
          </form>

          {/* Security & Password */}
          <div className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-slate-100 space-y-8">
             <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
               <Shield className="text-red-500" />
               الأمان وكلمة المرور
             </h3>
             <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-red-50 rounded-3xl border border-red-100">
                <div>
                   <p className="font-black text-red-900">تغيير كلمة المرور</p>
                   <p className="text-xs font-bold text-red-600 mt-1">يُنصح بتحديث كلمة المرور دورياً لحماية حسابك.</p>
                </div>
                <button className="px-8 py-3 bg-white text-red-600 rounded-2xl font-black text-sm shadow-sm hover:bg-red-600 hover:text-white transition-all">
                   تحديث الآن
                </button>
             </div>
          </div>

          {/* Parent Invitation Section - Only for Students */}
          {profile?.role === 'student' && (
            <div className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-slate-100 space-y-8">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                <Users className="text-purple-500" />
                دعوة ولي الأمر للربط مع الحساب
              </h3>
              
              <div className="space-y-6">
                <div className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-3xl border border-purple-100">
                  <div className="flex items-start gap-4 mb-4">
                    <QrCode className="text-purple-600 flex-shrink-0 mt-1" size={24} />
                    <div>
                      <p className="font-black text-purple-900 mb-2">رمز الدعوة لولي الأمر</p>
                      <p className="text-sm font-bold text-purple-700 leading-relaxed">
                        شارك هذا الرمز مع ولي الأمر للسماح له بالربط مع حسابك. الرمز صالح لمدة 7 أيام.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 border-2 border-dashed border-purple-300">
                    {inviteCode ? (
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-xs font-bold text-slate-500 mb-2">رمز الدعوة الحالي</p>
                          <p className="text-3xl font-black text-purple-700 tracking-[0.3em] font-mono">
                            {inviteCode}
                          </p>
                        </div>
                        <button
                          onClick={handleCopyCode}
                          className="p-3 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 transition-all flex items-center gap-2"
                          title="نسخ الرمز"
                        >
                          {copied ? <CheckCircle2 size={20} /> : <Copy size={20} />}
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-slate-500 font-bold mb-4">لم يتم إنشاء رمز دعوة بعد</p>
                        <button
                          onClick={handleGenerateCode}
                          disabled={generatingCode}
                          className="px-6 py-3 bg-purple-600 text-white rounded-xl font-black hover:bg-purple-700 transition-all disabled:bg-slate-300 flex items-center gap-2 mx-auto"
                        >
                          {generatingCode ? <Loader2 className="animate-spin" size={20} /> : <RefreshCw size={20} />}
                          إنشاء رمز جديد
                        </button>
                      </div>
                    )}
                  </div>

                  {inviteCode && (
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        onClick={handleGenerateCode}
                        disabled={generatingCode}
                        className="px-4 py-2 bg-white text-purple-700 rounded-xl font-bold text-sm hover:bg-purple-50 transition-all border border-purple-200 disabled:bg-slate-100 flex items-center gap-2"
                      >
                        <RefreshCw size={16} className={generatingCode ? 'animate-spin' : ''} />
                        إعادة إنشاء الرمز
                      </button>
                      <a
                        href="/parent-accept"
                        className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-all flex items-center gap-2"
                      >
                        <Link size={16} />
                        صفحة قبول ولي الأمر
                      </a>
                    </div>
                  )}
                </div>

                {/* Linked Parents List */}
                <div>
                  <h4 className="font-black text-slate-800 flex items-center gap-2 mb-4">
                    <Users size={18} className="text-blue-600" />
                    أولياء الأمور المرتبطين ({linkedParents.length})
                  </h4>
                  
                  {loadingParents ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="animate-spin text-slate-400" size={24} />
                    </div>
                  ) : linkedParents.length > 0 ? (
                    <div className="space-y-3">
                      {linkedParents.map(parent => (
                        <div key={parent.uid} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 font-black">
                            <Users size={20} />
                          </div>
                          <div className="flex-1">
                            <p className="font-black text-slate-800">{parent.fullName || 'ولي الأمر'}</p>
                            <p className="text-xs font-bold text-slate-500">{parent.email}</p>
                            {parent.phone && <p className="text-xs font-bold text-slate-500">{parent.phone}</p>}
                          </div>
                          <CheckCircle2 className="text-green-500" size={20} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                      <p className="text-slate-500 font-bold">لم يتم ربط أي أولياء أمور بعد</p>
                      <p className="text-xs text-slate-400 mt-2">شارك رمز الدعوة أعلاه للسماح لولي الأمر بالربط</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Account Info Sidebar */}
        <div className="space-y-8">
           <div className="bg-slate-900 p-8 rounded-[3.5rem] text-white space-y-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              <h3 className="text-xl font-black flex items-center gap-3">
                 <Shield className="text-blue-400" />
                 تفاصيل الحساب
              </h3>
              <div className="space-y-6">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-blue-400 border border-white/5">
                       <Clock size={20} />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">آخر ظهور</p>
                       <p className="font-bold text-sm">نشط الآن</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-green-400 border border-white/5">
                       <CheckCircle2 size={20} />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">حالة الحساب</p>
                       <p className="font-bold text-sm text-green-400">موثق ومعتمد ✅</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-orange-400 border border-white/5">
                       <Briefcase size={20} />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">نوع الصلاحية</p>
                       <p className="font-bold text-sm">{profile?.role.toUpperCase()}</p>
                    </div>
                 </div>
              </div>
              <div className="p-6 bg-blue-600/20 rounded-[2.5rem] border border-blue-500/20">
                 <p className="text-xs font-bold text-blue-100 leading-relaxed italic">
                   "التعليم هو أقوى سلاح يمكنك استخدامه لتغيير العالم." - نيلسون مانديلا
                 </p>
              </div>
           </div>

           {/* Quick Actions */}
           <div className="bg-white p-8 rounded-[3.5rem] border border-slate-100 shadow-sm space-y-6">
              <h3 className="text-lg font-black text-slate-800">إعدادات سريعة</h3>
              <div className="space-y-3">
                 <button className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl font-bold text-slate-600 hover:bg-slate-100 transition-all">
                    <span>اللغة / Language</span>
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">العربية</span>
                 </button>
                 <button className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl font-bold text-slate-600 hover:bg-slate-100 transition-all">
                    <span>الوضع الليلي</span>
                    <div className="w-10 h-6 bg-slate-200 rounded-full relative">
                       <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                    </div>
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
