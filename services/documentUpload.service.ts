/**
 * Document Upload Service - خدمة رفع المستندات
 * 
 * Handles uploading guardian proof documents to Firebase Storage
 */

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../services/firebase';

export type ProofDocumentType = 'id_card' | 'birth_certificate' | 'family_book' | 'court_order' | 'other';

export interface UploadResult {
  success: boolean;
  downloadUrl?: string;
  errorMessage?: string;
}

/**
 * Upload guardian proof document to Firebase Storage
 */
export async function uploadProofDocument(
  file: File,
  requestId: string,
  parentUid: string
): Promise<UploadResult> {
  try {
    if (!storage) {
      return { success: false, errorMessage: 'Firebase Storage غير متوفر' };
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, errorMessage: 'نوع الملف غير مدعوم. يرجى رفع صورة أو PDF' };
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return { success: false, errorMessage: 'حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت' };
    }

    // Create storage path
    const storagePath = `parent_link_requests/${requestId}/proof_document`;
    const storageRef = ref(storage, storagePath);

    // Add metadata
    const metadata = {
      contentType: file.type,
      customMetadata: {
        requestId,
        parentUid,
        uploadedAt: new Date().toISOString()
      }
    };

    // Upload file
    const snapshot = await uploadBytes(storageRef, file, metadata);
    
    // Get download URL
    const downloadUrl = await getDownloadURL(snapshot.ref);

    return { success: true, downloadUrl };
  } catch (error: any) {
    console.error('Error uploading proof document:', error);
    return { success: false, errorMessage: error.message || 'فشل رفع الملف' };
  }
}

/**
 * Validate proof document type
 */
export function isValidProofDocumentType(type: string): type is ProofDocumentType {
  return ['id_card', 'birth_certificate', 'family_book', 'court_order', 'other'].includes(type);
}

/**
 * Get proof document type label in Arabic
 */
export function getProofDocumentTypeLabel(type: ProofDocumentType): string {
  const labels: Record<ProofDocumentType, string> = {
    'id_card': 'بطاقة الهوية',
    'birth_certificate': 'شهادة الميلاد',
    'family_book': 'دفتر العائلة',
    'court_order': 'أمر المحكمة',
    'other': 'أخرى'
  };
  return labels[type] || 'أخرى';
}

export const DocumentUploadService = {
  uploadProofDocument,
  isValidProofDocumentType,
  getProofDocumentTypeLabel
};

export default DocumentUploadService;
