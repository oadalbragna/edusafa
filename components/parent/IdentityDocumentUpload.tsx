/**
 * Identity Document Upload Component - مكون رفع مستند إثبات الهوية
 *
 * Allows parents to upload identity documents (ID card, passport, etc.) via Telegram Bridge
 * Supports: ID Card, Passport, Family Book, Birth Certificate, or any proof document
 */

import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, X, Image as ImageIcon, CreditCard, Globe, Users, Baby, FileCheck } from 'lucide-react';
import { TelegramService } from '../../services/telegram.service';
import { useToast } from '../../components/common/ToastProvider';

// Document types for identity verification
export type IdentityDocumentType = 'id_card' | 'passport' | 'family_book' | 'birth_certificate' | 'driver_license' | 'residence_permit' | 'other';

export interface IdentityDocumentData {
  documentType: IdentityDocumentType;
  fileUrl: string;
  fileName: string;
  fileId?: string;
  shortId?: string;
  uploadedAt: string;
}

interface IdentityDocumentUploadProps {
  parentUid: string;
  parentName: string;
  onSuccess: (documentData: IdentityDocumentData) => void;
  onCancel?: () => void;
  className?: string;
}

// Document type configuration
const DOCUMENT_TYPES: { value: IdentityDocumentType; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: 'id_card',
    label: 'بطاقة الهوية',
    icon: <CreditCard className="w-5 h-5" />,
    description: 'بطاقة الهوية الوطنية أو الشخصية'
  },
  {
    value: 'passport',
    label: 'جواز السفر',
    icon: <Globe className="w-5 h-5" />,
    description: 'جواز السفر ساري المفعول'
  },
  {
    value: 'family_book',
    label: 'دفتر العائلة',
    icon: <Users className="w-5 h-5" />,
    description: 'دفتر العائلة أو سجل الأسرة'
  },
  {
    value: 'birth_certificate',
    label: 'شهادة الميلاد',
    icon: <Baby className="w-5 h-5" />,
    description: 'شهادة الميلاد الرسمية'
  },
  {
    value: 'driver_license',
    label: 'رخصة القيادة',
    icon: <FileCheck className="w-5 h-5" />,
    description: 'رخصة القيادة كإثبات هوية'
  },
  {
    value: 'residence_permit',
    label: 'إقامة',
    icon: <FileText className="w-5 h-5" />,
    description: 'تصريح الإقامة أو الإقامة الدائمة'
  },
  {
    value: 'other',
    label: 'مستند آخر',
    icon: <FileText className="w-5 h-5" />,
    description: 'أي مستند رسمي آخر يثبت الهوية'
  }
];

