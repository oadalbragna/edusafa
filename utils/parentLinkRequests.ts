import { ref, get, update, push, set } from 'firebase/database';
import { getDb as db } from '../services/firebase';
import { SYS } from '../constants/dbPaths';
import type { ParentLinkRequest } from '../types';

/**
 * Generate a random invite code (8 characters, alphanumeric)
 */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate a new parent invite code for a student
 * Stores code at: sys/users/{studentUid}/parentInviteCodes/{CODE}
 * Contains: { code, createdAt, expiresAt, status }
 */
export async function generateParentInviteCode(studentUid: string, validDays: number = 7): Promise<string> {
  const userRef = ref(db, SYS.user(studentUid));
  const snapshot = await get(userRef);

  if (!snapshot.exists()) {
    throw new Error('الطالب غير موجود');
  }

  const userData = snapshot.val();
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + validDays);

  const newCode = generateInviteCode();

  // Expire any existing active codes for this student
  const existingCodesRef = ref(db, SYS.userParentInviteCodes(studentUid));
  const existingSnapshot = await get(existingCodesRef);

  if (existingSnapshot.exists()) {
    const existingCodes = existingSnapshot.val();
    const updates: Record<string, any> = {};

    for (const code in existingCodes) {
      const entry = existingCodes[code];
      if (entry.status === 'active') {
        updates[SYS.userParentInviteCode(studentUid, code)] = { ...entry, status: 'expired' };
      }
    }

    if (Object.keys(updates).length > 0) {
      await update(ref(db), updates);
    }
  }

  // Store new code at sys/users/{studentUid}/parentInviteCodes/{CODE}
  await set(ref(db, SYS.userParentInviteCode(studentUid, newCode)), {
    code: newCode,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    status: 'active'
  });

  // Also update the student's profile with the active code reference
  await update(userRef, {
    parentInviteCode: newCode,
  });

  return newCode;
}

/**
 * Find which user owns a specific invite code by searching across all users
 */
async function findCodeOwner(code: string): Promise<{ userId: string; codeData: any } | null> {
  const usersRef = ref(db, SYS.USERS);
  const usersSnapshot = await get(usersRef);
  
  if (!usersSnapshot.exists()) {
    return null;
  }
  
  const allUsers = usersSnapshot.val();
  
  // Check each user's parentInviteCodes
  for (const userId in allUsers) {
    const userCodesRef = ref(db, SYS.userParentInviteCode(userId, code));
    const codeSnapshot = await get(userCodesRef);
    
    if (codeSnapshot.exists()) {
      return {
        userId,
        codeData: codeSnapshot.val()
      };
    }
  }
  
  return null;
}

/**
 * Validate invite code by looking it up at: sys/users/{studentUid}/parentInviteCodes/{CODE}
 * If found, fetch student info from: sys/users/{studentUid}
 */
