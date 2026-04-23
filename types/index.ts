export type UserRole = 'super_admin' | 'admin' | 'teacher' | 'student' | 'parent';

// Parent Link Request Interface
export interface ParentLinkRequest {
  id: string;
  studentUid: string;
  studentName: string;
  studentEmail: string;
  parentUid: string;
  parentName: string;
  parentEmail: string;
  parentPhone?: string;
  inviteCode: string;
  status: 'pending' | 'student_approved' | 'proof_uploaded' | 'proof_reviewed_by_student' | 'admin_approved' | 'rejected';
  requestedAt: string;
  studentRespondedAt?: string;
  adminRespondedAt?: string;
  rejectionReason?: string | null;
  respondedBy?: string; // admin or student uid who rejected
  expiresAt: string;
  // Guardian proof document fields
  proofDocumentUrl?: string;
  proofDocumentType?: 'id_card' | 'birth_certificate' | 'family_book' | 'court_order' | 'other';
  proofUploadedAt?: string;
  proofReviewedByStudent?: boolean;
  proofStudentReviewNotes?: string;
  proofReviewedAt?: string;
  adminReviewNotes?: string;
  // Identity document fields (new system)
  identityDocumentUrl?: string;
  identityDocumentType?: 'id_card' | 'passport' | 'family_book' | 'birth_certificate' | 'driver_license' | 'residence_permit' | 'other';
  identityDocumentId?: string;
  identityUploadedAt?: string;
  identityReviewedBy?: string;
  identityReviewedAt?: string;
  identityStatus?: 'pending' | 'approved' | 'rejected';
}

export interface UserPermissions {
  readOnly?: boolean;
  uploadEditDelete?: boolean;
  announcements?: boolean;
  messaging?: boolean;
  accessMaterials?: boolean;
  interact?: boolean;
  financialManage?: boolean; // Can issue invoices and record payments
  financialView?: boolean;   // Can only view reports
}

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  secondName?: string;
  phone?: string;
  eduLevel?: string;
  grade?: string;
  // School class hierarchy (new system)
  schoolId?: string;      // School ID
  stageId?: string;       // Educational stage (primary/middle/high)
  gradeId?: string;       // Grade within stage
  classId?: string;       // Class/section within grade
  year?: string;          // Academic year
  inviteCode?: string;
  // Parent invitation system
  parentInviteCode?: string;  // Current active invite code for parents
  parentInviteCodes?: Array<{  // History of generated codes
    code: string;
    createdAt: string;
    expiresAt?: string;
    usedBy?: string;  // parent uid who used this code
    usedAt?: string;
    status: 'active' | 'used' | 'expired';
  }>;
  studentLink?: string;     // For parent: links to student UID
  studentLinks?: string[];   // For parent: array of student UIDs linked (new system)
  parentLinks?: string[];   // For student: array of parent UIDs linked
  parentUid?: string;       // Legacy: single parent UID on student
  parentEmail?: string;     // Legacy: single parent email on student
  address?: string;
  photoURL?: string;
  createdAt: string;
  status?: 'online' | 'offline' | 'pending' | 'approved' | 'rejected';
  lastSeen?: number;        // Timestamp instead of any
  classRequests?: Record<string, { status: 'pending' | 'approved' | 'rejected', requestedAt: string, rejectionReason?: string | null, approvedAt?: string, rejectedAt?: string }>;
  permissions?: UserPermissions;
  blockedClasses?: string[];
  blockedSubjects?: string[];
}

export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'late' | 'reviewing';
export type FeeType = 'tuition' | 'transport' | 'books' | 'activities' | 'uniform' | 'salary' | 'bonus' | 'other';

export interface PaymentHistory {
  id: string;
  amount: number;
  date: string;
  method: 'cash' | 'bankak' | 'transfer';
  proofUrl?: string;
  recordedBy: string;
}

