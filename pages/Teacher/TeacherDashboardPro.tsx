/**
 * EduSafa Learning - Teacher Dashboard Pro
 * 
 * لوحة تحكم متكاملة للمعلمين لرفع وإدارة:
 * - الدروس والمحاضرات
 * - الاختبارات والامتحانات
 * - البث المباشر
 * - الواجبات
 * - الدرجات
 * - الحضور
 * - المواد التعليمية
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/ToastProvider';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import {
  BookOpen, Video, FileText, Calendar, Users, Trophy,
  Upload, Plus, Search, Filter, MoreVertical, Edit, Trash2,
  Eye, Download, Play, Clock, CheckCircle, XCircle, AlertCircle,
  BarChart3, PieChart, TrendingUp, Star, MessageSquare,
  Send, Link as LinkIcon, Image, File, FileVideo, FileAudio,
  FileCode, FileCheck, Presentation, Radio, Wifi, WifiOff,
  Settings, Bell, Megaphone, ClipboardList, GraduationCap,
  Award, BookMarked, FolderOpen, HardDrive, Cloud
} from 'lucide-react';
import { db, storage } from '../../services/firebase';
import { ref, get, set, push, update, remove, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { SYS, EDU } from '../../constants/dbPaths';
import { useData, useClasses, useStudents } from '../../hooks/useData';
import { sanitizeHTML, validateFileType, validateFileSize } from '../../utils/security';
import { logActivity } from '../../utils/activityLogger';

// ============================================================================
// Types & Interfaces
// ============================================================================

interface Material {
  id: string;
  title: string;
  description?: string;
  type: 'lecture' | 'summary' | 'exam' | 'assignment' | 'video' | 'document' | 'link';
  fileType?: string;
  fileSize?: number;
  url: string;
  classId: string;
  subjectId: string;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: string;
  updatedAt?: string;
  views?: number;
  downloads?: number;
  status: 'draft' | 'published' | 'archived';
  tags?: string[];
}

interface LiveStream {
  id: string;
  title: string;
  description?: string;
  url: string;
  classId: string;
  subjectId: string;
  scheduledAt?: string;
  duration?: number;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  viewers?: number;
  recordingUrl?: string;
  createdAt: string;
}

interface Exam {
  id: string;
  title: string;
  description?: string;
  classId: string;
  subjectId: string;
  questions: ExamQuestion[];
  duration: number; // minutes
  totalMarks: number;
  passMark: number;
  scheduledAt?: string;
  dueDate?: string;
  status: 'draft' | 'published' | 'active' | 'ended';
  createdAt: string;
}

interface ExamQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  question: string;
  options?: string[];
  correctAnswer?: string | string[];
  marks: number;
}

// ============================================================================
// Main Component
// ============================================================================

const TeacherDashboardPro: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const toast = useToast();

  // State
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'materials' | 'exams' | 'live' | 'assignments' | 'grades' | 'attendance' | 'analytics'>('overview');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState<'lecture' | 'exam' | 'assignment' | 'live' | 'announcement'>('lecture');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Data
  const { data: classes, loading: classesLoading } = useClasses();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [stats, setStats] = useState({
    totalMaterials: 0,
    totalExams: 0,
    totalStudents: 0,
    averageGrade: 0,
    attendanceRate: 0,
    upcomingLiveStreams: 0
  });

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    if (!profile?.uid) return;
    fetchData();
  }, [profile, selectedClass, selectedSubject]);

  // ============================================================================
  // Data Fetching
  // ============================================================================

  const fetchData = async () => {
    if (!profile?.uid) return;
    
    try {
      setLoading(true);

      // Fetch materials for teacher's subjects
      if (selectedClass && selectedSubject) {
        await fetchMaterials(selectedClass, selectedSubject);
        await fetchExams(selectedClass, selectedSubject);
        await fetchLiveStreams(selectedClass, selectedSubject);
      } else {
        // Fetch all materials for all assigned subjects
        await fetchAllMaterials();
      }

      // Calculate stats
      calculateStats();
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.showError('خطأ في تحميل البيانات', 'يرجى المحاولة مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllMaterials = async () => {
    // Get all classes assigned to this teacher
    const classesRef = ref(db, EDU.SCH.CLASSES);
    const snapshot = await get(classesRef);
    
    if (!snapshot.exists()) return;

    const allMaterials: Material[] = [];
    const allExams: Exam[] = [];
    const allLiveStreams: LiveStream[] = [];

    Object.values(snapshot.val()).forEach((cls: any) => {
      cls.subjects?.forEach((sub: any) => {
        if (sub.teacherId === profile.uid) {
          // Fetch materials for this subject
          // ... implementation
        }
      });
    });

    setMaterials(allMaterials);
    setExams(allExams);
    setLiveStreams(allLiveStreams);
  };

  const fetchMaterials = async (classId: string, subjectId: string) => {
    const types = ['lectures', 'summaries', 'exams', 'assignments'];
    const allMaterials: Material[] = [];

    for (const type of types) {
      const path = `${EDU.SCH.CLASSES}/${classId}/materials/${subjectId}/${type}`;
      const snapshot = await get(ref(db, path));
      
      if (snapshot.exists()) {
        const items = Object.entries(snapshot.val()).map(([id, val]: any) => ({
          id,
          ...val,
          type: type.slice(0, -1) as Material['type'] // remove 's'
        }));
        allMaterials.push(...items);
      }
    }

    setMaterials(allMaterials);
  };

  const fetchExams = async (classId: string, subjectId: string) => {
    const path = `${EDU.SCH.CLASSES}/${classId}/exams/${subjectId}`;
    const snapshot = await get(ref(db, path));
    
    if (snapshot.exists()) {
      const examsData = Object.entries(snapshot.val()).map(([id, val]: any) => ({ id, ...val }));
      setExams(examsData);
    } else {
      setExams([]);
    }
  };

  const fetchLiveStreams = async (classId: string, subjectId: string) => {
    const path = `${EDU.SCH.CLASSES}/${classId}/live_streams/${subjectId}`;
    const snapshot = await get(ref(db, path));
    
    if (snapshot.exists()) {
      const streamsData = Object.entries(snapshot.val()).map(([id, val]: any) => ({ id, ...val }));
      setLiveStreams(streamsData);
    } else {
      setLiveStreams([]);
    }
  };

  const calculateStats = () => {
    setStats({
      totalMaterials: materials.length,
      totalExams: exams.length,
      totalStudents: 0, // Calculate from classes
      averageGrade: 0, // Calculate from grades
      attendanceRate: 0, // Calculate from attendance
      upcomingLiveStreams: liveStreams.filter(s => s.status === 'scheduled').length
    });
  };

  // ============================================================================
  // Upload Handlers
  // ============================================================================

  const handleUpload = async (file: File, data: any) => {
    if (!profile?.uid || !selectedClass || !selectedSubject) {
      toast.showError('خطأ', 'يرجى اختيار الفصل والمادة أولاً');
      return;
    }

    try {
      // Validate file
      const allowedTypes = ['video/mp4', 'video/webm', 'application/pdf', 
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg', 'image/png', 'image/gif'];
      
      if (!validateFileType(file, allowedTypes)) {
        toast.showError('نوع الملف غير مدعوم', 'يرجى رفع فيديو، PDF، مستند Word، أو صورة');
        return;
      }

      if (!validateFileSize(file, 100)) { // 100MB max
        toast.showError('حجم الملف كبير جداً', 'الحد الأقصى 100 ميجابايت');
        return;
      }

      // Upload to Firebase Storage
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const storagePath = `EduSafa/materials/${selectedClass}/${selectedSubject}/${data.type}/${fileName}`;
      
      const fileRef = storageRef(storage, storagePath);
      await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(fileRef);

      // Save metadata to Database
      const materialData: Partial<Material> = {
        title: sanitizeHTML(data.title),
        description: sanitizeHTML(data.description || ''),
        type: data.type,
        fileType: file.type,
        fileSize: file.size,
        url: downloadURL,
        classId: selectedClass,
        subjectId: selectedSubject,
        uploadedBy: profile.uid,
        uploadedByName: profile.fullName || profile.firstName || 'معلم',
        createdAt: new Date().toISOString(),
        status: data.status || 'published',
        tags: data.tags?.map((tag: string) => sanitizeHTML(tag))
      };

      const newMaterialRef = push(ref(db, `${EDU.SCH.CLASSES}/${selectedClass}/materials/${selectedSubject}/${data.type}s`));
      await set(newMaterialRef, { id: newMaterialRef.key, ...materialData });

      // Log activity
      await logActivity({
        type: 'material_uploaded',
        userId: profile.uid,
        userName: profile.fullName || 'معلم',
        details: `قام برفع ${data.type}: ${data.title}`,
        targetId: newMaterialRef.key || '',
        targetName: data.title
      });

      toast.showSuccess('تم الرفع بنجاح', 'تم إضافة المادة بنجاح');
      setShowUploadModal(false);
      fetchData();

    } catch (error: any) {
      console.error('Upload error:', error);
      toast.showError('فشل الرفع', error.message || 'حدث خطأ أثناء رفع الملف');
    }
  };

  const handleCreateExam = async (examData: Partial<Exam>) => {
    if (!profile?.uid || !selectedClass || !selectedSubject) {
      toast.showError('خطأ', 'يرجى اختيار الفصل والمادة أولاً');
      return;
    }

    try {
      const newExam: Partial<Exam> = {
        ...examData,
        classId: selectedClass,
        subjectId: selectedSubject,
        createdAt: new Date().toISOString(),
        status: examData.status || 'draft'
      };

      const newExamRef = push(ref(db, `${EDU.SCH.CLASSES}/${selectedClass}/exams/${selectedSubject}`));
      await set(newExamRef, { id: newExamRef.key, ...newExam });

      toast.showSuccess('تم إنشاء الاختبار بنجاح');
      setShowUploadModal(false);
      fetchData();

    } catch (error: any) {
      console.error('Create exam error:', error);
      toast.showError('فشل إنشاء الاختبار', error.message || 'حدث خطأ');
    }
  };

  const handleCreateLiveStream = async (streamData: Partial<LiveStream>) => {
    if (!profile?.uid || !selectedClass || !selectedSubject) {
      toast.showError('خطأ', 'يرجى اختيار الفصل والمادة أولاً');
      return;
    }

    try {
      const newStream: Partial<LiveStream> = {
        ...streamData,
        classId: selectedClass,
        subjectId: selectedSubject,
        createdAt: new Date().toISOString(),
        status: streamData.scheduledAt ? 'scheduled' : 'live'
      };

      const newStreamRef = push(ref(db, `${EDU.SCH.CLASSES}/${selectedClass}/live_streams/${selectedSubject}`));
      await set(newStreamRef, { id: newStreamRef.key, ...newStream });

      toast.showSuccess('تم إنشاء البث بنجاح');
      setShowUploadModal(false);
      fetchData();

    } catch (error: any) {
      console.error('Create live stream error:', error);
      toast.showError('فشل إنشاء البث', error.message || 'حدث خطأ');
    }
  };

  const handleDeleteMaterial = async (materialId: string, type: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المادة؟')) return;
    const cls = classes.find(c => c.id === selectedClass);
    if (!cls) return;

    try {
      const path = EDU.SCH.classSubjectMaterials(cls.level, cls.grade, selectedClass, selectedSubject, type + 's');
      await remove(ref(db, `${path}/${materialId}`));
      toast.showSuccess('تم الحذف بنجاح');
      fetchData();
    } catch (error: any) {
      toast.showError('فشل الحذف', error.message);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (loading || classesLoading) {
    return <LoadingSpinner fullScreen text="جاري تحميل البيانات..." />;
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-8 h-8 text-brand-600" />
                <div>
                  <h1 className="text-xl font-black text-slate-900">لوحة المعلم الاحترافية</h1>
                  <p className="text-xs text-slate-500">إدارة متكاملة للمحتوى التعليمي</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Class Selector */}
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="">اختر الفصل</option>
                {classes?.map((cls: any) => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>

              {/* Subject Selector */}
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                disabled={!selectedClass}
                className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:opacity-50"
              >
                <option value="">اختر المادة</option>
                {classes?.find((c: any) => c.id === selectedClass)?.subjects?.map((sub: any) => (
                  <option key={sub.id || sub.name} value={sub.id || sub.name}>{sub.name}</option>
                ))}
              </select>

              {/* Upload Button */}
              <button
                onClick={() => setShowUploadModal(true)}
                disabled={!selectedClass || !selectedSubject}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-xl font-bold text-sm
                         hover:bg-brand-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                رفع محتوى
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={BookOpen}
            label="إجمالي المواد"
            value={stats.totalMaterials}
            color="bg-blue-500"
          />
          <StatCard
            icon={FileCheck}
            label="الاختبارات"
            value={stats.totalExams}
            color="bg-emerald-500"
          />
          <StatCard
            icon={Users}
            label="عدد الطلاب"
            value={stats.totalStudents}
            color="bg-purple-500"
          />
          <StatCard
            icon={Trophy}
            label="متوسط الدرجات"
            value={`${stats.averageGrade}%`}
            color="bg-amber-500"
          />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-slate-200 mb-6">
          <div className="flex overflow-x-auto scrollbar-hide">
            <TabButton
              icon={BarChart3}
              label="نظرة عامة"
              active={activeTab === 'overview'}
              onClick={() => setActiveTab('overview')}
            />
            <TabButton
              icon={BookOpen}
              label="المواد التعليمية"
              active={activeTab === 'materials'}
              onClick={() => setActiveTab('materials')}
            />
            <TabButton
              icon={FileCheck}
              label="الاختبارات"
              active={activeTab === 'exams'}
              onClick={() => setActiveTab('exams')}
            />
            <TabButton
              icon={Radio}
              label="البث المباشر"
              active={activeTab === 'live'}
              onClick={() => setActiveTab('live')}
            />
            <TabButton
              icon={ClipboardList}
              label="الواجبات"
              active={activeTab === 'assignments'}
              onClick={() => setActiveTab('assignments')}
            />
            <TabButton
              icon={Trophy}
              label="الدرجات"
              active={activeTab === 'grades'}
              onClick={() => setActiveTab('grades')}
            />
            <TabButton
              icon={CheckCircle}
              label="الحضور"
              active={activeTab === 'attendance'}
              onClick={() => setActiveTab('attendance')}
            />
            <TabButton
              icon={PieChart}
              label="التحليلات"
              active={activeTab === 'analytics'}
              onClick={() => setActiveTab('analytics')}
            />
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          {activeTab === 'overview' && <OverviewTab stats={stats} materials={materials} exams={exams} />}
          {activeTab === 'materials' && <MaterialsTab materials={materials} onEdit={() => {}} onDelete={handleDeleteMaterial} />}
          {activeTab === 'exams' && <ExamsTab exams={exams} onCreate={() => setShowUploadModal(true)} />}
          {activeTab === 'live' && <LiveTab streams={liveStreams} onCreate={() => setShowUploadModal(true)} />}
          {activeTab === 'assignments' && <AssignmentsTab />}
          {activeTab === 'grades' && <GradesTab />}
          {activeTab === 'attendance' && <AttendanceTab />}
          {activeTab === 'analytics' && <AnalyticsTab />}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          type={uploadType}
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUpload}
          onCreateExam={handleCreateExam}
          onCreateLiveStream={handleCreateLiveStream}
        />
      )}
    </div>
  );
};

