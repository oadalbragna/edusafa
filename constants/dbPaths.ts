/**
 * EduSafa Learning - Database Path Constants
 * 
 * الهيكل النظيف الجديد لقاعدة البيانات
 * بدون prefixes - فقط sys, edu, comm
 * 
 * @version 3.0.0 - Clean Structure
 */

// ============================================================================
// 📁 ROOT PATHS - التفرعات الرئيسية
// ============================================================================

export const DB_ROOT = {
  SYS: 'sys',
  EDU: 'edu',
  COMM: 'comm',
} as const;

// ============================================================================
// 🔧 SYS (System Core) - البيانات الحساسة والإدارية
// ============================================================================

export const SYS = {
  // Users & Authentication
  USERS: `${DB_ROOT.SYS}/users`,
  user: (uid: string) => `${DB_ROOT.SYS}/users/${uid}`,
  userStatus: (uid: string) => `${DB_ROOT.SYS}/users/${uid}/status`,
  userLastSeen: (uid: string) => `${DB_ROOT.SYS}/users/${uid}/lastSeen`,
  
  // System Settings
  SYSTEM: {
    ROOT: `${DB_ROOT.SYS}/system`,
    SETTINGS: `${DB_ROOT.SYS}/system/settings`,
    BRANDING: `${DB_ROOT.SYS}/system/settings/branding`,
    MASKING_ACTIVE: `${DB_ROOT.SYS}/system/settings/maskingActive`,
    ALLOW_REGISTRATION: `${DB_ROOT.SYS}/system/settings/allowRegistration`,
    MAINTENANCE_MODE: `${DB_ROOT.SYS}/system/settings/maintenanceMode`,
    APP_DOWNLOAD_URL: `${DB_ROOT.SYS}/system/settings/appDownloadUrl`,
    SLIDER: `${DB_ROOT.SYS}/system/slider`,
    BANKS: `${DB_ROOT.SYS}/system/banks`,
  },

  // System Components
  META_DATA: `${DB_ROOT.SYS}/system/meta_data`,
  SAFE_LINKS: `${DB_ROOT.SYS}/system/meta_data/safe_links`,
  
  // Maintenance & Logs
  MAINTENANCE: {
    ROOT: `${DB_ROOT.SYS}/maintenance`,
    ACTIVITIES: `${DB_ROOT.SYS}/maintenance/activities`,
    CASHIPAY_LOGS: `${DB_ROOT.SYS}/maintenance/cashipay_logs`,
    SUPPORT_TICKETS: `${DB_ROOT.SYS}/maintenance/support_tickets`,
  },
  
  // Configuration
  CONFIG: {
    ROOT: `${DB_ROOT.SYS}/config`,
    TEACHER_CLASS_REQUESTS: `${DB_ROOT.SYS}/config/teacher_class_requests`,
    PARENT_LINK_REQUESTS: `${DB_ROOT.SYS}/config/parent_link_requests`,
    parentLinkRequest: (requestId: string) => `${DB_ROOT.SYS}/config/parent_link_requests/${requestId}`,
  },

  // Parent Invite Codes - stored under each user: sys/users/{userid}/parentInviteCodes/{CODE}
  // Each code entry contains: { code, createdAt, expiresAt, status, usedBy?, usedAt? }
  userParentInviteCodes: (userId: string) => `${DB_ROOT.SYS}/users/${userId}/parentInviteCodes`,
  userParentInviteCode: (userId: string, code: string) => `${DB_ROOT.SYS}/users/${userId}/parentInviteCodes/${code}`,

  // Communications (System-wide)
  ANNOUNCEMENTS: `${DB_ROOT.SYS}/announcements`,
  
  // Financial
  FINANCIAL: {
    ROOT: `${DB_ROOT.SYS}/financial`,
    PAYMENTS: `${DB_ROOT.SYS}/financial/payments`,
  },
} as const;

// ============================================================================
// 📚 EDU (Education) - العملية التعليمية
// ============================================================================