export interface EditLog {
  date: string;
  user: string;
  field: string;
  oldValue: any;
  newValue: any;
}

export interface InstallmentPlan {
  id: string;
  amount: number;
  dueDate: string;
  status: 'paid' | 'unpaid';
}

export interface Payment {
  id: string;
  studentId: string;
  targetRole: 'student' | 'teacher' | 'staff';
  description: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  feeType: FeeType;
  dueDate: string;
  status: PaymentStatus;
  createdAt: string;
  history?: PaymentHistory[];
  editLogs?: EditLog[];
  installments?: InstallmentPlan[];
  paymentProof?: string;
  paymentMethod?: string;
  submittedAt?: string;
  notes?: string;
}

export interface School {
  id: string;
  name: string;
  address: string;
  logo?: string;
  subscriptionStatus: 'active' | 'inactive' | 'trial';
  settings: {
    academicYear: string;
    currentSemester: string;
  };
}

// School Class Hierarchy (replaces University/College/Department)
export interface SchoolClass {
  id: string;
  name: string;
  schoolId: string;           // School ID
  stage: 'primary' | 'middle' | 'high';  // Educational stage
  stageName?: string;         // Stage name in Arabic
  grade: string;              // Grade number (1-12)
  gradeName?: string;         // Grade name in Arabic
  section?: string;           // Section/division (أ, ب, ج)
  fullName?: string;          // Full class name (e.g., "الصف الخامس أ")
  teacherId?: string;         // Homeroom teacher
  teacherName?: string;
  year?: string;              // Academic year
  status: 'public' | 'hidden' | 'coming_soon' | 'teachers_only' | 'admin_only';
  studentsCount?: number;
  subjectsCount?: number;
  createdAt?: string;
}

export interface SchoolClassSubject {
  id: string;
  classId: string;
  name: string;
  nameAr?: string;            // Subject name in Arabic
  teacherId?: string;
  teacherName?: string;
  color?: string;
  icon?: string;
  status: 'public' | 'hidden' | 'coming_soon' | 'teachers_only' | 'admin_only';
  lecturesCount?: number;
  assignmentsCount?: number;
}

export interface SchoolClassLecture {
  id: string;
  classId: string;
  subjectId: string;
  title: string;
  titleAr?: string;
  lectureNumber?: number;
  unit?: string;
  description?: string;
  blocks?: Array<{
    id: string;
    type: 'text' | 'image' | 'video' | 'audio' | 'pdf' | 'link';
    content?: string;
    url?: string;
    title?: string;
    fileId?: string;
  }>;
  objectives?: string[];
  videoUrl?: string;
  audioUrl?: string;
  pdfUrl?: string;
  imageUrl?: string;
  attachments?: any[];
  publishDate?: string;
  instructorId?: string;
  instructorName?: string;
  timestamp?: any;
  createdAt?: string;
  status?: 'draft' | 'published' | 'deleted';
}

export interface SchoolClassAssignment {
  id: string;
  classId: string;
  subjectId?: string;
  lectureId?: string;
  title: string;
  titleAr?: string;
  description: string;
  instructions?: string;
  type: 'homework' | 'quiz' | 'project' | 'exam';
  submissionTypes: string[];  // ['pdf', 'image', 'video', 'audio', 'document']
  allowMultipleFiles?: boolean;
  maxFileSize?: number;       // in MB
  requireText?: boolean;
  startTime: string;
  endTime: string;
  dueDate: string;
  allowLateSubmission?: boolean;
  latePenalty?: number;       // percentage
  points?: number;
  status: 'draft' | 'published' | 'archived';
  createdAt?: string;
  teacherId?: string;
  teacherName?: string;
}

export interface SchoolClassSchedule {
  id: string;
  classId: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  day: 'Saturday' | 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
  startTime: string;  // HH:mm
  endTime: string;    // HH:mm
  room?: string;
  imageUrl?: string;  // Schedule image for this day
}

