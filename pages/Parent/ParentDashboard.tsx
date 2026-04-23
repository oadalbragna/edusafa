/**
 * Parent Dashboard - لوحة تحكم ولي الأمر
 *
 * Displays:
 * - Linked children overview
 * - Grades and performance
 * - Attendance tracking
 * - Behavior reports
 * - Schedule and assignments
 * - Parent link requests tracking
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, GraduationCap, TrendingUp, Calendar, Clock,
  AlertCircle, CheckCircle2, XCircle, BookOpen, Award,
  BarChart3, MessageSquare, Bell, ArrowRight, Star,
  TrendingDown, Minus, Eye, BookMarked, ClipboardList,
  UserCheck, UserX, Phone, Mail, RefreshCw, Plus, FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ref, get, query, orderByChild, equalTo, onValue } from 'firebase/database';
import { db } from '../../services/firebase';
import { SYS, EDU } from '../../constants/dbPaths';
import type { UserProfile } from '../../types';

interface StudentData {
  uid: string;
  fullName: string;
  className?: string;
  eduLevel?: string;
  grade?: string;
  status: string;
  parentLinkStatus?: 'pending' | 'student_approved' | 'admin_approved' | 'rejected';
  attendance?: { present: number; absent: number; total: number };
  grades?: { subject: string; grade: number; maxGrade: number; date: string }[];
  behaviors?: { type: 'positive' | 'negative'; description: string; date: string; teacher: string }[];
  upcomingExams?: { subject: string; date: string; type: string }[];
  assignments?: { subject: string; title: string; status: 'pending' | 'submitted' | 'graded'; grade?: number; dueDate: string }[];
}

type DashboardTab = 'overview' | 'grades' | 'attendance' | 'behavior' | 'schedule';

const ParentDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [showRequests, setShowRequests] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  // Load linked students
  useEffect(() => {
    if (!user || !profile) return;

    const loadStudents = async () => {
      setLoading(true);
      try {
        const studentUids = profile.studentLinks || [];

        if (studentUids.length === 0) {
          setStudents([]);
          setLoading(false);
          return;
        }

        const studentsData: StudentData[] = [];

        for (const uid of studentUids) {
          const userRef = ref(db, SYS.user(uid));
          const snapshot = await get(userRef);

          if (snapshot.exists()) {
            const data = snapshot.val() as UserProfile;
            const student: StudentData = {
              uid,
              fullName: data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'طالب',
              className: data.classId || data.grade || '',
              eduLevel: data.eduLevel,
              grade: data.grade,
              status: data.status,
              parentLinkStatus: 'admin_approved'
            };

            student.attendance = await loadAttendance(uid);
            student.grades = await loadGrades(uid);
            student.behaviors = await loadBehaviors(uid);
            student.assignments = await loadAssignments(uid);

            studentsData.push(student);
          }
        }

        setStudents(studentsData);
        if (studentsData.length > 0) {
          setSelectedStudent(studentsData[0]);
        }
      } catch (err) {
        console.error('Failed to load students:', err);
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, [user, profile]);

  // Real-time listener for pending parent requests
  useEffect(() => {
    if (!user?.uid) return;

    const requestsRef = ref(db, SYS.CONFIG.PARENT_LINK_REQUESTS);

    const unsubscribe = onValue(requestsRef, (snapshot) => {
      if (!snapshot.exists()) {
        setPendingRequests([]);
        return;
      }

      const allRequests = snapshot.val();
      const myRequests: any[] = [];

      for (const id in allRequests) {
        const req = allRequests[id];
        if (req.parentUid === user.uid && req.status !== 'admin_approved' && req.status !== 'rejected') {
          myRequests.push({ ...req, id });
        }
      }

      myRequests.sort((a, b) =>
        new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
      );

      setPendingRequests(myRequests);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const loadAttendance = async (studentUid: string) => {
    try {
      const studentRef = ref(db, SYS.user(studentUid));
      const studentSnap = await get(studentRef);

      if (studentSnap.exists()) {
        const studentData = studentSnap.val();
        const classId = studentData.classId;

        if (classId) {
          const attendanceRef = ref(db, EDU.classAttendance(classId));
          const attendanceSnap = await get(attendanceRef);

          if (attendanceSnap.exists()) {
            const attendanceData = attendanceSnap.val();
            let present = 0;
            let absent = 0;

            Object.values(attendanceData).forEach((record: any) => {
              if (record.studentId === studentUid) {
                if (record.status === 'present') present++;
                else if (record.status === 'absent') absent++;
              }
            });

            return { present, absent, total: present + absent };
          }
        }
      }
    } catch (err) {
      console.error('Failed to load attendance:', err);
    }
    return { present: 0, absent: 0, total: 0 };
  };

  const loadGrades = async (studentUid: string) => {
    try {
      const examsRef = ref(db, EDU.EXAMS);
      const snapshot = await get(examsRef);

      if (snapshot.exists()) {
        const exams = snapshot.val();
        const grades: { subject: string; grade: number; maxGrade: number; date: string }[] = [];

        Object.values(exams).forEach((classExams: any) => {
          Object.values(classExams).forEach((subjectExams: any) => {
            Object.values(subjectExams).forEach((exam: any) => {
              if (exam.studentId === studentUid || !exam.studentId) {
                grades.push({
                  subject: exam.subject || 'مادة',
                  grade: exam.score || exam.grade || 0,
                  maxGrade: exam.maxScore || exam.maxGrade || 100,
                  date: exam.date || exam.examDate || ''
                });
              }
            });
          });
        });

        return grades.slice(0, 10);
      }
    } catch (err) {
      console.error('Failed to load grades:', err);
    }
    return [];
  };

  const loadBehaviors = async (studentUid: string) => {
    try {
      const behaviorsRef = ref(db, EDU.BEHAVIORS);
      const snapshot = await get(behaviorsRef);

      if (snapshot.exists()) {
        const behaviorsData = snapshot.val();
        const behaviors: any[] = [];

        Object.values(behaviorsData).forEach((classBehaviors: any) => {
          Object.values(classBehaviors).forEach((behavior: any) => {
            if (behavior.studentId === studentUid) {
              behaviors.push(behavior);
            }
          });
        });

        return behaviors.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
      }
    } catch (err) {
      console.error('Failed to load behaviors:', err);
    }
    return [];
  };

  const loadAssignments = async (studentUid: string) => {
    try {
      const assignmentsRef = ref(db, EDU.ASSIGNMENTS);
      const snapshot = await get(assignmentsRef);

      if (snapshot.exists()) {
        const assignmentsData = snapshot.val();
        const assignments: any[] = [];

        Object.values(assignmentsData).forEach((classAssignments: any) => {
          Object.values(classAssignments).forEach((subjectAssignments: any) => {
            Object.entries(subjectAssignments).forEach(([key, value]: [string, any]) => {
              if (value.studentId === studentUid || !value.studentId) {
                assignments.push({
                  subject: value.subject || 'مادة',
                  title: value.title || 'واجب',
                  status: value.status || 'pending',
                  grade: value.grade,
                  dueDate: value.dueDate || value.deadline || ''
                });
              }
            });
          });
        });

        return assignments.slice(0, 10);
      }
    } catch (err) {
      console.error('Failed to load assignments:', err);
    }
    return [];
  };

  // Empty State - No linked students
  if (!loading && students.length === 0) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black mb-1">مرحباً، {profile?.fullName || 'ولي الأمر'} 👋</h1>
              <p className="text-white/70 text-sm">ابدأ بربط حسابك بأبنائك الطلاب</p>
            </div>
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center">
              <Users className="w-8 h-8" />
            </div>
          </div>
        </div>

        {/* Linking Guide */}
        <div className="bg-white rounded-3xl shadow-lg p-6">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-10 h-10 text-purple-500" />
            </div>
            <h2 className="text-xl font-black text-slate-800 mb-2">لم يتم ربط أي أبناء بعد</h2>
            <p className="text-slate-500 text-sm">اتبع الخطوات التالية لربط حسابك بأبنائك</p>
          </div>

          {/* Steps */}
          <div className="space-y-4 mb-6">
            {[
              {
                num: '1',
                title: 'اطلب كود الدعوة من ابنك',
                desc: 'يجب على الطالب إنشاء كود دعوة من حسابه'
              },
              {
                num: '2',
                title: 'أدخل الكود في التطبيق',
                desc: 'اذهب إلى ربط ولي الأمر وأدخل الكود'
              },
              {
                num: '3',
                title: 'ارفع وثيقة إثبات القرابة',
                desc: 'بعد موافقة الطالب، ارفع وثيقة تثبت قرابتك'
              },
              {
                num: '4',
                title: 'انتظر الموافقة النهائية',
                desc: 'يوافق الطالب ثم الإدارة على الطلب'
              }
            ].map((step, idx) => (
              <div key={idx} className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl">
                <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-white font-black text-sm">{step.num}</span>
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">{step.title}</p>
                  <p className="text-xs text-slate-400 mt-1">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Action Button */}
          <button
            onClick={() => navigate('/parent-accept')}
            className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-black shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            بدء ربط حساب جديد
          </button>
        </div>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div className="bg-white rounded-3xl shadow-lg p-6">
            <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              طلبات قيد المراجعة ({pendingRequests.length})
            </h3>
            <div className="space-y-3">
              {pendingRequests.map((req) => {
                let statusLabel = '';
                let statusColor = '';

                switch (req.status) {
                  case 'pending':
                    statusLabel = 'بانتظار موافقة الطالب';
                    statusColor = 'bg-amber-100 text-amber-700';
                    break;
                  case 'student_approved':
                    statusLabel = 'وافق الطالب - ارفع وثيقة الإثبات';
                    statusColor = 'bg-blue-100 text-blue-700';
                    break;
                  case 'proof_uploaded':
                    statusLabel = 'تم رفع الوثيقة - بانتظار مراجعة الطالب';
                    statusColor = 'bg-indigo-100 text-indigo-700';
                    break;
                  case 'proof_reviewed_by_student':
                    statusLabel = 'وافق على الوثيقة - بانتظار الإدارة';
                    statusColor = 'bg-purple-100 text-purple-700';
                    break;
                  default:
                    statusLabel = req.status;
                    statusColor = 'bg-slate-100 text-slate-600';
                }

                return (
                  <div key={req.id} className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                          <UserCheck className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{req.studentName}</p>
                          <p className="text-xs text-slate-400">{new Date(req.requestedAt).toLocaleDateString('ar-EG')}</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold ${statusColor}`}>
                        {statusLabel}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Loading State
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl p-6 animate-pulse">
          <div className="h-8 bg-white/20 rounded w-48 mb-2"></div>
          <div className="h-4 bg-white/10 rounded w-64"></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-3xl p-6 animate-pulse">
              <div className="h-12 bg-slate-100 rounded-2xl mb-3"></div>
              <div className="h-4 bg-slate-50 rounded w-24"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Main Dashboard View
  const attendanceRate = selectedStudent?.attendance
    ? Math.round((selectedStudent.attendance.present / selectedStudent.attendance.total) * 100) || 0
    : 0;

  const averageGrade = selectedStudent?.grades && selectedStudent.grades.length > 0
    ? Math.round(selectedStudent.grades.reduce((sum, g) => sum + (g.grade / g.maxGrade * 100), 0) / selectedStudent.grades.length)
    : 0;

  const pendingAssignments = selectedStudent?.assignments?.filter(a => a.status === 'pending').length || 0;

  return (
    <div className="space-y-6">
      {/* Header with Navigation */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-black mb-1">لوحة ولي الأمر 👨‍👧‍👦</h1>
            <p className="text-white/70 text-sm">
              {showRequests ? 'متابعة طلبات الربط' : 'تابع أداء أبنائك الدراسي'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRequests(!showRequests)}
              className="relative p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all"
              title="متابعة الطلبات"
            >
              <Clock className="w-5 h-5" />
              {pendingRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 text-purple-900 rounded-full flex items-center justify-center text-[10px] font-black">
                  {pendingRequests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate('/parent-accept')}
              className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all"
              title="إضافة ابن"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Student Selector */}
        {!showRequests && students.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {students.map(student => (
              <button
                key={student.uid}
                onClick={() => setSelectedStudent(student)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  selectedStudent?.uid === student.uid
                    ? 'bg-white text-purple-600 shadow-md'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {student.fullName}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Requests Tracking View */}
      {showRequests ? (
        <div className="bg-white rounded-3xl shadow-lg p-6">
          <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            طلبات ربط ولي الأمر ({pendingRequests.length})
          </h3>

          {pendingRequests.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-10 h-10 text-slate-300" />
              </div>
              <h4 className="font-bold text-slate-600 mb-2">لا توجد طلبات حالياً</h4>
              <p className="text-sm text-slate-400 mb-6">يمكنك إرسال طلب ربط جديد من خلال رمز الدعوة من ابنك</p>
              <button
                onClick={() => navigate('/parent-accept')}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center gap-2 mx-auto"
              >
                <Plus className="w-4 h-4" />
                ربط حساب جديد
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((req) => {
                let statusLabel = '';
                let statusColor = '';
                let statusIcon = null;
                let actionRequired = '';

                switch (req.status) {
                  case 'pending':
                    statusLabel = 'بانتظار موافقة الطالب';
                    statusColor = 'bg-amber-50 border-amber-200';
                    statusIcon = <Clock className="w-5 h-5 text-amber-500" />;
                    actionRequired = 'في انتظار أن يوافق الطالب على الطلب';
                    break;
                  case 'student_approved':
                    statusLabel = 'وافق الطالب';
                    statusColor = 'bg-blue-50 border-blue-200';
                    statusIcon = <CheckCircle2 className="w-5 h-5 text-blue-500" />;
                    actionRequired = 'يمكنك الآن رفع وثيقة إثبات القرابة';
                    break;
                  case 'proof_uploaded':
                    statusLabel = 'تم رفع الوثيقة';
                    statusColor = 'bg-indigo-50 border-indigo-200';
                    statusIcon = <FileText className="w-5 h-5 text-indigo-500" />;
                    actionRequired = 'بانتظار مراجعة الطالب للوثيقة';
                    break;
                  case 'proof_reviewed_by_student':
                    statusLabel = 'وافق الطالب على الوثيقة';
                    statusColor = 'bg-purple-50 border-purple-200';
                    statusIcon = <CheckCircle2 className="w-5 h-5 text-purple-500" />;
                    actionRequired = 'بانتظار موافقة الإدارة النهائية';
                    break;
                  case 'rejected':
                    statusLabel = 'مرفوض';
                    statusColor = 'bg-red-50 border-red-200';
                    statusIcon = <XCircle className="w-5 h-5 text-red-500" />;
                    actionRequired = req.rejectionReason || 'تم رفض الطلب';
                    break;
                  default:
                    statusLabel = req.status;
                    statusColor = 'bg-slate-50 border-slate-200';
                    statusIcon = <Clock className="w-5 h-5 text-slate-400" />;
                    actionRequired = '';
                }

                return (
                  <div key={req.id} className={`p-5 rounded-2xl border-2 ${statusColor}`}>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                        {statusIcon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-black text-slate-800">{req.studentName}</p>
                            <p className="text-xs text-slate-400">
                              {new Date(req.requestedAt).toLocaleDateString('ar-EG', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                            req.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                            req.status === 'student_approved' ? 'bg-blue-100 text-blue-700' :
                            req.status === 'proof_uploaded' ? 'bg-indigo-100 text-indigo-700' :
                            req.status === 'proof_reviewed_by_student' ? 'bg-purple-100 text-purple-700' :
                            req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {statusLabel}
                          </div>
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-slate-100">
                          <p className="text-sm font-bold text-slate-700">{actionRequired}</p>
                        </div>
                        {req.proofDocumentUrl && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                            <FileText className="w-3 h-3" />
                            <span>تم رفع وثيقة الإثبات</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Student Dashboard View */
        selectedStudent && (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                    <UserCheck className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-xs text-slate-400 font-bold">الحضور</span>
                </div>
                <p className="text-2xl font-black text-slate-800">{attendanceRate}%</p>
                {selectedStudent?.attendance && (
                  <p className="text-xs text-slate-400 mt-1">
                    {selectedStudent.attendance.present} من {selectedStudent.attendance.total} يوم
                  </p>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-xs text-slate-400 font-bold">المعدل العام</span>
                </div>
                <p className="text-2xl font-black text-slate-800">{averageGrade}%</p>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedStudent?.grades?.length || 0} مواد دراسية
                </p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                    <ClipboardList className="w-5 h-5 text-amber-600" />
                  </div>
                  <span className="text-xs text-slate-400 font-bold">الواجبات</span>
                </div>
                <p className="text-2xl font-black text-slate-800">{pendingAssignments}</p>
                <p className="text-xs text-slate-400 mt-1">واجبات معلقة</p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-xs text-slate-400 font-bold">المواد</span>
                </div>
                <p className="text-2xl font-black text-slate-800">{selectedStudent?.grades?.length || 0}</p>
                <p className="text-xs text-slate-400 mt-1">مواد دراسية</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
              <div className="flex border-b border-slate-100 min-w-max">
                {[
                  { id: 'overview', label: 'نظرة عامة', icon: BarChart3 },
                  { id: 'grades', label: 'الدرجات', icon: Award },
                  { id: 'attendance', label: 'الحضور', icon: Calendar },
                  { id: 'behavior', label: 'السلوك', icon: Star },
                  { id: 'schedule', label: 'الجدول', icon: Clock }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 min-w-[80px] py-3 px-4 text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                      activeTab === tab.id
                        ? 'text-purple-600 border-b-2 border-purple-500 bg-purple-50/50'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                {/* Recent Grades */}
                <div className="bg-white rounded-2xl shadow-sm p-5">
                  <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-blue-500" />
                    آخر الدرجات
                  </h3>
                  {selectedStudent.grades && selectedStudent.grades.length > 0 ? (
                    <div className="space-y-3">
                      {selectedStudent.grades.slice(0, 5).map((grade, idx) => {
                        const percentage = Math.round((grade.grade / grade.maxGrade) * 100);
                        return (
                          <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                            <div className="flex-1">
                              <p className="font-bold text-slate-800 text-sm">{grade.subject}</p>
                              <p className="text-xs text-slate-400">{grade.date ? new Date(grade.date).toLocaleDateString('ar-EG') : ''}</p>
                            </div>
                            <div className="text-left">
                              <p className={`font-black ${
                                percentage >= 90 ? 'text-green-600' :
                                percentage >= 75 ? 'text-blue-600' :
                                percentage >= 60 ? 'text-amber-600' :
                                'text-red-600'
                              }`}>
                                {percentage}%
                              </p>
                              <p className="text-xs text-slate-400">{grade.grade}/{grade.maxGrade}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400">
                      <Award className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">لا توجد درجات بعد</p>
                    </div>
                  )}
                </div>

                {/* Pending Assignments */}
                <div className="bg-white rounded-2xl shadow-sm p-5">
                  <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-amber-500" />
                    الواجبات القادمة
                  </h3>
                  {selectedStudent.assignments && selectedStudent.assignments.length > 0 ? (
                    <div className="space-y-3">
                      {selectedStudent.assignments.filter(a => a.status === 'pending').slice(0, 5).map((assignment, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
                          <div className="flex-1">
                            <p className="font-bold text-slate-800 text-sm">{assignment.title}</p>
                            <p className="text-xs text-slate-400">{assignment.subject}</p>
                          </div>
                          <div className="text-left">
                            <p className="text-xs text-amber-600 font-bold">
                              {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString('ar-EG') : ''}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400">
                      <ClipboardList className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">لا توجد واجبات معلقة</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Grades Tab */}
            {activeTab === 'grades' && (
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-blue-500" />
                  سجل الدرجات
                </h3>
                {selectedStudent.grades && selectedStudent.grades.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedStudent.grades.map((grade, idx) => {
                      const percentage = Math.round((grade.grade / grade.maxGrade) * 100);
                      return (
                        <div key={idx} className="p-4 bg-slate-50 rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-bold text-slate-800">{grade.subject}</p>
                            <p className={`font-black text-lg ${
                              percentage >= 90 ? 'text-green-600' :
                              percentage >= 75 ? 'text-blue-600' :
                              percentage >= 60 ? 'text-amber-600' :
                              'text-red-600'
                            }`}>
                              {grade.grade}/{grade.maxGrade}
                            </p>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                percentage >= 90 ? 'bg-green-500' :
                                percentage >= 75 ? 'bg-blue-500' :
                                percentage >= 60 ? 'bg-amber-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-slate-400 mt-2">
                            {grade.date ? new Date(grade.date).toLocaleDateString('ar-EG') : ''}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <Award className="w-16 h-16 mx-auto mb-3 opacity-30" />
                    <p className="font-bold">لا توجد درجات</p>
                    <p className="text-sm mt-1">سيتم إضافة الدرجات من المعلمين</p>
                  </div>
                )}
              </div>
            )}

            {/* Attendance Tab */}
            {activeTab === 'attendance' && (
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  سجل الحضور
                </h3>
                {selectedStudent.attendance && selectedStudent.attendance.total > 0 ? (
                  <div className="space-y-4">
                    <div className="p-6 bg-slate-50 rounded-xl">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-sm text-slate-500 font-bold">نسبة الحضور</p>
                          <p className="text-3xl font-black text-slate-800">{attendanceRate}%</p>
                        </div>
                        <div className="w-20 h-20 relative">
                          <svg className="w-full h-full" viewBox="0 0 36 36">
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="#e2e8f0"
                              strokeWidth="3"
                            />
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke={attendanceRate >= 75 ? '#10b981' : attendanceRate >= 60 ? '#f59e0b' : '#ef4444'}
                              strokeWidth="3"
                              strokeDasharray={`${attendanceRate}, 100`}
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <p className={`text-xs font-black ${
                              attendanceRate >= 75 ? 'text-green-600' :
                              attendanceRate >= 60 ? 'text-amber-600' :
                              'text-red-600'
                            }`}>
                              {attendanceRate}%
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 bg-green-50 rounded-xl text-center">
                          <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-2" />
                          <p className="text-2xl font-black text-green-600">{selectedStudent.attendance.present}</p>
                          <p className="text-xs text-green-500 font-bold">أيام حضور</p>
                        </div>
                        <div className="p-4 bg-red-50 rounded-xl text-center">
                          <XCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
                          <p className="text-2xl font-black text-red-600">{selectedStudent.attendance.absent}</p>
                          <p className="text-xs text-red-500 font-bold">أيام غياب</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <Calendar className="w-16 h-16 mx-auto mb-3 opacity-30" />
                    <p className="font-bold">لا توجد بيانات حضور</p>
                    <p className="text-sm mt-1">سيتم تسجيل الحضور اليومي من المعلم</p>
                  </div>
                )}
              </div>
            )}

            {/* Behavior Tab */}
            {activeTab === 'behavior' && (
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500" />
                  التقرير السلوكي
                </h3>
                {selectedStudent.behaviors && selectedStudent.behaviors.length > 0 ? (
                  <div className="space-y-3">
                    {selectedStudent.behaviors.map((behavior, idx) => (
                      <div key={idx} className={`p-4 rounded-xl border-r-4 ${
                        behavior.type === 'positive'
                          ? 'bg-green-50 border-green-400'
                          : 'bg-red-50 border-red-400'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-bold text-slate-800 text-sm">{behavior.description}</p>
                            <p className="text-xs text-slate-400 mt-1">{behavior.teacher} • {new Date(behavior.date).toLocaleDateString('ar-EG')}</p>
                          </div>
                          {behavior.type === 'positive' ? (
                            <Star className="w-5 h-5 text-amber-500" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <Star className="w-16 h-16 mx-auto mb-3 opacity-30" />
                    <p className="font-bold">لا توجد تقارير سلوكية</p>
                    <p className="text-sm mt-1">سيتم رصد السلوكيات من المعلمين</p>
                  </div>
                )}
              </div>
            )}

            {/* Schedule Tab */}
            {activeTab === 'schedule' && (
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  الجدول الدراسي
                </h3>
                <div className="text-center py-12 text-slate-400">
                  <Clock className="w-16 h-16 mx-auto mb-3 opacity-30" />
                  <p className="font-bold">الجدول الدراسي قيد التجهيز</p>
                  <p className="text-sm mt-1">سيتم إضافة الجدول الدراسي قريباً</p>
                </div>
              </div>
            )}
          </>
        )
      )}
    </div>
  );
};

export default ParentDashboard;
