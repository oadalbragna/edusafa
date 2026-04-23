/**
 * Proof Document Upload Component - مكون رفع وثيقة الإثبات
 * 
 * Allows parents to upload guardian proof documents after student approval
 */

import * as React from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, X, Image as ImageIcon } from 'lucide-react';
import { uploadProofDocument, getProofDocumentTypeLabel } from '../../services/documentUpload.service';
import type { ProofDocumentType } from '../../services/documentUpload.service';
import { useToast } from '../../components/common/ToastProvider';

interface ProofDocumentUploadProps {
  requestId: string;
  parentUid: string;
  studentName: string;
  onUploadSuccess: (downloadUrl: string, documentType: ProofDocumentType) => void;
  onCancel?: () => void;
}

const ProofDocumentUpload: React.FC<ProofDocumentUploadProps> = ({
  requestId,
  parentUid,
  studentName,
  onUploadSuccess,
  onCancel
}) => {
  const { showSuccess, showError } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [documentType, setDocumentType] = React.useState<ProofDocumentType>('id_card');
  const [uploading, setUploading] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [dragOver, setDragOver] = React.useState(false);

  // Handle file selection
  const handleFileSelect = (file: File | null) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      showError('نوع الملف غير مدعوم', 'يرجى اختيار صورة (JPG, PNG) أو ملف PDF');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      showError('الملف كبير جداً', 'الحد الأقصى لحجم الملف هو 5 ميجابايت');
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
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files[0] || null);
  };

  // Handle upload
  const handleUpload = async () => {
    if (!selectedFile) {
      showError('خطأ', 'يرجى اختيار ملف أولاً');
      return;
    }

    setUploading(true);
    try {
      const result = await uploadProofDocument(selectedFile, requestId, parentUid);

      if (result.success && result.downloadUrl) {
        showSuccess('تم رفع الوثيقة بنجاح', 'سيتم مراجعة الوثيقة من قبل الطالب والإدارة');
        onUploadSuccess(result.downloadUrl, documentType);
      } else {
        showError('فشل الرفع', result.errorMessage || 'حدث خطأ أثناء رفع الملف');
      }
    } catch (error: any) {
      showError('فشل الرفع', error.message || 'حدث خطأ غير متوقع');
    } finally {
      setUploading(false);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
          <FileText className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-black text-slate-800">رفع وثيقة إثبات القرابة</h2>
        <p className="text-sm text-slate-500">
          يرجى رفع وثيقة تثبت قرابتك للطالب <span className="font-bold text-blue-600">{studentName}</span>
        </p>
      </div>

      {/* Document Type Selection */}
      <div className="space-y-3">
        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <FileText className="w-4 h-4 text-purple-500" />
          نوع الوثيقة
        </label>
        <select
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value as ProofDocumentType)}
          className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
        >
          <option value="id_card">بطاقة الهوية</option>
          <option value="birth_certificate">شهادة الميلاد</option>
          <option value="family_book">دفتر العائلة</option>
          <option value="court_order">أمر المحكمة</option>
          <option value="other">أخرى</option>
        </select>
      </div>

      {/* File Upload Area */}
      <div className="space-y-3">
        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <Upload className="w-4 h-4 text-blue-500" />
          ملف الوثيقة
        </label>
        
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all
            ${dragOver 
              ? 'border-purple-500 bg-purple-50' 
              : selectedFile 
                ? 'border-green-400 bg-green-50' 
                : 'border-slate-300 hover:border-purple-400 hover:bg-slate-50'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/jpg,application/pdf"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {!selectedFile ? (
            <div className="space-y-3">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                <Upload className="w-8 h-8 text-slate-400" />
              </div>
              <div>
                <p className="font-bold text-slate-700">اضغط لاختيار ملف أو اسحب الملف هنا</p>
                <p className="text-xs text-slate-500 mt-1">PNG, JPG, PDF (الحد الأقصى 5 ميجابايت)</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {previewUrl ? (
                <div className="relative">
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="max-h-48 mx-auto rounded-lg shadow-md"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-700">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                    className="p-1 text-slate-400 hover:text-red-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-amber-50 border-r-4 border-amber-400 rounded-xl p-4 space-y-2">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-700">معلومات مهمة</p>
            <ul className="text-xs text-amber-600 space-y-1 mt-2">
              <li>• الوثيقة ضرورية لإثبات قرابتك بالطالب</li>
              <li>• سيتم مراجعة الوثيقة من قبل الطالب والإدارة</li>
              <li>• تأكد من وضوح الوثيقة وقراءة جميع البيانات</li>
              <li>• الحد الأقصى لحجم الملف: 5 ميجابايت</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {onCancel && (
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
          >
            إلغاء
          </button>
        )}
        <button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-black shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              رفع الوثيقة
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ProofDocumentUpload;
