import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase';
import { ref, get } from 'firebase/database';
import { SYS, EDU } from '../../constants/dbPaths';
import {
  BookOpen, AlertTriangle, CheckCircle, Loader2,
  ArrowLeft, Plus, X, Library, Search, RefreshCw,
  AlertCircle, ChevronLeft
} from 'lucide-react';

const MissingLibrariesPage: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [allClasses, setAllClasses] = useState<any[]>([]);
  const [studentClass, setStudentClass] = useState<any>(null);
  const [missingLibraries, setMissingLibraries] = useState<any[]>([]);
  const [scanComplete, setScanComplete] = useState(false);

  useEffect(() => {
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    if (!profile?.uid || !profile?.classId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch student's class
      const classRef = ref(db, EDU.SCH.CLASSES);
      const classSnap = await get(classRef);
      
      if (classSnap.exists()) {
        const classes = Object.values(classSnap.val() || {});
        setAllClasses(classes as any[]);
        
        const myClass = (classes as any[]).find(c => c.id === profile.classId);
        setStudentClass(myClass);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const scanForMissingLibraries = async () => {
    if (!profile?.classId) return;

    setScanning(true);
    setScanComplete(false);
    setMissingLibraries([]);

    try {
      const missing: any[] = [];

      // Check 1: Class materials library
      if (profile.classId) {
        const materialsRef = ref(db, `${EDU.SCH.classMaterials(profile.classId)}`);
        const materialsSnap = await get(materialsRef);
        
        if (!materialsSnap.exists() || Object.keys(materialsSnap.val() || {}).length === 0) {
          missing.push({
            id: 'materials',
            name: 'مكتبة المواد التعليمية',
            description: 'المواد الدراسية والموارد التعليمية',
            icon: BookOpen,
            severity: 'high',
            path: `${EDU.SCH.classMaterials(profile.classId)}`
          });
        }
      }

      // Check 2: Assignments library
      if (profile.classId) {
        const assignmentsRef = ref(db, `edu/assignments`);
        const assignSnap = await get(assignmentsRef);
        
        if (assignSnap.exists()) {
          const assignments = Object.values(assignSnap.val() || {});
          const classAssignments = assignments.filter((a: any) => a.classId === profile.classId);
          
          if (classAssignments.length === 0) {
            missing.push({
              id: 'assignments',
              name: 'مكتبة الواجبات',
              description: 'الواجبات والمهام الدراسية',
              icon: BookOpen,
              severity: 'medium',
              path: 'edu/assignments'
            });
          }
        }
      }

      // Check 3: Grades library
      if (profile.classId) {
        const gradesRef = ref(db, `${EDU.grades(profile.classId)}`);
        const gradesSnap = await get(gradesRef);
        
        if (!gradesSnap.exists() || Object.keys(gradesSnap.val() || {}).length === 0) {
          missing.push({
            id: 'grades',
            name: 'مكتبة الدرجات',
            description: 'الدرجات والتقييمات',
            icon: BookOpen,
            severity: 'high',
            path: `${EDU.grades(profile.classId)}`
          });
        }
      }

      // Check 4: Attendance library
      if (profile.classId) {
        const attendanceRef = ref(db, `${EDU.attendance(profile.classId)}`);
        const attendSnap = await get(attendanceRef);
        
        if (!attendSnap.exists() || Object.keys(attendSnap.val() || {}).length === 0) {
          missing.push({
            id: 'attendance',
            name: 'مكتبة الحضور',
            description: 'سجل الحضور والغياب',
            icon: BookOpen,
            severity: 'medium',
            path: `${EDU.attendance(profile.classId)}`
          });
        }
      }

      // Check 5: Timetable/Schedule
      if (profile.classId) {
        const timetableRef = ref(db, `${EDU.SCH.classTimetable(profile.classId)}`);
        const timetableSnap = await get(timetableRef);
        
        if (!timetableSnap.exists() || Object.keys(timetableSnap.val() || {}).length === 0) {
          missing.push({
            id: 'timetable',
            name: 'مكتبة الجدول الدراسي',
            description: 'الجدول الأسبوعي للحصص',
            icon: BookOpen,
            severity: 'low',
            path: `${EDU.SCH.classTimetable(profile.classId)}`
          });
        }
      }

      // Check 6: Curricula
      const curriculaRef = ref(db, EDU.curricula);
      const curriculaSnap = await get(curriculaRef);
      
      if (!curriculaSnap.exists() || Object.keys(curriculaSnap.val() || {}).length === 0) {
        missing.push({
          id: 'curricula',
          name: 'مكتبة المناهج',
          description: 'المناهج والخطط الدراسية',
          icon: BookOpen,
          severity: 'high',
          path: EDU.curricula
        });
      }

      // Check 7: Exams
      if (profile.classId) {
        const examsRef = ref(db, EDU.exams);
        const examsSnap = await get(examsRef);
        
        if (examsSnap.exists()) {
          const exams = Object.values(examsSnap.val() || {});
          const classExams = exams.filter((e: any) => e.classId === profile.classId);
          
          if (classExams.length === 0) {
            missing.push({
              id: 'exams',
              name: 'مكتبة الاختبارات',
              description: 'الاختبارات والتقييمات',
              icon: BookOpen,
              severity: 'medium',
              path: EDU.exams
            });
          }
        }
      }

      setMissingLibraries(missing);
      setScanComplete(true);
    } catch (error) {
      console.error('Error scanning libraries:', error);
    } finally {
      setScanning(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'from-red-500 to-rose-600';
      case 'medium': return 'from-amber-500 to-orange-600';
      case 'low': return 'from-blue-500 to-indigo-600';
      default: return 'from-slate-500 to-gray-600';
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-50 border-red-200';
      case 'medium': return 'bg-amber-50 border-amber-200';
      case 'low': return 'bg-blue-50 border-blue-200';
      default: return 'bg-slate-50 border-slate-200';
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-700';
      case 'medium': return 'text-amber-700';
      case 'low': return 'text-blue-700';
      default: return 'text-slate-700';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'high': return 'عاجل';
      case 'medium': return 'مهم';
      case 'low': return 'منخفض';
      default: return 'عادي';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto" />
          <p className="text-lg font-bold text-slate-700">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/student')}
              className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-900">فحص المكتبات المفقودة</h1>
              <p className="text-sm font-bold text-slate-500">
                {studentClass ? `الصف: ${studentClass.fullName || studentClass.name}` : 'تحقق من المكتبات المتاحة'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`px-4 py-2 rounded-xl font-bold text-sm ${
              scanComplete && missingLibraries.length === 0
                ? 'bg-emerald-100 text-emerald-700'
                : scanComplete
                ? 'bg-amber-100 text-amber-700'
                : 'bg-slate-100 text-slate-600'
            }`}>
              {scanComplete 
                ? missingLibraries.length === 0 
                  ? '✓ الكل متوفر'
                  : `${missingLibraries.length} مكتبة مفقودة`
                : 'في الانتظار'
              }
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 space-y-6">
        {/* Scan Button */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                <Search size={24} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">فحص المكتبات</h2>
                <p className="text-sm font-bold text-slate-500">
                  التحقق من المكتبات المتاحة والمفقودة لصفك
                </p>
              </div>
            </div>
            <button
              onClick={scanForMissingLibraries}
              disabled={scanning}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-black text-sm shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center gap-2"
            >
              {scanning ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  جاري الفحص...
                </>
              ) : (
                <>
                  <RefreshCw size={18} />
                  بدء الفحص
                </>
              )}
            </button>
          </div>
        </div>

        {/* Scanning Progress */}
        {scanning && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
            <h3 className="text-lg font-black text-slate-900">جاري فحص المكتبات...</h3>
            <p className="text-slate-500 font-bold">الرجاء الانتظار بينما نتحقق من جميع المكتبات</p>
            <div className="w-64 mx-auto bg-slate-200 rounded-full h-2 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full animate-pulse"></div>
            </div>
          </div>
        )}

        {/* Results Summary */}
        {scanComplete && !scanning && (
          <>
            {/* All Libraries Present */}
            {missingLibraries.length === 0 && (
              <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-3xl shadow-xl p-10 text-white text-center space-y-4">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4">
                  <CheckCircle size={48} />
                </div>
                <h2 className="text-3xl font-black">جميع المكتبات متوفرة! 🎉</h2>
                <p className="text-lg font-bold text-emerald-100">
                  صفك يحتوي على جميع المكتبات المطلوبة
                </p>
              </div>
            )}

            {/* Missing Libraries */}
            {missingLibraries.length > 0 && (
              <>
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl shadow-xl p-8 text-white">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 rounded-xl bg-white/20">
                      <AlertTriangle size={32} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black">تم العثور على مكتبات مفقودة</h2>
                      <p className="font-bold text-amber-100">
                        {missingLibraries.length} مكتبة تحتاج إلى إضافة
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {missingLibraries.map((lib, index) => (
                    <div
                      key={lib.id}
                      className={`bg-white rounded-2xl shadow-sm border-2 p-6 space-y-4 ${getSeverityBg(lib.severity)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className={`p-3 rounded-xl bg-gradient-to-br ${getSeverityColor(lib.severity)} text-white`}>
                            <lib.icon size={24} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-lg font-black text-slate-900">{lib.name}</h3>
                              <span className={`px-3 py-1 rounded-lg text-xs font-black ${getSeverityBg(lib.severity)} ${getSeverityText(lib.severity)}`}>
                                {getSeverityLabel(lib.severity)}
                              </span>
                            </div>
                            <p className={`font-bold ${getSeverityText(lib.severity)}`}>
                              {lib.description}
                            </p>
                            <p className="text-xs font-mono text-slate-500 mt-2">
                              المسار: {lib.path}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className={`p-4 rounded-xl ${getSeverityBg(lib.severity)}`}>
                        <div className="flex items-start gap-2">
                          <AlertCircle size={16} className={getSeverityText(lib.severity)} />
                          <p className={`text-sm font-bold ${getSeverityText(lib.severity)}`}>
                            هذه المكتة {lib.severity === 'high' ? 'عاجلة ويجب إضافتها فوراً' : 
                             lib.severity === 'medium' ? 'مهمة وينبغي إضافتها قريباً' : 
                             'منخفضة الأولوية ولكن يُنصح بإضافتها'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Class Info */}
        {studentClass && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-purple-100 text-purple-600">
                <Library size={20} />
              </div>
              <h3 className="text-lg font-black text-slate-900">معلومات الصف</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-xs font-bold text-slate-500 mb-1">اسم الصف</p>
                <p className="font-black text-slate-900">{studentClass.fullName || studentClass.name}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-xs font-bold text-slate-500 mb-1">المرحلة</p>
                <p className="font-black text-slate-900">{studentClass.stageName || studentClass.stage}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-xs font-bold text-slate-500 mb-1">الصف</p>
                <p className="font-black text-slate-900">{studentClass.gradeName || studentClass.grade}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-xs font-bold text-slate-500 mb-1">القسم</p>
                <p className="font-black text-slate-900">{studentClass.section || 'غير محدد'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Help Card */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-xl p-6 text-white">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-white/20 flex-shrink-0">
              <ChevronLeft size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black mb-2">كيف يتم إضافة المكتبات؟</h3>
              <p className="text-sm font-bold text-blue-100 leading-relaxed">
                يجب على المعلم أو المسؤول إضافة المكتبات المفقودة من لوحة التحكم.
                يمكنك التواصل معهم وإبلاغهم بالمكتبات المطلوبة.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MissingLibrariesPage;
