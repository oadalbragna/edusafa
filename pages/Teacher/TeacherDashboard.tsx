import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  CheckSquare,
  FileText,
  Clock,
  PlusCircle,
  Users,
  LayoutGrid,
  Video,
  FileCheck,
  Calendar,
  ChevronLeft,
  Loader2,
  Trash2,
  ExternalLink,
  Folder,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Search,
  Layout,
  Trophy,
  Phone,
  Mail,
  UploadCloud,
  Megaphone,
  Send,
  ShieldCheck,
  Link as LinkIcon,
  Image as ImageIcon,
  LifeBuoy
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db, storage } from '../../services/firebase';
import { ref, get, push, set, remove, onValue } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { SYS, EDU, COMM } from '../../constants/dbPaths';
import Modal from '../../components/common/Modal';
import { logActivity } from '../../utils/activityLogger';
import type { SliderItem } from '../../types';

interface AssignedSubject {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  level: string;
  grade: string;
  isGlobal?: boolean;
}

const TeacherDashboard: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [assignedSubjects, setAssignedSubjects] = useState<AssignedSubject[]>([]);
  const [globalSubjects, setGlobalSubjects] = useState<AssignedSubject[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<AssignedSubject | null>(null);
  const [activeTab, setActiveTab] = useState<'lectures' | 'summaries' | 'exams' | 'schedule' | 'attendance' | 'assignments' | 'grades' | 'students' | 'announcements' | 'live' | 'my_requests'>('lectures');
  const [materials, setMaterials] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [uploadModal, setUploadModal] = useState(false);
  const [postModal, setPostModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [academicSettings, setAcademicSettings] = useState<any>(null);

  const [slides, setSlides] = useState<SliderItem[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);

  // Announcements & Live State
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [liveLink, setLiveLink] = useState<string>('');
  const [newPost, setNewPost] = useState({ title: '', content: '', url: '' });

  useEffect(() => {
    // Fetch Academic Settings for Visibility Control
    const acadRef = ref(db, 'edu/academic_settings');
    onValue(acadRef, (snap) => {
      if (snap.exists()) setAcademicSettings(snap.val());
    });
  }, []);

  useEffect(() => {
    // 1. Fetch Slider
    const sliderRef = ref(db, 'sys/system/slider');
    const unsubSlider = onValue(sliderRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = Object.values(snapshot.val()) as SliderItem[];
        setSlides(data.filter(s => {
          if (!s.active) return false;
          if (s.assignedTo === 'all' || !s.assignedTo) return true;
          const teacherClassIds = assignedSubjects.map(sub => sub.classId);
          return Array.isArray(s.assignedTo) && s.assignedTo.some(id => teacherClassIds.includes(id));
        }).sort((a, b) => a.order - b.order));
      }
    });
    return () => unsubSlider();
  }, [assignedSubjects]);

  useEffect(() => {
    // Fetch Announcements for Teacher (including hidden/teachers_only)
    const annRef = ref(db, 'sys/announcements');
    onValue(annRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = Object.values(snapshot.val()) as any[];
        setAnnouncements(data.filter((a: any) => {
           // Teachers can see everything except specifically targeted to other levels/classes they don't teach
           const matchesTarget = a.target === 'all' || a.target === 'teachers' || assignedSubjects.some(s => s.classId === a.target || s.level === a.target);
           return matchesTarget;
        }).reverse());
      }
    });
  }, [assignedSubjects]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides]);

  // Attendance State
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState<{ [key: string]: string }>({});

  // Assignments State
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);

  // Teacher Branding State
  const [brandingModal, setBrandingModal] = useState(false);
  const [brandingData, setBrandingData] = useState({
    welcomeMessage: '',
    newsTicker: '',
    subjectSlides: [] as any[]
  });

  useEffect(() => {
    if (selectedSubject && !selectedSubject.isGlobal) {
      const brandingRef = ref(db, `sys/system/settings/branding/${selectedSubject.classId}/${selectedSubject.subjectId}`);
      onValue(brandingRef, (snap) => {
        if (snap.exists()) setBrandingData(snap.val());
        else setBrandingData({ welcomeMessage: '', newsTicker: '', subjectSlides: [] });
      });
    }
  }, [selectedSubject]);

  const saveBranding = async () => {
    if (!selectedSubject) return;
    setUploading(true);
    try {
      await set(ref(db, `sys/system/settings/branding/${selectedSubject.classId}/${selectedSubject.subjectId}`), brandingData);
      alert('تم حفظ إعدادات الواجهة بنجاح');
      setBrandingModal(false);
    } catch (error) {
      console.error("Error saving branding:", error);
      alert('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setUploading(false);
    }
  };

  const addSubjectSlide = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSubject) return;
    setUploading(true);
    try {
      const fRef = storageRef(storage, `EduSafa_Learning/subject_slides/${selectedSubject.classId}/${selectedSubject.subjectId}/${Date.now()}_${file.name}`);
      const res = await uploadBytes(fRef, file);
      const url = await getDownloadURL(res.ref);
      setBrandingData(prev => ({
        ...prev,
        subjectSlides: [...prev.subjectSlides || [], { id: Date.now().toString(), imageUrl: url, active: true }]
      }));
      setUploading(false);
    }
  };

  // ... (keep submissions effect)
  useEffect(() => {
    if (activeTab === 'assignments' && selectedAssignment) {
      const subRef = ref(db, `edu/submissions/${selectedAssignment.id}`);
      onValue(subRef, (snapshot) => {
        if (snapshot.exists()) {
          setSubmissions(Object.values(snapshot.val()));
        } else {
          setSubmissions([]);
        }
      });
    }
  }, [activeTab, selectedAssignment]);

  // Grades State
  const [grades, setGrades] = useState<{ [key: string]: { [key: string]: string } }>({});
  
  // File Explorer State
  const [expandedNodes, setExpandedNodes] = useState<string[]>(['root']);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => 
      prev.includes(nodeId) ? prev.filter(id => id !== nodeId) : [...prev, nodeId]
    );
  };

  const [newMaterial, setNewMaterial] = useState({ title: '', link: '', type: 'video' });

  useEffect(() => {
    const fetchAssignedData = async () => {
      if (!profile?.uid) return;
      try {
        const classesRef = ref(db, 'edu/sch/classes');
        const snapshot = await get(classesRef);
        if (snapshot.exists()) {
          const classesData = snapshot.val();
          
          // 1. Fetch Approved Class Requests for this teacher
          const requestsRef = ref(db, 'sys/config/teacher_class_requests');
          const reqSnap = await get(requestsRef);
          const approvedClassIds = new Set<string>();
          
          if (reqSnap.exists()) {
            Object.values(reqSnap.val()).forEach((r: any) => {
              if (r.teacherId === profile.uid && r.status === 'approved') {
                approvedClassIds.add(r.classId);
              }
            });
          }

          const assigned: AssignedSubject[] = [];
          // Traverse hierarchical structure: level -> grade
          Object.keys(classesData).forEach(level => {
            Object.keys(classesData[level]).forEach(grade => {
              const cls = classesData[level][grade];
              const classId = grade; // grade is the new ID

              // Check if class is approved for this teacher
              const isApproved = approvedClassIds.has(classId);
              if (!isApproved) return;

              if (profile.blockedClasses?.includes(classId)) return;

              Object.values(cls.subjects || {}).forEach((sub: any) => {
                if (profile.blockedSubjects?.includes(sub.id || sub.name)) return;

                if (sub.teacherId === profile.uid) {
                  assigned.push({
                    ...sub,
                    classId: classId,
                    className: cls.name,
                    level: level,
                    grade: grade
                  });
                }
              });
            });
          });
                  // Restructured loops for stability
                  for (const level of Object.keys(data)) {
                    for (const grade of Object.keys(data[level])) {
                      const cls = data[level][grade];
                      if (cls.subjects) {
                        for (const sub of cls.subjects) {
                          if (sub.teacherId === user.uid) {
                            assigned.push({
                              classId: grade,
                              className: cls.name,
                              subjectId: sub.id || sub.name,
                              subjectName: sub.name,
                              level: level,
                              grade: grade
                            });
                          }
                        }
                      }
                    }
                  }
                  setAssignedSubjects(assigned);

        // Fetch Global Subjects
        const gsRef = ref(db, 'edu/courses');
        const gsSnap = await get(gsRef);
        if (gsSnap.exists()) {
          const gsData = Object.values(gsSnap.val());
          // Filter global subjects by levels the teacher is already assigned to
          const teacherLevels = new Set(assigned.map(s => s.level));
          const filteredGS = gsData.filter((s: any) => teacherLevels.has(s.level)).map((s: any) => ({
            classId: 'global',
            className: 'مصادر عامة',
            subjectId: s.id,
            subjectName: s.name,
            level: s.level,
            grade: 'عام',
            isGlobal: true
          }));
          setGlobalSubjects(filteredGS);
        }

        // Fetch My Requests
        const reqsRef = ref(db, 'sys/config/teacher_class_requests');
        const requestsSnapshot = await get(reqsRef);
        if (requestsSnapshot.exists()) {
          const allReqs = Object.values(requestsSnapshot.val());
          const filteredReqs = allReqs.filter((r: any) => r.teacherId === profile.uid).map((r: any) => {
            const cls = classesData[r.classId];
            return { ...r, className: cls?.name || 'فصل غير معروف', level: cls?.level, grade: cls?.grade };
          });
          setMyRequests(filteredReqs);
        }
        setLoading(false);
      }
      };

      fetchAssignedData();
      };
      init();
      }, [profile]);
  useEffect(() => {
    const fetchMaterials = async () => {
      if (!selectedSubject) return;
      const path = selectedSubject.isGlobal 
        ? `edu/sch/materials/global/${selectedSubject.subjectId}/${activeTab}`
        : `edu/sch/materials/${selectedSubject.classId}/${selectedSubject.subjectId}/${activeTab}`;
      
      const snapshot = await get(ref(db, path));
      if (snapshot.exists()) {
        setMaterials(Object.entries(snapshot.val()).map(([id, val]: any) => ({ id, ...val })));
      } else {
        setMaterials([]);
      }
    };

    const fetchSubjectData = async () => {
      if (!selectedSubject || selectedSubject.isGlobal) return;

      // 1. Fetch Class Students
      const usersRef = ref(db, 'sys/users');
      const usersSnap = await get(usersRef);
      if (usersSnap.exists()) {
        const classStudents = Object.values(usersSnap.val()).filter((u: any) => 
          u.role === 'student' && u.classId === selectedSubject.classId
        );
        setStudents(classStudents);
      }

      // 2. Fetch Attendance for current date
      const attendanceRef = ref(db, `edu/attendance/${selectedSubject.classId}/${attendanceDate}`);
      const attendSnap = await get(attendanceRef);
      if (attendSnap.exists()) setAttendanceData(attendSnap.val());
      else setAttendanceData({});

      // 3. Fetch Assignments
      const assignRef = ref(db, `edu/assignments/${selectedSubject.classId}/${selectedSubject.subjectId}`);
      const assignSnap = await get(assignRef);
      if (assignSnap.exists()) setAssignments(Object.entries(assignSnap.val()).map(([id, val]: any) => ({ id, ...val })));
      else setAssignments([]);

      // 4. Fetch Grades
      const gradesRef = ref(db, `edu/grades/${selectedSubject.classId}/${selectedSubject.subjectId}`);
      const gradesSnap = await get(gradesRef);
      if (gradesSnap.exists()) setGrades(gradesSnap.val());
      else setGrades({});

      // 5. Fetch Subject Announcements
      const annRef = ref(db, `sys/announcements_subject/${selectedSubject.classId}/${selectedSubject.subjectId}`);
      const annSnap = await get(annRef);
      if (annSnap.exists()) setAnnouncements(Object.entries(annSnap.val()).map(([id, val]: any) => ({ id, ...val })));
      else setAnnouncements([]);

      // 6. Fetch Live Link
      const liveRef = ref(db, `edu/live_links/${selectedSubject.classId}/${selectedSubject.subjectId}`);
      const liveSnap = await get(liveRef);
      if (liveSnap.exists()) setLiveLink(liveSnap.val()?.url || '');
      else setLiveLink('');
    };

    if (['lectures', 'summaries', 'exams', 'schedule'].includes(activeTab)) {
      fetchMaterials();
    } else {
      fetchSubjectData();
    }
  }, [selectedSubject, activeTab, attendanceDate]);

  const handleSubjectPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject) return;
    
    setUploading(true);
    try {
      if (activeTab === 'announcements') {
        const annRef = push(ref(db, `sys/announcements_subject/${selectedSubject.classId}/${selectedSubject.subjectId}`));
        await set(annRef, {
          title: newPost.title,
          content: newPost.content,
          id: annRef.key,
          createdAt: new Date().toISOString()
        });
        
        // Refresh announcements
        const snap = await get(ref(db, `sys/announcements_subject/${selectedSubject.classId}/${selectedSubject.subjectId}`));
        if (snap.exists()) setAnnouncements(Object.entries(snap.val()).map(([id, val]: any) => ({ id, ...val })));
      } else if (activeTab === 'live') {
        await set(ref(db, `edu/live_links/${selectedSubject.classId}/${selectedSubject.subjectId}`), {
          url: newPost.url,
          updatedAt: new Date().toISOString()
        });
        setLiveLink(newPost.url);
      }

      // Log Activity
      if (profile) {
        await logActivity({
          type: activeTab === 'announcements' ? 'subject_announcement' : 'live_link_updated',
          userId: profile.uid,
          userName: profile.fullName || profile.firstName || 'معلم',
          details: `قام بـ ${activeTab === 'announcements' ? 'إرسال إعلان للطلاب' : 'تحديث رابط البث المباشر'} لمادة ${selectedSubject.subjectName}`,
          targetId: selectedSubject.subjectId,
          targetName: selectedSubject.subjectName
        });
      }

      setPostModal(false);
      setNewPost({ title: '', content: '', url: '' });
      setUploading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject || !selectedFile) return;
    
    setUploading(true);
    try {
      // 1. Upload to Storage
      const fileRef = storageRef(storage, `EduSafa_Learning/materials/${selectedSubject.classId}/${selectedSubject.subjectId}/${Date.now()}_${selectedFile.name}`);
      const uploadResult = await uploadBytes(fileRef, selectedFile);
      const downloadURL = await getDownloadURL(uploadResult.ref);

      // 2. Determine path
      let path = '';
      if (['lectures', 'summaries', 'exams', 'schedule'].includes(activeTab)) {
        path = `edu/sch/materials/${selectedSubject.classId}/${selectedSubject.subjectId}/${activeTab}`;
      } else if (activeTab === 'assignments') {
        path = `edu/assignments/${selectedSubject.classId}/${selectedSubject.subjectId}`;
      }

      if (path) {
        const materialRef = push(ref(db, path));
        await set(materialRef, {
          title: newMaterial.title,
          link: downloadURL,
          id: materialRef.key,
          createdAt: new Date().toISOString()
        });

              // Log Activity
              if (profile) {
                await logActivity({
                  type: activeTab === 'assignments' ? 'assignment_added' : 'material_uploaded',
                  userId: profile.uid,
                  userName: profile.fullName || profile.firstName || 'معلم',
                  details: `قام برفع ${activeTab === 'assignments' ? 'واجب' : 'مادة'} جديدة: ${newMaterial.title} لمادة ${selectedSubject.subjectName}`,
                  targetId: selectedSubject.subjectId,
                  targetName: selectedSubject.subjectName
                });
              }
        setUploadModal(false);
        setSelectedFile(null);
        setNewMaterial({ title: '', link: '', type: 'video' });
        
        // Refresh
        const snapshot = await get(ref(db, path));
        if (snapshot.exists()) {
          const data = Object.entries(snapshot.val()).map(([id, val]: any) => ({ id, ...val }));
          if (activeTab === 'assignments') setAssignments(data);
          else setMaterials(data);
        }
      }
      setUploading(false);
    }
  };

  const updateSubmissionGrade = async (assignmentId: string, submissionId: string, grade: string) => {
    try {
      await set(ref(db, `edu/submissions/${assignmentId}/${submissionId}/grade`), grade);
      setSubmissions(prev => prev.map(s => s.id === submissionId ? { ...s, grade } : s));
  };

  const deleteMaterial = async (id: string) => {
    if (!selectedSubject) return;
    if (!window.confirm('هل أنت متأكد من حذف هذه المادة؟')) return;
    
    let path = '';
    if (['lectures', 'summaries', 'exams', 'schedule'].includes(activeTab)) {
      path = `edu/sch/materials/${selectedSubject.classId}/${selectedSubject.subjectId}/${activeTab}/${id}`;
    } else if (activeTab === 'assignments') {
      path = `edu/assignments/${selectedSubject.classId}/${selectedSubject.subjectId}/${id}`;
    }
    
    if (path) {
      await remove(ref(db, path));
      if (activeTab === 'assignments') setAssignments(assignments.filter(m => m.id !== id));
      else setMaterials(materials.filter(m => m.id !== id));
    }
  };

  // Grouping logic for File Explorer
  const hierarchy: any = {};
  [...assignedSubjects, ...globalSubjects].forEach(sub => {
    const levelKey = sub.level === 'primary' ? 'المرحلة الابتدائية' : 'المرحلة المتوسطة';
    if (!hierarchy[levelKey]) hierarchy[levelKey] = {};
    
    const gradeKey = sub.isGlobal ? 'مصادر إثرائية عامة' : `الصف ${sub.grade}`;
    if (!hierarchy[levelKey][gradeKey]) hierarchy[levelKey][gradeKey] = {};
    
    const classKey = sub.className;
    if (!hierarchy[levelKey][gradeKey][classKey]) hierarchy[levelKey][gradeKey][classKey] = [];
    
    hierarchy[levelKey][gradeKey][classKey].push(sub);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (selectedSubject) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-left-4" dir="rtl">
        <button 
          onClick={() => setSelectedSubject(null)}
          className="flex items-center gap-2 text-gray-500 hover:text-blue-600 font-bold transition-colors"
        >
          <ChevronLeft className="w-5 h-5 rotate-180" />
          العودة للمتصفح
        </button>

        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-gray-900">{selectedSubject.subjectName}</h1>
            <p className="text-slate-600 font-bold">
              {selectedSubject.className} • {selectedSubject.level === 'primary' ? 'ابتدائي' : 'متوسط'} • الصف {selectedSubject.grade}
            </p>
          </div>
          <div className="flex gap-3">
            {(!profile?.permissions?.readOnly && profile?.permissions?.uploadEditDelete !== false) && (
              <>
                <button 
                  onClick={() => setBrandingModal(true)}
                  className="bg-amber-500 text-white px-6 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-amber-600 shadow-lg shadow-amber-100 active:scale-95 transition-all"
                >
                  <LayoutGrid size={20} />
                  تخصيص الواجهة
                </button>
                <button 
                  onClick={() => setUploadModal(true)}
                  className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-95 transition-all"
                >
                  <PlusCircle className="w-5 h-5" />
                  إضافة {activeTab === 'lectures' ? 'محاضرة' : activeTab === 'summaries' ? 'ملخص' : activeTab === 'exams' ? 'اختبار' : 'جدول'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-white p-2 rounded-2xl border border-gray-100 gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
          {[
            { id: 'lectures', label: 'المحاضرات', icon: Video },
            { id: 'summaries', label: 'الملخصات', icon: FileText },
            { id: 'exams', label: 'الاختبارات', icon: FileCheck },
            { id: 'schedule', label: 'الجدول الدراسي', icon: Calendar },
            { id: 'attendance', label: 'رصد الغياب', icon: CheckSquare },
            { id: 'assignments', label: 'الواجبات', icon: FileText },
            { id: 'announcements', label: 'إعلانات المادة', icon: Megaphone },
            { id: 'live', label: 'البث المباشر', icon: Video },
            { id: 'grades', label: 'الدرجات', icon: Trophy },
            { id: 'students', label: 'قائمة الطلاب', icon: Users },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 min-w-[120px] py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                activeTab === tab.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dynamic Section Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {['lectures', 'summaries', 'exams', 'schedule'].includes(activeTab) && (
            <>
              {materials.length === 0 ? (
                <div className="col-span-full py-20 text-center space-y-4 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
                  <LayoutGrid className="w-16 h-16 mx-auto text-gray-300" />
                  <p className="text-gray-500 font-bold text-lg">لا توجد مواد مرفوعة حالياً</p>
                </div>
              ) : (
                materials.map((item) => (
                  <div key={item.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 group relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-4 rounded-2xl ${activeTab === 'lectures' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                        {activeTab === 'lectures' ? <Video className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                      </div>
                      {(!profile?.permissions?.readOnly && profile?.permissions?.uploadEditDelete !== false) && (
                        <button onClick={() => deleteMaterial(item.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">{item.title}</h3>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                      <span className="text-xs text-gray-400 font-medium">{new Date(item.createdAt).toLocaleDateString('ar-SA')}</span>
                      <a href={item.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:underline">
                        فتح <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === 'announcements' && (
            <div className="col-span-full space-y-6 animate-in slide-in-from-bottom-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-black text-gray-800">إعلانات وتنبيهات المادة</h3>
                {profile?.permissions?.announcements !== false && (
                  <button 
                    onClick={() => { setNewPost({ title: '', content: '', url: '' }); setPostModal(true); }}
                    className="bg-orange-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-orange-700 shadow-lg"
                  >
                    <PlusCircle className="w-5 h-5" /> إضافة إعلان
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {announcements.length === 0 ? (
                  <div className="col-span-full py-12 text-center bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
                    <Megaphone className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-400 font-bold">لا توجد إعلانات منشورة للطلاب</p>
                  </div>
                ) : (
                  announcements.map((ann) => (
                    <div key={ann.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-1.5 h-full bg-orange-500"></div>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-lg font-black text-gray-800">{ann.title}</h4>
                        {profile?.permissions?.announcements !== false && (
                          <button onClick={async () => {
                            if (window.confirm('هل أنت متأكد من حذف هذا الإعلان؟')) {
                              await remove(ref(db, `sys/announcements_subject/${selectedSubject.classId}/${selectedSubject.subjectId}/${ann.id}`));
                              setAnnouncements(announcements.filter(a => a.id !== ann.id));
                            }
                          }} className="text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm mb-4 leading-relaxed whitespace-pre-wrap">{ann.content}</p>
                      <div className="pt-4 border-t border-gray-50 text-[10px] text-gray-400 font-bold">
                        {new Date(ann.createdAt).toLocaleDateString('ar-SA')}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'live' && (
            <div className="col-span-full bg-white p-12 rounded-[3rem] border border-gray-100 shadow-sm text-center space-y-8 animate-in zoom-in-95">
              <div className="w-24 h-24 bg-red-50 text-red-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner">
                <Video size={48} />
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-black text-gray-900">غرفة البث المباشر</h3>
                <p className="text-gray-500 font-medium italic">أضف رابط الدرس الافتراضي (Zoom / Meet) ليتمكن الطلاب من الحضور</p>
              </div>
              
              {liveLink ? (
                <div className="max-w-md mx-auto p-8 bg-gray-50 rounded-[2.5rem] border border-dashed border-gray-200">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">الرابط الحالي والنشط</p>
                  <a href={liveLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-black break-all block mb-6 hover:underline text-lg">{liveLink}</a>
                  {(!profile?.permissions?.readOnly && profile?.permissions?.uploadEditDelete !== false) && (
                    <div className="flex gap-3">
                      <button onClick={() => { setNewPost({ title: '', content: '', url: liveLink }); setPostModal(true); }} className="flex-1 py-4 bg-white border border-gray-200 rounded-2xl font-black text-gray-700 hover:bg-gray-100 shadow-sm">تحديث الرابط</button>
                      <button onClick={async () => {
                         if (window.confirm('هل تريد إزالة رابط البث؟')) {
                           await remove(ref(db, `edu/live_links/${selectedSubject.classId}/${selectedSubject.subjectId}`));
                           setLiveLink('');
                         }
                      }} className="px-6 py-4 bg-red-50 text-red-600 rounded-2xl font-black hover:bg-red-100 transition-colors">إزالة</button>
                    </div>
                  )}
                </div>
              ) : (
                (!profile?.permissions?.readOnly && profile?.permissions?.uploadEditDelete !== false) ? (
                  <button 
                    onClick={() => { setNewPost({ title: '', content: '', url: '' }); setPostModal(true); }}
                    className="bg-blue-600 text-white px-10 py-5 rounded-[2rem] font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2 mx-auto"
                  >
                    <LinkIcon className="w-6 h-6" />
                    إعداد رابط الحصة الآن
                  </button>
                ) : (
                  <p className="text-red-500 font-bold">لا تملك صلاحية إضافة رابط البث</p>
                )
              )}
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="col-span-full bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm animate-in slide-in-from-bottom-4" dir="rtl">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-gray-800">رصد غياب اليوم</h3>
                <input 
                  type="date" 
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="space-y-3">
                {students.map((student) => (
                  <div key={student.uid} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-blue-100 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">{student.firstName?.[0]}</div>
                      <span className="font-bold text-gray-700">{student.firstName} {student.lastName}</span>
                    </div>
                    <div className="flex bg-white p-1 rounded-xl border border-gray-200">
                      {[
                        { id: 'present', label: 'حاضر', color: 'bg-green-500' },
                        { id: 'absent', label: 'غائب', color: 'bg-red-500' },
                        { id: 'late', label: 'متأخر', color: 'bg-orange-500' }
                      ].map((status) => (
                        <button
                          key={status.id}
                          onClick={async () => {
                            const newAttend = { ...attendanceData, [student.uid]: status.id };
                            setAttendanceData(newAttend);
                            await set(ref(db, `edu/attendance/${selectedSubject.classId}/${attendanceDate}/${student.uid}`), status.id);
                          }}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            attendanceData[student.uid] === status.id 
                            ? `${status.color} text-white shadow-md` 
                            : 'text-gray-400 hover:text-gray-600'
                          }`}
                        >
                          {status.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'students' && (
            <div className="col-span-full bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm animate-in slide-in-from-bottom-4">
              <h3 className="text-2xl font-black text-gray-800 mb-8">قائمة الطلاب ({students.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {students.map((student) => (
                  <div key={student.uid} className="p-6 bg-gray-50 rounded-[2.5rem] border border-transparent hover:border-blue-100 hover:bg-white hover:shadow-xl transition-all group">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-black text-xl">{student.firstName?.[0]}</div>
                      <div>
                        <h4 className="font-black text-gray-800">{student.firstName} {student.lastName}</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">طالب {student.eduLevel === 'primary' ? 'ابتدائي' : 'متوسط'}</p>
                      </div>
                    </div>
                    <div className="space-y-2 border-t border-gray-100 pt-4">
                      <div className="flex items-center gap-2 text-xs text-gray-500 font-bold">
                        <Phone className="w-3.5 h-3.5 text-gray-300" /> {student.phone || 'غير مسجل'}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 font-bold">
                        <Mail className="w-3.5 h-3.5 text-gray-300" /> {student.email}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'assignments' && (
            <div className="col-span-full space-y-6 animate-in slide-in-from-bottom-4">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-gray-800">الواجبات المنزلية</h3>
                {(!profile?.permissions?.readOnly && profile?.permissions?.uploadEditDelete !== false) && (
                  <button 
                    onClick={() => setUploadModal(true)}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg"
                  >
                    <PlusCircle className="w-5 h-5" /> إضافة واجب
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assignments.map((item) => (
                  <div key={item.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm group">
                    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl w-fit mb-4">
                      <FileText className="w-6 h-6" />
                    </div>
                    <h4 className="text-lg font-black text-gray-800 mb-2">{item.title}</h4>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                      <span className="text-[10px] text-gray-400 font-bold">{new Date(item.createdAt).toLocaleDateString('ar-SA')}</span>
                      <div className="flex items-center gap-2">
                         <button 
                           onClick={() => setSelectedAssignment(item)}
                           className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg font-bold text-[10px] hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                         >
                           <Users size={12} />
                           التسليمات
                         </button>
                         {(!profile?.permissions?.readOnly && profile?.permissions?.uploadEditDelete !== false) && (
                           <button onClick={() => deleteMaterial(item.id)} className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                             <Trash2 className="w-4 h-4" />
                           </button>
                         )}
                         <a href={item.link} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-lg transition-colors">
                           <ExternalLink size={16} />
                         </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submissions Modal */}
          <Modal 
            isOpen={!!selectedAssignment} 
            onClose={() => setSelectedAssignment(null)} 
            title={`تسليمات الطلاب: ${selectedAssignment?.title}`}
          >
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2" dir="rtl">
              {submissions.length === 0 ? (
                <div className="py-12 text-center text-slate-400 italic">
                   لا توجد تسليمات لهذا الواجب حتى الآن
                </div>
              ) : (
                submissions.map((sub: any) => (
                  <div key={sub.id} className="p-5 bg-slate-50 rounded-3xl border border-transparent hover:border-blue-100 hover:bg-white hover:shadow-xl transition-all flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-blue-600 shadow-sm border border-slate-100">
                        {sub.studentName?.[0] || 'ط'}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-base">{sub.studentName}</p>
                        <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                           <Clock size={10} />
                           {new Date(sub.submittedAt).toLocaleString('ar-SA')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center">
                        <input 
                          type="number" 
                          placeholder="الدرجة"
                          className="w-16 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-center font-bold text-blue-600 outline-none focus:ring-2 focus:ring-blue-500/20"
                          value={sub.grade || ''}
                          onChange={(e) => updateSubmissionGrade(selectedAssignment.id, sub.id, e.target.value)}
                        />
                        <span className="text-[8px] font-black text-slate-300 mt-1 uppercase">الدرجة</span>
                      </div>
                      <a 
                        href={sub.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
                      >
                        <ExternalLink size={20} />
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Modal>

          {activeTab === 'grades' && (
            <div className="col-span-full bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm animate-in slide-in-from-bottom-4">
              <h3 className="text-2xl font-black text-gray-800 mb-8">رصد درجات الطلاب</h3>
              <div className="space-y-3">
                {students.map((student) => (
                  <div key={student.uid} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">{student.firstName?.[0]}</div>
                      <span className="font-bold text-gray-700">{student.firstName} {student.lastName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input 
                        type="number" 
                        placeholder="الدرجة"
                        className="w-20 px-3 py-2 bg-white border border-gray-200 rounded-xl text-center font-bold text-blue-600 outline-none focus:ring-2 focus:ring-blue-500/20"
                        value={grades[student.uid]?.score || ''}
                        onChange={async (e) => {
                          const score = e.target.value;
                          setGrades(prev => ({ ...prev, [student.uid]: { ...prev[student.uid], score } }));
                          await set(ref(db, `edu/grades/${selectedSubject.classId}/${selectedSubject.subjectId}/${student.uid}/score`), score);
                        }}
                      />
                      <span className="text-gray-400 font-bold text-sm">/ ١٠٠</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <Modal isOpen={brandingModal} onClose={() => setBrandingModal(false)} title="تخصيص واجهة المادة">
          <div className="space-y-6" dir="rtl">
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-700">الرسالة الترحيبية للطلاب</label>
              <textarea 
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none font-bold resize-none"
                rows={2}
                placeholder="أهلاً بكم في مقرر... نتمنى لكم رحلة ممتعة"
                value={brandingData.welcomeMessage}
                onChange={e => setBrandingData({...brandingData, welcomeMessage: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-700 flex items-center gap-2">
                <Megaphone size={16} className="text-orange-500" /> شريط الأخبار المتحرك (عاجل)
              </label>
              <input 
                type="text"
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none font-bold"
                placeholder="تنبيه: تم تأجيل موعد الاختبار إلى..."
                value={brandingData.newsTicker}
                onChange={e => setBrandingData({...brandingData, newsTicker: e.target.value})}
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-black text-slate-700">صور السلايدر الخاصة بالمادة</label>
              <div className="grid grid-cols-2 gap-3">
                {brandingData.subjectSlides?.map((slide, idx) => (
                  <div key={slide.id} className="relative group rounded-xl overflow-hidden border aspect-video">
                    <img src={slide.imageUrl} className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setBrandingData({
                        ...brandingData, 
                        subjectSlides: brandingData.subjectSlides.filter((_, i) => i !== idx)
                      })}
                      className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                <label className="border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-all aspect-video">
                  <input type="file" className="hidden" accept="image/*" onChange={addSubjectSlide} />
                  <UploadCloud size={24} className="text-gray-300" />
                  <span className="text-[10px] font-bold text-gray-400 mt-1">رفع صورة</span>
                </label>
              </div>
            </div>

            <button 
              onClick={saveBranding}
              disabled={uploading}
              className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black shadow-lg hover:bg-amber-600 transition-all"
            >
              {uploading ? <Loader2 className="animate-spin mx-auto" /> : 'حفظ إعدادات الواجهة'}
            </button>
          </div>
        </Modal>

        <Modal isOpen={uploadModal} onClose={() => setUploadModal(false)} title={`إضافة ${activeTab === 'lectures' ? 'محاضرة' : 'مادة'}`}>
          <form onSubmit={handleUpload} className="space-y-6" dir="rtl">
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-700">عنوان الملف</label>
              <input 
                type="text" 
                required 
                className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none font-bold" 
                placeholder="مثال: شرح درس الجاذبية" 
                value={newMaterial.title} 
                onChange={(e) => setNewMaterial({...newMaterial, title: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-700">اختيار الملف</label>
              <div className="relative group">
                <input 
                  type="file" 
                  required
                  className="hidden"
                  id="teacher-upload-file"
                  onChange={(e) => e.target.files?.[0] && setSelectedFile(e.target.files[0])}
                />
                <label 
                  htmlFor="teacher-upload-file"
                  className={`flex flex-col items-center justify-center w-full py-10 border-2 border-dashed rounded-[2rem] cursor-pointer transition-all ${
                    selectedFile ? 'border-green-400 bg-green-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-blue-400'
                  }`}
                >
                  {selectedFile ? (
                    <>
                      <FileCheck className="text-green-500 mb-2" size={32} />
                      <span className="text-xs font-black text-green-700">{selectedFile.name}</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="text-blue-600 mb-2" size={32} />
                      <span className="text-sm font-black text-slate-700">اضغط لرفع الملف من جهازك</span>
                    </>
                  )}
                </label>
              </div>
            </div>
            <button 
              type="submit" 
              disabled={uploading}
              className={`w-full py-4 rounded-2xl font-black shadow-lg transition-all flex items-center justify-center gap-3 ${
                uploading ? 'bg-slate-100 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {uploading ? <Loader2 className="animate-spin" size={24} /> : <FileCheck size={24} />}
              <span>{uploading ? 'جاري الرفع...' : 'تأكيد الرفع والمشاركة مع الطلاب'}</span>
            </button>
          </form>
        </Modal>

        <Modal isOpen={postModal} onClose={() => setPostModal(false)} title={activeTab === 'announcements' ? 'إعلان جديد للطلاب' : 'إعداد رابط البث'}>
          <form onSubmit={handleSubjectPost} className="space-y-6" dir="rtl">
            {activeTab === 'announcements' ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700">عنوان الإعلان</label>
                  <input 
                    type="text" required
                    className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none font-bold text-gray-800" 
                    placeholder="مثال: تنبيه هام بخصوص موعد الاختبار" 
                    value={newPost.title} 
                    onChange={(e) => setNewPost({...newPost, title: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700">محتوى الإعلان</label>
                  <textarea 
                    required rows={5}
                    className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none font-bold text-gray-800 resize-none leading-relaxed" 
                    placeholder="اكتب تفاصيل الرسالة هنا..." 
                    value={newPost.content} 
                    onChange={(e) => setNewPost({...newPost, content: e.target.value})} 
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700">رابط الحصة (Zoom / Google Meet)</label>
                <div className="relative group">
                  <LinkIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                  <input 
                    type="url" required
                    className="w-full pr-12 pl-4 py-5 bg-gray-50 border border-gray-200 rounded-2xl outline-none font-black text-blue-600 placeholder:text-gray-400 focus:ring-4 focus:ring-blue-500/10" 
                    placeholder="https://zoom.us/j/..." 
                    value={newPost.url} 
                    onChange={(e) => setNewPost({...newPost, url: e.target.value})} 
                  />
                </div>
                <p className="text-[10px] text-gray-400 font-bold pr-2 italic">تأكد من كتابة الرابط بشكل كامل يبدأ بـ https://</p>
              </div>
            )}
            <button 
              type="submit" 
              disabled={uploading}
              className={`w-full py-5 rounded-2xl font-black shadow-xl transition-all flex items-center justify-center gap-3 ${
                uploading ? 'bg-slate-100 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-blue-200'
              }`}
            >
              {uploading ? <Loader2 className="animate-spin" size={24} /> : <Send size={24} className="rotate-180" />}
              <span>{activeTab === 'announcements' ? 'نشر الإعلان الآن' : 'حفظ ونشر الرابط للطلاب'}</span>
            </button>
          </form>
        </Modal>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in h-full flex flex-col pb-10" dir="rtl">
      {/* Slider Section */}
      {slides.length > 0 && (
        <div className="relative h-48 md:h-64 w-full overflow-hidden rounded-[2.5rem] shadow-xl group mb-4">
          {slides.map((slide, index) => (
            <div 
              key={slide.id}
              className={`absolute inset-0 transition-all duration-1000 transform ${
                index === activeSlide ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
              }`}
            >
              <img src={slide.imageUrl} alt={slide.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-8 md:p-10">
                <h2 className="text-xl md:text-3xl font-black text-white mb-1">{slide.title}</h2>
                <p className="text-white/80 font-bold text-xs md:text-sm mb-4">{slide.subtitle}</p>
                {slide.targetLink && (
                  <button 
                    onClick={() => {
                      if (slide.linkType === 'external') window.open(slide.targetLink, '_blank');
                      else navigate(slide.targetLink);
                    }}
                    className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black text-xs hover:bg-blue-700 transition-all shadow-lg w-fit active:scale-95"
                  >
                    التفاصيل
                  </button>
                )}
              </div>
            </div>
          ))}
          {slides.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {slides.map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => setActiveSlide(i)}
                  className={`h-1.5 rounded-full transition-all ${i === activeSlide ? 'w-8 bg-blue-600' : 'w-2 bg-white/50'}`}
                ></button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-gray-900">متصفح الفصول الدراسية</h1>
          <p className="text-slate-600 font-bold italic">أهلاً أ. {profile?.firstName}، تصفح فصولك بشكل منظم</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="بحث في المواد..." 
            className="w-full pr-12 pl-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-[600px]">
        {/* Sidebar: Tree View */}
        <div className="lg:w-1/3 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6 overflow-y-auto">
          <div className="flex items-center gap-2 mb-6 text-gray-400 font-black text-xs uppercase tracking-widest px-2">
            <Layout className="w-4 h-4" />
            هيكل المنصة
          </div>
          
          <div className="space-y-2">
            <button 
              onClick={() => { setSelectedSubject(null); setActiveTab('my_requests'); }}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all mb-4 ${activeTab === 'my_requests' ? 'bg-amber-50 text-amber-600 shadow-sm border border-amber-100' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent'}`}
            >
              <ShieldCheck className="w-5 h-5" />
              <span className="font-black text-sm">طلبات الإشراف الخاصة بي</span>
              {myRequests.filter(r => r.status === 'pending').length > 0 && (
                <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full mr-auto animate-pulse">
                  {myRequests.filter(r => r.status === 'pending').length}
                </span>
              )}
            </button>

            {Object.keys(hierarchy).map((level) => (
              <div key={level} className="space-y-1">
                <button 
                  onClick={() => toggleNode(level)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${expandedNodes.includes(level) ? 'bg-blue-50 text-blue-600 shadow-sm' : 'hover:bg-gray-50 text-gray-700'}`}
                >
                  {expandedNodes.includes(level) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4 rotate-180" />}
                  {expandedNodes.includes(level) ? <FolderOpen className="w-5 h-5" /> : <Folder className="w-5 h-5" />}
                  <span className="font-black text-sm">{level}</span>
                </button>
                
                {expandedNodes.includes(level) && (
                  <div className="mr-6 border-r-2 border-blue-100/50 pr-4 space-y-1 mt-1">
                    {Object.keys(hierarchy[level]).map((grade) => (
                      <div key={grade} className="space-y-1">
                        <button 
                          onClick={() => toggleNode(`${level}-${grade}`)}
                          className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all ${expandedNodes.includes(`${level}-${grade}`) ? 'text-blue-500' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                          {expandedNodes.includes(`${level}-${grade}`) ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5 rotate-180" />}
                          <Folder className="w-4 h-4" />
                          <span className="font-bold text-xs">{grade}</span>
                        </button>

                        {expandedNodes.includes(`${level}-${grade}`) && (
                          <div className="mr-4 border-r-2 border-gray-100 pr-4 space-y-1 mt-1">
                            {Object.keys(hierarchy[level][grade]).map((clsName) => (
                              <div key={clsName} className="space-y-1">
                                <div className="p-2 text-xs font-black text-gray-400 flex items-center gap-2">
                                  <LayoutGrid className="w-3 h-3" />
                                  {clsName}
                                </div>
                                <div className="space-y-1">
                                  {hierarchy[level][grade][clsName].map((sub: AssignedSubject) => (
                                    <button 
                                      key={sub.subjectId}
                                      onClick={() => setSelectedSubject(sub)}
                                      className="w-full flex items-center justify-between p-3 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-md border border-transparent hover:border-blue-100 transition-all group"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                          <BookOpen className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm font-bold text-gray-700">{sub.subjectName}</span>
                                      </div>
                                      <ChevronLeft className="w-4 h-4 text-gray-300 group-hover:text-blue-600" />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {assignedSubjects.length === 0 && (
              <div className="text-center py-10">
                <p className="text-gray-400 text-sm font-bold">لا توجد فصول دراسية</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Preview Area */}
        <div className="lg:w-2/3 space-y-8 overflow-y-auto">
          {activeTab === 'my_requests' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4">
              <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
                <h2 className="text-2xl font-black text-slate-900 mb-2">سجل طلبات الإشراف</h2>
                <p className="text-slate-500 font-bold">تابع حالة طلباتك للانضمام للفصول الدراسية</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {myRequests.length === 0 ? (
                  <div className="bg-white p-20 rounded-[3rem] text-center border-2 border-dashed border-slate-200">
                    <ShieldCheck size={48} className="text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold">لم تقم بتقديم أي طلبات إشراف بعد.</p>
                  </div>
                ) : (
                  myRequests.map((req) => (
                    <div key={req.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 group hover:shadow-md transition-all">
                      <div className="flex items-center gap-4 text-right w-full md:w-auto">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${
                          req.status === 'approved' ? 'bg-green-50 text-green-600' :
                          req.status === 'rejected' ? 'bg-red-50 text-red-600' :
                          'bg-amber-50 text-amber-600'
                        }`}>
                          {req.className[0]}
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-lg">{req.className}</h4>
                          <p className="text-xs font-bold text-slate-400">
                            المرحلة {req.level === 'primary' ? 'الابتدائية' : 'المتوسطة'} • الصف {req.grade}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                        <div className="text-center md:text-left space-y-1">
                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                            req.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200' :
                            req.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                            'bg-amber-100 text-amber-700 border-amber-200'
                          }`}>
                            {req.status === 'approved' ? 'مقبول ✅' : req.status === 'rejected' ? 'مرفوض ❌' : 'قيد المراجعة ⏳'}
                          </span>
                          {req.status === 'rejected' && req.rejectionReason && (
                            <p className="text-[10px] text-red-500 font-bold max-w-xs italic">{req.rejectionReason}</p>
                          )}
                        </div>
                        {req.status === 'rejected' && (
                          <button className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[10px] shadow-lg hover:bg-blue-700 active:scale-95 transition-all">
                            تعديل وإعادة تقديم
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab !== 'my_requests' && (
            <>
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[3rem] text-white shadow-xl shadow-blue-200 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mt-16 blur-2xl"></div>
                <div className="relative z-10">
                  <h2 className="text-2xl font-black mb-2">إدارة سريعة ومنظمة</h2>
                  <p className="text-white font-bold leading-relaxed opacity-95">استخدم المتصفح الشجري على اليمين للانتقال بين المراحل والصفوف والفصول بسهولة تامة. اضغط على أي مادة للبدء في رفع المقررات والمحاضرات.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col items-center text-center space-y-4">
                  <div className="p-5 bg-green-50 text-green-600 rounded-[2rem]">
                    <Users className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-gray-500 font-bold mb-1">فصول الإشراف</h4>
                    <p className="text-3xl font-black text-gray-900">{Array.from(new Set(assignedSubjects.map(s => s.classId))).length}</p>
                  </div>
                  <p className="text-xs text-slate-400 font-bold">إجمالي المواد: {assignedSubjects.length}</p>
                </div>

                <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col items-center text-center space-y-4">
                  <div className="p-5 bg-purple-50 text-purple-600 rounded-[2rem]">
                    <FileCheck className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-gray-500 font-bold mb-1">حالة الإشراف</h4>
                    <p className="text-xl font-black text-purple-600">{profile?.permissions?.readOnly ? 'مشاهدة فقط' : 'إشراف كامل'}</p>
                  </div>
                  <p className="text-xs text-slate-400 font-bold">بإذن من الإدارة</p>
                </div>
              </div>
              
              {/* Quick Help Link */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button 
                  onClick={() => navigate('/support')}
                  className="p-8 bg-slate-900 text-white rounded-[3rem] shadow-xl hover:bg-black transition-all flex flex-col items-center text-center gap-4 group relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                  <div className="p-4 bg-white/10 rounded-2xl group-hover:scale-110 transition-transform">
                    <LifeBuoy className="w-10 h-10 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-black text-lg leading-tight">مركز الدعم الفني</h4>
                    <p className="text-slate-400 text-xs font-bold mt-1">هل تواجه مشكلة؟ تواصل مع الإدارة</p>
                  </div>
                </button>

                <div className="p-8 bg-white border border-slate-100 rounded-[3rem] shadow-sm flex flex-col items-center text-center justify-center gap-4">
                  <div className="bg-amber-100 p-4 rounded-2xl text-amber-600">
                    <Clock className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-bold text-amber-900 leading-none">تحتاج مساعدة في تنظيم المنهج؟</p>
                  <button className="px-8 py-3 bg-amber-600 text-white rounded-xl font-black text-xs shadow-lg hover:bg-amber-700 transition-all">تواصل معنا</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
