/**
 * Parent Linking Service - خدمة ربط أولياء الأمور
 * 
 * Manages parent-student linking through invite codes and QR codes
 * Handles dual approval system (student + admin)
 */

import { ref, get, set, update, push, onValue } from 'firebase/database';
import { db } from '../../services/firebase';
import { SYS } from '../../constants/dbPaths';

// ============================================================================
// Types
// ============================================================================

export interface ParentInviteCode {
  code: string;
  studentUid: string;
  studentName: string;
  studentEmail: string;
  createdAt: number;
  expiresAt: number;
  status: 'active' | 'used' | 'expired';
  usedBy?: string;
  usedAt?: number;
}

export interface ParentLinkRequest {
  id: string;
  studentUid: string;
  studentName: string;
  studentEmail: string;
  studentClass?: string;
  parentUid: string;
  parentName: string;
  parentEmail: string;
  parentPhone?: string;
  inviteCode: string;
  status: 'pending' | 'student_approved' | 'proof_uploaded' | 'proof_reviewed_by_student' | 'admin_approved' | 'approved' | 'rejected';
  requestedAt: number | string;
  studentApprovedAt?: number | string;
  adminApprovedAt?: number | string;
  rejectionReason?: string;
  rejectedBy?: 'student' | 'admin';
  // Proof document fields
  proofDocumentUrl?: string;
  proofDocumentType?: string;
  proofUploadedAt?: number | string;
  proofReviewedByStudent?: boolean;
  proofStudentReviewNotes?: string;
  proofReviewedAt?: number | string;
  adminReviewNotes?: string;
}

// ============================================================================
// Invite Code Generation
// ============================================================================

/**
 * Generate a unique invite code for a student
 */