export const EDU = {
  // Schools & Classes
  SCH: {
    ROOT: `${DB_ROOT.EDU}/sch`,
    CLASSES: `${DB_ROOT.EDU}/sch/classes`,
    // New hierarchical path
    classesByGrade: (level: string, grade: string) => `${DB_ROOT.EDU}/sch/classes/${level}/${grade}`,
    class: (level: string, grade: string) => `${DB_ROOT.EDU}/sch/classes/${level}/${grade}`,
    
    classStudents: (classId: string) => `${DB_ROOT.EDU}/sch/classes/students/${classId}`, // Keeping students mapping accessible
    classStudent: (classId: string, uid: string) => `${DB_ROOT.EDU}/sch/classes/students/${classId}/${uid}`,
    
    CLASSES_META: `${DB_ROOT.EDU}/sch/classes_meta`,
    SCHEDULES: `${DB_ROOT.EDU}/sch/schedules`,
    MATERIALS: `${DB_ROOT.EDU}/sch/materials`,

    // Inside each class subject (will need class path info)
    classSubject: (level: string, grade: string, classId: string, subjectId: string) => 
      `${DB_ROOT.EDU}/sch/classes/${level}/${grade}/${classId}/subjects/${subjectId}`,

    // Subject Categories (for organizing subjects within classes)
    classSubjectCategories: (classId: string) => `${DB_ROOT.EDU}/sch/classes/${classId}/subject_categories`,
    classSubjectCategory: (classId: string, categoryId: string) => `${DB_ROOT.EDU}/sch/classes/${classId}/subject_categories/${categoryId}`,

    // Categorized Subjects (subjects within categories)
    classCategorySubjects: (classId: string, categoryId: string) => `${DB_ROOT.EDU}/sch/classes/${classId}/subject_categories/${categoryId}/subjects`,
    classCategorySubject: (classId: string, categoryId: string, subjectId: string) => `${DB_ROOT.EDU}/sch/classes/${classId}/subject_categories/${categoryId}/subjects/${subjectId}`,

    // Inside each class subject
    classSubjectCurricula: (classId: string, subjectId: string) =>
      `${DB_ROOT.EDU}/sch/classes/${classId}/subjects/${subjectId}/curricula`,
    classSubjectSchedules: (classId: string, subjectId: string) =>
      `${DB_ROOT.EDU}/sch/classes/${classId}/subjects/${subjectId}/schedules`,
    classSubjectTests: (classId: string, subjectId: string) =>
      `${DB_ROOT.EDU}/sch/classes/${classId}/subjects/${subjectId}/tests`,
    classSubjectMaterials: (classId: string, subjectId: string, type: string) =>
      `${DB_ROOT.EDU}/sch/classes/${classId}/subjects/${subjectId}/materials/${type}`,
    classSubjectAssignments: (classId: string, subjectId: string) =>
      `${DB_ROOT.EDU}/sch/classes/${classId}/subjects/${subjectId}/assignments`,
    classSubjectGrades: (classId: string, subjectId: string) =>
      `${DB_ROOT.EDU}/sch/classes/${classId}/subjects/${subjectId}/grades`,
    classSubjectAttendance: (classId: string, subjectId: string, date: string) =>
      `${DB_ROOT.EDU}/sch/classes/${classId}/subjects/${subjectId}/attendance/${date}`,
    classSubjectAnnouncements: (classId: string, subjectId: string) =>
      `${DB_ROOT.EDU}/sch/classes/${classId}/subjects/${subjectId}/announcements`,
    classSubjectLiveLinks: (classId: string, subjectId: string) =>
      `${DB_ROOT.EDU}/sch/classes/${classId}/subjects/${subjectId}/live_links`,

    material: (classId: string, subjectId: string, type: string) =>
      `${DB_ROOT.EDU}/sch/classes/${classId}/subjects/${subjectId}/materials/${type}`,
    
    // NEW: Class-level data
    classMaterials: (classId: string) => `${DB_ROOT.EDU}/sch/classes/${classId}/materials`,
    classTimetable: (classId: string) => `${DB_ROOT.EDU}/sch/classes/${classId}/timetable`,
    classBehaviors: (classId: string) => `${DB_ROOT.EDU}/sch/classes/${classId}/behaviors`,
  },

  // Courses & Subjects (Global - organized by level/grade)
  COURSES: `${DB_ROOT.EDU}/courses`,
  coursesByGrade: (level: string, grade: string) => `${DB_ROOT.EDU}/courses/${level}/${grade}`,
  course: (level: string, grade: string, courseId: string) => `${DB_ROOT.EDU}/courses/${level}/${grade}/${courseId}`,

  // NEW: Behaviors (Global behaviors)
  BEHAVIORS: `${DB_ROOT.EDU}/behaviors`,
  studentBehaviors: (studentId: string) => `${DB_ROOT.EDU}/behaviors/${studentId}`,

  // NEW: Lessons (Global lessons)
  LESSONS: `${DB_ROOT.EDU}/lessons`,
  lesson: (lessonId: string) => `${DB_ROOT.EDU}/lessons/${lessonId}`,

  // NEW: Timetable (Global timetable)
  TIMETABLE: `${DB_ROOT.EDU}/timetable`,
  TIMETABLE_SETTINGS: `${DB_ROOT.EDU}/timetable_settings`,
  timetableClass: (classId: string) => `${DB_ROOT.EDU}/timetable/${classId}`,

  // NEW: Grades (Global grades structure)
  GRADES: `${DB_ROOT.EDU}/grades`,
  classGrades: (classId: string) => `${DB_ROOT.EDU}/grades/${classId}`,
  studentGrades: (classId: string, studentId: string) => `${DB_ROOT.EDU}/grades/${classId}/${studentId}`,

  // NEW: Assignments (Global assignments)
  ASSIGNMENTS: `${DB_ROOT.EDU}/assignments`,
  classAssignments: (classId: string) => `${DB_ROOT.EDU}/assignments/${classId}`,

  // NEW: Submissions (Student submissions)
  SUBMISSIONS: `${DB_ROOT.EDU}/submissions`,
  assignmentSubmissions: (assignmentId: string) => `${DB_ROOT.EDU}/submissions/${assignmentId}`,

  // NEW: Exams (Global exams)
  EXAMS: `${DB_ROOT.EDU}/exams`,
  classExams: (classId: string) => `${DB_ROOT.EDU}/exams/${classId}`,

  // NEW: Results (Exam results)
  RESULTS: `${DB_ROOT.EDU}/results`,
  examResults: (examId: string) => `${DB_ROOT.EDU}/results/${examId}`,

  // NEW: Attendance (Global attendance)
  ATTENDANCE: `${DB_ROOT.EDU}/attendance`,
  classAttendance: (classId: string) => `${DB_ROOT.EDU}/attendance/${classId}`,

  // NEW: Curricula (Global curricula)
  CURRICULA: `${DB_ROOT.EDU}/curricula`,
  classCurricula: (classId: string) => `${DB_ROOT.EDU}/curricula/${classId}`,

  // NEW: Live Links (Global live links)
  LIVE_LINKS: `${DB_ROOT.EDU}/live_links`,
  classLiveLinks: (classId: string) => `${DB_ROOT.EDU}/live_links/${classId}`,

  // NEW: Academic Settings (Global academic settings)
  ACADEMIC_SETTINGS: `${DB_ROOT.EDU}/academic_settings`,

  // NEW: Announcements (Subject-specific announcements)
  ANNOUNCEMENTS_SUBJECT: `${DB_ROOT.EDU}/announcements_subject`,

  // Legacy paths (for backward compatibility during migration)
  // TODO: Remove after migration is complete
  legacyAssignments: `${DB_ROOT.EDU}/assignments`,
  legacySubmissions: `${DB_ROOT.EDU}/submissions`,
  legacyGrades: `${DB_ROOT.EDU}/grades`,
  legacyAttendance: `${DB_ROOT.EDU}/attendance`,
  legacyTimetable: `${DB_ROOT.EDU}/timetable`,
  legacyTimetableSettings: `${DB_ROOT.EDU}/timetable_settings`,
  legacyAcademicSettings: `${DB_ROOT.EDU}/academic_settings`,
  legacyCurricula: `${DB_ROOT.EDU}/curricula`,
  legacyLiveLinks: `${DB_ROOT.EDU}/live_links`,
  legacyAnnouncementsSubject: `${DB_ROOT.EDU}/announcements_subject`,
} as const;

