/**
 * Proof Document Viewer - عارض وثيقة الإثبات
 * 
 * Displays uploaded proof documents for review by students and admins
 */

import React, { useState } from 'react';
import { 
  Eye, FileText, CheckCircle2, XCircle, AlertCircle, 
  Loader2, MessageSquare, Download, ExternalLink 
} from 'lucide-react';
import { getProofDocumentTypeLabel } from '../../services/documentUpload.service';
import type { ProofDocumentType } from '../../services/documentUpload.service';

interface ProofDocumentViewerProps {
  documentUrl: string;
  documentType: ProofDocumentType | string;
  uploadedAt: string;
  reviewedByStudent?: boolean;
  studentReviewNotes?: string;
  onApprove?: (notes?: string) => void;
  onReject?: (notes?: string) => void;
  isStudent?: boolean;
  isAdmin?: boolean;
  loading?: boolean;
}

const ProofDocumentViewer: React.FC<ProofDocumentViewerProps> = ({
  documentUrl,
  documentType,
  uploadedAt,
  reviewedByStudent,
  studentReviewNotes,
  onApprove,
  onReject,
  isStudent = false,
  isAdmin = false,
  loading = false
}) => {
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [notes, setNotes] = useState('');
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);

  const handleSubmitReview = () => {
    if (action === 'approve' && onApprove) {
      onApprove(notes);
    } else if (action === 'reject' && onReject) {
      onReject(notes);
    }
    setShowNotesInput(false);
    setNotes('');
    setAction(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isImageFile = documentUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const isPdfFile = documentUrl.match(/\.pdf$/i);

  return (
    <div className="space-y-6">
      {/* Document Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <FileText className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-black mb-1">وثيقة إثبات القرابة</h3>
              <div className="space-y-1 text-sm text-white/90">
                <p>النوع: <span className="font-bold">{getProofDocumentTypeLabel(documentType as ProofDocumentType)}</span></p>
                <p>تاريخ الرفع: <span className="font-bold">{formatDate(uploadedAt)}</span></p>
              </div>
            </div>
          </div>
          <a
            href={documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 bg-white/20 rounded-xl hover:bg-white/30 transition-colors backdrop-blur-sm"
            title="فتح في نافذة جديدة"
          >
            <ExternalLink className="w-5 h-5" />
          </a>
        </div>
      </div>

      {/* Document Preview */}
      <div className="bg-slate-50 rounded-2xl p-6">
        <h4 className="font-black text-slate-800 mb-4 flex items-center gap-2">
          <Eye className="w-5 h-5 text-purple-500" />
          معاينة الوثيقة
        </h4>

        <div className="bg-white rounded-xl overflow-hidden shadow-lg">
          {isImageFile ? (
            <img 
              src={documentUrl} 
              alt="Proof Document" 
              className="w-full max-h-96 object-contain"
            />
          ) : isPdfFile ? (
            <iframe
              src={documentUrl}
              className="w-full h-96 border-0"
              title="PDF Preview"
            />
          ) : (
            <div className="p-12 text-center space-y-4">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <FileText className="w-10 h-10 text-blue-600" />
              </div>
              <p className="text-slate-600 font-bold">لا يمكن معاينة هذا النوع من الملفات</p>
              <a
                href={documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-all"
              >
                <Download className="w-5 h-5" />
                تحميل الملف
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Review Status */}
      {reviewedByStudent && (
        <div className="bg-green-50 border-r-4 border-green-400 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-green-700">تمت مراجعة الوثيقة من قبل الطالب</p>
              {studentReviewNotes && (
                <div className="mt-2 p-3 bg-white rounded-lg text-sm text-green-600">
                  <p className="font-bold mb-1">ملاحظات الطالب:</p>
                  <p>{studentReviewNotes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Review Actions (for students and admins) */}
      {(isStudent || isAdmin) && onApprove && onReject && !showNotesInput && (
        <div className="space-y-3">
          <div className="flex gap-3">
            <button
              onClick={() => {
                setAction('approve');
                setShowNotesInput(true);
              }}
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              {isStudent ? 'اعتماد الوثيقة' : 'اعتماد الطلب'}
            </button>
            <button
              onClick={() => {
                setAction('reject');
                setShowNotesInput(true);
              }}
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-bold hover:from-red-600 hover:to-rose-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <XCircle className="w-5 h-5" />
              {isStudent ? 'رفض الوثيقة' : 'رفض الطلب'}
            </button>
          </div>
        </div>
      )}

      {/* Notes Input */}
      {showNotesInput && (
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            {action === 'approve' ? (
              <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
            )}
            <div className="flex-1">
              <h4 className="font-black text-slate-800 mb-2">
                {action === 'approve' ? 'اعتماد الوثيقة' : 'رفض الوثيقة'}
              </h4>
              <p className="text-sm text-slate-500 mb-4">
                {action === 'approve' 
                  ? 'يمكنك إضافة ملاحظات (اختياري)' 
                  : 'يرجى إدخال سبب الرفض'}
              </p>
            </div>
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="اكتب ملاحظاتك هنا..."
            className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all min-h-[120px]"
          />

          <div className="flex gap-3">
            <button
              onClick={handleSubmitReview}
              disabled={loading || (action === 'reject' && !notes.trim())}
              className={`flex-1 py-3 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                action === 'approve'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                  : 'bg-gradient-to-r from-red-500 to-rose-600 text-white'
              }`}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : action === 'approve' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              {action === 'approve' ? 'تأكيد الاعتماد' : 'تأكيد الرفض'}
            </button>
            <button
              onClick={() => {
                setShowNotesInput(false);
                setNotes('');
                setAction(null);
              }}
              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProofDocumentViewer;
