import React, { useState, useEffect } from 'react';
import {
  UserCircle,
  Phone,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Mail,
  Info,
  School,
  Plus,
  X,
  ChevronDown,
  GraduationCap,
  CreditCard,
  Wallet,
  Smartphone,
  Zap,
  ShieldCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useRegister } from '../../hooks/useRegister';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthInput } from '../../components/auth/AuthInput';
import { RoleSelector } from '../../components/auth/RoleSelector';
import { getDb as db } from '../../services/firebase';
import { ref, get } from 'firebase/database';
import { EDU } from '../../constants/dbPaths';

const AccountPage: React.FC = () => {
  const {
    userType,
    setUserType,
    formData,
    handleInputChange,
    toggleClass,
    loading,
    success,
    error,
    allowRegistration,
    handleSubmit,
    isFormValid,
    showPaymentStep,
    setShowPaymentStep,
    navigate
  } = useRegister();

  const [showPassword, setShowPassword] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);

  useEffect(() => {
    if (userType === 'teacher' || userType === 'student') {
      if (db) {
        get(ref(db, EDU.SCH.CLASSES)).then(snap => {
          if (snap.exists()) {
            setClasses(Object.entries(snap.val()).map(([id, data]: [string, any]) => ({ id, ...data })));
          }
        });
      }
    }
  }, [userType]);

  const handleClassSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const classId = e.target.value;
    const selectedClass = classes.find(c => c.id === classId);
    
    if (selectedClass) {
      // Create a synthetic event to use the existing handleInputChange
      handleInputChange({
        target: { name: 'classId', value: classId }
      } as any);
      handleInputChange({
        target: { name: 'eduLevel', value: selectedClass.level }
      } as any);
      handleInputChange({
        target: { name: 'grade', value: selectedClass.grade }
      } as any);
    } else {
      handleInputChange({
        target: { name: 'classId', value: '' }
      } as any);
    }
  };

  if (allowRegistration === false) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 text-center" dir="rtl">
        <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full space-y-6">
          <div className="flex justify-center">
            <div className="p-4 bg-amber-50 text-amber-600 rounded-full">
              <Info size={48} />
            </div>
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">التسجيل مغلق حالياً</h2>
          <p className="text-slate-500 font-bold leading-relaxed">
            نعتذر، التسجيل لمستخدمين جدد متوقف حالياً من قبل إدارة المنصة. يرجى المحاولة في وقت لاحق.
          </p>
          <button 
            onClick={() => navigate('/login')}
            className="w-full py-4 bg-brand-500 text-white rounded-xl font-bold shadow-lg hover:bg-brand-600 transition-all"
          >
            العودة لتسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#f8fafc]" dir="rtl">
        <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="bg-green-100 p-4 rounded-full animate-bounce">
              <CheckCircle2 className="w-16 h-16 text-green-600" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-slate-800">تم التسجيل بنجاح!</h2>
          <p className="text-slate-600 leading-relaxed">
            مرحباً بك في منصتنا التعليمية. تم إنشاء حسابك بنجاح وجاري تحويلك للوحة التحكم.
          </p>
          <button 
            onClick={() => {
              if (formData.paymentMethod === 'kashy') {
                navigate('/cashipay-payment');
              } else {
                navigate('/pending-approval');
              }
            }}
            className="w-full py-4 bg-brand-500 text-white rounded-xl font-bold shadow-lg hover:bg-brand-600 transition-all flex items-center justify-center gap-2"
          >
            {formData.paymentMethod === 'kashy' ? 'الانتقال لصفحة الدفع' : 'الانتقال لصفحة الانتظار'}
            <ArrowRight className="w-5 h-5 rotate-180" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <AuthLayout 
      title="إنشاء حساب جديد" 
      subtitle="اختر نوع الحساب المناسب لك لتبدأ رحلتك التعليمية"
    >
      <div className="space-y-8">
        <RoleSelector selectedRole={userType as any} onSelectRole={(role) => setUserType(role || 'student')} />

        {userType && (
          <form 
            onSubmit={handleSubmit}
            className="space-y-6 animate-in slide-in-from-bottom-4 duration-500"
          >
            {!showPaymentStep ? (
              <>
                <div className="flex items-center gap-3 pb-2">
                  <div className="h-6 w-1 bg-brand-500 rounded-full"></div>
                  <h3 className="text-lg font-bold text-slate-800">
                    {userType === 'student' && 'بيانات الطالب التعليمية'}
                    {userType === 'teacher' && 'بيانات المعلم وكود التحقق'}
                    {userType === 'parent' && 'بيانات ولي الأمر وربط الأبناء'}
                    {userType === 'admin' && 'بيانات مسؤول النظام'}
                  </h3>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border-r-4 border-red-500 text-red-700 flex items-center gap-3 rounded-xl text-[13px] font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}
                {/* ... existing fields ... */}

            <AuthInput 
              label="البريد الإلكتروني (اختياري)"
              icon={Mail}
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="example@email.com"
              dir="ltr"
            />

            {(userType === 'teacher' || userType === 'parent' || userType === 'admin') && (
              <AuthInput 
                label="الاسم الكامل"
                icon={UserCircle}
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="الاسم الكامل كما في الهوية"
                required
              />
            )}

            {(userType === 'student' || userType === 'teacher') && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-slate-700 block mr-1">الاسم الأول</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500/30 transition-all font-bold text-sm"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-slate-700 block mr-1">
                    {userType === 'student' ? 'اسم العائلة' : 'الاسم الثاني'}
                  </label>
                  <input
                    type="text"
                    name={userType === 'student' ? 'lastName' : 'secondName'}
                    value={userType === 'student' ? formData.lastName : formData.secondName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500/30 transition-all font-bold text-sm"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[13px] font-bold text-slate-700 block mr-1">رقم الهاتف</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Phone size={18} />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="09xxxxxxxx"
                    dir="ltr"
                    className="w-full pr-12 pl-4 py-4 border rounded-2xl outline-none transition-all font-bold text-sm bg-slate-50 border-slate-100 focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500/30"
                    required
                  />
                </div>
              </div>
            </div>

            {userType === 'student' && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[13px] font-bold text-slate-700 block mr-1 flex items-center gap-2">
                    <GraduationCap size={16} className="text-brand-500" />
                    اختر المرحلة الدراسية
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'primary', label: 'ابتدائي' },
                      { id: 'middle', label: 'متوسط' },
                      { id: 'high', label: 'ثانوي' }
                    ].map(level => (
                      <button
                        key={level.id}
                        type="button"
                        onClick={() => {
                          handleInputChange({ target: { name: 'eduLevel', value: level.id } } as any);
                          handleInputChange({ target: { name: 'classId', value: '' } } as any);
                        }}
                        className={`py-3 rounded-xl text-xs font-black transition-all border-2 ${
                          formData.eduLevel === level.id 
                          ? 'border-brand-500 bg-brand-50 text-brand-600 shadow-sm' 
                          : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                        }`}
                      >
                        {level.label}
                      </button>
                    ))}
                  </div>
                </div>

                {formData.eduLevel && (
                  <div className="space-y-3 animate-in slide-in-from-top-2">
                    <label className="text-[13px] font-bold text-slate-700 block mr-1 flex items-center gap-2">
                      <School size={16} className="text-brand-500" />
                      اختر فصلك الدراسي
                    </label>
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-3 bg-slate-50 rounded-[2rem] border border-slate-100">
                      {classes
                        .filter(c => c.level === formData.eduLevel)
                        .map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleClassSelect({ target: { value: c.id } } as any)}
                            className={`px-4 py-2.5 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-2 ${
                              formData.classId === c.id
                              ? 'bg-brand-500 text-white border-brand-500 shadow-md shadow-brand-500/20'
                              : 'bg-white text-slate-500 border-slate-200 hover:border-brand-300'
                            }`}
                          >
                            {formData.classId === c.id ? <CheckCircle2 size={14} /> : <Plus size={14} />}
                            {c.name} (الصف {c.grade})
                          </button>
                        ))
                      }
                      {classes.filter(c => c.level === formData.eduLevel).length === 0 && (
                        <p className="text-xs text-slate-400 italic p-4 w-full text-center">لا توجد فصول مضافة لهذه المرحلة حالياً.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {userType === 'teacher' && (
              <>
                <AuthInput 
                  label="كود الدعوة"
                  icon={Info}
                  type="text"
                  name="inviteCode"
                  value={formData.inviteCode}
                  onChange={handleInputChange}
                  placeholder="أدخل كود الدعوة الممنوح لك"
                  required
                />

                <div className="space-y-3">
                  <label className="text-sm font-black text-slate-700 flex items-center gap-2">
                    <School className="w-5 h-5 text-brand-500" /> الفصول التي تود الإشراف عليها
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-3 bg-slate-50 rounded-[2rem] border border-slate-100">
                    {classes.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleClass(c.id)}
                        className={`px-4 py-2 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-2 ${
                          formData.selectedClasses.includes(c.id)
                          ? 'bg-brand-500 text-white border-brand-500 shadow-md shadow-brand-500/20'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-brand-300'
                        }`}
                      >
                        {formData.selectedClasses.includes(c.id) ? <X size={14} /> : <Plus size={14} />}
                        {c.name} ({c.level === 'primary' ? 'ابتدائي' : 'متوسط'} - {c.grade})
                      </button>
                    ))}
                    {classes.length === 0 && <p className="text-xs text-slate-400 italic p-2 w-full text-center">جاري تحميل الفصول...</p>}
                  </div>
                  <p className="text-[10px] text-slate-400 mr-2">سيتم إرسال طلبات الإشراف للإدارة للموافقة عليها.</p>
                </div>
              </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-50">
              <AuthInput 
                label="كلمة المرور"
                icon={Lock}
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••"
                required
              />
              <AuthInput 
                label="تأكيد كلمة المرور"
                icon={Lock}
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="••••••••"
                required
              />
            </div>
            </>
            ) : null}

            <div className="pt-6">
              {!showPaymentStep ? (
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-4 rounded-2xl font-black text-base transition-all shadow-sm ${
                    !loading
                      ? 'bg-brand-500 text-white hover:bg-brand-600 shadow-xl shadow-brand-500/20 active:scale-[0.98]'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'إنشاء الحساب'}
                </button>
              ) : (
                <div className="space-y-6 animate-in zoom-in-95">
                  <div className="flex justify-between items-center bg-brand-50 p-4 rounded-2xl border border-brand-100">
                    <div className="flex items-center gap-2">
                       <CreditCard className="text-brand-600" size={20} />
                       <span className="text-sm font-black text-slate-800">اختر وسيلة الدفع المناسبة</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setShowPaymentStep(false)}
                      className="text-xs font-bold text-slate-400 hover:text-red-500"
                    >تغيير البيانات</button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'cash', name: 'نقداً', desc: 'في المركز', icon: Wallet },
                      { id: 'bankak', name: 'بنكك', desc: 'تحويل مباشر', icon: Smartphone },
                      { id: 'kashy', name: 'كاشي', desc: 'دفع فوري', icon: Zap },
                      { id: 'syberpay', name: 'سايبرباي', desc: 'بوابة سودانية', icon: ShieldCheck },
                      { id: 'fawry', name: 'فوري', desc: 'عبر البطاقة', icon: CreditCard },
                      { id: 'visa', name: 'فيزا/ماستر', desc: 'بطاقة دولية', icon: CreditCard }
                    ].map(method => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => handleInputChange({ target: { name: 'paymentMethod', value: method.id } } as any)}
                        className={`p-4 rounded-[2rem] border-2 transition-all text-right flex flex-col gap-2 relative overflow-hidden group ${
                          formData.paymentMethod === method.id 
                          ? 'border-brand-500 bg-brand-50 shadow-md' 
                          : 'border-slate-100 bg-white hover:border-brand-200'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          formData.paymentMethod === method.id ? 'bg-brand-500 text-white' : 'bg-slate-50 text-slate-400 group-hover:text-brand-500'
                        }`}>
                          <method.icon size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800">{method.name}</p>
                          <p className="text-[10px] font-bold text-slate-400">{method.desc}</p>
                        </div>
                        {formData.paymentMethod === method.id && (
                          <div className="absolute -top-1 -right-1">
                            <div className="bg-brand-500 p-1 rounded-bl-xl text-white">
                              <CheckCircle2 size={12} />
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100/50">
                    <p className="text-[11px] font-bold text-amber-700 leading-relaxed text-center">
                      سيتم مراجعة طلبك وإتمام عملية الدفع لتنشيط حسابك بالكامل. يمكنك البدء في استخدام المنصة فور التأكيد.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-5 bg-brand-500 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-brand-500/20 hover:bg-brand-600 transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"
                  >
                    {loading ? (
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    ) : (
                      <>
                        إكمال إنشاء الحساب
                        <ArrowRight className="w-5 h-5 rotate-180 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              )}
              <div className="text-center mt-6">
                <p className="text-[13px] font-bold text-slate-400">
                  لديك حساب بالفعل؟ <Link to="/login" className="text-brand-600 hover:underline mr-1 font-black">سجل دخولك هنا</Link>
                </p>
              </div>
            </div>
          </form>
        )}

        <p className="text-center text-slate-400 text-[11px] font-bold px-4">
          بالضغط على إنشاء، أنت توافق على <button className="text-slate-600 underline">شروط الخدمة</button> و <button className="text-slate-600 underline">سياسة الخصوصية</button>
        </p>
      </div>
    </AuthLayout>
  );
};

export default AccountPage;
