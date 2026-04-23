import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { ref, get } from 'firebase/database';
import { SYS } from '../constants/dbPaths';
import { AuthService } from '../services/auth.service';
import { useAuth } from '../context/AuthContext';

export const useRegister = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [userType, setUserType] = useState<'student' | 'teacher' | 'parent' | 'admin'>('student');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    fullName: '',
    secondName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    eduLevel: '',
    grade: '',
    classId: '',
    inviteCode: '',
    studentLink: '',
    selectedClasses: [] as string[],
    paymentMethod: 'cash' as 'cash' | 'bankak' | 'kashy' | 'syberpay' | 'fawry' | 'visa',
    gender: '' as 'male' | 'female' | ''
  });

  const [showPaymentStep, setShowPaymentStep] = useState(false);
  const toggleClass = (classId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedClasses: prev.selectedClasses.includes(classId)
        ? prev.selectedClasses.filter(id => id !== classId)
        : [...prev.selectedClasses, classId]
    }));
  };

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allowRegistration, setAllowRegistration] = useState<boolean | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        if (db) {
          const settingsRef = ref(db, SYS.SYSTEM.ALLOW_REGISTRATION);
          const snapshot = await get(settingsRef);
          setAllowRegistration(snapshot.exists() ? snapshot.val() : true);
        } else {
          setAllowRegistration(true);
        }
      } catch (e) {
        setAllowRegistration(true);
      }
    };
    fetchSettings();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let { name, value } = e.target;

    // Phone Number Processing for Sudan
    if (name === 'phone') {
      // Remove all non-numeric characters
      value = value.replace(/\D/g, '');

      // Rule 3: If it starts with 249, replace with 0
      if (value.startsWith('249')) {
        value = '0' + value.substring(3);
      }

      // Rule 2: If it's 10 digits and starts with 0, it's correct (or keep it as is if it's 10)
      // Rule 1: Must be 9 digits (excluding leading 0)
      if (value.length > 10) {
        value = value.substring(0, 10);
      }

      // Ensure it starts with 0 for storage (10 digits total)
      if (value.length === 9 && !value.startsWith('0')) {
        value = '0' + value;
      }
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    if (!formData.password) return 'كلمة المرور مطلوبة';
    if (formData.password.length < 8) return 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
    if (formData.password !== formData.confirmPassword) return 'كلمات المرور غير متطابقة';

    if (userType === 'student') {
      if (!formData.firstName || !formData.lastName) return 'يرجى إكمال اسم الطالب';
      if (!formData.classId) return 'عليك اختيار الفصل الدراسي!';
      if (!formData.eduLevel) return 'يرجى تحديد المرحلة الدراسية';
      if (!formData.gender) return 'يرجى اختيار الجنس';
    } else if (userType === 'teacher') {
      if (!formData.firstName || !formData.secondName) return 'يرجى إكمال اسم المعلم';
      // كود الدعوة اختياري للمعلم حالياً للتفعيل الفوري
    } else if (userType === 'parent') {
      if (!formData.fullName) return 'يرجى إدخال الاسم الكامل';
    } else if (userType === 'admin') {
      if (!formData.fullName) return 'يرجى إدخال الاسم الكامل';
      if (!formData.gender) return 'يرجى اختيار الجنس';
    } else {
      if (!formData.fullName) return 'يرجى إدخال الاسم الكامل';
    }

    return null;
  };

  // Keep for UI if needed, but we will mostly rely on internal validation
  const isFormValid = () => {
    return !!(formData.phone && formData.password);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (userType === 'student' && !showPaymentStep) {
      setShowPaymentStep(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const classRequests = formData.selectedClasses.reduce((acc, classId) => {
        acc[classId] = { status: 'pending', requestedAt: new Date().toISOString() };
        return acc;
      }, {} as any);

      // Prepare registration data
      const registrationData = {
        ...formData,
        role: userType,
        classRequests: userType === 'teacher' ? classRequests : undefined,
        // For parents, include student link info
        ...(userType === 'parent' && (window as any).__parentRegistrationData?.studentInfo ? {
          studentLink: (window as any).__parentRegistrationData.studentInfo.uid,
          studentName: (window as any).__parentRegistrationData.studentInfo.fullName,
          identityDocumentUrl: (window as any).__parentRegistrationData.identityDocData?.fileUrl,
          identityDocumentType: (window as any).__parentRegistrationData.identityDocData?.documentType,
          identityUploadedAt: (window as any).__parentRegistrationData.identityDocData?.uploadedAt,
        } : {})
      };

      // Call optimized registerManual which saves instantly to DB
      const res = await AuthService.registerManual(registrationData);

      if (res.success && res.user) {
        setSuccess(true);
        // Store UID for identity document save
        const parentUid = res.user.uid;

        // All new users are pending, so redirect to pending page
        setTimeout(() => {
          login(res.user!); // Log them in so profile is available
          if (formData.paymentMethod === 'kashy') {
            navigate('/cashipay-payment');
          } else {
            navigate('/pending-approval');
          }
        }, 1500);

        // Return the UID for external use
        return { success: true, uid: parentUid };
      } else {
        setError(res.error || 'فشل إنشاء الحساب');
        return { success: false, error: res.error };
      }
    } catch (err) {
      setError('حدث خطأ أثناء الاتصال بالخادم');
      return { success: false, error: 'network' };
    } finally {
      setLoading(false);
    }
  };

  return {
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
  } as const;
};
