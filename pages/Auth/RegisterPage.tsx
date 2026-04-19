/**
 * Registration Page - Modern Stepper Design
 * صفحة إنشاء الحساب - تصميم عصري متعدد الخطوات
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User, Users, GraduationCap, Shield, QrCode, Camera, Copy,
  CheckCircle, AlertCircle, XCircle, Loader2, Eye, EyeOff, Mail, Phone,
  Lock, School, ArrowRight, ArrowLeft, X, CreditCard, FileText, Upload,
  Zap, BookOpen, Moon, Sun, ChevronLeft
} from 'lucide-react';
import { validateParentInviteCode } from '../../utils/parentLinkRequests';
import { useRegister } from '../../hooks/useRegister';
import { db } from '../../services/firebase';
import { ref, get } from 'firebase/database';
import { EDU } from '../../constants/dbPaths';
import IdentityDocumentUpload from '../../components/parent/IdentityDocumentUpload';
import type { IdentityDocumentData } from '../../components/parent/IdentityDocumentUpload';
import { saveParentIdentityDocument } from '../../services/identityDocument.service';

type RegistrationStep = 'role' | 'info' | 'education' | 'parent-code' | 'identity-upload' | 'password' | 'success';
type UserRole = 'student' | 'teacher' | 'parent' | 'admin';

// Step Configuration
const stepConfig: Record<UserRole, RegistrationStep[]> = {
  student: ['role', 'info', 'education', 'password', 'success'],
  teacher: ['role', 'info', 'password', 'success'],
  parent: ['role', 'info', 'parent-code', 'identity-upload', 'password', 'success'],
  admin: ['role', 'info', 'password', 'success']
};

const RegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    userType, setUserType, formData, handleInputChange, loading, success, error,
    handleSubmit, isFormValid, allowRegistration
  } = useRegister();

  // UI State
  const [step, setStep] = useState<RegistrationStep>('role');
  const [darkMode, setDarkMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [parentCode, setParentCode] = useState('');
  const [parentCodeValid, setParentCodeValid] = useState(false);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [validatingCode, setValidatingCode] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  // Identity document state
  const [identityDocUploaded, setIdentityDocUploaded] = useState(false);
  const [identityDocData, setIdentityDocData] = useState<IdentityDocumentData | null>(null);
  const [createdParentUid, setCreatedParentUid] = useState<string | null>(null);

  // Load classes for student/teacher
  useEffect(() => {
    if ((userType === 'teacher' || userType === 'student') && db) {
      get(ref(db, EDU.SCH.CLASSES)).then(snap => {
        if (snap.exists()) {
          setClasses(Object.entries(snap.val()).map(([id, data]: [string, any]) => ({ id, ...data })));
        }
      });
    }
  }, [userType]);

  // Auto-hide error banner after 5 seconds
  useEffect(() => {
    if (errorBanner) {
      const timer = setTimeout(() => setErrorBanner(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorBanner]);

  // Handle role selection
  const handleRoleSelect = (role: UserRole) => {
    setUserType(role);
    setStep('info');
  };

  // Validate parent invite code
  const handleValidateParentCode = async () => {
    if (!parentCode.trim()) {
      setErrorBanner('يرجى إدخال رمز الدعوة');
      return;
    }

    setValidatingCode(true);
    try {
      const result = await validateParentInviteCode(parentCode.trim().toUpperCase());

      if (result.valid && result.studentUid) {
        setParentCodeValid(true);
        setStudentInfo({
          uid: result.studentUid,
          fullName: result.studentName,
          email: result.studentEmail,
          className: result.studentClassName,
          eduLevel: result.studentEduLevel
        });
        setErrorBanner(null);
      } else {
        setParentCodeValid(false);
        setStudentInfo(null);
        setErrorBanner(result.errorMessage || 'رمز الدعوة غير صالح');
      }
    } catch (e: any) {
      setParentCodeValid(false);
      setStudentInfo(null);
      setErrorBanner(e.message || 'حدث خطأ أثناء التحقق');
    } finally {
      setValidatingCode(false);
    }
  };

  // Next step
  const nextStep = () => {
    setErrorBanner(null);

    // Validation before proceeding
    if (step === 'info') {
      if (userType === 'student' || userType === 'teacher') {
        if (!formData.firstName?.trim()) {
          setErrorBanner('يرجى إدخال الاسم الأول');
          return;
        }
        if (!formData.lastName?.trim() && userType === 'student') {
          setErrorBanner('يرجى إدخال اسم العائلة');
          return;
        }
        if (!formData.secondName?.trim() && userType === 'teacher') {
          setErrorBanner('يرجى إدخال الاسم الثاني');
          return;
        }
      } else {
        if (!formData.fullName?.trim()) {
          setErrorBanner('يرجى إدخال الاسم الكامل');
          return;
        }
      }
      if (!formData.phone?.trim()) {
        setErrorBanner('يرجى إدخال رقم الهاتف');
        return;
      }
    }

    if (step === 'education' && userType === 'student') {
      if (!formData.eduLevel) {
        setErrorBanner('يرجى اختيار المرحلة الدراسية');
        return;
      }
      if (!formData.classId) {
        setErrorBanner('عليك اختيار الفصل الدراسي!');
        return;
      }
    }

    if (step === 'parent-code') {
      if (!parentCodeValid) {
        setErrorBanner('يرجى التحقق من رمز الدعوة أولاً');
        return;
      }
    }

    if (step === 'password') {
      if (!formData.password) {
        setErrorBanner('يرجى إدخال كلمة المرور');
        return;
      }
      if (formData.password.length < 8) {
        setErrorBanner('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setErrorBanner('كلمتا المرور غير متطابقتين');
        return;
      }
      if ((userType === 'student' || userType === 'admin') && !formData.gender) {
        setErrorBanner('يرجى اختيار الجنس');
        return;
      }
    }

    // Move to next step
    const steps = stepConfig[userType];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  // Previous step
  const prevStep = () => {
    setErrorBanner(null);
    const steps = stepConfig[userType];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  // Submit form
  const handleFinalSubmit = async () => {
    setErrorBanner(null);

    if (!formData.password) {
      setErrorBanner('يرجى إدخال كلمة المرور');
      return;
    }

    if (formData.password.length < 8) {
      setErrorBanner('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorBanner('كلمتا المرور غير متطابقتين');
      return;
    }

    if (userType === 'parent' && !parentCodeValid) {
      setErrorBanner('يرجى التحقق من رمز دعوة الطالب');
      return;
    }

    if (userType === 'parent' && !identityDocUploaded) {
      setErrorBanner('يرجى رفع مستند إثبات الهوية قبل المتابعة');
      return;
    }

    // For parents, store registration data in window for use during account creation
    if (userType === 'parent' && identityDocData && studentInfo) {
      (window as any).__parentRegistrationData = {
        studentInfo: {
          uid: studentInfo.uid,
          fullName: studentInfo.fullName
        },
        identityDocData: {
          fileUrl: identityDocData.fileUrl,
          documentType: identityDocData.documentType,
          uploadedAt: identityDocData.uploadedAt,
          fileName: identityDocData.fileName,
          fileId: identityDocData.fileId,
          shortId: identityDocData.shortId
        }
      };
    }

    // Call the submit handler
    const result = await handleSubmit();

    // After successful account creation, save identity document for parent
    if (result?.success && result.uid && userType === 'parent' && identityDocData) {
      await handleAccountCreated(result.uid);
      // Clean up window data
      delete (window as any).__parentRegistrationData;
    }
  };

  // Handle identity document upload success during registration
  const handleIdentityUploadSuccess = async (documentData: IdentityDocumentData) => {
    setIdentityDocData(documentData);
    setIdentityDocUploaded(true);
    setErrorBanner(null);
  };

  // Handle account creation success - save identity document
  const handleAccountCreated = async (parentUid: string) => {
    setCreatedParentUid(parentUid);

    // Save identity document if uploaded
    if (identityDocUploaded && identityDocData) {
      try {
        const result = await saveParentIdentityDocument(parentUid, identityDocData);
        if (result.success) {
          console.log('✅ Identity document saved successfully');
        } else {
          console.error('Failed to save identity document:', result.errorMessage);
        }
      } catch (error) {
        console.error('Error saving identity document:', error);
      }
    }
  };

  // Get current step index
  const getCurrentStepIndex = (): number => {
    const steps = stepConfig[userType];
    return steps.indexOf(step);
  };

  // Get step title and description
  const getStepInfo = (): { title: string; subtitle: string; icon: React.ReactNode } => {
    switch (step) {
      case 'role':
        return {
          title: 'إنشاء حساب جديد',
          subtitle: 'اختر نوع الحساب المناسب لك',
          icon: <Zap className="w-6 h-6 md:w-8 md:h-8" />
        };
      case 'info':
        return {
          title: userType === 'student' ? 'بيانات الطالب' : userType === 'parent' ? 'بيانات ولي الأمر' : userType === 'teacher' ? 'بيانات المعلم' : 'بيانات المشرف',
          subtitle: 'أدخل بياناتك الشخصية',
          icon: <User className="w-6 h-6 md:w-8 md:h-8" />
        };
      case 'education':
        return {
          title: 'البيانات التعليمية',
          subtitle: 'اختر مرحلتك وفصلك الدراسي',
          icon: <School className="w-6 h-6 md:w-8 md:h-8" />
        };
      case 'parent-code':
        return {
          title: 'ربط بالطالب',
          subtitle: 'أدخل رمز الدعوة من الطالب',
          icon: <Users className="w-6 h-6 md:w-8 md:h-8" />
        };
      case 'identity-upload':
        return {
          title: 'إثبات الهوية',
          subtitle: 'ارفع مستند رسمي يثبت هويتك',
          icon: <CreditCard className="w-6 h-6 md:w-8 md:h-8" />
        };
      case 'password':
        return {
          title: 'كلمة المرور',
          subtitle: 'اختر كلمة مرور آمنة لحسابك',
          icon: <Lock className="w-6 h-6 md:w-8 md:h-8" />
        };
      case 'success':
        return {
          title: 'تم بنجاح!',
          subtitle: 'تم إنشاء حسابك بنجاح',
          icon: <CheckCircle className="w-6 h-6 md:w-8 md:h-8" />
        };
      default:
        return { title: '', subtitle: '', icon: null };
    }
  };

  // Get step icon color
  const getStepIconColor = (): string => {
    switch (userType) {
      case 'student': return 'from-blue-500 to-cyan-500';
      case 'teacher': return 'from-emerald-500 to-teal-500';
      case 'parent': return 'from-purple-500 to-pink-500';
      case 'admin': return 'from-amber-500 to-orange-500';
      default: return 'from-blue-500 to-purple-500';
    }
  };

  // Role cards data
  const roleCards = [
    { role: 'student' as UserRole, icon: GraduationCap, label: 'طالب', desc: 'تعلم ومتابعة دراسية', color: 'from-blue-500 to-cyan-500' },
    { role: 'teacher' as UserRole, icon: BookOpen, label: 'معلم', desc: 'تدريس وإدارة الفصول', color: 'from-emerald-500 to-teal-500' },
    { role: 'parent' as UserRole, icon: Users, label: 'ولي أمر', desc: 'متابعة الأبناء', color: 'from-purple-500 to-pink-500' },
    { role: 'admin' as UserRole, icon: Shield, label: 'مشرف', desc: 'إدارة المنصة', color: 'from-amber-500 to-orange-500' }
  ];

  // If registration is closed
  if (allowRegistration === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl max-w-md w-full space-y-6 text-center">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-10 h-10 text-amber-600" />
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800">التسجيل مغلق حالياً</h2>
          <p className="text-slate-500 font-medium">نعتذر، التسجيل لمستخدمين جدد متوقف حالياً</p>
          <Link
            to="/login"
            className="block w-full py-4 bg-brand-500 text-white rounded-2xl font-bold shadow-lg hover:bg-brand-600 transition-all"
          >
            العودة لتسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (success || step === 'success') {
    const isParent = userType === 'parent';
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl max-w-md w-full space-y-6 text-center animate-in zoom-in-95">
          <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-black text-slate-800">تم إنشاء الحساب بنجاح! 🎉</h2>
          <p className="text-slate-500 font-medium">
            {isParent
              ? 'تم رفع مستند هويتك وحسابك قيد المراجعة'
              : 'مرحباً بك في منصتنا التعليمية'}
          </p>
          {isParent && (
            <div className="bg-purple-50 rounded-2xl p-4 border-2 border-purple-200">
              <p className="text-sm text-purple-700">
                سيتم مراجعة مستند هويتك من قبل الإدارة. ستتلقى إشعاراً عند الموافقة.
              </p>
            </div>
          )}
          <Link
            to="/login"
            className="block w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-2xl font-black shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
          >
            تسجيل الدخول
            <ArrowRight className="w-5 h-5 rotate-180" />
          </Link>
        </div>
      </div>
    );
  }

  const stepInfo = getStepInfo();
  const steps = stepConfig[userType];
  const currentStepIndex = getCurrentStepIndex();
  const isLastStep = step === steps[steps.length - 2]; // Before success

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 to-blue-50'}`} dir="rtl">
      {/* Fixed Top Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 ${darkMode ? 'bg-slate-800/95' : 'bg-white/95'} backdrop-blur-md shadow-lg border-b ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br ${getStepIconColor()} rounded-xl flex items-center justify-center shadow-lg`}>
              <Zap className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div className="hidden md:block">
              <h1 className="font-black text-slate-800 text-lg">إنشاء حساب جديد</h1>
              <p className="text-xs text-slate-500">منصة التعليم الذكي</p>
            </div>
          </div>

          {/* Step Progress */}
          <div className="flex items-center gap-2">
            {steps.filter(s => s !== 'role' && s !== 'success').map((s, idx) => {
              const isCompleted = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (
                <div
                  key={s}
                  className={`w-8 md:w-10 h-1.5 md:h-2 rounded-full transition-all ${
                    isCompleted ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                    isCurrent ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-slate-200'
                  }`}
                />
              );
            })}
          </div>

          {/* Dark Mode Toggle & Close */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg transition-all ${darkMode ? 'bg-slate-700 text-yellow-400' : 'bg-slate-100 text-slate-600'}`}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link
              to="/login"
              className={`p-2 rounded-lg transition-all ${darkMode ? 'bg-slate-700 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-400 hover:text-slate-600'}`}
            >
              <X className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Error Banner - Fixed below header */}
      {errorBanner && (
        <div className="fixed top-[60px] md:top-[72px] left-0 right-0 z-40 animate-in slide-in-from-top">
          <div className="max-w-4xl mx-auto px-4">
            <div className="bg-red-500 text-white rounded-xl p-4 flex items-center gap-3 shadow-xl">
              <XCircle className="w-5 h-5 shrink-0" />
              <p className="font-bold text-sm flex-1">{errorBanner}</p>
              <button onClick={() => setErrorBanner(null)} className="p-1 hover:bg-red-600 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global error from useRegister */}
      {error && !errorBanner && (
        <div className="fixed top-[60px] md:top-[72px] left-0 right-0 z-40 animate-in slide-in-from-top">
          <div className="max-w-4xl mx-auto px-4">
            <div className="bg-red-500 text-white rounded-xl p-4 flex items-center gap-3 shadow-xl">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="font-bold text-sm flex-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="pt-[80px] md:pt-[96px] pb-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Step Header */}
          <div className="text-center mb-6 md:mb-8">
            <div className={`w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br ${getStepIconColor()} rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto shadow-2xl mb-4`}>
              {stepInfo.icon}
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-2">{stepInfo.title}</h2>
            <p className="text-sm md:text-base text-slate-500">{stepInfo.subtitle}</p>
          </div>

          {/* Role Selection */}
          {step === 'role' && (
            <div className="grid grid-cols-2 gap-3 md:gap-4 animate-in fade-in zoom-in-95">
              {roleCards.map(({ role, icon: Icon, label, desc, color }) => (
                <button
                  key={role}
                  onClick={() => handleRoleSelect(role)}
                  className="group p-4 md:p-6 bg-white rounded-2xl border-2 border-slate-100 hover:border-transparent hover:shadow-2xl transition-all duration-300 text-center space-y-3 md:space-y-4 relative overflow-hidden"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                  <div className="relative z-10">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-50 group-hover:bg-white/20 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto transition-all">
                      <Icon className="w-6 h-6 md:w-8 md:h-8 text-slate-600 group-hover:text-white transition-colors" />
                    </div>
                    <h3 className="text-base md:text-xl font-black text-slate-800 group-hover:text-white transition-colors">{label}</h3>
                    <p className="text-xs md:text-sm text-slate-500 group-hover:text-white/90 transition-colors">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Personal Info Step */}
          {step === 'info' && (
            <div className="space-y-4 md:space-y-6 animate-in slide-in-from-right-4">
              {/* Name Fields */}
              {(userType === 'teacher' || userType === 'parent' || userType === 'admin') && (
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-2 block flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-500" /> الاسم الكامل
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold"
                    placeholder="الاسم الكامل كما في الهوية"
                    required
                  />
                </div>
              )}

              {(userType === 'student' || userType === 'teacher') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-bold text-slate-700 mb-2 block">الاسم الأول</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-700 mb-2 block">{userType === 'student' ? 'اسم العائلة' : 'الاسم الثاني'}</label>
                    <input
                      type="text"
                      name={userType === 'student' ? 'lastName' : 'secondName'}
                      value={userType === 'student' ? formData.lastName : formData.secondName}
                      onChange={handleInputChange}
                      className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="text-sm font-bold text-slate-700 mb-2 block flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-500" /> البريد الإلكتروني <span className="text-slate-400 font-normal">(اختياري)</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold"
                  dir="ltr"
                  placeholder="example@email.com"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="text-sm font-bold text-slate-700 mb-2 block flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-500" /> رقم الهاتف
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold"
                  dir="ltr"
                  placeholder="09xxxxxxxx"
                  required
                />
              </div>

              {/* Teacher Trial Code */}
              {userType === 'teacher' && (
                <div className="animate-in slide-in-from-bottom-2 duration-500">
                  <label className="text-sm font-bold text-slate-700 mb-2 block flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" /> كود الانضمام التجريبي (اختياري)
                  </label>
                  <input
                    type="text"
                    name="inviteCode"
                    value={formData.inviteCode}
                    onChange={handleInputChange}
                    className="w-full px-5 py-4 bg-amber-50 border-2 border-amber-200 rounded-2xl outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all font-bold placeholder:text-amber-300"
                    placeholder="أدخل الكود للتفعيل الفوري"
                  />
                  <p className="text-[10px] text-amber-600 mt-2 font-bold bg-amber-100/50 p-2 rounded-lg border border-amber-200">
                    💡 يمكنك استخدام الكود التجريبي للانضمام وتفعيل حسابك مباشرة.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Education Step (Student only) */}
          {step === 'education' && userType === 'student' && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              {/* Education Level */}
              <div>
                <label className="text-sm font-black text-slate-700 flex items-center gap-2 mb-3">
                  <GraduationCap className="w-5 h-5 text-blue-500" /> المرحلة الدراسية
                </label>
                <div className="grid grid-cols-3 gap-3">
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
                      className={`py-4 rounded-2xl font-black text-sm transition-all border-2 ${
                        formData.eduLevel === level.id
                        ? 'border-blue-500 bg-blue-50 text-blue-600'
                        : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                      }`}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Class Selection */}
              {formData.eduLevel && (
                <div className="animate-in slide-in-from-top-2">
                  <label className="text-sm font-black text-slate-700 flex items-center gap-2 mb-3">
                    <School className="w-5 h-5 text-blue-500" /> الفصل الدراسي
                  </label>
                  <div className="flex flex-wrap gap-3 p-4 bg-slate-50 rounded-3xl border border-slate-100 max-h-64 overflow-y-auto">
                    {classes.filter((c: any) => c.level === formData.eduLevel).map((c: any) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          handleInputChange({ target: { name: 'classId', value: c.id } } as any);
                          if (c.grade) {
                            handleInputChange({ target: { name: 'grade', value: c.grade } } as any);
                          }
                        }}
                        className={`px-5 py-3 rounded-2xl font-bold text-sm border-2 transition-all flex items-center gap-2 ${
                          formData.classId === c.id
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        {formData.classId === c.id ? <CheckCircle className="w-4 h-4" /> : <School className="w-4 h-4" />}
                        {c.name}
                      </button>
                    ))}
                    {classes.filter((c: any) => c.level === formData.eduLevel).length === 0 && (
                      <p className="text-sm text-slate-400 italic p-4 w-full text-center">لا توجد فصول مضافة لهذه المرحلة حالياً</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Parent Code Step */}
          {step === 'parent-code' && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              {/* Info Card */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-5 border-2 border-purple-100">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
                    <QrCode className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-black text-purple-800 mb-1">كيف تحصل على رمز الدعوة؟</h4>
                    <ol className="text-sm text-purple-700 space-y-1">
                      <li>1. اطلب من ابنك الطالب فتح حسابه</li>
                      <li>2. يذهب إلى الإعدادات ← ربط ولي الأمر</li>
                      <li>3. ينسخ الرمز أو يعرض رمز QR</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Code Input */}
              <div>
                <label className="text-sm font-black text-slate-700 flex items-center gap-2 mb-3">
                  <QrCode className="w-5 h-5 text-purple-500" /> رمز دعوة الطالب
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={parentCode}
                    onChange={(e) => {
                      setParentCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                      setParentCodeValid(false);
                      setStudentInfo(null);
                    }}
                    placeholder="ABC123XY"
                    maxLength={8}
                    className="w-full px-6 py-5 bg-white border-2 border-slate-200 rounded-2xl text-center font-mono text-2xl tracking-widest outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
                    dir="ltr"
                    autoComplete="off"
                  />
                  {parentCode && (
                    <button
                      onClick={() => {
                        setParentCode('');
                        setParentCodeValid(false);
                        setStudentInfo(null);
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <button
                  onClick={handleValidateParentCode}
                  disabled={validatingCode || parentCode.length < 6}
                  className="w-full mt-4 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-black text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {validatingCode ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                  التحقق من الرمز
                </button>
              </div>

              {/* Success Result */}
              {parentCodeValid && studentInfo && (
                <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5 animate-in zoom-in-95">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <div>
                      <h4 className="font-black text-green-800">تم التحقق بنجاح!</h4>
                      <p className="text-sm text-green-600">الطالب: {studentInfo.fullName}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* QR Scanner Option */}
              <div className="p-6 rounded-2xl border-2 border-dashed border-purple-300 bg-white text-center">
                <Camera className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-500 mb-2">يمكنك أيضاً مسح رمز QR</p>
                <button
                  type="button"
                  className="mt-3 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 mx-auto"
                  onClick={() => alert('📷 سيتم فتح الكاميرا لمسح رمز QR\n\nفي الوقت الحالي، يرجى إدخال الرمز يدوياً')}
                >
                  <Camera className="w-5 h-5" />
                  مسح رمز QR
                </button>
              </div>
            </div>
          )}

          {/* Identity Document Upload Step (Parent Only) */}
          {step === 'identity-upload' && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              {parentCodeValid && studentInfo && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-500 shrink-0" />
                  <div>
                    <p className="text-xs text-blue-500 font-bold">تم التحقق من الطالب</p>
                    <p className="text-sm font-black text-blue-700">{studentInfo.fullName}</p>
                  </div>
                </div>
              )}
              <div className="bg-white rounded-3xl shadow-xl p-6">
                <IdentityDocumentUpload
                  parentUid="temp_registration" // Will be saved with actual UID after account creation
                  parentName={formData.fullName || 'ولي الأمر'}
                  onSuccess={handleIdentityUploadSuccess}
                />
              </div>
              {identityDocUploaded && (
                <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 flex items-center gap-3 animate-in zoom-in-95">
                  <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
                  <div className="flex-1">
                    <p className="font-black text-green-800">تم رفع مستند الهوية بنجاح!</p>
                    <p className="text-xs text-green-600 mt-1">
                      النوع: <span className="font-bold">{identityDocData?.documentType}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Password Step */}
          {step === 'password' && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              {/* Password Field */}
              <div>
                <label className="text-sm font-bold text-slate-700 mb-2 block flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-500" /> كلمة المرور
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold pl-14"
                    dir="ltr"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-2">يجب أن تكون 8 أحرف على الأقل</p>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="text-sm font-bold text-slate-700 mb-2 block flex items-center gap-2">
                  <Lock className="w-4 h-4 text-green-500" /> تأكيد كلمة المرور
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`w-full px-5 py-4 bg-white border-2 rounded-2xl outline-none transition-all font-bold pl-14 ${
                      formData.confirmPassword && formData.confirmPassword !== formData.password
                        ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                        : formData.confirmPassword && formData.confirmPassword === formData.password
                        ? 'border-green-300 focus:border-green-500 focus:ring-4 focus:ring-green-500/10'
                        : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
                    }`}
                    dir="ltr"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                  {formData.confirmPassword && formData.confirmPassword === formData.password && (
                    <CheckCircle className="w-5 h-5 text-green-500 absolute left-12 top-1/2 -translate-y-1/2" />
                  )}
                </div>
              </div>

              {/* Gender Selection - For Students and Admins */}
              {(userType === 'student' || userType === 'admin') && (
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-3 block flex items-center gap-2">
                    <User className="w-4 h-4 text-purple-500" /> الجنس
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleInputChange({ target: { name: 'gender', value: 'male' } } as any)}
                      className={`py-4 rounded-2xl font-bold text-sm border-2 transition-all flex items-center justify-center gap-2 ${
                        formData.gender === 'male'
                          ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-md'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <User className="w-5 h-5" />
                      ذكر
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInputChange({ target: { name: 'gender', value: 'female' } } as any)}
                      className={`py-4 rounded-2xl font-bold text-sm border-2 transition-all flex items-center justify-center gap-2 ${
                        formData.gender === 'female'
                          ? 'border-pink-500 bg-pink-50 text-pink-600 shadow-md'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <User className="w-5 h-5" />
                      أنثى
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          {step !== 'role' && (
            <div className="mt-6 md:mt-8 space-y-3">
              <button
                onClick={isLastStep ? handleFinalSubmit : nextStep}
                disabled={loading}
                className={`w-full py-4 rounded-2xl font-black text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 ${
                  isLastStep
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                    : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                } disabled:opacity-50`}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {isLastStep ? 'إنشاء الحساب' : 'التالي'}
                    <ArrowLeft className="w-5 h-5" />
                  </>
                )}
              </button>

              <button
                onClick={prevStep}
                className="w-full py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-5 h-5 rotate-180" />
                السابق
              </button>

              {/* Login Link */}
              <div className="text-center pt-2">
                <p className="text-sm text-slate-500">لديك حساب بالفعل؟</p>
                <Link
                  to="/login"
                  className="mt-2 inline-flex items-center gap-2 px-6 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 font-black rounded-xl transition-all text-sm"
                >
                  تسجيل الدخول
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default RegistrationPage;
