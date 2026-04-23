import { ref, get, update, set, push } from 'firebase/database';
import { db } from '../services/firebase';
import { SYS } from '../constants/dbPaths';

/**
 * Generate a random invite code (8 characters, alphanumeric)
 */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars like I, O, 0, 1
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate a new parent invite code for a student
 * Stores code at: sys/users/{studentUid}/parentInviteCodes/{CODE}
 * Invalidates previous active codes
 */
export async function generateParentInviteCode(studentUid: string, validDays: number = 7): Promise<string> {
  const userRef = ref(db, SYS.user(studentUid));
  const snapshot = await get(userRef);

  if (!snapshot.exists()) {
    throw new Error('Student not found');
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

  // Update user profile with the new active code (for backward compatibility)
  await update(userRef, {
    parentInviteCode: newCode,
  });

  return newCode;
}

/**
 * Find which user owns a specific invite code by searching across all users
 * This is needed when a parent enters a code and we need to find the student
 */
async function findCodeOwner(code: string): Promise<{ userId: string; codeData: any } | null> {
  // We need to search across all users to find who owns this code
  // This is inefficient but necessary when we only have the code
  // Alternative: maintain an index at sys/users/parentInviteCodesIndex/{CODE} -> { userId }
  
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
 * Validate a parent invite code by looking it up at: sys/users/{studentUid}/parentInviteCodes/{CODE}
 * If found, fetch student info from: sys/users/{studentUid}
 */
export async function validateParentInviteCode(code: string): Promise<{ valid: boolean; studentUid?: string; studentName?: string; studentEmail?: string; errorMessage?: string }> {
  try {
    const normalizedCode = code.trim().toUpperCase();

    // Find the code owner (which user it belongs to)
    const codeOwner = await findCodeOwner(normalizedCode);
    
    if (!codeOwner) {
      console.error('No invite code found for:', normalizedCode);
      return { valid: false, errorMessage: 'رمز الدعوة غير صالح أو منتهي الصلاحية' };
    }
    
    const { userId: studentUid, codeData } = codeOwner;

    // Check status
    if (codeData.status === 'used' || codeData.status === 'expired') {
      return { valid: false, errorMessage: codeData.status === 'used' ? 'تم استخدام هذا الرمز بالفعل' : 'رمز الدعوة منتهي الصلاحية' };
    }

    // Check expiration date
    const expiresAt = new Date(codeData.expiresAt);
    const now = new Date();
    if (expiresAt <= now) {
      // Mark as expired
      await update(ref(db, SYS.userParentInviteCode(studentUid, normalizedCode)), { status: 'expired' });
      return { valid: false, errorMessage: 'رمز الدعوة منتهي الصلاحية' };
    }

    if (codeData.status !== 'active') {
      return { valid: false, errorMessage: 'رمز الدعوة غير صالح' };
    }

    // Fetch student info from sys/users/{studentUid}
    const studentRef = ref(db, SYS.user(studentUid));
    const studentSnapshot = await get(studentRef);

    if (!studentSnapshot.exists()) {
      return { valid: false, errorMessage: 'بيانات الطالب غير موجودة' };
    }

    const student = studentSnapshot.val();

    return {
      valid: true,
      studentUid,
      studentName: student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim(),
      studentEmail: student.email
    };
  } catch (error: any) {
    console.error('Error validating invite code:', error);
    return { valid: false, errorMessage: 'حدث خطأ أثناء التحقق من الرمز' };
  }
}

/**
 * Link parent to student using invite code
 * Updates both parent and student profiles
 */
export async function linkParentToStudent(parentUid: string, parentEmail: string, inviteCode: string): Promise<{ success: boolean; studentUid?: string; studentName?: string; errorMessage?: string }> {
  try {
    // First validate the code
    const validation = await validateParentInviteCode(inviteCode);

    if (!validation.valid || !validation.studentUid) {
      return { success: false, errorMessage: validation.errorMessage };
    }

    const studentUid = validation.studentUid;
    const now = new Date();

    // Update student profile - add parent to parentLinks array
    const studentRef = ref(db, SYS.user(studentUid));
    const studentSnapshot = await get(studentRef);

    if (!studentSnapshot.exists()) {
      return { success: false, errorMessage: 'الطالب غير موجود' };
    }

    const studentData = studentSnapshot.val();
    const parentLinks = studentData.parentLinks || [];

    // Check if parent is already linked
    if (parentLinks.includes(parentUid)) {
      return { success: false, errorMessage: 'ولي الأمر مرتبط بالفعل بهذا الطالب' };
    }

    parentLinks.push(parentUid);

    // Mark invite code as used at sys/users/{studentUid}/parentInviteCodes/{CODE}
    const codeRef = ref(db, SYS.userParentInviteCode(studentUid, inviteCode));
    await update(codeRef, {
      status: 'used',
      usedBy: parentUid,
      usedAt: now.toISOString()
    });

    // Update student profile
    await update(studentRef, {
      parentLinks,
      // Keep legacy fields for backward compatibility
      parentUid: parentUid,
      parentEmail: parentEmail
    });

    // Update parent profile - link to student
    const parentRef = ref(db, SYS.user(parentUid));
    const parentSnapshot = await get(parentRef);

    if (!parentSnapshot.exists()) {
      return { success: false, errorMessage: 'حساب ولي الأمر غير موجود' };
    }

    const parentData = parentSnapshot.val();
    // For backward compatibility, keep studentLink as single value
    // If parent has multiple children, we can add studentLinks array later
    await update(parentRef, {
      studentLink: studentUid,
      studentLinks: [...(parentData.studentLinks || []), studentUid]
    });

    return {
      success: true,
      studentUid,
      studentName: validation.studentName
    };
  } catch (error: any) {
    console.error('Error linking parent to student:', error);
    return { success: false, errorMessage: 'حدث خطأ أثناء ربط الحساب' };
  }
}

/**
 * Get all parents linked to a student
 */
export async function getStudentParents(studentUid: string): Promise<Array<{ uid: string; email: string; fullName?: string; phone?: string }>> {
  try {
    const userRef = ref(db, SYS.user(studentUid));
    const snapshot = await get(userRef);

    if (!snapshot.exists()) {
      return [];
    }

    const studentData = snapshot.val();
    const parentLinks = studentData.parentLinks || [];

    if (parentLinks.length === 0) {
      return [];
    }

    // Fetch all parent details
    const parents: Array<{ uid: string; email: string; fullName?: string; phone?: string }> = [];
    const usersRef = ref(db, 'sys/users');
    const usersSnapshot = await get(usersRef);

    if (usersSnapshot.exists()) {
      const allUsers = usersSnapshot.val();
      parentLinks.forEach((parentUid: string) => {
        const user = allUsers[parentUid];
        if (user && user.role === 'parent') {
          parents.push({
            uid: user.uid,
            email: user.email,
            fullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            phone: user.phone
          });
        }
      });
    }

    return parents;
  } catch (error) {
    console.error('Error fetching student parents:', error);
    return [];
  }
}

/**
 * Revoke an active invite code
 */
export async function revokeParentInviteCode(studentUid: string, code: string): Promise<boolean> {
  try {
    // Mark code as expired at sys/users/{studentUid}/parentInviteCodes/{CODE}
    const codeRef = ref(db, SYS.userParentInviteCode(studentUid, code));
    const snapshot = await get(codeRef);

    if (snapshot.exists()) {
      const codeData = snapshot.val();
      if (codeData.status === 'active') {
        await update(codeRef, { status: 'expired' });
      }
    }

    // Also update student profile
    const userRef = ref(db, SYS.user(studentUid));
    const userSnapshot = await get(userRef);

    if (!userSnapshot.exists()) {
      return false;
    }

    const userData = userSnapshot.val();

    // If this was the active code, clear it
    const newActiveCode = userData.parentInviteCode === code ? null : userData.parentInviteCode;

    await update(userRef, {
      parentInviteCode: newActiveCode
    });

    return true;
  } catch (error) {
    console.error('Error revoking invite code:', error);
    return false;
  }
}

/**
 * Get all invite codes for a student
 */
export async function getStudentInviteCodes(studentUid: string): Promise<Array<{ code: string; createdAt: string; expiresAt: string; status: string; usedBy?: string; usedAt?: string }>> {
  try {
    const codesRef = ref(db, SYS.userParentInviteCodes(studentUid));
    const snapshot = await get(codesRef);

    if (!snapshot.exists()) {
      return [];
    }

    const codes = snapshot.val();
    return Object.values(codes);
  } catch (error) {
    console.error('Error fetching student invite codes:', error);
    return [];
  }
}
