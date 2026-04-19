/**
 * Identity Document Service - خدمة مستندات الهوية
 *
 * Handles saving and managing parent identity documents in Firebase
 * Documents are stored at: sys/users/{parentUid}/identityDocuments/{docId}
 */

import { ref, get, set, update, push } from 'firebase/database';
import { getDb as db } from '../services/firebase';
import { SYS } from '../constants/dbPaths';
import type { IdentityDocumentData } from '../components/parent/IdentityDocumentUpload';

export interface ParentIdentityDocument {
  id: string;
  documentType: string;
  fileUrl: string;
  fileName: string;
  fileId?: string;
  shortId?: string;
  uploadedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

/**
 * Save parent identity document to Firebase
 */
export async function saveParentIdentityDocument(
  parentUid: string,
  documentData: IdentityDocumentData
): Promise<{ success: boolean; documentId?: string; errorMessage?: string }> {
  try {
    // Create a new document entry
    const docRef = ref(db, `${SYS.user(parentUid)}/identityDocuments`);
    const newDocRef = push(docRef);
    const documentId = newDocRef.key!;

    const document: ParentIdentityDocument = {
      id: documentId,
      documentType: documentData.documentType,
      fileUrl: documentData.fileUrl,
      fileName: documentData.fileName,
      fileId: documentData.fileId,
      shortId: documentData.shortId,
      uploadedAt: documentData.uploadedAt,
      status: 'pending'
    };

    await set(newDocRef, document);

    return { success: true, documentId };
  } catch (error: any) {
    console.error('Error saving parent identity document:', error);
    return { success: false, errorMessage: error.message || 'فشل حفظ المستند' };
  }
}

/**
 * Get all identity documents for a parent
 */
export async function getParentIdentityDocuments(parentUid: string): Promise<ParentIdentityDocument[]> {
  try {
    const docsRef = ref(db, `${SYS.user(parentUid)}/identityDocuments`);
    const snapshot = await get(docsRef);

    if (!snapshot.exists()) {
      return [];
    }

    const docs = snapshot.val();
    return Object.values(docs) as ParentIdentityDocument[];
  } catch (error) {
    console.error('Error fetching parent identity documents:', error);
    return [];
  }
}

/**
 * Update identity document status (for admin review)
 */
export async function updateIdentityDocumentStatus(
  parentUid: string,
  documentId: string,
  status: 'approved' | 'rejected',
  reviewedBy: string,
  reviewNotes?: string
): Promise<{ success: boolean; errorMessage?: string }> {
  try {
    const docRef = ref(db, `${SYS.user(parentUid)}/identityDocuments/${documentId}`);
    
    await update(docRef, {
      status,
      reviewedBy,
      reviewedAt: new Date().toISOString(),
      reviewNotes: reviewNotes || ''
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error updating identity document status:', error);
    return { success: false, errorMessage: error.message || 'فشل تحديث حالة المستند' };
  }
}

/**
 * Get the latest approved identity document for a parent
 */
export async function getLatestApprovedIdentityDocument(parentUid: string): Promise<ParentIdentityDocument | null> {
  try {
    const documents = await getParentIdentityDocuments(parentUid);
    
    const approvedDocs = documents
      .filter(doc => doc.status === 'approved')
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    return approvedDocs.length > 0 ? approvedDocs[0] : null;
  } catch (error) {
    console.error('Error fetching latest approved identity document:', error);
    return null;
  }
}

/**
 * Check if parent has any pending identity documents
 */
export async function hasPendingIdentityDocument(parentUid: string): Promise<boolean> {
  try {
    const documents = await getParentIdentityDocuments(parentUid);
    return documents.some(doc => doc.status === 'pending');
  } catch (error) {
    console.error('Error checking pending identity documents:', error);
    return false;
  }
}

export const IdentityDocumentService = {
  saveParentIdentityDocument,
  getParentIdentityDocuments,
  updateIdentityDocumentStatus,
  getLatestApprovedIdentityDocument,
  hasPendingIdentityDocument
};

export default IdentityDocumentService;
