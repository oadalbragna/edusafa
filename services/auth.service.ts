/**
 * EduSafa Learning - Authentication Service
 *
 * Secure authentication with password hashing and rate limiting
 */

import { ref, get, set, serverTimestamp, update, onDisconnect, query, orderByChild, equalTo } from 'firebase/database';
import { getDb as db } from './firebase';
import { SYS } from '../constants/dbPaths';
import type { UserProfile } from '../types';
import { hashPassword, verifyPassword, validatePasswordStrength, validateEmail, sanitizeHTML } from '../utils/security';
import { errorHandler, ErrorType } from '../utils/errorHandler';

interface LoginAttempts {
  count: number;
  resetTime: number;
}

export const AuthService = {
  // جلب كافة المستخدمين (لأغراض الإدارة)
  async fetchUsers() {
    if (!db) return {};
    const usersRef = ref(db, SYS.USERS);
    const snapshot = await get(usersRef);
    return snapshot.exists() ? snapshot.val() : {};
  },

  // التحقق من صحة بيانات الدخول يدوياً مع تشفير كلمة المرور
  async loginManual(identifier: string, password: string): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    try {
      if (!db) return { success: false, error: 'قاعدة البيانات غير متاحة' };

      // Rate limiting check (client-side)
      const loginAttempts = localStorage.getItem('login_attempts');
      const attempts: LoginAttempts = loginAttempts ? JSON.parse(loginAttempts) : { count: 0, resetTime: Date.now() };

      if (Date.now() < attempts.resetTime && attempts.count >= 5) {
        const waitTime = Math.ceil((attempts.resetTime - Date.now()) / 60000);
        return { success: false, error: `تم تجاوز عدد المحاولات المسموحة. يرجى المحاولة بعد ${waitTime} دقيقة.` };
      }

      const usersRef = ref(db, SYS.USERS);
      const snapshot = await get(usersRef);

      if (!snapshot.exists()) {
        return { success: false, error: 'لا يوجد مستخدمين مسجلين في النظام' };
      }

      const users = Object.values(snapshot.val()) as UserProfile[];

      // البحث عن المستخدم عبر البريد أو الهاتف أو اسم المستخدم
      const user = users.find(u =>
        (u.email === identifier || u.phone === identifier || u.fullName === identifier)
      );

      if (!user) {
        // Record failed attempt
        attempts.count++;
        attempts.resetTime = Date.now() + (5 * 60 * 1000); // 5 minutes
        localStorage.setItem('login_attempts', JSON.stringify(attempts));
        return { success: false, error: 'بيانات الدخول غير صحيحة' };
      }

      // Check if user has a hashed password (migration check)
      const storedPassword = (user as any).password;
      let isValidPassword = false;

      // If password starts with hash prefix, verify with hash
      if (storedPassword && storedPassword.length === 64) {
        isValidPassword = await verifyPassword(password, storedPassword);
      } else {
        // Legacy plain text password (for migration)
        isValidPassword = storedPassword === password;
      }

      if (!isValidPassword) {
        // Record failed attempt
        attempts.count++;
        attempts.resetTime = Date.now() + (5 * 60 * 1000);
        localStorage.setItem('login_attempts', JSON.stringify(attempts));
        return { success: false, error: 'بيانات الدخول غير صحيحة' };
      }

      // Check if user is approved
      if (user.status === 'rejected') {
        return { success: false, error: 'تم رفض حسابك. يرجى التواصل مع الدعم الفني.' };
      }

      // Clear attempts on successful login
      localStorage.removeItem('login_attempts');

      // Update status to online
      await this.updateStatus(user.uid, 'online');

      return { success: true, user };
    } catch (e) {
      errorHandler.handle(e, { operation: 'login', identifier });
      return { success: false, error: 'خطأ في الاتصال بقاعدة البيانات' };
    }
  },

  // إنشاء حساب جديد مباشرة في قاعدة البيانات مع تشفير كلمة المرور
  async registerManual(userData: any): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    try {
      // Validate password strength
      if (!userData.password) {
        return { success: false, error: 'كلمة المرور مطلوبة' };
      }
      const passwordValidation = validatePasswordStrength(userData.password);
      if (!passwordValidation.valid) {
        return { success: false, error: passwordValidation.errors.join('، ') };
      }

      // Email validation (optional for parents, required for others)
      if (userData.email) {
        if (!validateEmail(userData.email)) {
          return { success: false, error: 'البريد الإلكتروني غير صحيح' };
        }
        // Optimized check: Use query instead of fetching all users
        if (!db) return { success: false, error: 'قاعدة البيانات غير متاحة' };
        const usersRef = ref(db, SYS.USERS);
        const emailQuery = query(usersRef, orderByChild('email'), equalTo(userData.email));
        const emailSnapshot = await get(emailQuery);
        
        if (emailSnapshot.exists()) {
          return { success: false, error: 'البريد الإلكتروني مسجل مسبقاً' };
        }
      }

      // 1. توليد معرف فريد
      const uid = `u_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

      // 2. تنظيف البيانات (إزالة الحقول غير الضرورية أو التي قد تكون undefined)
      const cleanData: any = {};
      const forbiddenKeys = ['confirmPassword', 'selectedClasses'];

      Object.keys(userData).forEach(key => {
        if (!forbiddenKeys.includes(key) && userData[key] !== undefined) {
          // Sanitize string inputs
          cleanData[key] = typeof userData[key] === 'string'
            ? sanitizeHTML(userData[key].trim())
            : userData[key];
        }
      });

      // 3. Hash password
      const hashedPassword = await hashPassword(userData.password);

      // 4. تجهيز الكائن النهائي
      const newUser = {
        ...cleanData,
        password: hashedPassword, // Store hashed password
        uid,
        fullName: userData.fullName || `${userData.firstName || ''} ${userData.lastName || userData.secondName || ''}`.trim(),
        // Email is optional for parents
        email: userData.email || '',
        // الجميع بانتظار التفعيل عدا رتبة الأدمن (إذا وجدت) أو المعلم بكود تجريبي
        status: (
          userData.role === 'admin' || 
          userData.role === 'super_admin' || 
          (userData.role === 'teacher' && userData.inviteCode === 'TEACHER-TRIAL-2026')
        ) ? 'approved' : 'pending',
        createdAt: new Date().toISOString(),
        lastSeen: serverTimestamp(),
        // For parents, add student link info
        ...(userData.role === 'parent' && userData.studentLink ? {
          studentLink: userData.studentLink,
          studentLinks: [userData.studentLink],
          identityDocumentUrl: userData.identityDocumentUrl || '',
          identityDocumentType: userData.identityDocumentType || '',
          identityUploadedAt: userData.identityUploadedAt || '',
          identityStatus: 'pending'
        } : {})
      };

      // 5. الحفظ المباشر في المسار المطلوب
      if (!db) return { success: false, error: 'قاعدة البيانات غير متاحة' };
      const userRef = ref(db, SYS.user(uid));
      await set(userRef, newUser);

      // 6. معالجة طلبات الفصول للمعلمين (المعماري الجديد)
      if (userData.role === 'teacher' && Array.isArray(userData.selectedClasses)) {
        const requests: any = {};
        userData.selectedClasses.forEach((classId: string) => {
          const requestId = `${uid}_${classId}`;
          requests[requestId] = {
            id: requestId,
            teacherId: uid,
            teacherName: newUser.fullName,
            classId: classId,
            status: 'pending',
            requestedAt: newUser.createdAt,
            notes: 'طلب انضمام عند التسجيل'
          };
        });

        if (Object.keys(requests).length > 0) {
          const classRequestsRef = ref(db, SYS.CONFIG.TEACHER_CLASS_REQUESTS);
          await update(classRequestsRef, requests);
        }
      }

      // Clear login attempts
      localStorage.removeItem('login_attempts');

      return { success: true, user: newUser as UserProfile };
    } catch (e: any) {
      errorHandler.handle(e, { operation: 'register', userData });
      console.error("Critical Register Error:", e);
      return { 
        success: false, 
        error: `فشل إنشاء الحساب: ${e.message || 'خطأ في حفظ البيانات'}` 
      };
    }
  },

  async updateStatus(uid: string, status: 'online' | 'offline') {
    try {
      if (!db) return;
      const userRef = ref(db, SYS.user(uid));
      await update(userRef, {
        status,
        lastSeen: serverTimestamp()
      });

      if (status === 'online') {
        onDisconnect(ref(db, `${SYS.user(uid)}/status`)).set('offline');
        onDisconnect(ref(db, `${SYS.user(uid)}/lastSeen`)).set(serverTimestamp());
      }
    } catch (e) {
      errorHandler.handle(e, { operation: 'updateStatus', uid });
    }
  },

  // Change password
  async changePassword(uid: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!db) return { success: false, error: 'قاعدة البيانات غير متاحة' };

      // Validate new password
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.valid) {
        return { success: false, error: passwordValidation.errors.join('، ') };
      }

      // Get current user data
      const userRef = ref(db, SYS.user(uid));
      const snapshot = await get(userRef);

      if (!snapshot.exists()) {
        return { success: false, error: 'المستخدم غير موجود' };
      }

      const user = snapshot.val() as UserProfile & { password: string };

      // Verify current password
      const isValidCurrent = await verifyPassword(currentPassword, user.password);
      if (!isValidCurrent) {
        return { success: false, error: 'كلمة المرور الحالية غير صحيحة' };
      }

      // Hash and update new password
      const hashedNewPassword = await hashPassword(newPassword);
      await update(userRef, {
        password: hashedNewPassword,
        passwordChangedAt: new Date().toISOString()
      });

      return { success: true };
    } catch (e) {
      errorHandler.handle(e, { operation: 'changePassword', uid });
      return { success: false, error: 'حدث خطأ في تغيير كلمة المرور' };
    }
  },

  // Reset login attempts
  resetLoginAttempts() {
    localStorage.removeItem('login_attempts');
  }
};
