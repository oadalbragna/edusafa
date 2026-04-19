/**
 * Identity Document Review Page - صفحة مراجعة مستندات الهوية
 *
 * Admin interface to review parent identity documents uploaded via Telegram Bridge
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  User,
  Calendar,
  MessageSquare,
  Eye,
  AlertTriangle
} from 'lucide-react';
import { SYS } from '../../constants/dbPaths';
import { ref, get, update } from 'firebase/database';
import { getDb as db } from '../../services/firebase';
import { updateIdentityDocumentStatus } from '../../services/identityDocument.service';
import type { ParentIdentityDocument } from '../../services/identityDocument.service';
import type { UserProfile } from '../../types';
import { useToast } from '../../components/common/ToastProvider';

const IdentityDocumentReviewPage: React.FC = () => {
  const { parentUid, documentId } = useParams<{ parentUid: string; documentId: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [parentData, setParentData] = useState<UserProfile | null>(null);
  const [document, setDocument] = useState<ParentIdentityDocument | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null);

  // Load parent data and document
  useEffect(() => {
    if (!parentUid || !documentId) {
      showError('خطأ', 'بيانات غير مكتملة');
      navigate('/admin/parents');
      return;
    }

    loadData();
  }, [parentUid, documentId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load parent profile
      const parentRef = ref(db, SYS.user(parentUid!));
      const parentSnap = await get(parentRef);

      if (!parentSnap.exists()) {
        showError('خطأ', 'بيانات ولي الأمر غير موجودة');
        navigate('/admin/parents');
        return;
      }

      const parent = parentSnap.val() as UserProfile;
      setParentData(parent);

      // Load document
      const docRef = ref(db, `${SYS.user(parentUid!)}/identityDocuments/${documentId}`);
      const docSnap = await get(docRef);

      if (!docSnap.exists()) {
        showError('خطأ', 'المستند غير موجود');
        navigate('/admin/parents');
        return;
      }

      const doc = docSnap.val() as ParentIdentityDocument;
      setDocument(doc);
    } catch (error: any) {
      console.error('Error loading data:', error);
      showError('خطأ', error.message || 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  // Handle document approval/rejection
  const handleReview = async () => {
    if (!parentUid || !documentId || !confirmAction) return;

    setProcessing(true);
    try {
      const result = await updateIdentityDocumentStatus(
        parentUid,
        documentId,
        confirmAction,
        'admin', // Replace with actual admin UID
        reviewNotes
      );

      if (result.success) {
        showSuccess(
          confirmAction === 'approve' ? 'تمت الموافقة' : 'تم الرفض',
          confirmAction === 'approve'
            ? 'تمت الموافقة على المستند بنجاح'
            : 'تم رفض المستند'
        );
        navigate('/admin/parents');
      } else {
        showError('خطأ', result.errorMessage || 'فشل معالجة المستند');
      }
    } catch (error: any) {
      console.error('Error reviewing document:', error);
      showError('خطأ', error.message || 'حدث خطأ أثناء المعالجة');
    } finally {
      setProcessing(false);
      setShowConfirmModal(false);
      setConfirmAction(null);
    }
  };

  // Get document type label in Arabic
  const getDocumentTypeLabel = (type: string): string => {
    const types: Record<string, string> = {
      'id_card': 'بطاقة الهوية',
      'passport': 'جواز السفر',
      'family_book': 'دفتر العائلة',
      'birth_certificate': 'شهادة الميلاد',
      'driver_license': 'رخصة القيادة',
      'residence_permit': 'إقامة',
      'other': 'مستند آخر'
    };
    return types[type] || type;
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      'pending': { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: 'قيد المراجعة' },
      'approved': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: 'موافق عليه' },
      'rejected': { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'مرفوض' }
    };
    const badge = badges[status] || badges['pending'];
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 md:p-8" dir="rtl">
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-bold">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  if (!parentData || !document) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 md:p-8" dir="rtl">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl p-8 mb-8 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-3 bg-white/20 rounded-2xl hover:bg-white/30 transition-colors backdrop-blur-sm"
              >
                <ArrowLeft className="w-6 h-6 text-white" />
              </button>
              <div>
                <h1 className="text-3xl font-black text-white mb-1">مراجعة مستند الهوية</h1>
                <p className="text-white/80 text-sm">مراجعة والموافقة على مستندات إثبات الهوية</p>
              </div>
            </div>
            {getStatusBadge(document.status)}
          </div>
        </div>

        {/* Parent Info */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-500" />
            بيانات ولي الأمر
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-xl">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">الاسم</p>
              <p className="font-bold text-slate-800 dark:text-white">
                {parentData.fullName || `${parentData.firstName || ''} ${parentData.lastName || ''}`.trim()}
              </p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-xl">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">البريد الإلكتروني</p>
              <p className="font-bold text-slate-800 dark:text-white">{parentData.email}</p>
            </div>
            {parentData.phone && (
              <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-xl">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">الهاتف</p>
                <p className="font-bold text-slate-800 dark:text-white">{parentData.phone}</p>
              </div>
            )}
            <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-xl">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">تاريخ الرفع</p>
              <p className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(document.uploadedAt).toLocaleDateString('ar-EG', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Document Info */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-500" />
            بيانات المستند
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-xl">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">نوع المستند</p>
              <p className="font-bold text-slate-800 dark:text-white">
                {getDocumentTypeLabel(document.documentType)}
              </p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-xl">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">اسم الملف</p>
              <p className="font-bold text-slate-800 dark:text-white truncate">{document.fileName}</p>
            </div>
          </div>

          {/* Document Preview */}
          <div className="border-2 border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            {document.fileUrl.includes('.pdf') ? (
              <div className="bg-slate-100 dark:bg-slate-700 p-8 text-center">
                <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">ملف PDF</p>
                <a
                  href={document.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-colors"
                >
                  <Eye className="w-5 h-5" />
                  عرض المستند
                </a>
              </div>
            ) : (
              <img
                src={document.fileUrl}
                alt={document.fileName}
                className="w-full h-auto max-h-96 object-contain bg-slate-100 dark:bg-slate-700"
              />
            )}
          </div>
        </div>

        {/* Review Notes */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-amber-500" />
            ملاحظات المراجعة
          </h2>
          <textarea
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="أضف ملاحظاتك حول هذا المستند (اختياري)..."
            className="w-full p-4 bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 outline-none transition-all dark:text-white min-h-[120px]"
          />
        </div>

        {/* Action Buttons */}
        {document.status === 'pending' && (
          <div className="flex gap-3">
            <button
              onClick={() => {
                setConfirmAction('reject');
                setShowConfirmModal(true);
              }}
              disabled={processing}
              className="flex-1 py-4 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-black shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <XCircle className="w-5 h-5" />
                  رفض المستند
                </>
              )}
            </button>
            <button
              onClick={() => {
                setConfirmAction('approve');
                setShowConfirmModal(true);
              }}
              disabled={processing}
              className="flex-1 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-black shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  الموافقة على المستند
                </>
              )}
            </button>
          </div>
        )}

        {/* Warning for already reviewed documents */}
        {document.status !== 'pending' && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-800 dark:text-amber-300 mb-1">
                تم مراجعة هذا المستند مسبقاً
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-400">
                حالة المستند: <span className="font-bold">{document.status === 'approved' ? 'موافق عليه' : 'مرفوض'}</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-6">
            <div className="text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                confirmAction === 'approve'
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : 'bg-red-100 dark:bg-red-900/30'
              }`}>
                {confirmAction === 'approve' ? (
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-500" />
                )}
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">
                {confirmAction === 'approve' ? 'تأكيد الموافقة' : 'تأكيد الرفض'}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {confirmAction === 'approve'
                  ? 'هل أنت متأكد من الموافقة على هذا المستند؟'
                  : 'هل أنت متأكد من رفض هذا المستند؟'}
              </p>
            </div>

            {reviewNotes && (
              <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-xl">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">ملاحظاتك:</p>
                <p className="text-sm text-slate-800 dark:text-white">{reviewNotes}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmAction(null);
                }}
                disabled={processing}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleReview}
                disabled={processing}
                className={`flex-1 py-3 text-white rounded-xl font-bold transition-all disabled:opacity-50 ${
                  confirmAction === 'approve'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                    : 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700'
                }`}
              >
                {processing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'تأكيد'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IdentityDocumentReviewPage;
