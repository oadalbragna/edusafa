import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { EDU } from '../../constants/dbPaths';
import {
  BookOpen,
  Upload,
  Users,
  GraduationCap,
  ArrowRight,
  Plus,
  Eye,
  ShieldCheck,
  School,
  ChevronLeft
} from 'lucide-react';

interface Course {
  id: string;
  name: string;
  code?: string;
  level?: string;
  description?: string;
  status?: string;
  teachers?: string[];
  supervisors?: any[];
  lecturesCount?: number;
}

interface SupervisorAssignment {
  courseId: string;
  doctorId: string;
  doctorName?: string;
  permLevel: string;
  permissions: string[];
}

const CourseUploadDashboard: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [supervisions, setSupervisions] = useState<Record<string, SupervisorAssignment[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'supervised' | 'global'>('all');

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const isTeacher = profile?.role === 'teacher';

  useEffect(() => {
    const coursesRef = ref(db, EDU.COURSES);
    const unsubCourses = onValue(coursesRef, (snapshot) => {
      if (snapshot.exists()) {
        const coursesData = Object.entries(snapshot.val()).map(([id, val]: [string, any]) => ({
          id,
          ...val
        }));
        setCourses(coursesData);
      } else {
        setCourses([]);
      }
    });

    // Fetch all course supervisions
    const supervisionsRef = ref(db, 'edu/course_supervisions');
    const unsubSupervisions = onValue(supervisionsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const supervisionsMap: Record<string, SupervisorAssignment[]> = {};
        Object.entries(data).forEach(([courseId, supervisors]: [string, any]) => {
          supervisionsMap[courseId] = Object.values(supervisors);
        });
        setSupervisions(supervisionsMap);
      }
    });

    setLoading(false);
    return () => {
      unsubCourses();
      unsubSupervisions();
    };
  }, []);

  // Filter courses based on user role and permissions
  const getFilteredCourses = () => {
    if (isAdmin) {
      if (activeTab === 'global') {
        return courses.filter(c => c.level);
      }
      return courses;
    }

    if (isTeacher) {
      const teacherId = profile?.uid;
      const supervisedCourses = courses.filter(course => {
        const courseSupervisions = supervisions[course.id] || [];
        return courseSupervisions.some(s => s.doctorId === teacherId);
      });

      if (activeTab === 'supervised') {
        return supervisedCourses;
      }

      if (activeTab === 'global') {
        return courses.filter(c => c.status === 'public' || !c.status);
      }

      return [...new Set([...supervisedCourses, ...courses.filter(c => c.status === 'public')])];
    }

    return [];
  };

  const filteredCourses = getFilteredCourses();

  const canUploadToCourse = (courseId: string) => {
    if (isAdmin) return true;
    if (isTeacher) {
      const courseSupervisions = supervisions[courseId] || [];
      const supervision = courseSupervisions.find(s => s.doctorId === profile?.uid);
      return supervision && ['full', 'edit', 'add_only'].includes(supervision.permLevel);
    }
    return false;
  };

  const canManageCourse = (courseId: string) => {
    if (isAdmin) return true;
    if (isTeacher) {
      const courseSupervisions = supervisions[courseId] || [];
      const supervision = courseSupervisions.find(s => s.doctorId === profile?.uid);
      return supervision && ['full', 'edit'].includes(supervision.permLevel);
    }
    return false;
  };

  const getPermissionLevel = (courseId: string) => {
    if (isAdmin) return 'full';
    if (isTeacher) {
      const courseSupervisions = supervisions[courseId] || [];
      const supervision = courseSupervisions.find(s => s.doctorId === profile?.uid);
      return supervision?.permLevel || 'view';
    }
    return 'view';
  };

  const getPermissionBadge = (courseId: string) => {
    const perm = getPermissionLevel(courseId);
    switch (perm) {
      case 'full':
        return { text: 'صلاحيات كاملة', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
      case 'edit':
        return { text: 'تعديل وإضافة', color: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 'add_only':
        return { text: 'إضافة فقط', color: 'bg-amber-100 text-amber-700 border-amber-200' };
      default:
        return { text: 'عرض فقط', color: 'bg-gray-100 text-gray-700 border-gray-200' };
    }
  };

  const handleUploadToCourse = (course: Course) => {
    navigate('/admin/course-content', {
      state: {
        course: {
          id: course.id,
          name: course.name,
          level: course.level,
          description: course.description
        }
      }
    });
  };

  const handleViewCourse = (course: Course) => {
    navigate(`/course/${course.id}`);
  };

  const handleAddNewCourse = () => {
    navigate('/admin/global-subjects');
  };

  const handleBackToDashboard = () => {
    if (isAdmin) {
      navigate('/admin');
    } else if (isTeacher) {
      navigate('/teacher');
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-600 font-bold">جاري تحميل المقررات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-10" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToDashboard}
                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <ArrowRight className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">لوحة رفع المقررات</h1>
                <p className="text-sm text-slate-500 mt-1">إدارة ورفع المحتوى التعليمي للمقررات</p>
              </div>
            </div>
            {isAdmin && (
              <button
                onClick={handleAddNewCourse}
                className="bg-brand-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-brand-500/20 hover:bg-brand-600 transition-all active:scale-95 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                إضافة مقرر جديد
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 w-fit">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-brand-500 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            جميع المقررات
          </button>
          {isTeacher && (
            <button
              onClick={() => setActiveTab('supervised')}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'supervised'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              المقررات supervised
            </button>
          )}
          <button
            onClick={() => setActiveTab('global')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'global'
                ? 'bg-blue-500 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            المقررات العامة
          </button>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="max-w-7xl mx-auto px-6">
        {filteredCourses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
            <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-700 mb-2">لا توجد مقررات</h3>
            <p className="text-slate-500 mb-6">
              {isTeacher
                ? 'لم يتم تعيينك كمشرف على أي مقررات بعد'
                : 'لم يتم إضافة مقررات بعد'}
            </p>
            {isAdmin && (
              <button
                onClick={handleAddNewCourse}
                className="bg-brand-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-600 transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                إضافة مقرر جديد
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => {
              const permBadge = getPermissionBadge(course.id);
              const canUpload = canUploadToCourse(course.id);
              const canManage = canManageCourse(course.id);
              const supervisorsCount = (supervisions[course.id] || []).length;

              return (
                <div
                  key={course.id}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-brand-500/20 transition-all overflow-hidden group"
                >
                  {/* Course Header */}
                  <div className="bg-gradient-to-r from-brand-500 to-brand-600 p-6 text-white relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mt-16 blur-2xl"></div>
                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                            <BookOpen className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg leading-tight">{course.name}</h3>
                            {course.code && (
                              <p className="text-xs text-white/80 font-mono">{course.code}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      {course.level && (
                        <span className="inline-block bg-white/20 px-3 py-1 rounded-lg text-xs font-bold">
                          {course.level === 'primary' ? 'ابتدائي' :
                           course.level === 'middle' ? 'متوسط' : 'ثانوي'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Course Body */}
                  <div className="p-6 space-y-4">
                    {/* Permission Badge */}
                    {(isTeacher || isAdmin) && (
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${permBadge.color}`}>
                          {permBadge.text}
                        </span>
                        {supervisorsCount > 0 && (
                          <div className="flex items-center gap-1 text-slate-500 text-xs">
                            <Users className="w-4 h-4" />
                            <span>{supervisorsCount}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Description */}
                    {course.description && (
                      <p className="text-sm text-slate-600 line-clamp-2">{course.description}</p>
                    )}

                    {/* Stats */}
                    <div className="flex gap-4 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-slate-600">
                        <GraduationCap className="w-4 h-4 text-brand-500" />
                        <span className="text-xs font-bold">
                          {course.lecturesCount || 0} محاضرة
                        </span>
                      </div>
                      {course.teachers && course.teachers.length > 0 && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <School className="w-4 h-4 text-emerald-500" />
                          <span className="text-xs font-bold">
                            {course.teachers.length} معلم
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      {canUpload && (
                        <button
                          onClick={() => handleUploadToCourse(course)}
                          className="flex-1 bg-brand-500 text-white py-3 rounded-xl font-bold text-sm hover:bg-brand-600 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          رفع محتوى
                        </button>
                      )}
                      {canManage && (
                        <button
                          onClick={() => handleViewCourse(course)}
                          className="flex-1 bg-slate-50 text-slate-700 py-3 rounded-xl font-bold text-sm hover:bg-slate-100 transition-all flex items-center justify-center gap-2 border border-slate-200"
                        >
                          <Eye className="w-4 h-4" />
                          عرض
                        </button>
                      )}
                      {!canUpload && !canManage && (
                        <button
                          onClick={() => handleViewCourse(course)}
                          className="w-full bg-slate-50 text-slate-600 py-3 rounded-xl font-bold text-sm hover:bg-slate-100 transition-all flex items-center justify-center gap-2 border border-slate-200"
                        >
                          <Eye className="w-4 h-4" />
                          معاينة فقط
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="max-w-7xl mx-auto px-6 mt-10">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/10 rounded-full -mr-24 -mt-24 blur-[60px]"></div>
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-brand-400" />
              دليل استخدام لوحة رفع المقررات
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-3">
                <h4 className="font-bold text-brand-400">للمشرفين:</h4>
                <ul className="space-y-2 text-slate-300">
                  <li>• يمكنك رفع محتوى للمقررات التي تشرف عليها</li>
                  <li>• صلاحيات "كاملة" تتيح لك التعديل والحذف والإضافة</li>
                  <li>• صلاحيات "تعديل" تتيح لك التعديل والإضافة فقط</li>
                  <li>• صلاحيات "إضافة فقط" تتيح لك إضافة محتوى جديد</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-bold text-brand-400">للمعلمين:</h4>
                <ul className="space-y-2 text-slate-300">
                  <li>• يمكنك رؤية المقررات التي تم تعيينك عليها</li>
                  <li>• تواصل مع المشرف للحصول على صلاحيات الرفع</li>
                  <li>• المقررات العامة متاحة للجميع للمعاينة</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseUploadDashboard;
