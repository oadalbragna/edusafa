/**
 * Parent Approval Management - لوحة موافقة أولياء الأمور للمشرفين
 *
 * Allows admins to review and approve parent link requests
 * Shows student and parent details, approves/rejects requests
 * Includes proof document review
 */

import React, { useState, useEffect } from 'react';
import {
  UserCheck, UserX, Eye, CheckCircle2, XCircle,
  Clock, AlertCircle, Loader2, Shield, Mail, Phone, User,
  BookOpen, Calendar, ChevronDown, ChevronUp, MessageSquare, FileText
} from 'lucide-react';
import { useToast } from '../../../components/common/ToastProvider';
import { ParentLinkService, ParentLinkRequest } from '../../../services/api/ParentLinkService';
import ProofDocumentViewer from '../../../components/parent/ProofDocumentViewer';
import { ref, get, update } from 'firebase/database';
import { getDb as db } from '../../../services/firebase';
import { SYS } from '../../../constants/dbPaths';

const ParentApprovalManagement: React.FC = () => {
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  const [requests, setRequests] = useState<ParentLinkRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  
  // Proof document review state
  const [showProofViewer, setShowProofViewer] = useState(false);
  const [proofReviewRequestId, setProofReviewRequestId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  // Fetch requests
  useEffect(() => {
    loadRequests();
    
    // Subscribe to real-time updates
    const unsubscribe = ParentLinkService.subscribeToAdminRequests((updatedRequests) => {
      setRequests(updatedRequests);
    });

    return () => unsubscribe();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await ParentLinkService.getAdminParentRequests();
      setRequests(data);
    } catch (error: any) {
      showError(error.message || 'فشل تحميل الطلبات');
    } finally {
      setLoading(false);
    }
  };

  // Approve request
  const handleApprove = async (requestId: string) => {
    if (!window.confirm('هل أنت متأكد من الموافقة على هذا الطلب؟')) {
      return;
    }

    setProcessing(true);
    try {
      const request = requests.find(r => r.id === requestId);
      if (!request) return;

      // Use the updated function from parentLinkRequests
      const { adminRespondToRequest } = await import('../../../utils/parentLinkRequests');
      const result = await adminRespondToRequest(requestId, 'admin_current', 'approve', undefined, reviewNotes);

      if (result.success) {
        showSuccess('تمت الموافقة بنجاح ✅');
        setRequests(prev => prev.filter(r => r.id !== requestId));
        setShowProofViewer(false);
        setProofReviewRequestId(null);
        setReviewNotes('');
      } else {
        showError(result.errorMessage || 'فشل الموافقة');
      }
    } catch (error: any) {
      showError(error.message || 'حدث خطأ');
    } finally {
      setProcessing(false);
    }
  };

  // Reject request
  const handleReject = (requestId: string) => {
    setSelectedRequestId(requestId);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!selectedRequestId) return;

    if (!rejectReason.trim()) {
      showWarning('يرجى إدخال سبب الرفض');
      return;
    }

    setProcessing(true);
    try {
      const { adminRespondToRequest } = await import('../../../utils/parentLinkRequests');
      const result = await adminRespondToRequest(selectedRequestId, 'admin_current', 'reject', rejectReason, reviewNotes);

      if (result.success) {
        showInfo('تم رفض الطلب');
        setRequests(prev => prev.filter(r => r.id !== selectedRequestId));
        setShowRejectModal(false);
        setRejectReason('');
        setReviewNotes('');
      } else {
        showError(result.errorMessage || 'فشل رفض الطلب');
      }
    } catch (error: any) {
      showError(error.message || 'حدث خطأ');
    } finally {
      setProcessing(false);
    }
  };

  // Open proof document viewer
  const handleOpenProofViewer = (requestId: string) => {
    setProofReviewRequestId(requestId);
    setShowProofViewer(true);
    setExpandedId(null);
  };

  // Get time ago
  const getTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return 'الآن';
    if (seconds < 3600) return `منذ ${Math.floor(seconds / 60)} دقيقة`;
    if (seconds < 86400) return `منذ ${Math.floor(seconds / 3600)} ساعة`;
    return `منذ ${Math.floor(seconds / 86400)} يوم`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 md:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl p-8 mb-8 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-4 mb-3">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-black text-white mb-1">طلبات ربط أولياء الأمور</h1>
                  <p className="text-white/80 text-sm">مراجعة والموافقة على طلبات الربط</p>
                </div>
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-4">
              <p className="text-white/80 text-xs mb-1">الطلبات المعلقة</p>
              <p className="text-4xl font-black text-white">{requests.length}</p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 font-bold">جاري تحميل الطلبات...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && requests.length === 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-16 text-center shadow-xl">
            <div className="w-24 h-24 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6">
              <UserCheck className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-black text-gray-800 dark:text-white mb-2">لا توجد طلبات معلقة</h3>
            <p className="text-gray-500 dark:text-gray-400">لا توجد طلبات ربط ولي أمر تحتاج مراجعة حالياً</p>
          </div>
        )}

        {/* Requests List */}
        {!loading && requests.length > 0 && (
          <div className="space-y-4">
            {requests.map((request, index) => (
              <div
                key={request.id}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden transition-all hover:shadow-xl"
              >
                {/* Request Header */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Status Badge */}
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                        request.status === 'student_approved' 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                          : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
                      }`}>
                        {request.status === 'student_approved' ? (
                          <CheckCircle2 className="w-6 h-6" />
                        ) : (
                          <Clock className="w-6 h-6" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-black text-gray-800 dark:text-white">
                            {request.parentName}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            request.status === 'student_approved'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                              : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
                          }`}>
                            {request.status === 'student_approved' ? 'موافقة الطالب ✓' : 'في الانتظار'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Mail className="w-4 h-4" />
                            <span>{request.parentEmail}</span>
                          </div>
                          {request.parentPhone && (
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                              <Phone className="w-4 h-4" />
                              <span>{request.parentPhone}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <User className="w-4 h-4" />
                            <span>الطالب: {request.studentName}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Clock className="w-4 h-4" />
                            <span>{getTimeAgo(request.requestedAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expand Button */}
                    <button
                      onClick={() => setExpandedId(expandedId === request.id ? null : request.id)}
                      className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      {expandedId === request.id ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    {request.proofDocumentUrl ? (
                      <>
                        <button
                          onClick={() => handleOpenProofViewer(request.id)}
                          className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-bold hover:from-blue-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
                        >
                          <Eye className="w-5 h-5" />
                          مراجعة الوثيقة
                        </button>
                        <button
                          onClick={() => handleApprove(request.id)}
                          disabled={processing}
                          className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {processing ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <>
                              <UserCheck className="w-5 h-5" />
                              اعتماد
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          disabled={processing}
                          className="flex-1 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-bold hover:from-red-600 hover:to-rose-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          <UserX className="w-5 h-5" />
                          رفض
                        </button>
                      </>
                    ) : (
                      <div className="flex-1 p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-xl text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <AlertCircle className="w-5 h-5 text-amber-600" />
                          <p className="font-bold text-amber-700 dark:text-amber-400 text-sm">
                            ولي الأمر لم يرفع وثيقة الإثبات بعد
                          </p>
                        </div>
                        <p className="text-xs text-amber-600 dark:text-amber-500">
                          الموافقة تتطلب رفع وثيقة إثبات القرابة أولاً
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedId === request.id && (
                  <div className="border-t border-gray-100 dark:border-slate-700 p-6 bg-gray-50 dark:bg-slate-700/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Parent Details */}
                      <div>
                        <h4 className="font-black text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                          <User className="w-4 h-4" />
                          بيانات ولي الأمر
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between p-2 bg-white dark:bg-slate-800 rounded-lg">
                            <span className="text-gray-500">الاسم:</span>
                            <span className="font-bold text-gray-800 dark:text-white">{request.parentName}</span>
                          </div>
                          <div className="flex justify-between p-2 bg-white dark:bg-slate-800 rounded-lg">
                            <span className="text-gray-500">البريد:</span>
                            <span className="font-bold text-gray-800 dark:text-white">{request.parentEmail}</span>
                          </div>
                          {request.parentPhone && (
                            <div className="flex justify-between p-2 bg-white dark:bg-slate-800 rounded-lg">
                              <span className="text-gray-500">الهاتف:</span>
                              <span className="font-bold text-gray-800 dark:text-white">{request.parentPhone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Student Details */}
                      <div>
                        <h4 className="font-black text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                          <BookOpen className="w-4 h-4" />
                          بيانات الطالب
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between p-2 bg-white dark:bg-slate-800 rounded-lg">
                            <span className="text-gray-500">الاسم:</span>
                            <span className="font-bold text-gray-800 dark:text-white">{request.studentName}</span>
                          </div>
                          <div className="flex justify-between p-2 bg-white dark:bg-slate-800 rounded-lg">
                            <span className="text-gray-500">البريد:</span>
                            <span className="font-bold text-gray-800 dark:text-white">{request.studentEmail}</span>
                          </div>
                          {request.studentClass && (
                            <div className="flex justify-between p-2 bg-white dark:bg-slate-800 rounded-lg">
                              <span className="text-gray-500">الفصل:</span>
                              <span className="font-bold text-gray-800 dark:text-white">{request.studentClass}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Invite Code */}
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mb-1">كود الدعوة:</p>
                      <p className="font-mono text-sm font-black text-blue-700 dark:text-blue-300">{request.inviteCode}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-black text-gray-800 dark:text-white mb-2">رفض الطلب</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">يرجى إدخال سبب الرفض</p>
              </div>

              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="سبب رفض الطلب..."
                className="w-full p-4 bg-gray-50 dark:bg-slate-700 border-2 border-gray-200 dark:border-slate-600 rounded-2xl focus:border-red-500 focus:ring-4 focus:ring-red-500/20 outline-none transition-all dark:text-white min-h-[120px]"
              />

              <div className="flex gap-3">
                <button
                  onClick={confirmReject}
                  disabled={processing}
                  className="flex-1 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-bold hover:from-red-600 hover:to-rose-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      <UserX className="w-5 h-5" />
                      تأكيد الرفض
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Proof Document Viewer Modal */}
        {showProofViewer && proofReviewRequestId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-gray-800 dark:text-white">مراجعة وثيقة إثبات القرابة</h3>
                  {(() => {
                    const request = requests.find(r => r.id === proofReviewRequestId);
                    return request && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        ولي الأمر: {request.parentName} - الطالب: {request.studentName}
                      </p>
                    );
                  })()}
                </div>
                <button
                  onClick={() => {
                    setShowProofViewer(false);
                    setProofReviewRequestId(null);
                  }}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <XCircle className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {(() => {
                  const request = requests.find(r => r.id === proofReviewRequestId);
                  if (!request || !request.proofDocumentUrl) return null;

                  return (
                    <ProofDocumentViewer
                      documentUrl={request.proofDocumentUrl}
                      documentType={request.proofDocumentType || 'other'}
                      uploadedAt={request.proofUploadedAt || request.requestedAt}
                      reviewedByStudent={request.proofReviewedByStudent}
                      studentReviewNotes={request.proofStudentReviewNotes}
                      isAdmin={true}
                      isStudent={false}
                      loading={processing}
                      onApprove={(notes) => {
                        setReviewNotes(notes || '');
                        handleApprove(proofReviewRequestId);
                      }}
                      onReject={(notes) => {
                        setRejectReason(notes || '');
                        handleReject(proofReviewRequestId);
                      }}
                    />
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentApprovalManagement;
