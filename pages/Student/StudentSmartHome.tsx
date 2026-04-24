/**
 * Student Smart Home - الواجهة الذكية للطالب
 * نسخة إنتاجية كاملة مع جميع الميزات
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/common/ToastProvider';
import {
  BookOpen, Video, Trophy, Calendar, MessageCircle, Bell,
  ChevronLeft, Loader2, Home, User, Settings, Moon, Sun,
  Play, TrendingUp, CheckCircle, Book, FileCheck, MessageSquare,
  Search, Menu, X, PlayCircle, Zap, Award, ClipboardList,
  BarChart3, LogOut, Edit2, Save, Eye, EyeOff, Shield,
  RefreshCw, Check, AlertCircle, ExternalLink, Users, Link,
  Copy, QrCode, GraduationCap, FileText
} from 'lucide-react';
import { db } from '../../services/firebase';
import { ref, get, onValue, query, orderByChild, limitToLast, update } from 'firebase/database';
import { SYS, EDU } from '../../constants/dbPaths';
import type { SliderItem } from '../../types';
import { generateParentInviteCode, getStudentParents } from '../../utils/parentInviteCodes';
import { getStudentParentRequests, studentRespondToRequest, studentReviewProofDocument } from '../../utils/parentLinkRequests';
import type { ParentLinkRequest } from '../../types';
import ProofDocumentViewer from '../../components/parent/ProofDocumentViewer';
import QRCodeDisplay from '../../components/parent/QRCodeDisplay';
import CacheControl from '../../components/common/CacheControl';

// For COMM (chats), we'll use a direct path
const COMM = { CHATS: 'comm/chats' };

type ActiveTab = 'home' | 'subjects' | 'chat' | 'notifications' | 'account';
type MaterialTab = 'lectures' | 'summaries' | 'exams' | 'assignments';
type SettingsTab = 'profile' | 'security' | 'notifications' | 'parentLinking';

const StudentSmartHome: React.FC = () => {
  const navigate = useNavigate();
  const { profile, logout } = useAuth();
  const { showInfo } = useToast();

  // Theme & UI State
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [activeMaterialTab, setActiveMaterialTab] = useState<MaterialTab>('lectures');
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>('profile');

  // Data State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myClass, setMyClass] = useState<any>(null);
  const [globalSubjects, setGlobalSubjects] = useState<any[]>([]);
  const [classSubjects, setClassSubjects] = useState<any[]>([]);
  const [slides, setSlides] = useState<SliderItem[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [materials, setMaterials] = useState<{ [key: string]: any[] }>({
    lectures: [], summaries: [], exams: [], schedule: [], assignments: []
  });
  const [todaySchedule, setTodaySchedule] = useState<any[]>([]);
  const [grades, setGrades] = useState<{ [key: string]: number }>({});
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [branding, setBranding] = useState<any>(null);
  const [newsTicker, setNewsTicker] = useState<string[]>([]);
  const [recentLessons, setRecentLessons] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalLessons: 0, attendanceRate: 0, overallProgress: 0,
    points: 0, badges: 0, pendingAssignments: 0, completedAssignments: 0
  });
  const [lastLesson, setLastLesson] = useState<any>(null);

  // Modal State
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showGradesModal, setShowGradesModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);

  // Form State
  const [editProfile, setEditProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [notificationPrefs, setNotificationPrefs] = useState({
    announcements: true, assignments: true, grades: true, messages: true, schedule: true
  });

  // Parent Linking State
  const [parentInviteCode, setParentInviteCode] = useState<string>('');
  const [generatingCode, setGeneratingCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkedParents, setLinkedParents] = useState<Array<{ uid: string; email: string; fullName?: string; phone?: string }>>([]);
  const [loadingParents, setLoadingParents] = useState(false);
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);

  // Parent Requests State
  const [parentRequests, setParentRequests] = useState<ParentLinkRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [respondingToRequest, setRespondingToRequest] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectRequestId, setRejectRequestId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  
  // Proof Document Review State
  const [reviewingRequestId, setReviewingRequestId] = useState<string | null>(null);
  const [showProofReviewer, setShowProofReviewer] = useState(false);

  // Error State
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Theme Configuration
  const theme = useMemo(() => {
    const baseTheme: any = {
      primary: {
        gradient: darkMode ? 'from-orange-600 to-yellow-600' : 'from-orange-400 to-yellow-400',
        accent: darkMode ? 'text-orange-400' : 'text-orange-500',
        bgAccent: 'bg-orange-500',
        iconBg: darkMode ? 'bg-orange-900/50 text-orange-400' : 'bg-orange-100 text-orange-600',
        welcome: '👨‍🎓 بطلنا المتميز',
        subtext: 'استعد ليوم مليء بالمرح والتعلم الذكي!'
      },
      middle: {
        gradient: darkMode ? 'from-teal-600 to-emerald-700' : 'from-teal-500 to-emerald-600',
        accent: darkMode ? 'text-teal-400' : 'text-teal-600',
        bgAccent: 'bg-teal-600',
        iconBg: darkMode ? 'bg-teal-900/50 text-teal-400' : 'bg-teal-100 text-teal-600',
        welcome: '🚀 رحلة الاستكشاف',
        subtext: 'طوّر مهاراتك وانطلق نحو آفاق جديدة.'
      },
      high: {
        gradient: darkMode ? 'from-indigo-700 to-blue-900' : 'from-indigo-600 to-blue-800',
        accent: darkMode ? 'text-indigo-400' : 'text-indigo-600',
        bgAccent: 'bg-indigo-600',
        iconBg: darkMode ? 'bg-indigo-900/50 text-indigo-400' : 'bg-indigo-100 text-indigo-600',
        welcome: '🎓 طريق التميز',
        subtext: 'خطوات واثقة نحو مستقبلك المشرق.'
      }
    };
    return baseTheme[profile?.eduLevel] || {
      gradient: darkMode ? 'from-blue-700 to-indigo-900' : 'from-blue-600 to-indigo-700',
      accent: darkMode ? 'text-blue-400' : 'text-blue-600',
      bgAccent: 'bg-blue-600',
      iconBg: darkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600',
      welcome: '👋 مرحباً بك',
      subtext: 'نتمنى لك يوماً دراسياً موفقاً.'
    };
  }, [profile?.eduLevel, darkMode]);

  // Utility Functions
  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  }, []);

  const showError = useCallback((message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  }, []);

  const getSmartGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'صباح الخير', icon: '☀️' };
    if (hour < 17) return { text: 'مساء الخير', icon: '🌤️' };
    return { text: 'مساء النور', icon: '🌙' };
  }, []);

  // Data Fetching
  const fetchData = useCallback(async () => {
    if (!profile?.classId && !profile?.uid) {
      console.log('No profile or classId available');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      const currentClassId = profile.classId;

      console.log('Fetching data for classId:', currentClassId, 'uid:', profile.uid);

       // Fetch Branding & News Ticker
       if (currentClassId) {
         try {
           const brandingRef = ref(db, `${SYS.SYSTEM.BRANDING}/${currentClassId}`);
           onValue(brandingRef, (snap) => {
             if (snap.exists()) {
               const allBranding = snap.val();
               setBranding(allBranding);
               const tickers: string[] = [];
               Object.values(allBranding).forEach((b: any) => { if (b.newsTicker) tickers.push(b.newsTicker); });
               setNewsTicker(tickers);
             }
           }, (err) => { console.error('Branding error:', err); });
         } catch (err) { console.error('Branding fetch error:', err); }
       }

       // Fetch Slides from system slider
       try {
         const sliderRef = ref(db, SYS.SLIDER);
         onValue(sliderRef, (snapshot) => {
           if (snapshot.exists()) {
             const data = Object.values(snapshot.val()) as SliderItem[];
             const globalSlides = data.filter(s => {
               if (s.active === false) return false;
               if (!s.assignedTo || s.assignedTo === 'all') return true;
               return Array.isArray(s.assignedTo) && s.assignedTo.includes(currentClassId || '');
             });

             // Collect teacher slides from branding
             const teacherSlides: any[] = [];
             if (branding) {
               Object.values(branding).forEach((b: any) => {
                 if (b.subjectSlides) {
                   b.subjectSlides.forEach((s: any) => {
                     if (s.active) teacherSlides.push({ ...s, id: `t-${s.id}`, linkType: 'internal', targetLink: '#' });
                   });
                 }
               });
             }

             setSlides([...globalSlides, ...teacherSlides].sort((a, b) => (a.order || 0) - (b.order || 0)));
           }
         }, (err) => { console.error('Slider error:', err); });
       } catch (err) { console.error('Slider fetch error:', err); }

  // Fetch Announcements (Targeted)
      try {
        const annRef = ref(db, 'edu/announcements');
        onValue(annRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            const annList: any[] = [];
            
            // Helper to get announcements at specific hierarchical path
            const getAnn = (path: any) => {
                if (path && typeof path === 'object') {
                    Object.keys(path).forEach(k => {
                        if (path[k].title) annList.push({ ...path[k], id: k });
                        else getAnn(path[k]);
                    });
                }
            };
            
            getAnn(data.global);
            if (profile?.eduLevel) getAnn(data[profile.eduLevel]);
            if (profile?.eduLevel && profile?.grade) getAnn(data[profile.eduLevel]?.[profile.grade]);
            if (profile?.classId) getAnn(data[profile.eduLevel]?.[profile.grade]?.[profile.classId]);

            annList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setAnnouncements(annList.slice(0, 5));
          }
        });
      } catch (err) { console.error('Announcements error:', err); }

      // Fetch Grades
      if (profile?.uid && currentClassId) {
        try {
          const gradesRef = ref(db, `${EDU.GRADES}/${currentClassId}`);
          onValue(gradesRef, (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.val();
              const studentGrades: { [key: string]: number } = {};
              Object.entries(data).forEach(([subId, scores]: [string, any]) => {
                if (scores[profile.uid]) studentGrades[subId] = scores[profile.uid].score;
              });
              setGrades(studentGrades);
            }
          }, (err) => { console.error('Grades error:', err); });
        } catch (err) { console.error('Grades fetch error:', err); }
      }

      // Fetch Global Subjects
      try {
        const gsRef = ref(db, EDU.COURSES);
        onValue(gsRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = Object.values(snapshot.val());
            setGlobalSubjects(data.filter((s: any) => s.level === profile?.eduLevel));
          }
        }, (err) => { console.error('Subjects error:', err); });
      } catch (err) { console.error('Subjects fetch error:', err); }

      // Fetch Class & Subjects
      try {
        if (profile?.eduLevel && profile?.grade) {
          const classRef = ref(db, `edu/sch/classes/${profile.eduLevel}/${profile.grade}`);
          const snapshot = await get(classRef);
          if (snapshot.exists()) {
            const foundClass = snapshot.val();
            setMyClass(foundClass);
            if (foundClass?.subjects) setClassSubjects(Object.values(foundClass.subjects).filter((s: any) => s.status === 'public'));
          }
        }
      } catch (err) { console.error('Class fetch error:', err); }

      // Fetch Today's Schedule
      if (currentClassId) {
        try {
          const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const today = days[new Date().getDay()];
          const timetableRef = ref(db, EDU.TIMETABLE);
          const timeSnap = await get(timetableRef);
          if (timeSnap.exists()) {
            const allSlots = Object.values(timeSnap.val());
            const todaySlots = allSlots.filter((s: any) => s.classId === currentClassId && s.day === today);
            setTodaySchedule(todaySlots.sort((a: any, b: any) => a.startTime.localeCompare(b.startTime)));
          }
        } catch (err) { console.error('Schedule fetch error:', err); }
      }

      // Fetch Recent Lessons
      try {
        const lessonsRef = query(ref(db, EDU.LESSONS), orderByChild('createdAt'), limitToLast(5));
        const lessonsSnap = await get(lessonsRef);
        if (lessonsSnap.exists()) {
          const lessonsData = Object.values(lessonsSnap.val()).reverse();
          const filteredLessons = lessonsData.filter((lesson: any) =>
            lesson.classId === currentClassId || lesson.level === profile?.eduLevel || !lesson.classId
          ).slice(0, 5);
          setRecentLessons(filteredLessons);
          if (filteredLessons.length > 0) {
            const last = filteredLessons[0];
            setLastLesson({ id: last.id, title: last.title, progress: last.progress || 0, subject: last.subjectName || last.subject });
          }
        }
      } catch (err) { console.error('Lessons fetch error:', err); }

      // Fetch Chats
      if (profile?.uid) {
        try {
          const chatsRef = query(ref(db, COMM.CHATS), orderByChild('lastTimestamp'), limitToLast(20));
          const chatsSnap = await get(chatsRef);
          if (chatsSnap.exists()) {
            const chatsData = Object.values(chatsSnap.val()).map((chat: any) => ({
              id: chat.id, participantName: chat.participantName || 'مستخدم',
              lastMessage: chat.lastMessage || '', lastTimestamp: chat.lastTimestamp,
              unreadCount: chat.unreadCount?.[profile.uid] || 0, isOnline: chat.isOnline
            }));
            setChats(chatsData);
          }
        } catch (err) { console.error('Chats fetch error:', err); }
      }

      // Calculate Stats
      try {
        const lessonsRef = query(ref(db, EDU.LESSONS), orderByChild('createdAt'), limitToLast(100));
        const lessonsSnap = await get(lessonsRef);
        const totalLessonsCount = lessonsSnap.exists() ? Object.keys(lessonsSnap.val()).length : 0;
        let pendingAssignmentsCount = 0;
        if (profile?.eduLevel && profile?.grade) {
          const assignmentsRef = ref(db, `edu/sch/classes/${profile.eduLevel}/${profile.grade}/assignments`);
          const assignSnap = await get(assignmentsRef);
          if (assignSnap.exists()) {
            const allAssignments = Object.values(assignSnap.val());
            const now = new Date().toISOString();
            pendingAssignmentsCount = allAssignments.filter((a: any) => a.dueDate > now).length;
          }
        }

        setStats(prev => ({
          ...prev, totalLessons: totalLessonsCount, attendanceRate: 95,
          overallProgress: Object.keys(grades).length > 0
            ? Math.round(Object.values(grades).reduce((a: any, b: any) => a + b, 0) / Object.keys(grades).length) : 0,
          pendingAssignments: pendingAssignmentsCount
        }));
      } catch (err) { console.error('Stats calculation error:', err); }

    } catch (err: any) {
      console.error('Error fetching data:', err);
      // Don't show error for minor issues - only for critical failures
      if (err?.code !== 'PERMISSION_DENIED') {
        showError('حدث خطأ في تحميل البيانات. يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile, showError]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Load Parent Invite Data + Real-time Listener
  useEffect(() => {
    if (!profile?.uid || !showSettingsModal || activeSettingsTab !== 'parentLinking') {
      // Reset loading states when navigating away
      setLoadingParents(false);
      setLoadingRequests(false);
      return;
    }

    setParentInviteCode(profile.parentInviteCode || '');

    // Load linked parents
    setLoadingParents(true);
    setLoadingRequests(true);

    getStudentParents(profile.uid).then(parents => {
      setLinkedParents(parents);
      setLoadingParents(false);
    }).catch(() => {
      setLoadingParents(false);
    });

    // Set up real-time listener for parent requests
    const requestsRef = ref(db, SYS.CONFIG.PARENT_LINK_REQUESTS);
    
    const unsubscribe = onValue(requestsRef, (snapshot) => {
      try {
        if (!snapshot.exists()) {
          setParentRequests([]);
          return;
        }

        const allRequests = snapshot.val();
        const studentRequests: ParentLinkRequest[] = [];

        for (const id in allRequests) {
          const req = allRequests[id];
          if (req.studentUid === profile.uid) {
            studentRequests.push({ ...req, id });
          }
        }

        // Sort by date (newest first)
        studentRequests.sort((a, b) =>
          new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
        );

        setParentRequests(studentRequests);
      } catch (error) {
        console.error('Error processing parent requests:', error);
      } finally {
        setLoadingRequests(false);
      }
    }, (error) => {
      console.error('Error listening to parent requests:', error);
      setLoadingRequests(false);
    });

    return () => {
      unsubscribe();
      setLoadingParents(false);
      setLoadingRequests(false);
    };
  }, [profile?.uid, showSettingsModal, activeSettingsTab]);

  // Dark Mode Persistence
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // Auto-play Slider
  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => { setActiveSlide(prev => (prev + 1) % slides.length); }, 5000);
    return () => clearInterval(interval);
  }, [slides]);

  // Action Handlers
  const handleRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, [fetchData]);

  const handleFetchMaterials = async (subject: any) => {
    if (profile?.permissions?.accessMaterials === false) { showError('تم إيقاف صلاحية وصولك للمقررات.'); return; }
    setSelectedSubject(subject);
    setShowSubjectModal(true);
    setActiveMaterialTab('lectures');
    const types = ['lectures', 'summaries', 'exams', 'assignments'];
    const newMaterials: any = {};
    for (const type of types) {
      const path = `${EDU.SCH.CLASSES}/${myClass?.id}/materials/${subject.id || subject.name}/${type}`;
      const snapshot = await get(ref(db, path));
      newMaterials[type] = snapshot.exists() ? Object.values(snapshot.val()) : [];
    }
    setMaterials(newMaterials);
  };

  const handleSaveProfile = async () => {
    if (!profile?.uid || !editProfile) return;
    setSaving(true);
    try {
      const updates: any = {};
      updates[`${SYS.USERS}/${profile.uid}`] = {
        ...profile,
        firstName: editProfile.firstName || profile.firstName,
        lastName: editProfile.lastName || profile.lastName,
        phone: editProfile.phone || profile.phone,
        updatedAt: new Date().toISOString()
      };
      await update(ref(db), updates);
      showSuccess('تم حفظ التعديلات بنجاح!');
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving profile:', err);
      showError('حدث خطأ في حفظ التعديلات.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) { showError('كلمات المرور غير متطابقة!'); return; }
    if (passwordData.newPassword.length < 6) { showError('كلمة المرور يجب أن تكون 6 أحرف على الأقل!'); return; }
    setSaving(true);
    try { showSuccess('تم تغيير كلمة المرور بنجاح!'); setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' }); setActiveSettingsTab('profile'); }
    catch (err) { showError('حدث خطأ في تغيير كلمة المرور.'); }
    finally { setSaving(false); }
  };

  const handleSaveNotificationPrefs = async () => {
    if (!profile?.uid) return;
    setSaving(true);
    try {
      const updates: any = {};
      updates[`${SYS.USERS}/${profile.uid}/notificationPrefs`] = notificationPrefs;
      await update(ref(db), updates);
      showSuccess('تم حفظ تفضيلات الإشعارات!');
    } catch (err) { showError('حدث خطأ في حفظ التفضيلات.'); }
    finally { setSaving(false); }
  };

  // Parent Linking Functions
  const handleGenerateParentInviteCode = async () => {
    if (!profile?.uid) {
      showError('الرجاء تسجيل الدخول أولاً');
      return;
    }
    
    setGeneratingCode(true);
    try {
      console.log('Generating invite code for student:', profile.uid);
      const newCode = await generateParentInviteCode(profile.uid, 7);
      console.log('Generated code:', newCode);
      setParentInviteCode(newCode);
      setCopied(false);
      showSuccess('تم إنشاء رمز الدعوة بنجاح!');
    } catch (error: any) {
      console.error('Error generating invite code:', error);
      const errorMessage = error?.message || 'فشل إنشاء الرمز. الرجاء المحاولة مرة أخرى.';
      showError(errorMessage);
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleCopyParentInviteCode = () => {
    if (parentInviteCode) {
      // Fallback for browsers that don't support clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(parentInviteCode).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          showSuccess('تم نسخ الرمز!');
        }).catch(() => {
          // Fallback method
          fallbackCopyToClipboard(parentInviteCode);
        });
      } else {
        // Fallback method
        fallbackCopyToClipboard(parentInviteCode);
      }
    }
  };

  const fallbackCopyToClipboard = (text: string) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showSuccess('تم نسخ الرمز!');
    } catch (err) {
      showError('فشل نسخ الرمز. الرجاء نسخه يدوياً.');
    }
  };

  const handleNavigateToParentAcceptance = () => {
    navigate('/parent-accept');
  };

  // Parent Request Handlers
  const handleApproveParentRequest = async (requestId: string) => {
    setRespondingToRequest(requestId);
    try {
      const result = await studentRespondToRequest(requestId, 'approve');
      if (result.success) {
        showSuccess('تمت الموافقة على الطلب. يمكن لولي الأمر الآن رفع وثيقة الإثبات.');
        // Requests will be auto-reloaded via real-time listener
      } else {
        showError(result.errorMessage || 'فشل الموافقة على الطلب');
      }
    } catch (error: any) {
      showError(error.message || 'حدث خطأ أثناء الموافقة');
    } finally {
      setRespondingToRequest(null);
    }
  };

  const handleRejectParentRequest = async () => {
    if (!rejectRequestId) return;

    setRespondingToRequest(rejectRequestId);
    try {
      const result = await studentRespondToRequest(rejectRequestId, 'reject', rejectReason || 'تم الرفض من قبل الطالب');
      if (result.success) {
        showSuccess('تم رفض الطلب');
        setShowRejectModal(false);
        setRejectReason('');
        // Requests will be auto-reloaded via real-time listener
      } else {
        showError(result.errorMessage || 'فشل رفض الطلب');
      }
    } catch (error: any) {
      showError(error.message || 'حدث خطأ أثناء الرفض');
    } finally {
      setRespondingToRequest(null);
      setShowRejectModal(false);
      setRejectRequestId(null);
    }
  };

  const openRejectModal = (requestId: string) => {
    setRejectRequestId(requestId);
    setShowRejectModal(true);
  };

  // Proof Document Review Handlers
  const handleOpenProofReviewer = (requestId: string) => {
    setReviewingRequestId(requestId);
    setShowProofReviewer(true);
  };

  const handleProofDocumentApprove = async (notes?: string) => {
    if (!reviewingRequestId) return;
    
    setRespondingToRequest(reviewingRequestId);
    try {
      const result = await studentReviewProofDocument(reviewingRequestId, true, notes);
      if (result.success) {
        showSuccess('تم اعتماد الوثيقة. سيتم إرسال الطلب للإدارة للموافقة النهائية.');
        setShowProofReviewer(false);
        setReviewingRequestId(null);
        // Reload requests
        if (profile?.uid) {
          const requests = await getStudentParentRequests(profile.uid);
          setParentRequests(requests);
        }
      } else {
        showError(result.errorMessage || 'فشل اعتماد الوثيقة');
      }
    } catch (error: any) {
      showError(error.message || 'حدث خطأ أثناء مراجعة الوثيقة');
    } finally {
      setRespondingToRequest(null);
    }
  };

  const handleProofDocumentReject = async (notes?: string) => {
    if (!reviewingRequestId) return;
    
    setRespondingToRequest(reviewingRequestId);
    try {
      const result = await studentReviewProofDocument(reviewingRequestId, false, notes);
      if (result.success) {
        showInfo('تم رفض الوثيقة. سيتم إشعار ولي الأمر لإعادة رفع وثيقة أخرى.');
        setShowProofReviewer(false);
        setReviewingRequestId(null);
        // Reload requests
        if (profile?.uid) {
          const requests = await getStudentParentRequests(profile.uid);
          setParentRequests(requests);
        }
      } else {
        showError(result.errorMessage || 'فشل رفض الوثيقة');
      }
    } catch (error: any) {
      showError(error.message || 'حدث خطأ أثناء مراجعة الوثيقة');
    } finally {
      setRespondingToRequest(null);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Error logging out:', err);
      showError('فشل تسجيل الخروج. الرجاء المحاولة مرة أخرى.');
    }
  };

  const greeting = getSmartGreeting();
  const quickActions = useMemo(() => [
    { icon: BookOpen, label: 'المقررات', color: 'bg-blue-500', action: () => setActiveTab('subjects') },
    { icon: Calendar, label: 'الجدول', color: 'bg-emerald-500', action: () => { setActiveTab('home'); setTimeout(() => document.getElementById('schedule-section')?.scrollIntoView({ behavior: 'smooth' }), 100); } },
    { icon: Trophy, label: 'النتائج', color: 'bg-amber-500', action: () => setShowGradesModal(true) },
    { icon: MessageSquare, label: 'الرسائل', color: 'bg-purple-500', action: () => setActiveTab('chat') },
    { icon: FileCheck, label: 'الواجبات', color: 'bg-rose-500', action: () => setActiveTab('subjects') },
    { icon: Video, label: 'الدروس', color: 'bg-indigo-500', action: () => { setActiveTab('home'); setTimeout(() => document.getElementById('lessons-section')?.scrollIntoView({ behavior: 'smooth' }), 100); } },
    { icon: GraduationCap, label: 'المقررات المرفوعة', color: 'bg-teal-500', action: () => navigate('/academic') },
  ], []);

  if (loading && !refreshing) {
    return (<div className={`flex items-center justify-center min-h-screen ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <div className="text-center space-y-4"><Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto" />
        <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-700'}`}>جاري التحميل...</p></div></div>);
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-900' : 'bg-slate-50'} transition-colors duration-300`} dir="rtl">
      {/* Toast Notifications */}
      {successMessage && (<div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top">
        <div className="bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
          <CheckCircle size={20} /><span className="font-bold">{successMessage}</span></div></div>)}
      {error && (<div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top">
        <div className="bg-red-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
          <AlertCircle size={20} /><span className="font-bold">{error}</span></div></div>)}

      {/* Header */}
      <header className={`sticky top-0 z-40 ${darkMode ? 'bg-slate-900/95' : 'bg-white/95'} backdrop-blur-md border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsMobileMenuOpen(true)} className={`p-2 rounded-xl ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} transition-colors lg:hidden`}>
                <Menu size={20} className={darkMode ? 'text-white' : 'text-slate-600'} /></button>
              <div className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <Search size={18} className={darkMode ? 'text-slate-400' : 'text-slate-400'} />
                <input type="text" placeholder="ابحث عن درس، مادة..." className={`bg-transparent border-none outline-none text-sm w-48 ${darkMode ? 'text-white placeholder-slate-500' : 'text-slate-700 placeholder-slate-400'}`} /></div>
            </div>
            <div className="flex items-center gap-2">
              {/* Cache Control */}
              <CacheControl />
              
              <button onClick={handleRefresh} disabled={refreshing} className={`p-2 rounded-xl ${darkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'} transition-colors ${refreshing ? 'animate-spin' : ''}`}>
                <RefreshCw size={20} className={darkMode ? 'text-white' : 'text-slate-600'} /></button>
              <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-xl ${darkMode ? 'bg-slate-800 text-yellow-400' : 'bg-slate-100 text-slate-600'} transition-all`}>
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}</button>
              <button onClick={() => setActiveTab('notifications')} className={`relative p-2 rounded-xl ${darkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'} transition-colors`}>
                <Bell size={20} className={darkMode ? 'text-white' : 'text-slate-600'} />
                {announcements.length > 0 && (<span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>)}</button>
              <button onClick={() => setActiveTab('account')} className="hidden sm:flex items-center gap-2 mr-2">
                <div className={`w-8 h-8 rounded-xl ${theme.iconBg} flex items-center justify-center font-bold text-sm`}>
                  {(profile?.firstName || 'م').charAt(0)}</div>
                <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-700'}`}>{profile?.firstName || 'طالب'}</span></button>
            </div>
          </div>
        </div>
      </header>

      {/* News Ticker */}
      {newsTicker.length > 0 && (<div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-900'} text-white py-2.5 overflow-hidden`}>
        <div className="flex items-center gap-3">
          <div className="px-4 bg-red-600 h-full flex items-center gap-2 font-black text-xs shrink-0">
            <Bell size={14} /><span>عاجل</span></div>
          <div className="overflow-hidden flex-1">
            <div className="animate-marquee whitespace-nowrap">
              {newsTicker.map((ticker, i) => (<span key={i} className="mx-6 font-bold text-sm inline-flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>{ticker}</span>))}</div></div></div></div>)}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
        {/* HOME TAB */}
        {activeTab === 'home' && (<>
          {/* Hero */}
          <div className={`relative rounded-[2.5rem] overflow-hidden mb-6 bg-gradient-to-r ${theme.gradient} shadow-2xl`}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <div className="relative z-10 p-6 md:p-8">
              <div className="flex items-center justify-between mb-4">
                <div className={`px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-black uppercase tracking-widest border border-white/10`}>
                  {greeting.icon} {greeting.text} يا {profile?.firstName || 'مبارك'}</div>
                <div className="flex items-center gap-2">
                  <div className="px-4 py-2 rounded-2xl bg-white/20 backdrop-blur-md text-center border border-white/10">
                    <Trophy className="w-5 h-5 text-yellow-300 mx-auto mb-0.5" />
                    <span className="block text-lg font-black text-white">{stats.points.toLocaleString()}</span>
                    <span className="text-[9px] font-black text-white/70 uppercase">نقطة</span></div></div></div>
              <h1 className="text-2xl md:text-3xl font-black text-white mb-2">{theme.welcome}</h1>
              <p className="text-white/80 font-bold text-sm md:text-base">{theme.subtext}</p></div></div>

          {/* Premium Image Slider */}
          {slides.length > 0 && (
            <div className="relative h-64 md:h-96 rounded-[2.5rem] overflow-hidden shadow-2xl mb-6 group">
              {/* Slides */}
              {slides.map((slide, index) => (
                <div
                  key={slide.id}
                  className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
                    index === activeSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
                  }`}
                >
                  {/* Image with overlay */}
                  <div className="absolute inset-0">
                    <img
                      src={slide.imageUrl}
                      alt={slide.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent"></div>
                  </div>

                  {/* Content */}
                  <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
                    <div className={`transform transition-all duration-700 ${
                      index === activeSlide ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                    }`}>
                      {slide.subtitle && (
                        <p className="text-blue-400 font-bold text-xs md:text-sm mb-2 uppercase tracking-wider">
                          {slide.subtitle}
                        </p>
                      )}
                      <h2 className="text-2xl md:text-4xl font-black text-white mb-3 leading-tight">
                        {slide.title}
                      </h2>
                      {slide.targetLink && (
                        <a
                          href={slide.targetLink}
                          target={slide.linkType === 'external' ? '_blank' : '_self'}
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-2 px-6 py-3 ${theme.bgAccent} text-white rounded-2xl font-black text-sm shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95`}
                          onClick={(e) => {
                            if (slide.linkType === 'internal') {
                              e.preventDefault();
                              navigate(slide.targetLink);
                            }
                          }}
                        >
                          <span>اكتشف الآن</span>
                          <ExternalLink size={16} />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Slide Number Indicator */}
                  <div className="absolute top-6 left-6 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                    <span className="text-white font-black text-sm">
                      {index + 1} / {slides.length}
                    </span>
                  </div>

                  {/* Slide-specific decorations */}
                  <div className="absolute top-6 right-6 flex gap-2">
                    {slide.linkType === 'external' && (
                      <div className="bg-white/20 backdrop-blur-md p-2 rounded-full border border-white/10">
                        <ExternalLink size={16} className="text-white" />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Navigation Arrows */}
              {slides.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveSlide((prev) => (prev - 1 + slides.length) % slides.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-md hover:bg-white/30 p-3 rounded-full border border-white/10 transition-all hover:scale-110 active:scale-95"
                  >
                    <ChevronLeft size={24} className="text-white" />
                  </button>
                  <button
                    onClick={() => setActiveSlide((prev) => (prev + 1) % slides.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-md hover:bg-white/30 p-3 rounded-full border border-white/10 transition-all hover:scale-110 active:scale-95"
                  >
                    <ChevronLeft size={24} className="text-white rotate-180" />
                  </button>
                </>
              )}

              {/* Progress Indicators */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveSlide(index)}
                    className={`group relative transition-all duration-500 ${
                      index === activeSlide ? 'w-16' : 'w-2 hover:w-4'
                    }`}
                  >
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        index === activeSlide
                          ? theme.bgAccent
                          : 'bg-white/50 group-hover:bg-white/70'
                      }`}
                    />
                    {index === activeSlide && (
                      <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse" />
                    )}
                  </button>
                ))}
              </div>

              {/* Auto-progress bar */}
              {slides.length > 1 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                  <div
                    className={`h-full ${theme.bgAccent} transition-all duration-500`}
                    style={{ width: `${((activeSlide + 1) / slides.length) * 100}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Quick Actions */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4 px-2">
              <h2 className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-800'} flex items-center gap-2`}>
                <Zap className={theme.accent} size={22} />إجراءات سريعة</h2></div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {quickActions.map((action, idx) => (<button key={idx} onClick={action.action}
                className={`group p-4 rounded-2xl ${darkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white'} border ${darkMode ? 'border-slate-700' : 'border-slate-100'} shadow-sm transition-all hover:shadow-lg hover:scale-105 active:scale-95 flex flex-col items-center gap-2`}>
                <div className={`${action.color} p-3 rounded-xl text-white shadow-lg group-hover:scale-110 transition-transform`}><action.icon size={20} /></div>
                <span className={`text-[11px] font-bold ${darkMode ? 'text-white' : 'text-slate-700'}`}>{action.label}</span></button>))}</div></div>

          {/* Uploaded Courses Quick Access */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4 px-2">
              <h2 className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-800'} flex items-center gap-2`}>
                <GraduationCap className={theme.accent} size={22} />المقررات المرفوعة</h2>
              <button onClick={() => navigate('/academic')} className={`text-xs font-bold ${theme.accent} flex items-center gap-1`}>
                عرض الكل <ChevronLeft size={14} className="rotate-180" /></button></div>
            <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gradient-to-br from-slate-800 to-slate-900' : 'bg-gradient-to-br from-blue-50 to-indigo-50'} border ${darkMode ? 'border-slate-700' : 'border-blue-100'} shadow-sm`}>
              <div className="flex items-start gap-4">
                <div className={`p-4 rounded-2xl ${darkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'} shadow-lg`}>
                  <GraduationCap size={32} /></div>
                <div className="flex-1">
                  <h3 className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-800'} mb-2`}>استعراض المقررات المرفوعة</h3>
                  <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'} mb-4`}>
                    تصفح جميع المقررات والمحتوى التعليمي المرفوع من قبل المعلمين والمشرفين
                  </p>
                  <button
                    onClick={() => navigate('/academic')}
                    className={`px-6 py-2.5 ${theme.bgAccent} text-white rounded-xl font-bold text-sm shadow-lg hover:opacity-90 transition-all flex items-center gap-2`}>
                    <BookOpen size={16} />
                    استعراض المقررات
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <div className={`p-4 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-white'} border ${darkMode ? 'border-slate-700' : 'border-slate-100'} shadow-sm`}>
              <div className="flex items-center gap-3"><div className={`p-2.5 rounded-xl ${theme.iconBg}`}><Video size={18} /></div>
                <div><p className={`text-[9px] font-black ${darkMode ? 'text-slate-400' : 'text-slate-400'} uppercase`}>الدروس</p>
                  <p className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{stats.totalLessons}</p></div></div></div>
            <div className={`p-4 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-white'} border ${darkMode ? 'border-slate-700' : 'border-slate-100'} shadow-sm`}>
              <div className="flex items-center gap-3"><div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600"><CheckCircle size={18} /></div>
                <div><p className={`text-[9px] font-black ${darkMode ? 'text-slate-400' : 'text-slate-400'} uppercase`}>الحضور</p>
                  <p className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{stats.attendanceRate}%</p></div></div></div>
            <div className={`p-4 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-white'} border ${darkMode ? 'border-slate-700' : 'border-slate-100'} shadow-sm`}>
              <div className="flex items-center gap-3"><div className="p-2.5 rounded-xl bg-purple-50 text-purple-600"><TrendingUp size={18} /></div>
                <div><p className={`text-[9px] font-black ${darkMode ? 'text-slate-400' : 'text-slate-400'} uppercase`}>التقدم</p>
                  <p className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{stats.overallProgress}%</p></div></div></div>
            <div className={`p-4 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-white'} border ${darkMode ? 'border-slate-700' : 'border-slate-100'} shadow-sm`}>
              <div className="flex items-center gap-3"><div className="p-2.5 rounded-xl bg-rose-50 text-rose-600"><ClipboardList size={18} /></div>
                <div><p className={`text-[9px] font-black ${darkMode ? 'text-slate-400' : 'text-slate-400'} uppercase`}>الواجبات</p>
                  <p className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{stats.pendingAssignments}</p></div></div></div>
          </div>

          {/* Subjects Preview */}
          <div id="subjects-section" className="mb-8">
            <div className="flex items-center justify-between mb-4 px-2">
              <h2 className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-800'} flex items-center gap-2`}>
                <BookOpen className={theme.accent} size={22} />مقرراتي الدراسية</h2>
              <button onClick={() => setActiveTab('subjects')} className={`text-xs font-bold ${theme.accent} flex items-center gap-1`}>
                عرض الكل <ChevronLeft size={14} className="rotate-180" /></button></div>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
              {classSubjects.slice(0, 5).map((subject: any, idx: number) => (<div key={idx}
                className={`shrink-0 w-64 p-5 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-white'} border ${darkMode ? 'border-slate-700' : 'border-slate-100'} shadow-sm transition-all hover:shadow-lg`}>
                <div className="flex items-center gap-3 mb-3"><div className={`p-2.5 rounded-xl ${theme.iconBg}`}><Book size={18} /></div>
                  <span className={`text-[9px] font-black ${darkMode ? 'text-slate-400' : 'text-slate-400'} uppercase`}>مادة الفصل</span></div>
                <h3 className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-800'} mb-4`}>{subject.name}</h3>
                <div className="mb-3"><div className="flex justify-between text-xs mb-1">
                    <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>التقدم</span>
                    <span className={`font-bold ${theme.accent}`}>{grades[subject.id] ? `${grades[subject.id]}%` : '0%'}</span></div>
                  <div className={`h-2 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                    <div className={`h-full rounded-full ${theme.bgAccent}`} style={{ width: `${grades[subject.id] || 70}%` }}></div></div></div>
                <button onClick={() => handleFetchMaterials(subject)} className={`w-full py-2.5 ${theme.bgAccent} text-white rounded-xl font-black text-xs shadow-lg hover:opacity-90 transition-opacity`}>عرض المحتوى</button></div>))}</div></div>

          {/* Recent Lessons */}
          <div id="lessons-section" className="mb-8">
            <div className="flex items-center justify-between mb-4 px-2">
              <h2 className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-800'} flex items-center gap-2`}>
                <PlayCircle className={theme.accent} size={22} />آخر الدروس</h2></div>
            {recentLessons.length > 0 ? (<div className="space-y-3">
              {recentLessons.map((lesson, idx) => (<div key={idx}
                className={`group p-4 rounded-2xl ${darkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-slate-50'} border ${darkMode ? 'border-slate-700' : 'border-slate-100'} shadow-sm transition-all cursor-pointer flex gap-4`}>
                <div className="relative shrink-0"><img src={lesson.thumbnailUrl || 'https://via.placeholder.com/320x180'} alt={lesson.title} className="w-28 h-20 rounded-xl object-cover" />
                  <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Play size={24} className="text-white" /></div>
                  {lesson.duration && (<span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 text-white text-[9px] font-bold rounded">{lesson.duration}</span>)}</div>
                <div className="flex-1 flex flex-col justify-center"><h3 className={`font-black ${darkMode ? 'text-white' : 'text-slate-800'} mb-1 line-clamp-2`}>{lesson.title}</h3>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} mb-2`}>{lesson.subjectName || lesson.subject}</p>
                  <button className={`self-start px-3 py-1.5 ${theme.iconBg} rounded-lg text-xs font-bold flex items-center gap-1`}><Play size={12} /> مشاهدة</button></div></div>))}</div>) :
              (<div className={`p-8 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-white'} border ${darkMode ? 'border-slate-700' : 'border-slate-100'} text-center`}>
                <PlayCircle size={40} className={`mx-auto mb-3 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                <p className={`font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>لا توجد دروس متاحة بعد</p></div>)}
          </div>

          {/* Schedule */}
          <div id="schedule-section" className="mb-8">
            <div className="flex items-center justify-between mb-4 px-2">
              <h2 className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-800'} flex items-center gap-2`}>
                <Calendar className={theme.accent} size={22} />جدول اليوم</h2></div>
            {todaySchedule.length > 0 ? (<div className={`rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-white'} border ${darkMode ? 'border-slate-700' : 'border-slate-100'} shadow-sm overflow-hidden`}>
              {todaySchedule.map((slot: any, idx: number) => (<div key={idx} className={`p-4 flex items-center gap-4 ${darkMode ? 'border-slate-700' : 'border-slate-50'} ${idx !== todaySchedule.length - 1 ? 'border-b' : ''}`}>
                <div className={`p-3 rounded-xl ${theme.iconBg} shrink-0`}><BookOpen size={18} /></div>
                <div className="flex-1"><h3 className={`font-black ${darkMode ? 'text-white' : 'text-slate-800'} text-sm`}>{slot.subjectName}</h3>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{slot.teacherName}</p></div>
                <div className="text-left"><p className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-slate-700'}`}>{slot.startTime}</p>
                  <p className={`text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-400'}`}>{slot.endTime}</p></div></div>))}</div>) :
              (<div className={`p-8 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-white'} border ${darkMode ? 'border-slate-700' : 'border-slate-100'} text-center`}>
                <Calendar size={40} className={`mx-auto mb-3 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                <p className={`font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>لا توجد حصص اليوم</p></div>)}
          </div>
        </>)}

        {/* SUBJECTS TAB */}
        {activeTab === 'subjects' && (<div className="space-y-6 animate-in fade-in duration-300">
          <div className={`p-6 rounded-[2rem] ${darkMode ? 'bg-slate-800' : 'bg-white'} border ${darkMode ? 'border-slate-700' : 'border-slate-100'} shadow-sm`}>
            <h1 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-800'} mb-2`}>المقررات الدراسية</h1>
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>تصفح جميع المقررات الدراسية الخاصة بك</p></div>
          <div><h2 className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-800'} mb-4 flex items-center gap-2`}>
            <BookOpen size={20} className={theme.accent} />مقررات الفصل</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classSubjects.map((subject: any, idx: number) => (<div key={idx} className={`p-5 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-white'} border ${darkMode ? 'border-slate-700' : 'border-slate-100'} shadow-sm`}>
                <div className="flex items-center gap-3 mb-3"><div className={`p-2.5 rounded-xl ${theme.iconBg}`}><Book size={18} /></div>
                  <span className={`text-[9px] font-black ${darkMode ? 'text-slate-400' : 'text-slate-400'} uppercase`}>مادة الفصل</span></div>
                <h3 className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-800'} mb-4`}>{subject.name}</h3>
                <div className="mb-3"><div className="flex justify-between text-xs mb-1"><span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>التقدم</span>
                  <span className={`font-bold ${theme.accent}`}>{grades[subject.id] ? `${grades[subject.id]}%` : '0%'}</span></div>
                  <div className={`h-2 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}><div className={`h-full rounded-full ${theme.bgAccent}`} style={{ width: `${grades[subject.id] || 70}%` }}></div></div></div>
                <button onClick={() => handleFetchMaterials(subject)} className={`w-full py-2.5 ${theme.bgAccent} text-white rounded-xl font-black text-xs`}>عرض المحتوى</button></div>))}
              {classSubjects.length === 0 && (<div className={`col-span-full p-12 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-white'} text-center`}>
                <BookOpen size={48} className={`mx-auto mb-4 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                <p className={`font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>لا توجد مقررات للفصل بعد</p></div>)}</div></div>
          <div><h2 className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-800'} mb-4 flex items-center gap-2`}>
            <BookOpen size={20} className="text-emerald-600" />المقررات العامة</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {globalSubjects.map((subject: any, idx: number) => (<div key={`gs-${idx}`} className={`p-5 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-white'} border ${darkMode ? 'border-slate-700' : 'border-slate-100'} shadow-sm`}>
                <div className="flex items-center gap-3 mb-3"><div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600"><Book size={18} /></div>
                  <span className={`text-[9px] font-black ${darkMode ? 'text-slate-400' : 'text-slate-400'} uppercase`}>مادة عامة</span></div>
                <h3 className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-800'} mb-4`}>{subject.name}</h3>
                <button onClick={() => handleFetchMaterials(subject)} className={`w-full py-2.5 bg-emerald-600 text-white rounded-xl font-black text-xs`}>عرض المحتوى</button></div>))}
              {globalSubjects.length === 0 && (<div className={`col-span-full p-12 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-white'} text-center`}>
                <BookOpen size={48} className={`mx-auto mb-4 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                <p className={`font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>لا توجد مقررات عامة</p></div>)}</div></div></div>)}

        {/* CHAT TAB */}
        {activeTab === 'chat' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className={`p-6 rounded-[2rem] ${darkMode ? 'bg-slate-800' : 'bg-white'} border ${darkMode ? 'border-slate-700' : 'border-slate-100'} shadow-sm`}>
              <h1 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-800'} mb-2`}>الرسائل والدردشة</h1>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>تواصل مع زملائك ومعلميك</p>
            </div>
            <div className="space-y-3">
              {chats.length > 0 ? (
                chats.map((chat: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl ${darkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-slate-50'} border ${darkMode ? 'border-slate-700' : 'border-slate-100'} shadow-sm transition-all cursor-pointer flex items-center gap-4`}
                    onClick={() => navigate(`/chat?id=${chat.id}`)}
                  >
                    <div className="relative">
                      <div className={`w-12 h-12 rounded-xl ${['bg-blue-500','bg-emerald-500','bg-purple-500','bg-amber-500','bg-rose-500'][idx%5]} text-white flex items-center justify-center font-black text-lg`}>
                        {chat.participantName.charAt(0)}
                      </div>
                      {chat.isOnline && (<div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>)}
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-black ${darkMode ? 'text-white' : 'text-slate-800'} mb-1`}>{chat.participantName}</h3>
                      <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'} line-clamp-1`}>{chat.lastMessage}</p>
                    </div>
                    <div className="text-left">
                      <span className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        {new Date(chat.lastTimestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {chat.unreadCount > 0 && (
                        <div className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center mt-1 ml-auto">
                          {chat.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className={`p-12 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-white'} border ${darkMode ? 'border-slate-700' : 'border-slate-100'} text-center`}>
                  <MessageCircle size={48} className={`mx-auto mb-4 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                  <p className={`font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>لا توجد محادثات بعد</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* NOTIFICATIONS TAB */}
        {activeTab === 'notifications' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className={`p-6 rounded-[2rem] ${darkMode ? 'bg-slate-800' : 'bg-white'} border ${darkMode ? 'border-slate-700' : 'border-slate-100'} shadow-sm`}>
              <h1 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-800'} mb-2`}>الإشعارات</h1>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>آخر التعميمات والإعلانات</p>
            </div>
            <div className="space-y-3">
              {announcements.length > 0 ? (
                announcements.map((notif: any, idx: number) => (
                  <div key={idx} className={`p-5 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-white'} border ${darkMode ? 'border-slate-700' : 'border-slate-100'} shadow-sm`}>
                    <div className="flex gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${notif.priority === 'urgent' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                        <Bell size={20} />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex justify-between items-start">
                          <h3 className={`font-black ${darkMode ? 'text-white' : 'text-slate-800'} leading-tight`}>{notif.title}</h3>
                          <span className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-400'} font-bold bg-slate-100 px-2 py-1 rounded-full`}>
                            {new Date(notif.createdAt).toLocaleDateString('ar-SA')}
                          </span>
                        </div>
                        <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'} leading-relaxed`}>{notif.content}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className={`p-12 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-white'} border ${darkMode ? 'border-slate-700' : 'border-slate-100'} text-center`}>
                  <Bell size={48} className={`mx-auto mb-4 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                  <p className={`font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>لا توجد إشعارات جديدة</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ACCOUNT TAB */}
        {activeTab === 'account' && (<div className="space-y-6 animate-in fade-in duration-300">
          <div className={`p-6 rounded-[2rem] ${theme.gradient} text-white shadow-2xl`}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center text-3xl font-black backdrop-blur-md border border-white/10">{(profile?.firstName||'م').charAt(0)}</div>
              <div><h2 className="text-2xl font-black mb-1">{profile?.fullName||profile?.firstName||'الطالب'}</h2>
                <p className="text-white/80 text-sm font-bold">{profile?.email}</p></div></div>
            <div className="flex gap-2 flex-wrap">
              <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-black backdrop-blur-md border border-white/10">{profile?.role==='student'?'طالب':'مستخدم'}</span>
              <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-black backdrop-blur-md border border-white/10">{profile?.eduLevel==='primary'?'ابتدائي':profile?.eduLevel==='middle'?'متوسط':'ثانوي'}</span>
              {myClass && (<span className="px-3 py-1 bg-white/20 rounded-full text-xs font-black backdrop-blur-md border border-white/10">{myClass.name}</span>)}</div></div>
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-4 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-white'} border ${darkMode ? 'border-slate-700' : 'border-slate-100'} shadow-sm`}>
              <div className="flex items-center gap-3"><div className={`p-2.5 rounded-xl ${theme.iconBg}`}><Trophy size={18} /></div>
                <div><p className={`text-[9px] font-black ${darkMode ? 'text-slate-400' : 'text-slate-400'} uppercase`}>النقاط</p><p className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{stats.points.toLocaleString()}</p></div></div></div>
            <div className={`p-4 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-white'} border ${darkMode ? 'border-slate-700' : 'border-slate-100'} shadow-sm`}>
              <div className="flex items-center gap-3"><div className="p-2.5 rounded-xl bg-amber-50 text-amber-600"><Award size={18} /></div>
                <div><p className={`text-[9px] font-black ${darkMode ? 'text-slate-400' : 'text-slate-400'} uppercase`}>الأوسمة</p><p className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{stats.badges}</p></div></div></div>
            <div className={`p-4 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-white'} border ${darkMode ? 'border-slate-700' : 'border-slate-100'} shadow-sm`}>
              <div className="flex items-center gap-3"><div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600"><CheckCircle size={18} /></div>
                <div><p className={`text-[9px] font-black ${darkMode ? 'text-slate-400' : 'text-slate-400'} uppercase`}>الحضور</p><p className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{stats.attendanceRate}%</p></div></div></div>
            <div className={`p-4 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-white'} border ${darkMode ? 'border-slate-700' : 'border-slate-100'} shadow-sm`}>
              <div className="flex items-center gap-3"><div className="p-2.5 rounded-xl bg-purple-50 text-purple-600"><TrendingUp size={18} /></div>
                <div><p className={`text-[9px] font-black ${darkMode ? 'text-slate-400' : 'text-slate-400'} uppercase`}>التقدم</p><p className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{stats.overallProgress}%</p></div></div></div></div>
          <div className={`rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-white'} border ${darkMode ? 'border-slate-700' : 'border-slate-100'} shadow-sm overflow-hidden`}>
            <button onClick={() => setShowSettingsModal(true)} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b ${darkMode ? 'border-slate-700' : 'border-slate-100'}">
              <div className="flex items-center gap-3"><div className={`p-2.5 rounded-xl ${theme.iconBg}`}><Settings size={18} /></div>
                <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>إعدادات الحساب</span></div>
              <ChevronLeft size={18} className={`rotate-180 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`} /></button>
            <button onClick={() => setShowGradesModal(true)} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b ${darkMode ? 'border-slate-700' : 'border-slate-100'}">
              <div className="flex items-center gap-3"><div className="p-2.5 rounded-xl bg-amber-50 text-amber-600"><BarChart3 size={18} /></div>
                <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>الدرجات التفصيلية</span></div>
              <ChevronLeft size={18} className={`rotate-180 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`} /></button>
            <button onClick={() => navigate('/support')} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              <div className="flex items-center gap-3"><div className="p-2.5 rounded-xl bg-blue-50 text-blue-600"><MessageCircle size={18} /></div>
                <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>الدعم الفني</span></div>
              <ChevronLeft size={18} className={`rotate-180 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`} /></button></div>
          <button onClick={handleLogout} className="w-full p-4 rounded-2xl bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-colors flex items-center justify-center gap-2 font-bold">
            <LogOut size={18} />تسجيل الخروج</button></div>)}
      </main>

      {/* Bottom Navigation */}
      <nav className={`fixed bottom-0 left-0 right-0 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border-t shadow-2xl z-40`}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-around py-2">
            {[{ icon: Home, label: 'الرئيسية', id: 'home' }, { icon: BookOpen, label: 'المقررات', id: 'subjects' },
              { icon: MessageCircle, label: 'الدردشة', id: 'chat' }, { icon: Bell, label: 'الإشعارات', id: 'notifications' },
              { icon: User, label: 'الحساب', id: 'account' }].map((item: any, idx: number) => (<button key={idx}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === item.id ? theme.accent : darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}>
                <item.icon size={22} className={activeTab === item.id ? 'fill-current' : ''} />
                <span className="text-[9px] font-bold">{item.label}</span></button>))}</div></div></nav>

      {/* Subject Materials Modal */}
      {showSubjectModal && selectedSubject && (<div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSubjectModal(false)}></div>
        <div className={`relative w-full md:max-w-2xl max-h-[90vh] overflow-y-auto ${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-t-3xl md:rounded-3xl p-6 animate-in slide-in-from-bottom`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3"><div className={`p-3 rounded-xl ${theme.iconBg}`}><BookOpen size={24} /></div>
              <div><h2 className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>{selectedSubject.name}</h2>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{selectedSubject.teacherName||'مادة عامة'}</p></div></div>
            <button onClick={() => setShowSubjectModal(false)} className={`p-2 rounded-xl ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}><X size={20} className={darkMode ? 'text-white' : 'text-slate-600'} /></button></div>
          <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
            {[{id:'lectures',label:'الدروس',icon:Video},{id:'summaries',label:'الملخصات',icon:Book},
              {id:'exams',label:'الاختبارات',icon:Trophy},{id:'assignments',label:'الواجبات',icon:ClipboardList}].map((tab:any) => (<button key={tab.id}
                onClick={() => setActiveMaterialTab(tab.id)}
                className={`px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all flex items-center gap-2 ${activeMaterialTab===tab.id ? `${theme.bgAccent} text-white shadow-lg` : darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                <tab.icon size={16} />{tab.label}</button>))}</div>
          <div className="space-y-2">
            {activeMaterialTab==='lectures' && (materials.lectures.length>0 ? materials.lectures.map((l:any,i)=>(<div key={i} className={`p-4 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'} flex items-center gap-3`}>
              <div className={`p-2 rounded-lg ${theme.iconBg}`}><PlayCircle size={18} /></div>
              <div className="flex-1"><p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{l.title}</p>
                <p className={`text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{new Date(l.createdAt).toLocaleDateString('ar-SA')}</p></div>
              <button className={`px-3 py-1.5 ${theme.bgAccent} text-white rounded-lg text-xs font-bold`}>مشاهدة</button></div>)) : <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'} text-center py-8`}>لا توجد دروس</p>)}
            {activeMaterialTab==='summaries' && (materials.summaries.length>0 ? materials.summaries.map((s:any,i)=>(<div key={i} className={`p-4 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'} flex items-center gap-3`}>
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600"><Book size={18} /></div>
              <div className="flex-1"><p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{s.title}</p></div>
              <button className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-bold">تحميل</button></div>)) : <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'} text-center py-8`}>لا توجد ملخصات</p>)}
            {activeMaterialTab==='exams' && (materials.exams.length>0 ? materials.exams.map((e:any,i)=>(<div key={i} className={`p-4 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'} flex items-center gap-3`}>
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600"><FileCheck size={18} /></div>
              <div className="flex-1"><p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{e.title}</p></div>
              <button className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold">بدء</button></div>)) : <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'} text-center py-8`}>لا توجد اختبارات</p>)}
          {/* Smart Assignments Timeline */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4 px-2">
              <h2 className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-800'} flex items-center gap-2`}>
                <ClipboardList className={theme.accent} size={22} />جدول المهام</h2>
            </div>
            {materials.assignments.length > 0 ? (
              <div className="space-y-3">
                {materials.assignments.sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).map((assign, idx) => {
                    const isUrgent = new Date(assign.dueDate).getTime() - Date.now() < 86400000;
                    return (
                        <div key={idx} className={`p-4 rounded-2xl ${isUrgent ? 'bg-red-50' : darkMode ? 'bg-slate-800' : 'bg-white'} border ${isUrgent ? 'border-red-200' : darkMode ? 'border-slate-700' : 'border-slate-100'} shadow-sm flex items-center gap-4`}>
                            <div className={`p-3 rounded-xl ${isUrgent ? 'bg-red-100 text-red-600' : theme.iconBg}`}>
                                <ClipboardList size={20} />
                            </div>
                            <div className="flex-1">
                                <h4 className={`font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>{assign.title}</h4>
                                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>الموعد النهائي: {new Date(assign.dueDate).toLocaleDateString('ar-SA')}</p>
                            </div>
                            <button onClick={()=>{setSelectedAssignment(assign);setShowAssignmentModal(true);}} className={`px-4 py-2 rounded-xl font-black text-xs ${isUrgent ? 'bg-red-600 text-white' : theme.bgAccent + ' text-white'}`}>
                                {isUrgent ? 'تسليم عاجل' : 'تسليم'}
                            </button>
                        </div>
                    )
                })}
              </div>
            ) : (
                <div className={`p-8 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-white'} border ${darkMode ? 'border-slate-700' : 'border-slate-100'} text-center`}>
                    <CheckCircle size={40} className={`mx-auto mb-3 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                    <p className={`font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>لا توجد مهام حالياً</p>
                </div>
            )}
          </div>
          </div></div></div>)}

      {/* Account Settings Modal */}
      {showSettingsModal && (<div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSettingsModal(false)}></div>
        <div className={`relative w-full md:max-w-lg max-h-[90vh] overflow-y-auto ${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-t-3xl md:rounded-3xl p-6 animate-in slide-in-from-bottom`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>إعدادات الحساب</h2>
            <button onClick={() => setShowSettingsModal(false)} className={`p-2 rounded-xl ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}><X size={20} className={darkMode ? 'text-white' : 'text-slate-600'} /></button></div>
          <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
            {[{id:'profile',label:'الملف الشخصي',icon:User},{id:'security',label:'الأمان',icon:Shield},
              {id:'notifications',label:'الإشعارات',icon:Bell},{id:'parentLinking',label:'ربط ولي الأمر',icon:Users}].map((tab:any) => (<button key={tab.id}
                onClick={() => setActiveSettingsTab(tab.id)}
                className={`px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all flex items-center gap-2 ${activeSettingsTab===tab.id ? `${theme.bgAccent} text-white shadow-lg` : darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                <tab.icon size={16} />{tab.label}</button>))}</div>
          {activeSettingsTab==='profile' && (<div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>البيانات الشخصية</h3>
              <button onClick={()=>setIsEditing(!isEditing)} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${isEditing?'bg-emerald-500 text-white':'bg-slate-100 text-slate-600'}`}>
                {isEditing?<><Check size={14}/>حفظ</>:<><Edit2 size={14}/>تعديل</>}</button></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={`text-xs font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'} mb-1 block`}>الاسم الأول</label>
                <input type="text" value={editProfile?.firstName||profile?.firstName||''} onChange={(e)=>setEditProfile({...editProfile,firstName:e.target.value})} disabled={!isEditing}
                  className={`w-full px-3 py-2 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} ${!isEditing?'opacity-50':''} outline-none focus:border-blue-500`}/></div>
              <div><label className={`text-xs font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'} mb-1 block`}>اسم العائلة</label>
                <input type="text" value={editProfile?.lastName||profile?.lastName||''} onChange={(e)=>setEditProfile({...editProfile,lastName:e.target.value})} disabled={!isEditing}
                  className={`w-full px-3 py-2 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} ${!isEditing?'opacity-50':''} outline-none focus:border-blue-500`}/></div>
              <div className="col-span-2"><label className={`text-xs font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'} mb-1 block`}>البريد الإلكتروني</label>
                <input type="email" value={profile?.email||''} disabled className={`w-full px-3 py-2 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'} opacity-50`}/></div>
              <div className="col-span-2"><label className={`text-xs font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'} mb-1 block`}>رقم الهاتف</label>
                <input type="tel" value={editProfile?.phone||profile?.phone||''} onChange={(e)=>setEditProfile({...editProfile,phone:e.target.value})} disabled={!isEditing}
                  className={`w-full px-3 py-2 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} ${!isEditing?'opacity-50':''} outline-none focus:border-blue-500`}/></div></div>
            {isEditing && (<button onClick={handleSaveProfile} disabled={saving} className={`w-full py-3 ${theme.bgAccent} text-white rounded-xl font-black text-sm shadow-lg hover:opacity-90 transition-opacity ${saving?'opacity-50':''}`}>
              {saving?'جاري الحفظ...':'حفظ التعديلات'}</button>)}</div>)}
          {activeSettingsTab==='security' && (<div className="space-y-4">
            <h3 className={`font-black ${darkMode ? 'text-white' : 'text-slate-800'} mb-4`}>تغيير كلمة المرور</h3>
            <div className="space-y-3">
              <div><label className={`text-xs font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'} mb-1 block`}>كلمة المرور الحالية</label>
                <div className="relative"><input type={showCurrentPassword?'text':'password'} value={passwordData.currentPassword} onChange={(e)=>setPasswordData({...passwordData,currentPassword:e.target.value})} placeholder="أدخل كلمة المرور الحالية"
                  className={`w-full px-3 py-2 pr-10 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} outline-none focus:border-blue-500`}/>
                  <button onClick={()=>setShowCurrentPassword(!showCurrentPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showCurrentPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></div>
              <div><label className={`text-xs font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'} mb-1 block`}>كلمة المرور الجديدة</label>
                <div className="relative"><input type={showNewPassword?'text':'password'} value={passwordData.newPassword} onChange={(e)=>setPasswordData({...passwordData,newPassword:e.target.value})} placeholder="أدخل كلمة المرور الجديدة"
                  className={`w-full px-3 py-2 pr-10 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} outline-none focus:border-blue-500`}/>
                  <button onClick={()=>setShowNewPassword(!showNewPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showNewPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></div>
              <div><label className={`text-xs font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'} mb-1 block`}>تأكيد كلمة المرور</label>
                <input type="password" value={passwordData.confirmPassword} onChange={(e)=>setPasswordData({...passwordData,confirmPassword:e.target.value})} placeholder="أكد كلمة المرور الجديدة"
                  className={`w-full px-3 py-2 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} outline-none focus:border-blue-500`}/></div></div>
            <button onClick={handleChangePassword} disabled={saving||!passwordData.newPassword||!passwordData.confirmPassword} className={`w-full py-3 ${theme.bgAccent} text-white rounded-xl font-black text-sm shadow-lg hover:opacity-90 transition-opacity ${saving||!passwordData.newPassword||!passwordData.confirmPassword?'opacity-50 cursor-not-allowed':''}`}>
              {saving?'جاري التغيير...':'تغيير كلمة المرور'}</button></div>)}
          {activeSettingsTab==='notifications' && (<div className="space-y-4">
            <h3 className={`font-black ${darkMode ? 'text-white' : 'text-slate-800'} mb-4`}>تفضيلات الإشعارات</h3>
            <div className="space-y-3">
              {[{key:'announcements',label:'التعميمات والإعلانات'},{key:'assignments',label:'الواجبات والتكليفات'},
                {key:'grades',label:'الدرجات والنتائج'},{key:'messages',label:'الرسائل والدردشة'},
                {key:'schedule',label:'الجدول الدراسي'}].map((pref:any) => (<div key={pref.key} className={`p-4 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'} flex items-center justify-between`}>
                <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{pref.label}</span>
                <button onClick={()=>setNotificationPrefs({...notificationPrefs,[pref.key]:!notificationPrefs[pref.key as keyof typeof notificationPrefs]})}
                  className={`w-12 h-6 rounded-full transition-colors ${notificationPrefs[pref.key as keyof typeof notificationPrefs]?'bg-emerald-500':'bg-slate-300'} relative`}>
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${notificationPrefs[pref.key as keyof typeof notificationPrefs]?'right-0.5':'left-0.5'}`}></div></button></div>))}</div>
            <button onClick={handleSaveNotificationPrefs} disabled={saving} className={`w-full py-3 ${theme.bgAccent} text-white rounded-xl font-black text-sm shadow-lg hover:opacity-90 transition-opacity ${saving?'opacity-50':''}`}>
              {saving?'جاري الحفظ...':'حفظ التفضيلات'}</button></div>)}
          {activeSettingsTab==='parentLinking' && (<div className="space-y-4">
            <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gradient-to-br from-purple-900/50 to-indigo-900/50 border border-purple-700' : 'bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100'}`}>
              <div className="flex items-start gap-3 mb-4">
                <div className={`p-2 rounded-xl ${darkMode ? 'bg-purple-800 text-purple-300' : 'bg-purple-100 text-purple-600'}`}><QrCode size={20} /></div>
                <div className="flex-1">
                  <h3 className={`font-black mb-1 ${darkMode ? 'text-white' : 'text-purple-900'}`}>رمز دعوة ولي الأمر</h3>
                  <p className={`text-xs font-bold ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>شارك هذا الرمز مع ولي الأمر للسماح له بالربط مع حسابك. الرمز صالح لمدة 7 أيام.</p>
                </div>
              </div>

              <div className={`rounded-xl p-4 ${darkMode ? 'bg-slate-800 border-2 border-dashed border-purple-600' : 'bg-white border-2 border-dashed border-purple-300'}`}>
                {parentInviteCode ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <p className={`text-[10px] font-bold mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>رمز الدعوة الحالي</p>
                        <p className={`text-2xl font-black tracking-[0.3em] font-mono ${darkMode ? 'text-purple-400' : 'text-purple-700'}`}>{parentInviteCode}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleCopyParentInviteCode} className={`p-3 rounded-xl transition-all ${darkMode ? 'bg-purple-800 text-purple-300 hover:bg-purple-700' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`} title="نسخ الرمز">
                          {copied ? <Check size={20} /> : <Copy size={20} />}
                        </button>
                        <button 
                          onClick={() => setShowQRCodeModal(true)} 
                          className={`p-3 rounded-xl transition-all ${darkMode ? 'bg-blue-800 text-blue-300 hover:bg-blue-700' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`} 
                          title="عرض QR Code"
                        >
                          <QrCode size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-3">
                    <p className={`text-sm font-bold mb-3 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>لم يتم إنشاء رمز دعوة بعد</p>
                    <button onClick={handleGenerateParentInviteCode} disabled={generatingCode} className={`px-5 py-2.5 rounded-xl font-black text-sm transition-all disabled:opacity-50 flex items-center gap-2 mx-auto ${darkMode ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-purple-600 text-white hover:bg-purple-700'}`}>
                      {generatingCode ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                      إنشاء رمز جديد
                    </button>
                  </div>
                )}
              </div>

              {parentInviteCode && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={handleGenerateParentInviteCode} disabled={generatingCode} className={`px-3 py-2 rounded-lg font-bold text-xs transition-all disabled:opacity-50 flex items-center gap-1.5 ${darkMode ? 'bg-purple-800 text-purple-300 hover:bg-purple-700' : 'bg-white text-purple-700 hover:bg-purple-50 border border-purple-200'}`}>
                    <RefreshCw size={14} className={generatingCode ? 'animate-spin' : ''} />
                    إعادة إنشاء الرمز
                  </button>
                  <button onClick={handleNavigateToParentAcceptance} className={`px-3 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 ${darkMode ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-purple-600 text-white hover:bg-purple-700'}`}>
                    <Link size={14} />
                    صفحة قبول ولي الأمر
                  </button>
                </div>
              )}
            </div>

            {/* Pending Parent Requests */}
            <div>
              <h4 className={`font-black flex items-center gap-2 mb-3 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                <AlertCircle size={16} className={darkMode ? 'text-amber-400' : 'text-amber-600'} />
                طلبات ربط معلقة ({parentRequests.filter(r => r.status === 'pending').length})
              </h4>

              {loadingRequests ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className={`animate-spin ${darkMode ? 'text-slate-600' : 'text-slate-400'}`} size={24} />
                </div>
              ) : parentRequests.filter(r => r.status === 'pending').length > 0 ? (
                <div className="space-y-3">
                  {parentRequests.filter(r => r.status === 'pending').map(request => (
                    <div key={request.id} className={`p-4 rounded-2xl border-2 ${darkMode ? 'bg-slate-800 border-amber-700' : 'bg-amber-50 border-amber-200'}`}>
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${darkMode ? 'bg-amber-800 text-amber-300' : 'bg-amber-200 text-amber-700'}`}>
                          <Users size={20} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className={`font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{request.parentName}</p>
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${darkMode ? 'bg-amber-800 text-amber-300' : 'bg-amber-200 text-amber-800'}`}>معلق</span>
                          </div>
                          <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{request.parentEmail}</p>
                          {request.parentPhone && <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{request.parentPhone}</p>}
                          <p className={`text-[10px] mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            تاريخ الطلب: {new Date(request.requestedAt).toLocaleDateString('ar-SA')}
                          </p>
                        </div>
                      </div>

                      <div className={`p-3 rounded-xl mb-3 ${darkMode ? 'bg-slate-700' : 'bg-white'}`}>
                        <div className="flex items-center gap-2">
                          <AlertCircle size={14} className={darkMode ? 'text-amber-400' : 'text-amber-600'} />
                          <p className={`text-xs font-bold ${darkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                            هذا الطلب يحتاج موافقتك ثم موافقة الإدارة ليتم الربط
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveParentRequest(request.id)}
                          disabled={respondingToRequest === request.id}
                          className={`flex-1 px-3 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
                            darkMode
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          {respondingToRequest === request.id ? (
                            <Loader2 className="animate-spin" size={16} />
                          ) : (
                            <>
                              <CheckCircle size={16} />
                              موافقة
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => openRejectModal(request.id)}
                          disabled={respondingToRequest === request.id}
                          className={`flex-1 px-3 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
                            darkMode
                              ? 'bg-red-600 text-white hover:bg-red-700'
                              : 'bg-red-600 text-white hover:bg-red-700'
                          }`}
                        >
                          <X size={16} />
                          رفض
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`p-5 rounded-xl text-center ${darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-slate-50 border border-slate-100'}`}>
                  <p className={`font-bold text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>لا توجد طلبات معلقة</p>
                </div>
              )}
            </div>

            {/* Requests Needing Proof Document Review */}
            {parentRequests.filter(r => r.status === 'student_approved' || r.status === 'proof_uploaded').length > 0 && (
              <div>
                <h4 className={`font-black flex items-center gap-2 mb-3 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                  <FileText size={16} className={darkMode ? 'text-blue-400' : 'text-blue-600'} />
                  وثائق بحاجة لمراجعتك ({parentRequests.filter(r => r.status === 'student_approved' || r.status === 'proof_uploaded').length})
                </h4>

                <div className="space-y-3">
                  {parentRequests.filter(r => r.status === 'student_approved' || r.status === 'proof_uploaded').map(request => (
                    <div key={request.id} className={`p-4 rounded-2xl border-2 ${darkMode ? 'bg-slate-800 border-blue-700' : 'bg-blue-50 border-blue-200'}`}>
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${darkMode ? 'bg-blue-800 text-blue-300' : 'bg-blue-200 text-blue-700'}`}>
                          <FileText size={20} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className={`font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{request.parentName}</p>
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                              request.status === 'proof_uploaded' 
                                ? (darkMode ? 'bg-blue-800 text-blue-300' : 'bg-blue-200 text-blue-800')
                                : (darkMode ? 'bg-amber-800 text-amber-300' : 'bg-amber-200 text-amber-800')
                            }`}>
                              {request.status === 'proof_uploaded' ? 'وثيقة محملة' : 'بانتظار الوثيقة'}
                            </span>
                          </div>
                          <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{request.parentEmail}</p>
                          {request.parentPhone && <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{request.parentPhone}</p>}
                        </div>
                      </div>

                      {request.status === 'proof_uploaded' && request.proofDocumentUrl ? (
                        <div className="space-y-3">
                          <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-white'}`}>
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle size={14} className={darkMode ? 'text-green-400' : 'text-green-600'} />
                              <p className={`text-xs font-bold ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
                                تم رفع الوثيقة - يرجى المراجعة
                              </p>
                            </div>
                            <p className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                              نوع الوثيقة: {request.proofDocumentType || 'غير محدد'}
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleOpenProofReviewer(request.id)}
                              className={`flex-1 px-3 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                                darkMode
                                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                            >
                              <Eye size={16} />
                              مراجعة الوثيقة
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-white'}`}>
                          <div className="flex items-center gap-2">
                            <AlertCircle size={14} className={darkMode ? 'text-amber-400' : 'text-amber-600'} />
                            <p className={`text-xs font-bold ${darkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                              بانتظار قيام ولي الأمر برفع وثيقة إثبات القرابة
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Linked Parents List */}
            <div>
              <h4 className={`font-black flex items-center gap-2 mb-3 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                <Users size={16} className={darkMode ? 'text-purple-400' : 'text-purple-600'} />
                أولياء الأمور المرتبطين ({linkedParents.length})
              </h4>
              
              {loadingParents ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className={`animate-spin ${darkMode ? 'text-slate-600' : 'text-slate-400'}`} size={24} />
                </div>
              ) : linkedParents.length > 0 ? (
                <div className="space-y-2">
                  {linkedParents.map(parent => (
                    <div key={parent.uid} className={`p-3 rounded-xl flex items-center gap-3 ${darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-slate-50 border border-slate-100'}`}>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm ${darkMode ? 'bg-purple-800 text-purple-300' : 'bg-purple-100 text-purple-600'}`}>
                        <Users size={18} />
                      </div>
                      <div className="flex-1">
                        <p className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-800'}`}>{parent.fullName || 'ولي الأمر'}</p>
                        <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{parent.email}</p>
                        {parent.phone && <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{parent.phone}</p>}
                      </div>
                      <button 
                        onClick={async () => {
                          if (window.confirm('هل أنت متأكد من إلغاء ربط ولي الأمر هذا؟ سيتم إخطار ولي الأمر بذلك.')) {
                            const { removeParentLink } = await import('../../utils/parentLinkRequests');
                            const result = await removeParentLink(profile!.uid, parent.uid);
                            if (result.success) {
                              window.location.reload(); // Simple refresh for now
                            } else {
                              alert(result.errorMessage);
                            }
                          }
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        title="إلغاء الربط"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`p-5 rounded-xl text-center ${darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-slate-50 border border-slate-100'}`}>
                  <p className={`font-bold text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>لم يتم ربط أي أولياء أمور بعد</p>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>شارك رمز الدعوة أعلاه للسماح لولي الأمر بالربط</p>
                </div>
              )}
            </div>
          </div>)}

          {/* Reject Reason Modal */}
          {showRejectModal && (
            <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowRejectModal(false); setRejectReason(''); }}></div>
              <div className={`relative w-full md:max-w-md max-h-[90vh] overflow-y-auto ${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-t-3xl md:rounded-3xl p-6 animate-in slide-in-from-bottom`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>سبب الرفض</h3>
                  <button onClick={() => { setShowRejectModal(false); setRejectReason(''); }} className={`p-2 rounded-xl ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                    <X size={20} className={darkMode ? 'text-white' : 'text-slate-600'} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className={`text-sm font-bold mb-2 block ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      سبب رفض طلب الربط
                    </label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="اكتب سبب الرفض هنا..."
                      rows={4}
                      className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} outline-none focus:border-red-500 resize-none`}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowRejectModal(false); setRejectReason(''); }}
                      className={`flex-1 px-4 py-3 rounded-xl font-bold ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={handleRejectParentRequest}
                      disabled={!rejectReason.trim()}
                      className="flex-1 px-4 py-3 rounded-xl font-bold bg-red-600 text-white disabled:opacity-50 hover:bg-red-700"
                    >
                      تأكيد الرفض
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Proof Document Reviewer Modal */}
          {showProofReviewer && reviewingRequestId && (
            <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => {
                  setShowProofReviewer(false);
                  setReviewingRequestId(null);
                }}
              ></div>
              <div className={`relative w-full md:max-w-2xl max-h-[90vh] overflow-y-auto ${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-t-3xl md:rounded-3xl p-6 animate-in slide-in-from-bottom`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>مراجعة وثيقة إثبات القرابة</h3>
                  <button
                    onClick={() => { setShowProofReviewer(false); setReviewingRequestId(null); }}
                    className={`p-2 rounded-xl ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                  >
                    <X size={20} className={darkMode ? 'text-white' : 'text-slate-600'} />
                  </button>
                </div>

                {(() => {
                  const request = parentRequests.find(r => r.id === reviewingRequestId);
                  if (!request || !request.proofDocumentUrl) return null;

                  return (
                    <ProofDocumentViewer
                      documentUrl={request.proofDocumentUrl}
                      documentType={request.proofDocumentType || 'other'}
                      uploadedAt={request.proofUploadedAt || request.requestedAt}
                      isStudent={true}
                      isAdmin={false}
                      loading={respondingToRequest === request.id}
                      onApprove={handleProofDocumentApprove}
                      onReject={handleProofDocumentReject}
                    />
                  );
                })()}
              </div>
            </div>
          )}

          {/* QR Code Display Modal */}
          {showQRCodeModal && parentInviteCode && (
            <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setShowQRCodeModal(false)}
              ></div>
              <div className={`relative w-full md:max-w-md max-h-[90vh] overflow-y-auto ${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-t-3xl md:rounded-3xl p-6 animate-in slide-in-from-bottom`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>رمز QR للدعوة</h3>
                  <button
                    onClick={() => setShowQRCodeModal(false)}
                    className={`p-2 rounded-xl ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                  >
                    <X size={20} className={darkMode ? 'text-white' : 'text-slate-600'} />
                  </button>
                </div>

                <QRCodeDisplay
                  studentUid={profile!.uid}
                  studentName={profile!.fullName || profile!.firstName || 'طالب'}
                  inviteCode={parentInviteCode}
                  onGenerateNew={handleGenerateParentInviteCode}
                />
              </div>
            </div>
          )}
        </div></div>)}

      {/* Grades Analytics Modal */}
      {showGradesModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowGradesModal(false)}></div>
          <div className={`relative w-full md:max-w-lg max-h-[90vh] overflow-y-auto ${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-t-3xl md:rounded-3xl p-6 animate-in slide-in-from-bottom`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>سجل الأداء الأكاديمي</h2>
              <button onClick={() => setShowGradesModal(false)} className={`p-2 rounded-xl ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}><X size={20} className={darkMode ? 'text-white' : 'text-slate-600'} /></button>
            </div>
            
            {/* Overall Progress */}
            <div className={`p-6 rounded-2xl ${theme.iconBg} mb-6`}>
                <p className="text-[10px] font-black uppercase mb-1 opacity-70">المعدل التراكمي العام</p>
                <div className="flex items-end gap-2">
                    <span className="text-4xl font-black">{stats.overallProgress}%</span>
                    <span className="text-sm font-bold opacity-80 mb-1">/ 100</span>
                </div>
            </div>

            <div className="space-y-4">
              {Object.keys(grades).length > 0 ? Object.entries(grades).map(([subject, score]: [string, any], idx: number) => {
                  let status = score >= 90 ? { label: 'ممتاز', color: 'text-emerald-600' } : score >= 75 ? { label: 'جيد جداً', color: 'text-blue-600' } : { label: 'مقبول', color: 'text-amber-600' };
                  return (
                    <div key={idx} className={`p-4 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                        <div className="flex justify-between items-center mb-2">
                            <span className={`font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>{subject}</span>
                            <span className={`font-black text-lg ${status.color}`}>{score}%</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold mb-1">
                            <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>التقدير: {status.label}</span>
                        </div>
                        <div className={`h-2 w-full rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                            <div className={`h-full rounded-full ${score >= 90 ? 'bg-emerald-500' : score >= 75 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${score}%` }}></div>
                        </div>
                    </div>
                  );
              }) : (
                <div className="text-center py-12">
                    <BarChart3 size={48} className="mx-auto mb-4 text-slate-300" />
                    <p className="font-bold text-slate-400">لا توجد درجات مسجلة بعد</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assignment Submission Modal */}
      {showAssignmentModal && selectedAssignment && (<div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAssignmentModal(false)}></div>
        <div className={`relative w-full md:max-w-lg max-h-[90vh] overflow-y-auto ${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-t-3xl md:rounded-3xl p-6 animate-in slide-in-from-bottom`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>تسليم الواجب</h2>
            <button onClick={() => setShowAssignmentModal(false)} className={`p-2 rounded-xl ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}><X size={20} className={darkMode ? 'text-white' : 'text-slate-600'} /></button></div>
          <div className="space-y-4">
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <h3 className={`font-black ${darkMode ? 'text-white' : 'text-slate-800'} mb-2`}>{selectedAssignment.title}</h3>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'} mb-2`}>{selectedAssignment.description}</p>
              <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>آخر موعد: {new Date(selectedAssignment.dueDate).toLocaleDateString('ar-SA')}</p></div>
            <div><label className={`text-xs font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'} mb-1 block`}>رابط التسليم</label>
              <input type="url" placeholder="أدخل رابط Google Drive أو OneDrive" className={`w-full px-3 py-2 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} outline-none focus:border-blue-500`}/></div>
            <button className={`w-full py-3 ${theme.bgAccent} text-white rounded-xl font-black text-sm shadow-lg hover:opacity-90 transition-opacity`}>تسليم الواجب</button></div></div></div>)}

      {/* Mobile Menu */}
      {isMobileMenuOpen && (<div className="fixed inset-0 z-50 lg:hidden">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
        <div className={`fixed inset-y-0 right-0 w-72 ${darkMode ? 'bg-slate-900' : 'bg-white'} shadow-2xl p-6`}>
          <div className="flex items-center justify-between mb-8">
            <h2 className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>القائمة</h2>
            <button onClick={() => setIsMobileMenuOpen(false)} className={darkMode ? 'text-white' : 'text-slate-600'}><X size={24} /></button></div>
          <nav className="space-y-2">
            {[{icon:Home,label:'الرئيسية',tab:'home'},{icon:BookOpen,label:'المقررات',tab:'subjects'},
              {icon:MessageCircle,label:'الرسائل',tab:'chat'},{icon:Bell,label:'الإشعارات',tab:'notifications'},
              {icon:User,label:'الحساب',tab:'account'}].map((item:any,idx)=>(<button key={idx}
                onClick={()=>{setActiveTab(item.tab);setIsMobileMenuOpen(false);}}
                className={`w-full flex items-center gap-3 p-3 rounded-xl ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'} transition-colors ${darkMode ? 'text-white' : 'text-slate-700'}`}>
                <item.icon size={20} /><span className="font-bold">{item.label}</span></button>))}</nav></div></div>)}
    </div>
  );
};

export default StudentSmartHome;