// ============================================================================
// 💬 COMM (Communication) - التفاعل الاجتماعي
// ============================================================================

export const COMM = {
  // Chats & Messages
  CHATS: `${DB_ROOT.COMM}/chats`,
  chat: (chatId: string) => `${DB_ROOT.COMM}/chats/${chatId}`,
  MESSAGES: `${DB_ROOT.COMM}/messages`,
  message: (chatId: string, messageId: string) => 
    `${DB_ROOT.COMM}/messages/${chatId}/${messageId}`,
  
  // Notifications
  NOTIFICATIONS: `${DB_ROOT.COMM}/notifications`,
  notification: (id: string) => `${DB_ROOT.COMM}/notifications/${id}`,
  
  // Groups & Feeds
  GROUPS: `${DB_ROOT.COMM}/groups`,
  FEEDS: `${DB_ROOT.COMM}/feeds`,
} as const;

// ============================================================================
// 🛠️ HELPER FUNCTIONS - دوال مساعدة
// ============================================================================

/**
 * الحصول على جميع مسارات SYS
 */
export function getSysPaths(): string[] {
  return [
    SYS.USERS,
    SYS.SYSTEM.ROOT,
    SYS.SYSTEM.SETTINGS,
    SYS.SYSTEM.BRANDING,
    SYS.SYSTEM.SLIDER,
    SYS.SYSTEM.BANKS,
    SYS.META_DATA,
    SYS.MAINTENANCE.ACTIVITIES,
    SYS.MAINTENANCE.CASHIPAY_LOGS,
    SYS.MAINTENANCE.SUPPORT_TICKETS,
    SYS.CONFIG.TEACHER_CLASS_REQUESTS,
    SYS.ANNOUNCEMENTS,
    SYS.FINANCIAL.PAYMENTS,
  ];
}

