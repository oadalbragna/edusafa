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
import { FloatingClassSelector } from '../../components/common/FloatingClassSelector';
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
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [allClasses, setAllClasses] = useState<any[]>([]);

  const requestClassSupervision = async (classId: string) => {
    if (!profile?.uid) return;
    const reqRef = push(ref(db, 'sys/config/teacher_class_requests'));
    await set(reqRef, {
      teacherId: profile.uid,
      teacherName: profile.fullName || 'معلم',
      classId,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    alert('تم إرسال طلب الإشراف للإدارة بانتظار الموافقة');
    setShowRequestModal(false);
  };

  const [slides, setSlides] = useState<SliderItem[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  useEffect(() => {
    const fetchTeacherData = async () => {
      if (!profile?.uid) return;
      try {
        setLoading(true);
        const [classesSnap, reqSnap, gsSnap] = await Promise.all([
          get(ref(db, "edu/sch/classes")),
          get(ref(db, "sys/config/teacher_class_requests")),
          get(ref(db, "edu/courses"))
        ]);

        if (classesSnap.exists()) {
          const classesData = classesSnap.val();
          const assigned: AssignedSubject[] = [];
          const approvedClassIds = new Set<string>();
          
          if (reqSnap.exists()) {
            Object.values(reqSnap.val()).forEach((r: any) => {
              if (r.teacherId === profile.uid && r.status === "approved") approvedClassIds.add(r.classId);
            });
          }

          Object.keys(classesData).forEach(level => {
            Object.keys(classesData[level]).forEach(grade => {
              const cls = classesData[level][grade];
              if (approvedClassIds.has(grade) && !profile.blockedClasses?.includes(grade)) {
                Object.values(cls.subjects || {}).forEach((sub: any) => {
                  if (sub.teacherId === profile.uid && !profile.blockedSubjects?.includes(sub.id || sub.name)) {
                    assigned.push({ ...sub, classId: grade, className: cls.name, level, grade });
                  }
                });
              }
            });
          });
          setAssignedSubjects(assigned);

          if (gsSnap.exists()) {
            const gsData = Object.values(gsSnap.val()) as any[];
            const teacherLevels = new Set(assigned.map(s => s.level));
            const filteredGS = gsData
              .filter((s: any) => teacherLevels.has(s.level))
              .map((s: any) => ({
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

        }
      } catch (err) {
        console.error("Critical fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeacherData();
  }, [profile]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <FloatingClassSelector assignedClasses={assignedSubjects} onSelect={setSelectedSubject} />
      {/* بقية محتوى الصفحة هنا */}
    </div>
  );
};

export default TeacherDashboard;