export async function validateParentInviteCode(code: string): Promise<{
  valid: boolean;
  studentUid?: string;
  studentName?: string;
  studentEmail?: string;
  studentClassName: string;
  studentEduLevel: string;
  errorMessage?: string;
  expired?: boolean;
  alreadyUsed?: boolean;
}> {
  try {
    const normalizedCode = code.trim().toUpperCase();
    console.log('[Validate] Checking code:', normalizedCode);

    // Find the code owner (which user it belongs to)
    const codeOwner = await findCodeOwner(normalizedCode);
    
    if (!codeOwner) {
      console.error('[Validate] ❌ No invite code found in sys/users/{userId}/parentInviteCodes');
      return { valid: false, errorMessage: 'رمز الدعوة غير صالح', studentClassName: '', studentEduLevel: '' };
    }

    const { userId: studentUid, codeData } = codeOwner;
    console.log('[Validate] Found invite code entry, status:', codeData.status, 'studentUid:', studentUid);

    // Check status
    if (codeData.status === 'used') {
      return { valid: false, errorMessage: 'تم استخدام هذا الرمز بالفعل', alreadyUsed: true, studentClassName: '', studentEduLevel: '' };
    }

    if (codeData.status === 'expired') {
      return { valid: false, errorMessage: 'رمز الدعوة منتهي الصلاحية', expired: true, studentClassName: '', studentEduLevel: '' };
    }

    // Check expiration date
    const expiresAt = new Date(codeData.expiresAt);
    const now = new Date();
    if (expiresAt <= now) {
      // Mark as expired in DB
      await update(ref(db, SYS.userParentInviteCode(studentUid, normalizedCode)), { status: 'expired' });
      return { valid: false, errorMessage: 'رمز الدعوة منتهي الصلاحية', expired: true, studentClassName: '', studentEduLevel: '' };
    }

    if (codeData.status !== 'active') {
      return { valid: false, errorMessage: 'رمز الدعوة غير صالح', studentClassName: '', studentEduLevel: '' };
    }

    // Fetch student info from sys/users/{studentUid}
    const studentRef = ref(db, SYS.user(studentUid));
    const studentSnapshot = await get(studentRef);

    if (!studentSnapshot.exists()) {
      console.error('[Validate] ❌ Student not found:', studentUid);
      return { valid: false, errorMessage: 'بيانات الطالب غير موجودة', studentClassName: '', studentEduLevel: '' };
    }

    const student = studentSnapshot.val();

    console.log('[Validate] ✅ Validation successful for:', student.fullName);

    return {
      valid: true,
      studentUid,
      studentName: student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim(),
      studentEmail: student.email,
      studentClassName: student.className || '',
      studentEduLevel: student.eduLevel || ''
    };
  } catch (error: any) {
    console.error('[Validate] Error:', error);
    return { valid: false, errorMessage: 'حدث خطأ أثناء التحقق من الرمز', studentClassName: '', studentEduLevel: '' };
  }
}

/**
 * Create a parent link request (instead of instant linking)
 * This creates a pending request that requires student and admin approval
 */
export async function createParentLinkRequest(
  parentUid: string,
  parentName: string,
  parentEmail: string,
  parentPhone: string | undefined,
  inviteCode: string,
  studentUid: string,
  studentName: string,
  studentEmail: string
): Promise<{ success: boolean; requestId?: string; errorMessage?: string }> {
  try {
    // Check if there's already a pending request from this parent to this student
    const requestsRef = ref(db, SYS.CONFIG.PARENT_LINK_REQUESTS);
    const snapshot = await get(requestsRef);
    
    if (snapshot.exists()) {
      const requests = snapshot.val();
      const existingRequest = Object.values(requests).find((req: any) => 
        req.parentUid === parentUid && 
        req.studentUid === studentUid && 
        req.status === 'pending'
      );
      
      if (existingRequest) {
        return { success: false, errorMessage: 'لديك طلب معلق بالفعل لهذا الطالب' };
      }

      // Check if parent is already linked
      const studentRef = ref(db, SYS.user(studentUid));
      const studentSnap = await get(studentRef);
      
      if (studentSnap.exists()) {
        const studentData = studentSnap.val();
        const parentLinks = studentData.parentLinks || [];
        
        if (parentLinks.includes(parentUid)) {
          return { success: false, errorMessage: 'أنت مرتبط بالفعل بهذا الطالب' };
        }
      }
    }

    // Create new request
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 7);

    const requestId = `req_${studentUid}_${parentUid}_${Date.now()}`;
    
    const newRequest: ParentLinkRequest = {
      id: requestId,
      studentUid,
      studentName,
      studentEmail,
      parentUid,
      parentName,
      parentEmail,
      parentPhone,
      inviteCode,
      status: 'pending',
      requestedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    await update(ref(db, SYS.CONFIG.parentLinkRequest(requestId)), newRequest);

    return { success: true, requestId };
  } catch (error: any) {
    console.error('Error creating parent link request:', error);
    return { success: false, errorMessage: 'حدث خطأ أثناء إرسال الطلب' };
  }
}

/**
 * Get all pending requests for a student
 */
export async function getStudentParentRequests(studentUid: string): Promise<ParentLinkRequest[]> {
  try {
    const requestsRef = ref(db, SYS.CONFIG.PARENT_LINK_REQUESTS);
    const snapshot = await get(requestsRef);
    
    if (!snapshot.exists()) {
      return [];
    }

    const requests = snapshot.val();
    const studentRequests: ParentLinkRequest[] = [];

    for (const id in requests) {
      const req = requests[id];
      if (req.studentUid === studentUid) {
        studentRequests.push({ ...req, id });
      }
    }

    // Sort by date (newest first)
    return studentRequests.sort((a, b) => 
      new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    );
  } catch (error) {
    console.error('Error fetching student parent requests:', error);
    return [];
  }
}

