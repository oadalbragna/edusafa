/**
 * QR Code Display Component - مكون عرض QR Code
 *
 * Displays student's QR code for parents to scan
 * Shows invite code and allows generating new codes
 */

import React, { useState } from 'react';
import {
  QrCode, Copy, RefreshCw, AlertCircle, CheckCircle2,
  Share2, Download, Info, Image as ImageIcon
} from 'lucide-react';
import { generateQRCodeURL, getParentQRCodeData } from '../../utils/qrCodeGenerator';
import { useToast } from '../../components/common/ToastProvider';

interface QRCodeDisplayProps {
  studentUid: string;
  studentName: string;
  inviteCode: string;
  onGenerateNew: () => Promise<void>;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  studentUid,
  studentName,
  inviteCode,
  onGenerateNew
}) => {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Generate QR code URL
  const qrData = getParentQRCodeData(studentUid, inviteCode, studentName);
  const qrCodeURL = generateQRCodeURL(qrData);

  // Copy invite code to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      toast.showSuccess('تم نسخ الكود بنجاح');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.showError('فشل نسخ الكود');
    }
  };

  // Generate new code
  const handleGenerateNew = async () => {
    if (!window.confirm('سيتم إنشاء كود جديد. هل أنت متأكد؟')) {
      return;
    }

    setGenerating(true);
    try {
      await onGenerateNew();
      toast.showSuccess('تم إنشاء كود جديد بنجاح');
    } catch (error: any) {
      toast.showError(error.message || 'فشل إنشاء كود جديد');
    } finally {
      setGenerating(false);
    }
  };

  // Share code
  const handleShare = async () => {
    const shareText = `كود دعوة ولي الأمر من ${studentName}: ${inviteCode}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'كود دعوة ولي الأمر',
          text: shareText
        });
      } catch (error) {
        // User cancelled share
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <QrCode className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-black text-gray-800 dark:text-white">كود دعوة ولي الأمر</h3>
            <p className="text-xs text-gray-400">شارك هذا الكود مع ولي أمرك</p>
          </div>
        </div>
        <button
          onClick={handleGenerateNew}
          disabled={generating}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
          title="إنشاء كود جديد"
        >
          <RefreshCw className={`w-5 h-5 text-gray-500 ${generating ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* QR Code Display */}
      <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-slate-500">
        <div className="text-center space-y-3 w-full p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 mx-auto shadow-lg max-w-[220px]">
            <img 
              src={qrCodeURL} 
              alt="QR Code" 
              className="w-full h-auto rounded-xl"
              crossOrigin="anonymous"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">امسح هذا الرمز بواسطة هاتف ولي الأمر</p>
        </div>
      </div>

      {/* Invite Code Display */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-blue-700 dark:text-blue-300">كود الدعوة:</p>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-700 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-600 transition-colors"
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                <span className="text-xs text-green-500 font-bold">تم النسخ</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-xs text-gray-500 font-bold">نسخ</span>
              </>
            )}
          </button>
        </div>
        <div className="p-4 bg-white dark:bg-slate-800 rounded-xl font-mono text-center text-lg tracking-wider border-2 border-blue-200 dark:border-blue-700">
          <span className="text-blue-600 dark:text-blue-400 font-black">{inviteCode}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleCopy}
          className="flex items-center justify-center gap-2 p-3 bg-gray-100 dark:bg-slate-700 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors font-bold text-sm"
        >
          <Copy className="w-4 h-4" />
          نسخ الكود
        </button>
        <button
          onClick={handleShare}
          className="flex items-center justify-center gap-2 p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors font-bold text-sm"
        >
          <Share2 className="w-4 h-4" />
          مشاركة
        </button>
      </div>

      {/* Info */}
      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-700 dark:text-amber-300 space-y-2">
            <p className="font-bold">تعليمات هامة:</p>
            <ul className="space-y-1 text-xs list-disc list-inside">
              <li>شارك هذا الكود مع ولي أمرك فقط</li>
              <li>الكود صالح لمدة 7 أيام</li>
              <li>يمكنك إنشاء كود جديد في أي وقت</li>
              <li>يجب عليك الموافقة على طلب الربط</li>
              <li>توافق الإدارة أيضاً على الطلب</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeDisplay;