export interface Subject {
  id: string;
  name: string;
  teacherId?: string;
  teacherName?: string;
  status: 'public' | 'hidden' | 'coming_soon' | 'teachers_only' | 'admin_only';
}

// Subject Category System (for organizing subjects within classes)
export interface SubjectCategory {
  id: string;
  classId: string;              // The class this category belongs to
  name: string;                 // Category name (e.g., "المواد الأساسية", "المواد الاختيارية")
  nameAr?: string;              // Arabic name
  description?: string;         // Category description
  color?: string;               // Category color for UI
  icon?: string;                // Icon/emoji for the category
  order: number;                // Display order
  status: 'active' | 'inactive';
  createdAt: string;
  createdBy?: string;           // UID of creator
}

// Subject within a category
export interface CategorizedSubject {
  id: string;
  categoryId: string;           // Reference to SubjectCategory
  classId: string;              // Denormalized for easy querying
  name: string;                 // Subject name
  nameAr?: string;              // Arabic name
  code?: string;                // Subject code
  description?: string;
  teacherId?: string;
  teacherName?: string;
  color?: string;
  icon?: string;
  order: number;                // Display order within category
  status: 'public' | 'hidden' | 'coming_soon' | 'teachers_only' | 'admin_only';
  isCertified?: boolean;        // Is this a certified subject?
  lectureCount?: number;
  assignmentCount?: number;
  materialCount?: number;
  createdAt: string;
  createdBy?: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: any;
  type: 'text' | 'file' | 'image' | 'video' | 'audio' | 'invoice';
  fileUrl?: string;
  fileName?: string;
  isDeleted?: boolean;
  reactions?: { [emoji: string]: string[] }; // emoji -> array of user uids
  invoiceData?: {
    id: string;
    description: string;
    amount: number;
    balance: number;
    dueDate: string;
    status: string;
  };
}

export interface Chat {
  id: string;
  participants: string[]; // [studentUid, teacherUid]
  lastMessage?: string;
  lastTimestamp?: any;
  unreadCount?: { [uid: string]: number };
}

export interface Class {
  id: string;
  name: string;
  level: 'primary' | 'middle' | 'high';
  grade: string;
  status: 'public' | 'hidden' | 'coming_soon' | 'teachers_only' | 'admin_only';
  animationUrl?: string;
  coverImage?: string;
  subjects?: Subject[];
  students?: string[]; // Array of student UIDs
  createdAt: string;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  classId: string;
  teacherId: string;
  dueDate: any;
  attachments?: string[];
  createdAt: any;
}

export interface Grade {
  id: string;
  studentId: string;
  classId: string;
  assignmentId?: string;
  subject: string;
  score: number;
  maxScore: number;
  comments?: string;
  date: any;
}

export interface Attendance {
  id: string;
  studentId: string;
  classId: string;
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent' | 'late' | 'excused';
}

export interface TimetableSlot {
  id: string;
  classId: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  day: 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  room?: string;
}

export interface PlatformSettings {
  name: string;
  logo?: string;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  termsAndConditions?: string;
  privacyPolicy?: string;
  lastUpdated?: string;
  bankName?: string;
  bankAccount?: string;
  appDownloadUrl?: string;
}

export type DocumentType = 'image' | 'video' | 'pdf' | 'audio' | 'attachment';

export interface CurriculumItem {
  id: string;
  title: string;
  classId?: string;
  level: 'primary' | 'middle' | 'high';
  grade: string;
  subject: string;
  fileLink: string;
  type: DocumentType;
  description?: string;
  uploadedBy: string;
  createdAt: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  active: boolean;
  instructions?: string;
}

export interface SliderItem {
  id: string;
  imageUrl: string;
  title: string;
  subtitle?: string;
  linkType: 'internal' | 'external';
  targetLink: string;
  order: number;
  active: boolean;
  assignedTo: string[] | 'all';
}