export async function generateInviteCode(studentUid: string): Promise<string> {
  const code = `PAR-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

  const codeRef = ref(db, SYS.userParentInviteCode(studentUid, code));
  await set(codeRef, {
    code,
    createdAt: Date.now(),
    expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
    status: 'active'
  });

  return code;
}

/**
 * Get all active invite codes for a student
 */
export async function getStudentInviteCodes(studentUid: string): Promise<ParentInviteCode[]> {
  const codesRef = ref(db, SYS.userParentInviteCodes(studentUid));
  const snapshot = await get(codesRef);

  if (!snapshot.exists()) return [];

  const codes = snapshot.val();
  return Object.values(codes)
    .filter((c: any) => c.status === 'active' && c.expiresAt > Date.now())
    .sort((a: any, b: any) => b.createdAt - a.createdAt);
}

/**
 * Validate an invite code
 */
export async function validateInviteCode(code: string): Promise<{ valid: boolean; studentData?: any; error?: string }> {
  // Find the code owner by searching across all users
  const usersRef = ref(db, SYS.USERS);
  const usersSnapshot = await get(usersRef);
  
  if (!usersSnapshot.exists()) {
    return { valid: false, error: 'كود الدعوة غير موجود' };
  }
  
  const allUsers = usersSnapshot.val();
  
  // Check each user's parentInviteCodes
  for (const [studentUid, userData] of Object.entries(allUsers)) {
    const userCodesRef = ref(db, SYS.userParentInviteCode(studentUid as string, code));
    const codeSnapshot = await get(userCodesRef);
    
    if (codeSnapshot.exists()) {
      const inviteCode = codeSnapshot.val();
      
      // Check if expired
      if (inviteCode.expiresAt < Date.now()) {
        return { valid: false, error: 'كود الدعوة منتهي الصلاحية' };
      }
      
      // Check if already used
      if (inviteCode.status === 'used') {
        return { valid: false, error: 'كود الدعوة مستخدم بالفعل' };
      }
      
      // Get student data
      const studentRef = ref(db, SYS.user(studentUid));
      const studentSnap = await get(studentRef);
      
      if (!studentSnap.exists()) {
        return { valid: false, error: 'الطالب غير موجود' };
      }
      
      const studentData = studentSnap.val();
      
      return {
        valid: true,
        studentData: {
          uid: studentUid,
          name: studentData.fullName || `${studentData.firstName} ${studentData.lastName}`,
          email: studentData.email,
          classId: studentData.classId,
          schoolId: studentData.schoolId
        }
      };
    }
  }
  
  return { valid: false, error: 'كود الدعوة غير صحيح' };
}

/**
 * Mark invite code as used
 */
export async function markCodeAsUsed(code: string, studentUid: string, parentUid: string): Promise<void> {
  const codeRef = ref(db, SYS.userParentInviteCode(studentUid, code));
  await update(codeRef, {
    status: 'used',
    usedBy: parentUid,
    usedAt: Date.now()
  });
}

// ============================================================================
// Link Requests
// ============================================================================

/**
 * Create a parent link request (sends to both student and admin)
 */
export async function createParentLinkRequest(
  inviteCode: string,
  parentData: {
    uid: string;
    name: string;
    email: string;
    phone?: string;
  }
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  try {
    // Validate invite code
    const validation = await validateInviteCode(inviteCode);
    
    if (!validation.valid || !validation.studentData) {
      return { success: false, error: validation.error || 'كود الدعوة غير صحيح' };
    }
    
    const studentData = validation.studentData;
    
    // Create request ID
    const requestId = push(ref(db, 'sys/parent_link_requests')).key!;
    
    // Create the link request
    const linkRequest: ParentLinkRequest = {
      id: requestId,
      studentUid: studentData.uid,
      studentName: studentData.name,
      studentEmail: studentData.email,
      studentClass: studentData.classId,
      parentUid: parentData.uid,
      parentName: parentData.name,
      parentEmail: parentData.email,
      parentPhone: parentData.phone,
      inviteCode,
      status: 'pending',
      requestedAt: Date.now()
    };
    
    // Save to database
    await set(ref(db, `sys/parent_link_requests/${requestId}`), linkRequest);
    
    // Mark code as used
    await markCodeAsUsed(inviteCode, studentData.uid, parentData.uid);
    
    // Create notification for student
    await set(ref(db, `sys/notifications/${studentData.uid}/parent_request_${requestId}`), {
      type: 'parent_link_request',
      title: 'طلب ربط من ولي أمر',
      message: `${parentData.name} يريد الربط بحسابك كولي أمر`,
      requestId,
      timestamp: Date.now(),
      read: false
    });
    
    // Create notification for admins
    const adminsRef = ref(db, 'sys/users/admins');
    const adminsSnap = await get(adminsRef);
    
    if (adminsSnap.exists()) {
      const admins = adminsSnap.val();
      const notifications = {};
      
      Object.keys(admins).forEach(adminUid => {
        notifications[`sys/notifications/${adminUid}/parent_request_${requestId}`] = {
          type: 'parent_link_request',
          title: 'طلب ربط ولي أمر جديد',
          message: `${parentData.name} يطلب الربط بالطالب ${studentData.name}`,
          requestId,
          timestamp: Date.now(),
          read: false
        };
      });
      
      await update(ref(db), notifications);
    }
    
    return { success: true, requestId };
  } catch (error: any) {
    console.error('Error creating parent link request:', error);
    return { success: false, error: error.message || 'حدث خطأ أثناء إنشاء الطلب' };
  }
}

/**
 * Approve link request as student
 */
export async function approveAsStudent(requestId: string, studentUid: string): Promise<{ success: boolean; error?: string }> {
  try {
    const requestRef = ref(db, `sys/parent_link_requests/${requestId}`);
    const requestSnap = await get(requestRef);
    
    if (!requestSnap.exists()) {
      return { success: false, error: 'الطلب غير موجود' };
    }
    
    const request = requestSnap.val();
    
    if (request.studentUid !== studentUid) {
      return { success: false, error: 'غير مصرح لك بالموافقة على هذا الطلب' };
    }
    
    if (request.status !== 'pending') {
      return { success: false, error: 'الطلب ليس في حالة الانتظار' };
    }
    
    // Update request status
    await update(requestRef, {
      status: 'student_approved',
      studentApprovedAt: Date.now()
    });
    
    // Notify parent
    await set(ref(db, `sys/notifications/${request.parentUid}/student_approved_${requestId}`), {
      type: 'parent_link_approved',
      title: 'تمت موافقة الطالب',
      message: `وافق ${request.studentName} على طلب الربط`,
      requestId,
      timestamp: Date.now(),
      read: false
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Error approving as student:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Approve link request as admin
 */
export async function approveAsAdmin(requestId: string, adminUid: string): Promise<{ success: boolean; error?: string }> {
  try {
    const requestRef = ref(db, `sys/parent_link_requests/${requestId}`);
    const requestSnap = await get(requestRef);
    
    if (!requestSnap.exists()) {
      return { success: false, error: 'الطلب غير موجود' };
    }
    
    const request = requestSnap.val();
    
    if (request.status !== 'student_approved') {
      return { success: false, error: 'يجب موافقة الطالب أولاً' };
    }
    
    // Update request status to approved
    await update(requestRef, {
      status: 'approved',
      adminApprovedAt: Date.now()
    });
    
    // Link parent to student in both profiles
    await update(ref(db), {
      [`sys/users/students/${request.studentUid}/parentLinks`]: [
        ...(request.studentUid ? [] : []),
        request.parentUid
      ],
      [`sys/users/parents/${request.parentUid}/studentLink`]: request.studentUid
    });
    
    // Notify parent
    await set(ref(db, `sys/notifications/${request.parentUid}/admin_approved_${requestId}`), {
      type: 'parent_link_approved',
      title: 'تمت موافقة الإدارة',
      message: `تمت الموافقة على طلبك للربط بالطالب ${request.studentName}`,
      requestId,
      timestamp: Date.now(),
      read: false
    });
    
    // Notify student
    await set(ref(db, `sys/notifications/${request.studentUid}/parent_linked_${requestId}`), {
      type: 'parent_linked',
      title: 'تم ربط ولي الأمر',
      message: `تم ربط ${request.parentName} كولي أمر لك`,
      requestId,
      timestamp: Date.now(),
      read: false
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Error approving as admin:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Reject link request
 */
export async function rejectRequest(
  requestId: string,
  rejectedBy: 'student' | 'admin',
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const requestRef = ref(db, `sys/parent_link_requests/${requestId}`);
    const requestSnap = await get(requestRef);
    
    if (!requestSnap.exists()) {
      return { success: false, error: 'الطلب غير موجود' };
    }
    
    const request = requestSnap.val();
    
    await update(requestRef, {
      status: 'rejected',
      rejectedBy,
      rejectionReason: reason || 'مرفوض',
      respondedAt: Date.now()
    });
    
    // Notify parent
    await set(ref(db, `sys/notifications/${request.parentUid}/request_rejected_${requestId}`), {
      type: 'parent_link_rejected',
      title: 'تم رفض الطلب',
      message: rejectedBy === 'student' 
        ? `رفض ${request.studentName} طلب الربط`
        : 'رفضت الإدارة طلب الربط',
      reason: reason,
      requestId,
      timestamp: Date.now(),
      read: false
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Error rejecting request:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// Get Requests
// ============================================================================

/**
 * Get all pending parent requests for a student
 */
export async function getStudentParentRequests(studentUid: string): Promise<ParentLinkRequest[]> {
  const requestsRef = ref(db, 'sys/parent_link_requests');
  const snapshot = await get(requestsRef);
  
  if (!snapshot.exists()) return [];
  
  const requests = snapshot.val();
  return Object.values(requests)
    .filter((r: any) => r.studentUid === studentUid && r.status !== 'approved')
    .sort((a: any, b: any) => b.requestedAt - a.requestedAt);
}

/**
 * Get all pending parent requests for admins
 */
export async function getAdminParentRequests(): Promise<ParentLinkRequest[]> {
  const requestsRef = ref(db, 'sys/parent_link_requests');
  const snapshot = await get(requestsRef);

  if (!snapshot.exists()) return [];

  const requests = snapshot.val();
  return Object.values(requests)
    .filter((r: any) => r.status === 'proof_reviewed_by_student')
    .sort((a: any, b: any) => b.proofReviewedAt || b.studentApprovedAt - a.proofReviewedAt || a.studentApprovedAt);
}

/**
 * Get all approved parent links for a student
 */
export async function getApprovedParentLinks(studentUid: string): Promise<ParentLinkRequest[]> {
  const requestsRef = ref(db, 'sys/parent_link_requests');
  const snapshot = await get(requestsRef);
  
  if (!snapshot.exists()) return [];
  
  const requests = snapshot.val();
  return Object.values(requests)
    .filter((r: any) => r.studentUid === studentUid && r.status === 'approved')
    .sort((a: any, b: any) => b.adminApprovedAt - a.adminApprovedAt);
}

/**
 * Get parent link request for a parent
 */
export async function getParentRequest(parentUid: string): Promise<ParentLinkRequest | null> {
  const requestsRef = ref(db, 'sys/parent_link_requests');
  const snapshot = await get(requestsRef);
  
  if (!snapshot.exists()) return null;
  
  const requests = snapshot.val();
  const request = Object.values(requests).find((r: any) => r.parentUid === parentUid && r.status === 'approved');
  
  return request || null;
}

// ============================================================================
// Real-time Listeners
// ============================================================================

/**
 * Subscribe to student parent requests (real-time)
 */
export function subscribeToStudentRequests(
  studentUid: string,
  callback: (requests: ParentLinkRequest[]) => void
): () => void {
  const requestsRef = ref(db, 'sys/parent_link_requests');
  
  return onValue(requestsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    
    const requests = snapshot.val();
    const studentRequests = Object.values(requests)
      .filter((r: any) => r.studentUid === studentUid && r.status !== 'approved')
      .sort((a: any, b: any) => b.requestedAt - a.requestedAt);
    
    callback(studentRequests as ParentLinkRequest[]);
  });
}

/**
 * Subscribe to admin parent requests (real-time)
 */
export function subscribeToAdminRequests(
  callback: (requests: ParentLinkRequest[]) => void
): () => void {
  const requestsRef = ref(db, 'sys/parent_link_requests');

  return onValue(requestsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }

    const requests = snapshot.val();
    const pendingRequests = Object.values(requests)
      .filter((r: any) => r.status === 'proof_reviewed_by_student')
      .sort((a: any, b: any) => (b.proofReviewedAt || b.studentApprovedAt) - (a.proofReviewedAt || a.studentApprovedAt));

    callback(pendingRequests as ParentLinkRequest[]);
  });
}

// ============================================================================
// QR Code Data
// ============================================================================

/**
 * Generate QR code data for a student
 */
export async function generateQRCodeData(studentUid: string): Promise<{ code: string; data: string } | null> {
  try {
    // Get student data
    const studentRef = ref(db, SYS.user(studentUid));
    const studentSnap = await get(studentRef);

    if (!studentSnap.exists()) return null;

    const studentData = studentSnap.val();

    // Generate new invite code
    const code = await generateInviteCode(studentUid);

    // Create QR data object
    const qrData = {
      type: 'parent_invite',
      code,
      studentName: studentData.fullName || `${studentData.firstName} ${studentData.lastName}`,
      studentEmail: studentData.email,
      timestamp: Date.now()
    };

    // Convert to JSON string for QR code
    const qrString = JSON.stringify(qrData);

    return {
      code,
      data: qrString
    };
  } catch (error) {
    console.error('Error generating QR code data:', error);
    return null;
  }
}

// ============================================================================
// Export Service
// ============================================================================

export const ParentLinkService = {
  generateInviteCode,
  getStudentInviteCodes,
  validateInviteCode,
  markCodeAsUsed,
  createParentLinkRequest,
  approveAsStudent,
  approveAsAdmin,
  rejectRequest,
  getStudentParentRequests,
  getAdminParentRequests,
  getApprovedParentLinks,
  getParentRequest,
  subscribeToStudentRequests,
  subscribeToAdminRequests,
  generateQRCodeData
};

export default ParentLinkService;
