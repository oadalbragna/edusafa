import { db } from '../services/firebase';
import { ref, push, set, serverTimestamp } from 'firebase/database';
import { SYS } from '../constants/dbPaths';

export type ActivityType =
  | 'student_added'
  | 'teacher_added'
  | 'class_created'
  | 'material_uploaded'
  | 'report_generated'
  | 'attendance_marked'
  | 'grade_added'
  | 'assignment_added'
  | 'subject_announcement'
  | 'live_link_updated'
  | 'user_login'
  | 'support_ticket_created'
  | 'user_approved'
  | 'user_rejected'
  | 'announcement_posted'
  | 'permission_updated'
  | 'role_updated';

interface ActivityParams {
  type: ActivityType;
  userId: string;
  userName: string;
  details: string;
  targetId?: string;
  targetName?: string;
}

export const logActivity = async (params: ActivityParams) => {
  try {
    const activityRef = push(ref(db, SYS.MAINTENANCE.ACTIVITIES));
    await set(activityRef, {
      ...params,
      id: activityRef.key,
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
};