/**
 * Student responds to a parent link request (approve/reject)
 */
export async function studentRespondToRequest(
  requestId: string,
  response: 'approve' | 'reject',
  rejectionReason?: string
): Promise<{ success: boolean; errorMessage?: string }> {
  try {
    const requestRef = ref(db, SYS.CONFIG.parentLinkRequest(requestId));
    const snapshot = await get(requestRef);

    if (!snapshot.exists()) {
      return { success: false, errorMessage: 'الطلب غير موجود' };
    }

    const request = snapshot.val();
    const now = new Date().toISOString();

    if (response === 'approve') {
      // Student approves - request moves to student_approved status
      // Parent can now upload proof document
      await update(requestRef, {
        status: 'student_approved',
        studentRespondedAt: now
      });
    } else {
      // Student rejects
      await update(requestRef, {
        status: 'rejected',
        studentRespondedAt: now,
        rejectionReason: rejectionReason || 'تم الرفض من قبل الطالب',
        respondedBy: request.studentUid
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error student responding to request:', error);
    return { success: false, errorMessage: 'حدث خطأ أثناء الرد على الطلب' };
  }
}

/**
 * Student reviews proof document uploaded by parent
 */
export async function studentReviewProofDocument(
  requestId: string,
  approved: boolean,
  notes?: string
): Promise<{ success: boolean; errorMessage?: string }> {
  try {
    const requestRef = ref(db, SYS.CONFIG.parentLinkRequest(requestId));
    const snapshot = await get(requestRef);

    if (!snapshot.exists()) {
      return { success: false, errorMessage: 'الطلب غير موجود' };
    }

    const request = snapshot.val();
    
    // Check if proof document exists
    if (!request.proofDocumentUrl) {
      return { success: false, errorMessage: 'لم يتم رفع وثيقة الإثبات بعد' };
    }

    const now = new Date().toISOString();

    if (approved) {
      // Student approves the proof document
      await update(requestRef, {
        status: 'proof_reviewed_by_student',
        proofReviewedByStudent: true,
        proofStudentReviewNotes: notes || '',
        proofReviewedAt: now
      });
    } else {
      // Student rejects the proof document - parent needs to re-upload
      await update(requestRef, {
        status: 'student_approved', // Go back to student_approved so parent can upload again
        proofReviewedByStudent: false,
        proofStudentReviewNotes: notes || 'تم رفض الوثيقة من قبل الطالب',
        proofReviewedAt: now
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error student reviewing proof document:', error);
    return { success: false, errorMessage: 'حدث خطأ أثناء مراجعة الوثيقة' };
  }
}

/**
 * Admin responds to a parent link request (approve/reject)
 * Can only approve if student has approved AND proof document has been reviewed
 */
export async function adminRespondToRequest(
  requestId: string,
  adminUid: string,
  response: 'approve' | 'reject',
  rejectionReason?: string,
  reviewNotes?: string
): Promise<{ success: boolean; errorMessage?: string; parentLinked?: boolean }> {
  try {
    const requestRef = ref(db, SYS.CONFIG.parentLinkRequest(requestId));
    const snapshot = await get(requestRef);

    if (!snapshot.exists()) {
      return { success: false, errorMessage: 'الطلب غير موجود' };
    }

    const request = snapshot.val();
    const now = new Date().toISOString();

    if (response === 'approve') {
      // Can only approve if student has approved and proof reviewed
      if (request.status !== 'proof_reviewed_by_student') {
        return { success: false, errorMessage: 'يجب مراجعة وثيقة الإثبات من الطالب أولاً' };
      }

      // Student + Admin approved - complete the linking
      const studentRef = ref(db, SYS.user(request.studentUid));
      const parentRef = ref(db, SYS.user(request.parentUid));

      // Get current student data
      const studentSnap = await get(studentRef);
      if (!studentSnap.exists()) {
        return { success: false, errorMessage: 'الطالب غير موجود' };
      }

      const studentData = studentSnap.val();
      const parentLinks = studentData.parentLinks || [];

      // Check if already linked
      if (!parentLinks.includes(request.parentUid)) {
        parentLinks.push(request.parentUid);
      }

      // Update student profile
      await update(studentRef, {
        parentLinks,
        parentUid: request.parentUid, // Legacy
        parentEmail: request.parentEmail // Legacy
      });

      // Update parent profile
      const parentSnap = await get(parentRef);
      if (parentSnap.exists()) {
        const parentData = parentSnap.val();
        const studentLinks = parentData.studentLinks || [];

        if (!studentLinks.includes(request.studentUid)) {
          studentLinks.push(request.studentUid);
        }

        await update(parentRef, {
          studentLink: request.studentUid, // Legacy
          studentLinks,
          status: 'approved' // Activate parent account
        });
      }

      // Mark invite code as used at sys/users/{studentUid}/parentInviteCodes/{CODE}
      const codeRef = ref(db, SYS.userParentInviteCode(request.studentUid, request.inviteCode));
      await update(codeRef, {
        status: 'used',
        usedBy: request.parentUid,
        usedAt: now
      });

      // Update request status
      await update(requestRef, {
        status: 'admin_approved',
        adminRespondedAt: now,
        respondedBy: adminUid,
        adminReviewNotes: reviewNotes || ''
      });

      return { success: true, parentLinked: true };
    } else {
      // Admin rejects
      await update(requestRef, {
        status: 'rejected',
        adminRespondedAt: now,
        rejectionReason: rejectionReason || 'تم الرفض من قبل الإدارة',
        respondedBy: adminUid,
        adminReviewNotes: reviewNotes || ''
      });

      return { success: true, parentLinked: false };
    }
  } catch (error: any) {
    console.error('Error admin responding to request:', error);
    return { success: false, errorMessage: 'حدث خطأ أثناء معالجة الطلب' };
  }
}

/**
 * Upload proof document URL to parent link request
 */
export async function uploadProofDocumentToRequest(
  requestId: string,
  documentUrl: string,
  documentType: string
): Promise<{ success: boolean; errorMessage?: string }> {
  try {
    const requestRef = ref(db, SYS.CONFIG.parentLinkRequest(requestId));
    const snapshot = await get(requestRef);

    if (!snapshot.exists()) {
      return { success: false, errorMessage: 'الطلب غير موجود' };
    }

    const now = new Date().toISOString();

    await update(requestRef, {
      proofDocumentUrl: documentUrl,
      proofDocumentType: documentType,
      proofUploadedAt: now,
      status: 'proof_uploaded'
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error uploading proof document to request:', error);
    return { success: false, errorMessage: 'حدث خطأ أثناء رفع الوثيقة' };
  }
}

/**
 * Get all pending parent link requests for admin review
 */
export async function getPendingAdminParentRequests(): Promise<ParentLinkRequest[]> {
  try {
    const requestsRef = ref(db, SYS.CONFIG.PARENT_LINK_REQUESTS);
    const snapshot = await get(requestsRef);

    if (!snapshot.exists()) {
      return [];
    }

    const requests = snapshot.val();
    const pendingRequests: ParentLinkRequest[] = [];

    for (const id in requests) {
      const req = requests[id];
      // Show requests that student has approved and proof reviewed by student
      if (req.status === 'proof_reviewed_by_student') {
        pendingRequests.push({ ...req, id });
      }
    }

    return pendingRequests.sort((a, b) =>
      new Date(b.proofReviewedAt || b.studentRespondedAt || b.requestedAt).getTime() -
      new Date(a.proofReviewedAt || a.studentRespondedAt || a.requestedAt).getTime()
    );
  } catch (error) {
    console.error('Error fetching pending admin parent requests:', error);
    return [];
  }
}

/**
 * Check if parent has any pending requests
 */
export async function getParentPendingRequests(parentUid: string): Promise<ParentLinkRequest[]> {
  try {
    const requestsRef = ref(db, SYS.CONFIG.PARENT_LINK_REQUESTS);
    const snapshot = await get(requestsRef);
    
    if (!snapshot.exists()) {
      return [];
    }

    const requests = snapshot.val();
    const parentRequests: ParentLinkRequest[] = [];

    for (const id in requests) {
      const req = requests[id];
      if (req.parentUid === parentUid && req.status !== 'admin_approved' && req.status !== 'rejected') {
        parentRequests.push({ ...req, id });
      }
    }

    return parentRequests;
  } catch (error) {
    console.error('Error fetching parent pending requests:', error);
    return [];
  }
}