// ============================================================================
// Sub-Components
// ============================================================================

const StatCard: React.FC<{
  icon: any;
  label: string;
  value: string | number;
  color: string;
}> = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white rounded-2xl p-6 border border-slate-200 flex items-center gap-4">
    <div className={`${color} p-4 rounded-xl text-white`}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-sm font-bold text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-black text-slate-900">{value}</p>
    </div>
  </div>
);

const TabButton: React.FC<{
  icon: any;
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-4 font-bold text-sm transition-all border-b-2 whitespace-nowrap
      ${active
        ? 'border-brand-600 text-brand-600 bg-brand-50'
        : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
      }`}
  >
    <Icon className="w-4 h-4" />
    {label}
  </button>
);

const OverviewTab: React.FC<{ stats: any; materials: Material[]; exams: Exam[] }> = ({ stats, materials, exams }) => (
  <div className="space-y-6">
    <h2 className="text-xl font-black text-slate-900">نظرة عامة</h2>
    
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Recent Materials */}
      <div>
        <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          آخر المواد المرفوعة
        </h3>
        {materials.slice(0, 5).map(material => (
          <div key={material.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl mb-2">
            <File className="w-5 h-5 text-brand-600" />
            <div className="flex-1">
              <p className="font-bold text-sm text-slate-900">{material.title}</p>
              <p className="text-xs text-slate-500">{new Date(material.createdAt).toLocaleDateString('ar-SA')}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Upcoming Exams */}
      <div>
        <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
          <FileCheck className="w-5 h-5" />
          الاختبارات القادمة
        </h3>
        {exams.slice(0, 5).map(exam => (
          <div key={exam.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl mb-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            <div className="flex-1">
              <p className="font-bold text-sm text-slate-900">{exam.title}</p>
              <p className="text-xs text-slate-500">
                {exam.scheduledAt ? new Date(exam.scheduledAt).toLocaleDateString('ar-SA') : 'غير محدد'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const MaterialsTab: React.FC<{ materials: Material[]; onEdit: (id: string) => void; onDelete: (id: string, type: string) => void }> = ({ materials, onEdit, onDelete }) => (
  <div>
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-xl font-black text-slate-900">المواد التعليمية</h2>
    </div>

    {materials.length === 0 ? (
      <EmptyState
        icon={BookOpen}
        title="لا توجد مواد"
        description="ابدأ برفع المواد التعليمية لطلابك"
      />
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {materials.map(material => (
          <MaterialCard key={material.id} material={material} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    )}
  </div>
);

const MaterialCard: React.FC<{ material: Material; onEdit: (id: string) => void; onDelete: (id: string, type: string) => void }> = ({ material, onEdit, onDelete }) => {
  const icons: Record<string, any> = {
    lecture: Video,
    summary: FileText,
    exam: FileCheck,
    assignment: ClipboardList,
    video: FileVideo,
    document: File,
    link: LinkIcon
  };

  const Icon = icons[material.type] || File;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`${material.type === 'lecture' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'} p-2 rounded-lg`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onEdit(material.id)} className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-brand-50">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(material.id, material.type)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <h3 className="font-bold text-slate-900 mb-2 line-clamp-2">{material.title}</h3>
      {material.description && (
        <p className="text-sm text-slate-500 mb-3 line-clamp-2">{material.description}</p>
      )}

      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{new Date(material.createdAt).toLocaleDateString('ar-SA')}</span>
        <span className="flex items-center gap-1">
          <Eye className="w-3 h-3" /> {material.views || 0}
        </span>
      </div>
    </div>
  );
};