const IdentityDocumentUpload: React.FC<IdentityDocumentUploadProps> = ({
  parentUid,
  parentName,
  onSuccess,
  onCancel,
  className = ''
}) => {
  const { showSuccess, showError, showWarning } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<IdentityDocumentType>('id_card');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(true);

  // Handle file selection
  const handleFileSelect = (file: File | null) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      showError(
        'نوع الملف غير مدعوم',
        'يرجى اختيار صورة (JPG, PNG, WebP) أو ملف PDF فقط'
      );
      return;
    }

    // Validate file size (10MB max for identity documents)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      showError(
        'الملف كبير جداً',
        'الحد الأقصى لحجم الملف هو 10 ميجابايت'
      );
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files?.[0] || null);
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files[0] || null);
  };

  // Handle upload to Telegram
  const handleUpload = async () => {
    if (!selectedFile) {
      showError('خطأ', 'يرجى اختيار ملف أولاً');
      return;
    }

    if (!documentType) {
      showError('خطأ', 'يرجى اختيار نوع المستند');
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      // Upload file via Telegram Service (unified tunnel)
      console.log('📤 Starting upload:', {
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        documentType,
        parentUid
      });

      setUploadProgress(20);

      const result = await TelegramService.uploadFile(
        selectedFile,
        'identity_documents',
        parentUid
      );

      setUploadProgress(80);

      console.log('📥 Upload result:', result);

      if (result.success && result.url) {
        setUploadProgress(100);

        // Create document data object
        const documentData: IdentityDocumentData = {
          documentType,
          fileUrl: result.url,
          fileName: selectedFile.name,
          fileId: result.fileId,
          shortId: result.shortId,
          uploadedAt: new Date().toISOString()
        };

        console.log('✅ Upload successful, notifying parent component');

        showSuccess(
          'تم رفع المستند بنجاح ✓',
          `تم رفع ${DOCUMENT_TYPES.find(t => t.value === documentType)?.label || 'المستند'} وحفظه بأمان`
        );

        // Notify parent component to save to Firebase
        onSuccess(documentData);
      } else {
        // Upload failed - show detailed error
        const errorMessage = result.error || 'حدث خطأ غير معروف أثناء رفع الملف';
        console.error('❌ Upload failed:', errorMessage);
        
        showError(
          'فشل رفع المستند ✗',
          errorMessage
        );
      }
    } catch (error: any) {
      console.error('❌ Identity document upload error:', {
        error: error,
        message: error.message,
        stack: error.stack
      });
      
      // Provide helpful error message based on error type
      let errorMessage = 'حدث خطأ غير متوقع أثناء الرفع';
      
      if (error.message?.includes('Failed to fetch') || error.message?.includes('network')) {
        errorMessage = 'خطأ في الاتصال بالشبكة. يرجى التحقق من الإنترنت والمحاولة مرة أخرى.';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'انتهت مهلة الاتصال. يرجى المحاولة مرة أخرى.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showError(
        'خطأ أثناء الرفع ✗',
        errorMessage
      );
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Cleanup preview URL on unmount
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Get selected document type config
  const selectedDocType = DOCUMENT_TYPES.find(t => t.value === documentType);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center mx-auto shadow-xl">
          <FileText className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-white">
          رفع مستند إثبات الهوية
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          يرجى رفع مستند رسمي يثبت هويتك وقرابتك بالطالب
        </p>
      </div>

      {/* Document Type Selection - Card Grid */}
      {showTypeSelector && (
        <div className="space-y-3">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-purple-500" />
            نوع المستند
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2">
            {DOCUMENT_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => {
                  setDocumentType(type.value);
                  if (selectedFile) setShowTypeSelector(false);
                }}
                className={`
                  p-4 rounded-xl border-2 transition-all text-right
                  ${documentType === type.value
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-md'
                    : 'border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-600 bg-white dark:bg-slate-800'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <div className={`
                    p-2 rounded-lg
                    ${documentType === type.value
                      ? 'bg-purple-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }
                  `}>
                    {type.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 dark:text-white text-sm">{type.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{type.description}</p>
                  </div>
                  {documentType === type.value && (
                    <CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected Document Type Badge */}
      {!showTypeSelector && selectedDocType && (
        <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-300 dark:border-purple-700 rounded-xl">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-500 rounded-lg text-white">
              {selectedDocType.icon}
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">نوع المستند المختار</p>
              <p className="font-bold text-slate-800 dark:text-white text-sm">{selectedDocType.label}</p>
            </div>
          </div>
          <button
            onClick={() => setShowTypeSelector(true)}
            className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 font-bold"
          >
            تغيير
          </button>
        </div>
      )}

      {/* File Upload Area */}
      <div className="space-y-3">
        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <Upload className="w-4 h-4 text-blue-500" />
          ملف المستند
        </label>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all
            ${dragOver
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
              : selectedFile
                ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                : 'border-slate-300 dark:border-slate-600 hover:border-purple-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {!selectedFile ? (
            <div className="space-y-4">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto">
                <Upload className="w-10 h-10 text-slate-400" />
              </div>
              <div>
                <p className="font-bold text-slate-700 dark:text-slate-300">
                  اضغط لاختيار ملف أو اسحب الملف هنا
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  PNG, JPG, WebP, PDF (الحد الأقصى 10 ميجابايت)
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {previewUrl ? (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="معاينة المستند"
                    className="max-h-64 mx-auto rounded-lg shadow-md"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setPreviewUrl(null);
                      setShowTypeSelector(true);
                    }}
                    className="absolute top-2 right-2 p-2 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-4">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-right flex-1">
                    <p className="font-bold text-slate-700 dark:text-slate-300">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setPreviewUrl(null);
                      setShowTypeSelector(true);
                    }}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">جاري الرفع عبر تيليغرام...</span>
            <span className="font-bold text-purple-600 dark:text-purple-400">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-r-4 border-amber-400 rounded-xl p-4 space-y-2">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">معلومات مهمة</p>
            <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1 mt-2">
              <li>• المستند ضروري لإثبات هويتك وقرابتك بالطالب</li>
              <li>• يتم رفع المستند بشكل آمن عبر جسر تيليغرام</li>
              <li>• تأكد من وضوح المستند وقراءة جميع البيانات</li>
              <li>• المستندات المقبولة: بطاقة هوية، جواز سفر، دفتر عائلة، شهادة ميلاد</li>
              <li>• الحد الأقصى لحجم الملف: 10 ميجابايت</li>
              <li>• سيتم مراجعة المستند من قبل الطالب والإدارة</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={uploading}
            className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            إلغاء
          </button>
        )}
        <button
          onClick={handleUpload}
          disabled={!selectedFile || uploading || !documentType}
          className="flex-1 py-3 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white rounded-xl font-black shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              جاري الرفع...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              رفع المستند عبر تيليغرام
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default IdentityDocumentUpload;