/**
 * الحصول على جميع مسارات EDU
 */
export function getEduPaths(): string[] {
  return [
    EDU.SCH.CLASSES,
    EDU.COURSES,
    EDU.LESSONS,
    EDU.ASSIGNMENTS,
    EDU.SUBMISSIONS,
    EDU.GRADES,
    EDU.EXAMS,
    EDU.RESULTS,
    EDU.ATTENDANCE,
    EDU.TIMETABLE,
    EDU.TIMETABLE_SETTINGS,
    EDU.ACADEMIC_SETTINGS,
    EDU.CURRICULA,
    EDU.LIVE_LINKS,
    EDU.ANNOUNCEMENTS_SUBJECT,
  ];
}

/**
 * الحصول على جميع مسارات COMM
 */
export function getCommPaths(): string[] {
  return [
    COMM.CHATS,
    COMM.MESSAGES,
    COMM.NOTIFICATIONS,
    COMM.GROUPS,
    COMM.FEEDS,
  ];
}

/**
 * الحصول على جميع المسارات
 */
export function getAllPaths(): string[] {
  return [...getSysPaths(), ...getEduPaths(), ...getCommPaths()];
}

// ============================================================================
// 📤 EXPORT DEFAULT
// ============================================================================

export default {
  SYS,
  EDU,
  COMM,
  DB_ROOT,
  getSysPaths,
  getEduPaths,
  getCommPaths,
  getAllPaths,
};
