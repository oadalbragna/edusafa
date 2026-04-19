/**
 * Parent Acceptance Page - صفحة ربط ولي الأمر بالطالب
 *
 * Allows parent to:
 * 1. Enter student invite code manually
 * 2. Scan QR code from student's device
 * 3. Confirm linking and send request for approval
 * 4. Upload guardian proof document after student approval
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  QrCode, Copy, CheckCircle2, AlertCircle, Loader2,
  ArrowRight, User, School, Mail, Phone, Info,
  Camera, Upload, X, RefreshCw, FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/ToastProvider';
import { validateParentInviteCode, createParentLinkRequest } from '../../utils/parentLinkRequests';
import { uploadProofDocumentToRequest } from '../../utils/parentLinkRequests';
import ProofDocumentUpload from '../../components/parent/ProofDocumentUpload';
import IdentityDocumentUpload from '../../components/parent/IdentityDocumentUpload';
import { ref, get, onValue } from 'firebase/database';
import { db } from '../../services/firebase';
import { SYS } from '../../constants/dbPaths';
import type { ProofDocumentType } from '../../services/documentUpload.service';
import type { IdentityDocumentData } from '../../components/parent/IdentityDocumentUpload';
import { saveParentIdentityDocument } from '../../services/identityDocument.service';

type Step = 'input' | 'confirming' | 'confirmed' | 'submitting' | 'pending' | 'uploading_proof' | 'proof_uploaded' | 'final_pending' | 'error';

const ParentAcceptancePage: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError, showInfo } = useToast();

  const [step, setStep] = useState<Step>('input');
  const [inviteCode, setInviteCode] = useState('');
  const [studentInfo, setStudentInfo] = useState<{
    uid: string;
    fullName: string;
    className?: string;
    eduLevel?: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [requestId, setRequestId] = useState('');
  const [useCamera, setUseCamera] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Proof document state
  const [requestStatus, setRequestStatus] = useState<string>('pending');
  const [proofUploaded, setProofUploaded] = useState(false);

  // Monitor request status changes
  useEffect(() => {
    if (!requestId) return;

    const requestRef = ref(db, SYS.CONFIG.parentLinkRequest(requestId));
    
    const unsubscribe = onValue(requestRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setRequestStatus(data.status);
        
        // If student approved and proof not uploaded yet, show upload button
        if (data.status === 'student_approved' && !data.proofDocumentUrl) {
          setStep('uploading_proof');
        }
        
        // If proof uploaded and reviewed by student, show final pending
        if (data.status === 'proof_reviewed_by_student') {
          setStep('final_pending');
        }
        
        // If admin approved, show success
        if (data.status === 'admin_approved') {
          showSuccess('تمت الموافقة النهائية!', 'تم ربطك بالطالب بنجاح ويمكنك الآن متابعة أخباره');
          setStep('proof_uploaded');
        }
        
        // If rejected at any stage
        if (data.status === 'rejected') {
          setErrorMessage(data.rejectionReason || 'تم رفض الطلب');
          setStep('error');
        }
      }
    });

    return () => unsubscribe();
  }, [requestId]);

  // Handle proof document upload success
  const handleProofUploadSuccess = async (downloadUrl: string, documentType: ProofDocumentType) => {
    if (!requestId) return;

    setLoading(true);
    try {
      const result = await uploadProofDocumentToRequest(requestId, downloadUrl, documentType);

      if (result.success) {
        setProofUploaded(true);
        setStep('proof_uploaded');
        showSuccess('تم رفع الوثيقة بنجاح', 'سيتم مراجعة الوثيقة من قبل الطالب ثم الإدارة');
      } else {
        showError('فشل الرفع', result.errorMessage);
      }
    } catch (error: any) {
      showError('خطأ', error.message || 'حدث خطأ أثناء رفع الوثيقة');
    } finally {
      setLoading(false);
    }
  };

  // Handle identity document upload success
  const handleIdentityUploadSuccess = async (documentData: IdentityDocumentData) => {
    if (!user?.uid) return;

    setLoading(true);
    try {
      // Save to Firebase under user's identity documents
      const result = await saveParentIdentityDocument(user.uid, documentData);

      if (result.success) {
        showSuccess(
          'تم رفع مستند الهوية بنجاح',
          'تم رفع مستند إثبات الهوية عبر جسر تيليغرام بنجاح'
        );
      } else {
        showError('فشل الحفظ', result.errorMessage || 'حدث خطأ أثناء حفظ المستند');
      }
    } catch (error: any) {
      showError('خطأ', error.message || 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraReady(true);
      }
    } catch (err) {
      showError('فشل في تشغيل الكاميرا', 'يرجى السماح بالوصول للكاميرا أو استخدم إدخال الكود يدوياً');
      setUseCamera(false);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
    setUseCamera(false);
  };

  // Validate invite code
  const handleValidateCode = async () => {
    if (!inviteCode.trim()) {
      setErrorMessage('يرجى إدخال كود الدعوة');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setStep('confirming');

    try {
      const result = await validateParentInviteCode(inviteCode.trim().toUpperCase());

      if (result.valid && result.studentUid) {
        setStudentInfo({
          uid: result.studentUid,
          fullName: result.studentName || 'طالب',
          className: result.studentClassName,
          eduLevel: result.studentEduLevel
        });
        setStep('confirmed');
      } else {
        setErrorMessage(result.errorMessage || 'رمز الدعوة غير صالح');
        setStep('input');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء التحقق');
      setStep('input');
    } finally {
      setLoading(false);
    }
  };

  // Submit link request
  const handleSubmitRequest = async () => {
    if (!studentInfo || !user || !profile) {
      showError('خطأ في البيانات', 'يرجى تسجيل الدخول أولاً');
      return;
    }

    setLoading(true);
    setStep('submitting');

    try {
      const result = await createParentLinkRequest(
        user.uid,
        profile.fullName || profile.firstName || 'ولي الأمر',
        profile.email || '',
        profile.phone,
        inviteCode.trim().toUpperCase(),
        studentInfo.uid,
        studentInfo.fullName,
        studentInfo.className || ''
      );

      if (result.success && result.requestId) {
        setRequestId(result.requestId);
        setStep('pending');
        showSuccess('تم إرسال الطلب بنجاح', 'سيتم مراجعة طلبك من قبل الطالب والإدارة');
      } else {
        setErrorMessage(result.errorMessage || 'فشل في إرسال الطلب');
        setStep('confirmed');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء إرسال الطلب');
      setStep('confirmed');
    } finally {
      setLoading(false);
    }
  };

  // Handle code input change (auto-uppercase)
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInviteCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
  };

  // Reset and go back
  const handleReset = () => {
    setInviteCode('');
    setStudentInfo(null);
    setErrorMessage('');
    setRequestId('');
    setStep('input');
  };

  // Check if user is parent
  if (!user || user.role !== 'parent') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-800">غير مصرح</h2>
          <p className="text-slate-500 font-medium">هذه الصفحة متاحة فقط لأولياء الأمور</p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-4 bg-brand-500 text-white rounded-xl font-bold hover:bg-brand-600 transition-all"
          >
            العودة للصفحة الرئيسية
          </button>
        </div>
      </div>
    );
  }

  // Check if already has linked students
  const hasLinkedStudents = profile?.studentLinks && profile.studentLinks.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8 px-4" dir="rtl">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg mb-4">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-800">ربط حساب بابنك</h1>
          <p className="text-slate-500 font-medium">
            {step === 'input' && 'أدخل كود الدعوة من ابن الطالب أو صوّر رمز QR'}
            {step === 'confirming' && 'جاري التحقق من الرمز...'}
            {step === 'confirmed' && 'تأكد من بيانات الطالب'}
            {step === 'submitting' && 'جاري إرسال الطلب...'}
            {step === 'pending' && 'الطلب قيد المراجعة'}
            {step === 'uploading_proof' && 'يرجى رفع وثيقة إثبات القرابة'}
            {step === 'proof_uploaded' && 'تم رفع الوثيقة - بانتظار المراجعة النهائية'}
            {step === 'final_pending' && 'بانتظار موافقة الإدارة النهائية'}
          </p>
        </div>

        {/* Step 1: Input Code */}
        {step === 'input' && (
          <div className="bg-white rounded-3xl shadow-xl p-6 space-y-6 animate-in slide-in-from-bottom-4">
            {!useCamera ? (
              <>
                {/* Manual Input */}
                <div className="space-y-4">
                  <label className="text-sm font-black text-slate-700 flex items-center gap-2">
                    <Info className="w-4 h-4 text-purple-500" />
                    كود الدعوة
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={handleCodeChange}
                      onKeyDown={(e) => e.key === 'Enter' && handleValidateCode()}
                      placeholder="ABC123XY"
                      maxLength={8}
                      className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center font-mono text-2xl tracking-widest outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
                      dir="ltr"
                      autoComplete="off"
                    />
                    {inviteCode && (
                      <button
                        onClick={() => setInviteCode('')}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={handleValidateCode}
                    disabled={loading || inviteCode.length < 6}
                    className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-black text-lg shadow-lg shadow-purple-500/20 hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        التحقق من الرمز
                        <ArrowRight className="w-5 h-5 rotate-180" />
                      </>
                    )}
                  </button>
                </div>

                {/* QR Camera Option */}
                <div className="pt-4 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setUseCamera(true);
                      startCamera();
                    }}
                    className="w-full py-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 font-bold hover:border-purple-300 hover:text-purple-600 transition-all flex items-center justify-center gap-2"
                  >
                    <Camera className="w-5 h-5" />
                    تصوير رمز QR من جهاز الطالب
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Camera View */}
                <div className="space-y-4">
                  <div className="relative aspect-square bg-black rounded-2xl overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-48 border-2 border-white/50 rounded-2xl">
                        <div className="w-full h-full flex items-center justify-center">
                          <QrCode className="w-12 h-12 text-white/30" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 text-center">وجّه الكاميرا نحو رمز QR الخاص بالطالب</p>
                  <div className="flex gap-3">
                    <button
                      onClick={stopCamera}
                      className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={() => {
                        // For now, prompt user to enter code manually
                        // TODO: Implement actual QR scanning
                        stopCamera();
                        showInfo('مسح QR غير متاح حالياً', 'يرجى إدخال الكود يدوياً');
                      }}
                      className="flex-1 py-3 bg-purple-500 text-white rounded-xl font-bold hover:bg-purple-600 transition-all"
                    >
                      التقاط
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="p-4 bg-red-50 border-r-4 border-red-400 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-700 text-sm">{errorMessage}</p>
                  <button
                    onClick={handleReset}
                    className="text-xs text-red-500 underline mt-1"
                  >
                    حاول مرة أخرى
                  </button>
                </div>
              </div>
            )}

            {/* Help Text */}
            <div className="bg-purple-50 rounded-2xl p-4 space-y-3">
              <p className="text-sm font-bold text-purple-700">كيف تحصل على كود الدعوة؟</p>
              <ol className="space-y-2 text-xs text-purple-600">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-black text-[10px] shrink-0">1</span>
                  <span>اطلب من ابن الطالب فتح حسابه</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-black text-[10px] shrink-0">2</span>
                  <span>يذهب إلى الإعدادات ← ربط ولي الأمر</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-black text-[10px] shrink-0">3</span>
                  <span>ينسخ الكود أو يعرض لك رمز QR</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-black text-[10px] shrink-0">4</span>
                  <span>أدخل الكود هنا أو صوّر الرمز</span>
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* Step 2: Confirming */}
        {step === 'confirming' && (
          <div className="bg-white rounded-3xl shadow-xl p-12 text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-purple-500" />
            <p className="text-slate-600 font-bold">جاري التحقق من الرمز...</p>
          </div>
        )}

        {/* Step 3: Confirm Student Info */}
        {step === 'confirmed' && studentInfo && (
          <div className="bg-white rounded-3xl shadow-xl p-6 space-y-6 animate-in slide-in-from-bottom-4">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800">تم العثور على الطالب</h2>
                <p className="text-xs text-slate-400">تأكد من أن هذا هو ابنك</p>
              </div>
            </div>

            {/* Student Info Card */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <School className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-green-600 font-bold">اسم الطالب</p>
                  <p className="text-lg font-black text-green-800">{studentInfo.fullName}</p>
                </div>
              </div>

              {studentInfo.className && (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    <BookIcon />
                  </div>
                  <div>
                    <p className="text-xs text-green-600 font-bold">الفصل</p>
                    <p className="text-sm font-bold text-green-700">{studentInfo.className}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <User className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-green-600 font-bold">اسم ولي الأمر</p>
                  <p className="text-sm font-bold text-green-700">{profile?.fullName || profile?.firstName || 'غير محدد'}</p>
                </div>
              </div>

              {profile?.email && (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    <Mail className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-green-600 font-bold">بريد ولي الأمر</p>
                    <p className="text-sm font-bold text-green-700" dir="ltr">{profile.email}</p>
                  </div>
                </div>
              )}

              {profile?.phone && (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    <Phone className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-green-600 font-bold">هاتف ولي الأمر</p>
                    <p className="text-sm font-bold text-green-700" dir="ltr">{profile.phone}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Approval Steps Info */}
            <div className="bg-amber-50 rounded-2xl p-4 space-y-3">
              <p className="text-sm font-bold text-amber-700 flex items-center gap-2">
                <Info className="w-4 h-4" />
                خطوات الموافقة المطلوبة
              </p>
              <ol className="space-y-2 text-xs text-amber-600">
                <li className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-black text-[10px]">1</span>
                  <span>موافقة الطالب على الطلب</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-black text-[10px]">2</span>
                  <span>موافقة الإدارة على الطلب</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-black text-[10px]">3</span>
                  <span>إتمام الربط وتفعيل الحساب</span>
                </li>
              </ol>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
              >
                تراجع
              </button>
              <button
                onClick={handleSubmitRequest}
                disabled={loading}
                className="flex-1 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-black shadow-lg shadow-green-500/20 hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    إرسال الطلب
                    <ArrowRight className="w-5 h-5 rotate-180" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Submitting */}
        {step === 'submitting' && (
          <div className="bg-white rounded-3xl shadow-xl p-12 text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-green-500" />
            <p className="text-slate-600 font-bold">جاري إرسال طلب الربط...</p>
          </div>
        )}

        {/* Step 5: Pending Approval */}
        {step === 'pending' && (
          <div className="bg-white rounded-3xl shadow-xl p-6 space-y-6 animate-in zoom-in-95">
            {/* Success Animation */}
            <div className="text-center space-y-4">
              <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto animate-bounce shadow-lg">
                <CheckCircle2 className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-2xl font-black text-slate-800">تم إرسال الطلب بنجاح! 🎉</h2>
              <p className="text-slate-500 font-medium">
                طلب ربطك بالطالب <span className="font-black text-green-600">{studentInfo?.fullName}</span> قيد المراجعة
              </p>
            </div>

            {/* Status Timeline */}
            <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
              <p className="text-sm font-bold text-slate-700 text-center">حالة الطلب</p>

              <div className="space-y-4">
                {/* Step 1 - Done */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-700 text-sm">تم إرسال الطلب</p>
                    <p className="text-xs text-slate-400">بانتظار موافقة الطالب</p>
                  </div>
                </div>

                {/* Step 2 - Pending */}
                <div className="flex items-center gap-3 opacity-60">
                  <div className="w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center shadow-md">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-700 text-sm">موافقة الطالب</p>
                    <p className="text-xs text-slate-400">سيتم إشعارك عند الموافقة</p>
                  </div>
                </div>

                {/* Step 3 - Pending */}
                <div className="flex items-center gap-3 opacity-40">
                  <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center">
                    <span className="text-white font-black text-xs">3</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-700 text-sm">موافقة الإدارة</p>
                    <p className="text-xs text-slate-400">مراجعة نهائية من الإدارة</p>
                  </div>
                </div>

                {/* Step 4 - Pending */}
                <div className="flex items-center gap-3 opacity-30">
                  <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                    <span className="text-slate-500 font-black text-xs">4</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-700 text-sm">إتمام الربط</p>
                    <p className="text-xs text-slate-400">سيتم تفعيل الربط بالكامل</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="bg-blue-50 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700 space-y-1">
                  <p className="font-bold">💡 سيتم إشعارك عند:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• موافقة الطالب على الطلب</li>
                    <li>• موافقة الإدارة وإتمام الربط</li>
                    <li>• رفض الطلب مع ذكر السبب</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              {hasLinkedStudents ? (
                <button
                  onClick={() => navigate('/parent')}
                  className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-black shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  الذهاب للوحة تحكم الأبناء
                  <ArrowRight className="w-5 h-5 rotate-180" />
                </button>
              ) : (
                <button
                  onClick={() => navigate('/')}
                  className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-black shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  الذهاب للصفحة الرئيسية
                  <ArrowRight className="w-5 h-5 rotate-180" />
                </button>
              )}
              <button
                onClick={handleReset}
                className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
              >
                ربط ابن آخر
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Upload Proof Document */}
        {step === 'uploading_proof' && (
          <div className="bg-white rounded-3xl shadow-xl p-6 animate-in zoom-in-95">
            <ProofDocumentUpload
              requestId={requestId}
              parentUid={user!.uid}
              studentName={studentInfo?.fullName || 'الطالب'}
              onUploadSuccess={handleProofUploadSuccess}
            />
          </div>
        )}

        {/* Step 6.5: Upload Identity Document */}
        {(step === 'uploading_proof' || step === 'proof_uploaded' || step === 'final_pending') && (
          <div className="bg-white rounded-3xl shadow-xl p-6 mt-6 animate-in zoom-in-95">
            <IdentityDocumentUpload
              parentUid={user!.uid}
              parentName={profile?.fullName || profile?.firstName || 'ولي الأمر'}
              onSuccess={handleIdentityUploadSuccess}
            />
          </div>
        )}

        {/* Step 7: Proof Uploaded - Waiting for Student Review */}
        {step === 'proof_uploaded' && (
          <div className="bg-white rounded-3xl shadow-xl p-6 space-y-6 animate-in zoom-in-95">
            <div className="text-center space-y-4">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto animate-bounce shadow-lg">
                <CheckCircle2 className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-2xl font-black text-slate-800">تم رفع الوثيقة بنجاح! 📄</h2>
              <p className="text-slate-500 font-medium">
                وثيقة إثبات القرابة قيد المراجعة من <span className="font-black text-blue-600">{studentInfo?.fullName}</span>
              </p>
            </div>

            {/* Status Timeline */}
            <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
              <p className="text-sm font-bold text-slate-700 text-center">حالة الطلب</p>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-700 text-sm">تم إرسال الطلب</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-700 text-sm">موافقة الطالب</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-700 text-sm">تم رفع وثيقة الإثبات</p>
                  </div>
                </div>

                {requestStatus === 'proof_reviewed_by_student' ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-700 text-sm">مراجعة الطالب للوثيقة ✓</p>
                      <p className="text-xs text-green-500">بانتظار موافقة الإدارة النهائية</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 opacity-60">
                    <div className="w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center shadow-md">
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-700 text-sm">مراجعة الطالب للوثيقة</p>
                      <p className="text-xs text-slate-400">سيتم إشعارك عند المراجعة</p>
                    </div>
                  </div>
                )}

                <div className={`flex items-center gap-3 ${requestStatus === 'admin_approved' ? 'opacity-100' : 'opacity-40'}`}>
                  <div className={`w-10 h-10 ${requestStatus === 'admin_approved' ? 'bg-green-500' : 'bg-slate-300'} rounded-full flex items-center justify-center shadow-md`}>
                    {requestStatus === 'admin_approved' ? (
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    ) : (
                      <span className="text-white font-black text-xs">5</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-700 text-sm">الموافقة النهائية من الإدارة</p>
                    <p className="text-xs text-slate-400">
                      {requestStatus === 'admin_approved' ? 'تمت ✓' : 'ستتم بعد مراجعة الطالب'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700 space-y-1">
                  <p className="font-bold">💡 خطوات إتمام الربط:</p>
                  <ul className="space-y-1 text-xs">
                    <li>✓ موافقة الطالب على الطلب</li>
                    <li>✓ رفع وثيقة إثبات القرابة</li>
                    <li>• مراجعة الطالب للوثيقة</li>
                    <li>• الموافقة النهائية من الإدارة</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/')}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-black shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              العودة للصفحة الرئيسية
              <ArrowRight className="w-5 h-5 rotate-180" />
            </button>
          </div>
        )}

        {/* Step 8: Final Pending - After Student Review */}
        {step === 'final_pending' && (
          <div className="bg-white rounded-3xl shadow-xl p-6 space-y-6 animate-in zoom-in-95">
            <div className="text-center space-y-4">
              <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto animate-pulse shadow-lg">
                <Loader2 className="w-12 h-12 text-white animate-spin" />
              </div>
              <h2 className="text-2xl font-black text-slate-800">الطلب قيد المراجعة النهائية ⏳</h2>
              <p className="text-slate-500 font-medium">
                تمت مراجعة الوثيقة من <span className="font-black text-green-600">{studentInfo?.fullName}</span> - بانتظار موافقة الإدارة
              </p>
            </div>

            <div className="bg-green-50 border-r-4 border-green-400 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-green-700">تمت موافقة الطالب على الوثيقة</p>
                  <p className="text-xs text-green-600 mt-1">سيتم إرسال الطلب للإدارة للموافقة النهائية</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-bold">🔍 تقوم الإدارة الآن بـ:</p>
                  <ul className="space-y-1 text-xs mt-2">
                    <li>• مراجعة وثيقة إثبات القرابة</li>
                    <li>• التحقق من صحة البيانات</li>
                    <li>• اتخاذ قرار الموافقة أو الرفض</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/')}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-black shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              العودة للصفحة الرئيسية
              <ArrowRight className="w-5 h-5 rotate-180" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Simple Book Icon Component
function BookIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

export default ParentAcceptancePage;