const ExamsTab: React.FC<{ exams: Exam[]; onCreate: () => void }> = ({ exams, onCreate }) => (
  <div>
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-xl font-black text-slate-900">الاختبارات والامتحانات</h2>
      <button
        onClick={onCreate}
        className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl font-bold text-sm hover:bg-brand-700"
      >
        <Plus className="w-4 h-4" />
        اختبار جديد
      </button>
    </div>

    {exams.length === 0 ? (
      <EmptyState
        icon={FileCheck}
        title="لا توجد اختبارات"
        description="أنشئ اختبارات إلكترونية لطلابك"
        actionLabel="إنشاء اختبار"
        onAction={onCreate}
      />
    ) : (
      <div className="space-y-4">
        {exams.map(exam => (
          <div key={exam.id} className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`${exam.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'} p-2 rounded-lg`}>
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{exam.title}</h3>
                  <p className="text-sm text-slate-500">{exam.questions?.length} أسئلة • {exam.duration} دقيقة</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold
                  ${exam.status === 'active' ? 'bg-emerald-100 text-emerald-600' :
                    exam.status === 'published' ? 'bg-blue-100 text-blue-600' :
                    'bg-slate-100 text-slate-600'}`}>
                  {exam.status === 'active' ? 'نشط' :
                   exam.status === 'published' ? 'منشور' :
                   exam.status === 'draft' ? 'مسودة' : 'منتهي'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

const LiveTab: React.FC<{ streams: LiveStream[]; onCreate: () => void }> = ({ streams, onCreate }) => (
  <div>
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-xl font-black text-slate-900">البث المباشر</h2>
      <button
        onClick={onCreate}
        className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl font-bold text-sm hover:bg-brand-700"
      >
        <Plus className="w-4 h-4" />
        بث جديد
      </button>
    </div>

    {streams.length === 0 ? (
      <EmptyState
        icon={Radio}
        title="لا يوجد بث مباشر"
        description="أنشئ جلسات بث مباشر لطلابك"
        actionLabel="إنشاء بث"
        onAction={onCreate}
      />
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {streams.map(stream => (
          <div key={stream.id} className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className={`${stream.status === 'live' ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-600'} p-2 rounded-lg`}>
                {stream.status === 'live' ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{stream.title}</h3>
                <p className="text-sm text-slate-500">
                  {stream.status === 'live' ? 'مباشر الآن' : 
                   stream.scheduledAt ? `مجدول: ${new Date(stream.scheduledAt).toLocaleString('ar-SA')}` : 
                   'غير مجدول'}
                </p>
              </div>
            </div>
            {stream.status === 'live' && (
              <button className="w-full py-2 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700">
                مشاهدة البث
              </button>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
);

// Placeholder tabs
const AssignmentsTab: React.FC = () => (
  <EmptyState icon={ClipboardList} title="الواجبات" description="قريباً" />
);

const GradesTab: React.FC = () => (
  <EmptyState icon={Trophy} title="الدرجات" description="قريباً" />
);

const AttendanceTab: React.FC = () => (
  <EmptyState icon={CheckCircle} title="الحضور والغياب" description="قريباً" />
);

const AnalyticsTab: React.FC = () => (
  <EmptyState icon={PieChart} title="التحليلات والإحصائيات" description="قريباً" />
);

// ============================================================================
// Upload Modal Component
// ============================================================================

const UploadModal: React.FC<{
  type: string;
  onClose: () => void;
  onUpload: (file: File, data: any) => void;
  onCreateExam: (data: any) => void;
  onCreateLiveStream: (data: any) => void;
}> = ({ type, onClose, onUpload, onCreateExam, onCreateLiveStream }) => {
  const [selectedType, setSelectedType] = useState<'upload' | 'exam' | 'live'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      if (selectedType === 'upload' && file) {
        await onUpload(file, { title, description, type: 'lecture' });
      } else if (selectedType === 'exam') {
        await onCreateExam({ title, description, type: 'exam' });
      } else if (selectedType === 'live') {
        await onCreateLiveStream({ title, description, type: 'live' });
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-2xl font-black text-slate-900">رفع محتوى جديد</h2>
          <p className="text-sm text-slate-500 mt-1">اختر نوع المحتوى واملأ البيانات</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Type Selector */}
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setSelectedType('upload')}
              className={`p-4 rounded-2xl border-2 transition-all ${selectedType === 'upload' ? 'border-brand-600 bg-brand-50' : 'border-slate-200'}`}
            >
              <Upload className="w-6 h-6 mx-auto mb-2 text-brand-600" />
              <p className="font-bold text-sm">رفع ملف</p>
            </button>
            <button
              type="button"
              onClick={() => setSelectedType('exam')}
              className={`p-4 rounded-2xl border-2 transition-all ${selectedType === 'exam' ? 'border-brand-600 bg-brand-50' : 'border-slate-200'}`}
            >
              <FileCheck className="w-6 h-6 mx-auto mb-2 text-brand-600" />
              <p className="font-bold text-sm">اختبار</p>
            </button>
            <button
              type="button"
              onClick={() => setSelectedType('live')}
              className={`p-4 rounded-2xl border-2 transition-all ${selectedType === 'live' ? 'border-brand-600 bg-brand-50' : 'border-slate-200'}`}
            >
              <Radio className="w-6 h-6 mx-auto mb-2 text-brand-600" />
              <p className="font-bold text-sm">بث مباشر</p>
            </button>
          </div>

          {/* File Upload */}
          {selectedType === 'upload' && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">الملف</label>
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-brand-500 transition-colors">
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="file-upload"
                  accept="video/*,application/pdf,application/msword,image/*"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                  <p className="font-bold text-slate-700 mb-1">اضغط لرفع ملف</p>
                  <p className="text-sm text-slate-500">فيديو، PDF، مستند Word، أو صورة (حد أقصى 100MB)</p>
                </label>
                {file && (
                  <div className="mt-4 p-3 bg-brand-50 rounded-xl">
                    <p className="font-bold text-sm text-brand-900">{file.name}</p>
                    <p className="text-xs text-brand-600">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">العنوان</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              placeholder="أدخل العنوان"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">الوصف</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              placeholder="أدخل وصفاً للمحتوى"
              rows={4}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={uploading || (selectedType === 'upload' && !file)}
              className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'جاري الرفع...' : 'رفع المحتوى'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeacherDashboardPro;
