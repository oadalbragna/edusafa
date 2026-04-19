import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight, ThumbsUp, Bookmark, Share2, Check, MessageCircle, FileText,
  Paperclip, Download, MoreHorizontal, Flag, Users, Clock, BookOpen, Radio, PlayCircle,
  Headphones, ImageIcon, LinkIcon, AlignRight, ExternalLink, Info, Target, Sparkles,
  ChevronLeft, ChevronRight, X, Maximize2, Layout, StickyNote, Layers,
  ZoomIn, ZoomOut, RotateCw, Move, Save, Copy, Grid, Minimize2, Trash2, Bug, Loader2, ClipboardList, Calendar
} from 'lucide-react';
import { ref, onValue, push, set, remove, serverTimestamp, runTransaction, get } from 'firebase/database';
import { getDb as db } from '../../services/firebase';
import { useTheme } from '../../context/ThemeContext';
// TODO: Create these components if they don't exist
// import ReportDialog, { ReportType } from '../../components/common/ReportDialog';
// import { useDebugTracker } from '../../context/DebugTrackerContext';
import { Badge } from '../../components/ui';

// Import Refactored Components - adjust paths as needed
// import { LectureVideoPlayer } from '../../features/lecture-view/LectureVideoPlayer';
// import { WaveformAudioPlayer } from '../../features/lecture-view/WaveformAudioPlayer';
// import { CommentSection } from '../../features/lecture-view/CommentSection';
import { ImageProcessingService } from '../../services/api/ImageProcessingService';

interface AllViewPageProps {
  onBack: () => void;
  lectureTitle?: string;
  lectureId?: string;
  userData?: any;
  lessonData?: any;
}

// ============================================
// Advanced Reader Components with Smart Resolver
// ============================================

const AdvancedPDFReader: React.FC<{ url: string; title: string; onBack: () => void; fileId?: string }> = ({ url, title, onBack, fileId }) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Smart Resolver - نفس الطريقة من LectureViewPage
  useEffect(() => {
    const resolve = async () => {
        setLoading(true);
        if (url.includes('api.telegram.org')) {
            const fid = fileId || url.split('/').pop();
            if (fid) {
                const fresh = await ImageProcessingService.resolveFileId(fid);
                setResolvedUrl(fresh || url);
            } else setResolvedUrl(url);
        } else {
            setResolvedUrl(url);
        }
        setLoading(false);
    };
    resolve();
  }, [url, fileId]);

  return (
    <div className="fixed inset-0 z-[110] bg-gray-900 flex flex-col animate-slide-up" dir="rtl">
      <div className="p-3 md:p-4 border-b border-white/10 flex items-center justify-between bg-gray-900/95 backdrop-blur-md z-40">
        <div className="flex gap-2 items-center">
            <button onClick={onBack} className="p-2 md:p-2.5 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-all border border-white/5 active:scale-90">
                <X className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <button onClick={() => window.open(resolvedUrl || url, '_blank')} className="p-2 md:p-2.5 bg-primary text-white rounded-xl shadow-lg flex items-center gap-2 px-3 md:px-5 hover:bg-primary/90 transition-all active:scale-95">
                <Download className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="text-[10px] md:text-xs font-black">تحميل</span>
            </button>
        </div>
        <div className="text-right min-w-0 pr-2">
          <h3 className="font-black text-[10px] md:text-sm text-white truncate max-w-[150px] md:max-w-[400px]">{title}</h3>
          <p className="text-[7px] md:text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none">قارئ المرفقات الذكي • نظام الإنعاش مفعل</p>
        </div>
      </div>

      <div className="flex-1 relative flex flex-col md:flex-row overflow-hidden">
          <div className="md:absolute right-4 top-1/2 md:-translate-y-1/2 flex flex-row md:flex-col gap-2 bg-black/60 backdrop-blur-xl p-2 md:p-2.5 rounded-xl md:rounded-2xl border border-white/10 z-30 justify-center m-2 md:m-0">
              <button onClick={() => setScale(s => Math.min(s + 0.2, 3))} className="p-2.5 md:p-3 bg-white/10 text-white rounded-lg md:rounded-xl hover:bg-white/20 active:bg-primary/20">
                  <ZoomIn className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button onClick={() => setScale(s => Math.max(s - 0.2, 0.5))} className="p-2.5 md:p-3 bg-white/10 text-white rounded-lg md:rounded-xl hover:bg-white/20 active:bg-primary/20">
                  <ZoomOut className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <div className="hidden md:block w-full h-[1px] bg-white/10 my-1"></div>
              <button onClick={() => setRotation(r => r + 90)} className="p-2.5 md:p-3 bg-white/10 text-white rounded-lg md:rounded-xl hover:bg-white/20 active:bg-primary/20">
                  <RotateCw className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button onClick={() => { setScale(1); setRotation(0); }} className="p-2.5 md:p-3 bg-white/10 text-white rounded-lg md:rounded-xl hover:bg-white/20 active:bg-primary/20">
                  <Grid className="w-4 h-4 md:w-5 md:h-5" />
              </button>
          </div>

          <div className="flex-1 overflow-auto bg-gray-800/50 flex items-start justify-center p-4 md:p-12 custom-scrollbar">
              {loading ? (
                  <div className="flex flex-col items-center justify-center gap-4 text-white/40">
                      <Loader2 className="w-12 h-12 animate-spin text-primary" />
                      <p className="text-xs font-black uppercase tracking-widest">جاري تجهيز المستند...</p>
                  </div>
              ) : (
                <div
                    style={{
                        transform: `scale(${scale}) rotate(${rotation}deg)`,
                        transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        transformOrigin: 'top center'
                    }}
                    className="shadow-2xl shadow-black/80 bg-white rounded-sm md:rounded-lg overflow-hidden w-full max-w-[900px]"
                >
                    <iframe
                        src={`https://docs.google.com/viewer?url=${encodeURIComponent(resolvedUrl || url)}&embedded=true`}
                        className="w-full aspect-[1/1.41] md:h-[1200px] border-none bg-white"
                        title={title}
                    />
                </div>
              )}
          </div>
      </div>
    </div>
  );
};

const FullscreenImageViewer: React.FC<{ url: string; onClose: () => void; fileId?: string }> = ({ url, onClose, fileId }) => {
    const [scale, setScale] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const dragStart = useRef({ x: 0, y: 0 });

    // Smart Resolver - نفس الطريقة من LectureViewPage
    useEffect(() => {
        const resolve = async () => {
            setLoading(true);
            if (url.includes('api.telegram.org')) {
                const fid = fileId || url.split('/').pop();
                if (fid) {
                    const fresh = await ImageProcessingService.resolveFileId(fid);
                    setResolvedUrl(fresh || url);
                } else setResolvedUrl(url);
            } else {
                setResolvedUrl(url);
            }
            setLoading(false);
        };
        resolve();
    }, [url, fileId]);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setPosition({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
    };

    const handleMouseUp = () => setIsDragging(false);

    const handleSave = async () => {
        try {
            const downloadUrl = resolvedUrl || url;
            const response = await fetch(downloadUrl);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `image-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (e) { 
            alert("فشل تحميل الصورة"); 
        }
    };

    return (
        <div className="fixed inset-0 z-[120] bg-black flex flex-col animate-scale-in">
            {loading ? (
                <div className="absolute inset-0 z-[130] flex items-center justify-center bg-black/80 backdrop-blur-md">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-12 h-12 animate-spin text-primary" />
                        <p className="text-white text-xs font-black uppercase tracking-widest">جاري تجهيز الصورة...</p>
                    </div>
                </div>
            ) : (
                <>
                    <div className="absolute top-4 right-4 z-50 flex gap-2">
                        <button onClick={handleSave} className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20">
                            <Save className="w-5 h-5" />
                        </button>
                        <button onClick={onClose} className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-red-500/20 hover:text-red-500">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-50 bg-black/40 backdrop-blur-md p-2 rounded-2xl border border-white/10">
                        <button onClick={() => setScale(s => s + 0.2)} className="p-3 bg-white/10 rounded-xl text-white hover:bg-primary">
                            <ZoomIn className="w-5 h-5" />
                        </button>
                        <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="p-3 bg-white/10 rounded-xl text-white hover:bg-primary">
                            <ZoomOut className="w-5 h-5" />
                        </button>
                        <button onClick={() => setRotation(r => r + 90)} className="p-3 bg-white/10 rounded-xl text-white hover:bg-primary">
                            <RotateCw className="w-5 h-5" />
                        </button>
                        <button onClick={() => { setScale(1); setPosition({x:0,y:0}); setRotation(0); }} className="p-3 bg-white/10 rounded-xl text-white hover:bg-primary">
                            <Maximize2 className="w-5 h-5" />
                        </button>
                    </div>

                    <div
                        className="flex-1 w-full h-full overflow-hidden flex items-center justify-center cursor-move"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        <img
                            src={resolvedUrl || url}
                            alt="Fullscreen"
                            className="max-w-none transition-transform duration-100 ease-out select-none pointer-events-none"
                            style={{
                                transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                                maxHeight: '90vh',
                                maxWidth: '90vw'
                            }}
                        />
                    </div>
                </>
            )}
        </div>
    );
};

const TextReader: React.FC<{ content: string; title: string; onBack: () => void }> = ({ content, title, onBack }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    alert("تم نسخ النص بالكامل");
  };

  return (
    <div className="fixed inset-0 z-[110] bg-white dark:bg-gray-950 flex flex-col animate-slide-up">
      <div className="p-4 pt-10 border-b dark:border-gray-800 flex items-center justify-between bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
        <button 
          onClick={onBack} 
          className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-gray-500"
        >
          <ArrowRight className="w-5 h-5 rotate-180" />
        </button>
        <div className="text-right">
          <h3 className="font-black text-xs dark:text-white">{title}</h3>
          <p className="text-[8px] text-secondary font-black uppercase tracking-widest">شرح تفصيلي</p>
        </div>
        <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary shadow-inner">
          <AlignRight className="w-5 h-5" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-gray-50/50 dark:bg-gray-950/50">
        <div className="max-w-2xl mx-auto bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-sm border dark:border-gray-800">
          <div className="flex items-center gap-2 mb-6 border-b pb-4 dark:border-gray-800">
            <Sparkles className="w-5 h-5 text-secondary" />
            <h4 className="text-[11px] font-black text-gray-400 uppercase">ملخص الدرس والمعلومات الهامة</h4>
          </div>
          <div className="text-right leading-[1.8] text-gray-700 dark:text-gray-300 font-bold text-sm whitespace-pre-wrap selection:bg-secondary/20">
            {content}
          </div>
        </div>
      </div>
      <div className="p-4 border-t dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md flex gap-2">
        <button 
          onClick={handleCopy} 
          className="flex-1 py-3.5 bg-gray-900 text-white rounded-2xl text-[10px] font-black shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Bookmark className="w-4 h-4" /> نسخ النص بالكامل
        </button>
        <button 
          onClick={onBack} 
          className="flex-1 py-3.5 bg-secondary text-white rounded-2xl text-[10px] font-black shadow-lg shadow-secondary/20 active:scale-95 transition-all uppercase tracking-widest"
        >
          إغلاق القارئ
        </button>
      </div>
    </div>
  );
};

// ============================================
// Main AllViewPage Component
// ============================================

const AllViewPage: React.FC<AllViewPageProps> = ({
  onBack, 
  userData, 
  lessonData, 
  lectureId: propId, 
  lectureTitle = "محتوى تعليمي"
}) => {
  const { dir } = useTheme();
  const { trackClick, trackNavigation, addLog } = useDebugTracker();
  
  // State Management
  const [activeTab, setActiveTab] = useState<'comments' | 'questions' | 'docs' | 'notes' | 'info'>('info');
  const [activeBlockView, setActiveBlockView] = useState<{type: string, data: any} | null>(null);
  const [currentMedia, setCurrentMedia] = useState<{type: string, url: string} | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const videoPlayerRef = useRef<any>(null);
  const [pendingSeekTime, setPendingSeekTime] = useState<number | null>(null);

  // Core Data Extraction
  const lessonId = lessonData?.id || propId || 'default_lesson';
  const displayTitle = lessonData?.title || lessonData?.name || lectureTitle;
  const blocks = lessonData?.blocks || [];
  const objectives = lessonData?.objectives || [];
  const attachments = lessonData?.attachments ? Object.values(lessonData.attachments) : [];
  const currentUserUid = userData?.user_id || userData?.uid;

  // ✅ User Display Name State
  const [userDisplayName, setUserDisplayName] = useState<string>('مستخدم');
  
  // ✅ Assignment from parent component (StudentDashboard)
  const linkedAssignment = lessonData?.assignment || null;

  // Interaction State
  const [isSaved, setIsSaved] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  // Comments & Social
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [userFollowStatus, setUserFollowStatus] = useState<Record<string, boolean>>({});
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportConfig, setReportConfig] = useState<{type: ReportType, name: string}>({ type: 'lecture', name: '' });
  
  // ✅ Timestamp Comment State
  const [newCommentText, setNewCommentText] = useState('');
  const [commentTimestamp, setCommentTimestamp] = useState<number | null>(null);
  const [showTimestampBtn, setShowTimestampBtn] = useState(false);

  // Notes State
  const [notes, setNotes] = useState<any[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  
  // ✅ Questions State
  const [questions, setQuestions] = useState<any[]>([]);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [newAnswerText, setNewAnswerText] = useState('');

  // ============================================
  // Data Fetching Effects
  // ============================================

  // ✅ Fetch User Display Name
  useEffect(() => {
    if (!currentUserUid) return;

    // Try to get display name from userData first
    if (userData?.display_name) {
      setUserDisplayName(userData.display_name);
      return;
    }

    // Fetch from database
    const userRef = ref(db, `sys/users/students/${currentUserUid}`);
    const unsub = onValue(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setUserDisplayName(data.full_name || data.display_name || data.name || 'مستخدم');
      } else {
        // Try teachers path
        const teacherRef = ref(db, `sys/users/teachers/${currentUserUid}`);
        onValue(teacherRef, (teacherSnap) => {
          if (teacherSnap.exists()) {
            const data = teacherSnap.val();
            setUserDisplayName(data.full_name || data.display_name || data.name || 'مستخدم');
          }
        });
      }
    });

    return () => unsub();
  }, [currentUserUid, userData]);

  // Fetch Interactions & Progress
  useEffect(() => {
    if (!currentUserUid || !lessonId) return;

    const unsubSaved = onValue(ref(db, `sys/users/library/${currentUserUid}/${lessonId}`), (snap) => {
      setIsSaved(snap.exists());
    });
    
    const unsubLiked = onValue(ref(db, `comm/engagement/likes/${lessonId}/${currentUserUid}`), (snap) => {
      setIsLiked(snap.val() === true);
    });
    
    const unsubLikesCount = onValue(ref(db, `comm/engagement/likes_count/${lessonId}`), (snap) => {
      setLikesCount(snap.val() || 0);
    });

    const subjectId = lessonData?.subjectId;
    if (subjectId) {
      const contextId = lessonData?.contextId || 'general';
      const unsubProgress = onValue(
        ref(db, `edu/learner/progress/${currentUserUid}/${contextId}/${subjectId}/completed_lessons/${lessonId}`), 
        (snap) => setIsFinished(snap.exists())
      );
      return () => {
        unsubSaved();
        unsubLiked();
        unsubLikesCount();
        unsubProgress();
      };
    }

    return () => {
      unsubSaved();
      unsubLiked();
      unsubLikesCount();
    };
  }, [lessonId, currentUserUid, lessonData]);

  // Fetch Comments
  useEffect(() => {
    const unsub = onValue(ref(db, `comm/engagement/comments/${lessonId}`), (snapshot) => {
      if (snapshot.exists()) {
        const list = Object.entries(snapshot.val()).map(([k, v]: any) => ({ id: k, ...v }))
          .sort((a, b) => b.timestamp - a.timestamp);
        setCommentsList(list);
        list.forEach(c => checkFollowStatus(c.senderId));
      } else {
        setCommentsList([]);
      }
    });
    return () => unsub();
  }, [lessonId]);

  // Fetch Notes
  useEffect(() => {
    if (!currentUserUid || !lessonId) return;
    const unsub = onValue(ref(db, `sys/users/notes/${currentUserUid}/${lessonId}`), (snap) => {
      if (snap.exists()) {
        setNotes(Object.entries(snap.val()).map(([k, v]: any) => ({ id: k, ...v }))
          .sort((a, b) => a.time - b.time));
      } else {
        setNotes([]);
      }
    });
    return () => unsub();
  }, [lessonId, currentUserUid]);

  // ✅ Fetch Questions
  useEffect(() => {
    if (!lessonId) return;
    const unsub = onValue(ref(db, `comm/engagement/questions/${lessonId}`), (snap) => {
      if (snap.exists()) {
        const list = Object.entries(snap.val()).map(([k, v]: any) => ({ id: k, ...v }))
          .sort((a, b) => b.timestamp - a.timestamp);
        setQuestions(list);
      } else {
        setQuestions([]);
      }
    });
    return () => unsub();
  }, [lessonId]);

  // Initialize Media
  useEffect(() => {
    if (lessonData?.videoUrl) {
      setCurrentMedia({ type: 'video', url: lessonData.videoUrl });
    } else if (blocks.length > 0) {
      const firstMedia = blocks.find((b: any) => ['video', 'audio', 'image'].includes(b.type));
      if (firstMedia) {
        setCurrentMedia({ type: firstMedia.type, url: firstMedia.url });
      }
    }
    trackNavigation('init', 'all-view', { lessonId, title: displayTitle });
  }, [lessonData, blocks]);

  // Handle Pending Seek
  useEffect(() => {
    if (pendingSeekTime !== null && currentMedia?.type === 'video' && videoPlayerRef.current) {
      const timer = setTimeout(() => {
        if (videoPlayerRef.current?.seekTo) {
          videoPlayerRef.current.seekTo(pendingSeekTime);
          setPendingSeekTime(null);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentMedia, pendingSeekTime]);

  // ============================================
  // Handler Functions
  // ============================================

  const checkFollowStatus = async (targetUid: string) => {
    if (!currentUserUid || targetUid === currentUserUid || userFollowStatus[targetUid]) return;
    const snap = await get(ref(db, `comm/engagement/social_graph/friends/${currentUserUid}/${targetUid}`));
    if (snap.exists()) {
      setUserFollowStatus(prev => ({ ...prev, [targetUid]: true }));
    }
  };

  const handleComplete = async () => {
    if (!currentUserUid || !lessonId || !lessonData?.subjectId || isFinished) return;
    const contextId = lessonData.contextId || 'general';
    await set(
      ref(db, `edu/learner/progress/${currentUserUid}/${contextId}/${lessonData.subjectId}/completed_lessons/${lessonId}`), 
      true
    );
  };

  const handleLike = async () => {
    if (!currentUserUid) {
      alert("يرجى تسجيل الدخول");
      return;
    }
    const likePath = `comm/engagement/likes/${lessonId}/${currentUserUid}`;
    const countPath = `comm/engagement/likes_count/${lessonId}`;
    
    if (isLiked) {
      await remove(ref(db, likePath));
      await runTransaction(ref(db, countPath), (current) => (current || 0) - 1);
    } else {
      await set(ref(db, likePath), true);
      await runTransaction(ref(db, countPath), (current) => (current || 0) + 1);
    }
  };

  const handleSave = async () => {
    if (!currentUserUid) {
      alert("يرجى تسجيل الدخول للحفظ");
      return;
    }
    const refPath = ref(db, `sys/users/library/${currentUserUid}/${lessonId}`);
    if (isSaved) {
      await remove(refPath);
    } else {
      await set(refPath, {
        id: lessonId,
        title: displayTitle,
        type: 'lesson',
        savedAt: Date.now(),
        image: lessonData?.image || ""
      });
    }
  };

  // ✅ Capture current timestamp for comment
  const handleCaptureTimestamp = () => {
    setCommentTimestamp(currentTime);
    setShowTimestampBtn(false);
    addLog('comment', 'timestamp_capture', { time: currentTime, mediaType: currentMedia?.type });
  };

  // ✅ Post comment with optional timestamp
  const handlePostComment = (text: string, options: any = {}) => {
    if (!text.trim() && commentTimestamp === null) return;

    const refC = ref(db, `comm/engagement/comments/${lessonId}`);
    push(refC, {
      senderId: currentUserUid,
      senderName: userDisplayName,
      senderAvatar: userData?.user_photo || '',
      text,
      timestamp: serverTimestamp(),
      likes: 0,
      parentId: options.parentId || null,
      replyToName: options.replyToName || null,
      mentions: options.mentions || [],
      // ✅ Timestamp data
      timestampSeconds: commentTimestamp,
      mediaType: commentTimestamp !== null ? (currentMedia?.type || 'video') : null
    });

    setNewCommentText('');
    setCommentTimestamp(null);
    setShowTimestampBtn(false);
  };

  // ✅ Handle comment click with timestamp
  const handleCommentClick = (comment: any) => {
    if (!comment.timestampSeconds) return;
    
    addLog('comment', 'timestamp_click', { 
      commentId: comment.id, 
      time: comment.timestampSeconds,
      mediaType: comment.mediaType 
    });
    
    // Seek to timestamp based on media type
    if (comment.mediaType === 'video') {
      const videoBlock = blocks.find((b: any) => b.type === 'video');
      if (videoBlock) {
        setCurrentMedia({ type: 'video', url: videoBlock.url });
        setTimeout(() => {
          if (videoPlayerRef.current?.seekTo) {
            videoPlayerRef.current.seekTo(comment.timestampSeconds);
          }
        }, 800);
      }
    } else if (comment.mediaType === 'audio') {
      const audioBlock = blocks.find((b: any) => b.type === 'audio');
      if (audioBlock) {
        setCurrentMedia({ type: 'audio', url: audioBlock.url, startTime: comment.timestampSeconds });
      }
    }
  };

  const handleReport = (type: ReportType, name: string) => {
    setReportConfig({ type, name });
    setIsReportOpen(true);
  };

  const handleSaveNote = async () => {
    if (!newNoteText.trim()) return;
    if (!currentUserUid) {
      alert("يرجى تسجيل الدخول لحفظ الملاحظة");
      return;
    }
    
    const noteRef = push(ref(db, `sys/users/notes/${currentUserUid}/${lessonId}`));
    await set(noteRef, {
      text: newNoteText,
      time: currentTime,
      mediaType: currentMedia?.type || 'unknown', // ✅ حفظ نوع الوسائط
      mediaUrl: currentMedia?.url || '', // ✅ حفظ رابط الوسائط
      timestamp: serverTimestamp()
    });
    setNewNoteText('');
    addLog('note', 'create', { lessonId, noteId: noteRef.key, mediaType: currentMedia?.type, time: currentTime });
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!currentUserUid || !lessonId) return;
    await remove(ref(db, `sys/users/notes/${currentUserUid}/${lessonId}/${noteId}`));
  };

  // ✅ Handle Note Click - Switch to media and seek to time
  const handleNoteClick = async (note: any) => {
    if (!note.mediaType || note.mediaType === 'unknown') {
      addLog('note', 'click_error', { reason: 'no_media_type' });
      return;
    }

    addLog('note', 'click', { noteId: note.id, mediaType: note.mediaType, time: note.time });

    if (note.mediaType === 'video') {
      // Switch to video and seek
      const videoBlock = blocks.find((b: any) => b.type === 'video' && b.url === note.mediaUrl);
      if (videoBlock) {
        setCurrentMedia({ type: 'video', url: videoBlock.url });
        // Wait for player to initialize then seek
        setTimeout(() => {
          if (videoPlayerRef.current?.seekTo) {
            videoPlayerRef.current.seekTo(note.time);
            addLog('note', 'video_seek', { time: note.time });
          }
        }, 800);
      } else if (lessonData?.videoUrl) {
        setCurrentMedia({ type: 'video', url: lessonData.videoUrl });
        setPendingSeekTime(note.time);
        addLog('note', 'video_seek_pending', { time: note.time });
      }
    } else if (note.mediaType === 'audio') {
      // Switch to audio and seek - audio player uses currentTime prop
      const audioBlock = blocks.find((b: any) => b.type === 'audio' && b.url === note.mediaUrl);
      if (audioBlock) {
        setCurrentMedia({ type: 'audio', url: audioBlock.url, startTime: note.time });
        addLog('note', 'audio_seek', { time: note.time });
      } else if (lessonData?.audioUrl) {
        setCurrentMedia({ type: 'audio', url: lessonData.audioUrl, startTime: note.time });
        addLog('note', 'audio_seek_pending', { time: note.time });
      }
    } else if (note.mediaType === 'image') {
      // Open image in fullscreen
      setFullscreenImage(note.mediaUrl);
      addLog('note', 'image_open', { url: note.mediaUrl });
    }
  };

  const handleSeekTo = (time: number) => {
    if (currentMedia?.type === 'video') {
      if (videoPlayerRef.current?.seekTo) {
        videoPlayerRef.current.seekTo(time);
      }
    } else {
      const videoBlock = blocks.find((b: any) => b.type === 'video');
      if (videoBlock) {
        setPendingSeekTime(time);
        setCurrentMedia({ type: 'video', url: videoBlock.url });
        setActiveBlockView(null);
      } else if (lessonData?.videoUrl) {
        setPendingSeekTime(time);
        setCurrentMedia({ type: 'video', url: lessonData.videoUrl });
        setActiveBlockView(null);
      } else {
        alert("لا يوجد فيديو في هذا الدرس للانتقال إليه.");
      }
    }
  };

  const handleBlockClick = (block: any) => {
    trackClick(`block-${block.type}`, { id: block.id, type: block.type, url: block.url });
    addLog('info', `Block clicked: ${block.type}`, { block });

    if (['video', 'audio', 'image'].includes(block.type)) {
      setCurrentMedia({ type: block.type, url: block.url });
      setActiveBlockView(null);
    } else if (block.type === 'pdf' || block.type === 'text') {
      setActiveBlockView({ type: block.type, data: block });
    } else if (block.type === 'link') {
      window.open(block.url, '_blank');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: displayTitle,
          text: `شاهد هذا الدرس: ${displayTitle}`,
          url: window.location.href
        });
      } catch (e) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("تم نسخ الرابط");
    }
  };

  // ============================================
  // Render
  // ============================================

  return (
    <div className="w-full h-full bg-gray-50 dark:bg-gray-950 flex flex-col relative animate-fade-in overflow-hidden transition-colors">
      {/* Report Dialog */}
      <ReportDialog 
        isOpen={isReportOpen} 
        onClose={() => setIsReportOpen(false)} 
        type={reportConfig.type} 
        targetName={reportConfig.name} 
      />

      {/* Full Screen Viewers */}
      {activeBlockView?.type === 'pdf' && (
        <AdvancedPDFReader 
          url={activeBlockView.data.url} 
          title={displayTitle} 
          onBack={() => setActiveBlockView(null)} 
        />
      )}
      {activeBlockView?.type === 'text' && (
        <TextReader 
          content={activeBlockView.data.content} 
          title={displayTitle} 
          onBack={() => setActiveBlockView(null)} 
        />
      )}
      {fullscreenImage && (
        <FullscreenImageViewer 
          url={fullscreenImage} 
          onClose={() => setFullscreenImage(null)} 
        />
      )}

      {/* Video/Media Player Section */}
      <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden shrink-0">
        {currentMedia?.type === 'video' ? (
          <>
            <LectureVideoPlayer
              ref={videoPlayerRef}
              src={currentMedia.url}
              title={displayTitle}
              onBack={onBack}
              onReport={() => handleReport('lecture', displayTitle)}
              onComplete={handleComplete}
              onTimeUpdate={(time: number) => setCurrentTime(time)}
            />
            {/* ✅ Floating Timestamp Button for Comments */}
            <button
              onClick={handleCaptureTimestamp}
              className="absolute bottom-20 right-4 p-3 bg-primary/90 backdrop-blur-md text-white rounded-2xl shadow-lg shadow-primary/30 hover:bg-primary transition-all active:scale-90 z-30 group"
              title="التقاط الزمن للمناقشة"
            >
              <Clock className="w-6 h-6" />
              <span className="absolute -top-10 right-0 bg-white text-gray-800 px-3 py-1.5 rounded-xl text-[9px] font-black opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
                📌 التقاط الزمن للمناقشة
              </span>
            </button>
          </>
        ) : currentMedia?.type === 'audio' ? (
          <div className="w-full h-full bg-gradient-to-br from-indigo-900 to-primary flex flex-col items-center justify-center p-10 animate-fade-in">
            <button 
              onClick={onBack} 
              className="absolute top-10 right-6 p-2.5 bg-white/10 text-white rounded-xl backdrop-blur-md active:scale-95 transition-all z-20"
            >
              <ArrowRight className="w-5 h-5 rotate-180" />
            </button>
            <div className="w-24 h-24 bg-white/20 backdrop-blur-xl rounded-[2.5rem] flex items-center justify-center text-white mb-6 animate-pulse">
              <Headphones className="w-12 h-12" />
            </div>
            <div className="text-center mb-10">
              <h3 className="text-white font-black text-sm mb-1">{displayTitle}</h3>
              <p className="text-white/40 text-[9px] font-black uppercase tracking-widest">Audio Lecture Player</p>
            </div>
            <WaveformAudioPlayer 
              src={currentMedia.url} 
              onTimeUpdate={(time: number) => setCurrentTime(time)} 
            />
          </div>
        ) : currentMedia?.type === 'image' ? (
          <div
            className="w-full h-full bg-gray-900 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer"
            onClick={() => setFullscreenImage(currentMedia.url)}
          >
            <button 
              onClick={(e) => { e.stopPropagation(); onBack(); }} 
              className="absolute top-10 right-6 p-2.5 bg-white/10 text-white rounded-xl backdrop-blur-md active:scale-95 transition-all z-20"
            >
              <ArrowRight className="w-5 h-5 rotate-180" />
            </button>
            <div className="flex-1 w-full flex items-center justify-center p-4">
              <img 
                src={currentMedia.url} 
                alt="Media" 
                className="max-w-full max-h-full object-contain shadow-2xl rounded-lg" 
              />
            </div>
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 pointer-events-none">
              <span className="bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2">
                <Maximize2 className="w-4 h-4" /> اضغط للعرض الكامل
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center text-white/20 p-10 flex flex-col items-center">
            <PlayCircle className="w-16 h-16 mb-4" />
            <p className="text-xs font-black">اختر المحتوى لعرضه</p>
          </div>
        )}
      </div>

      {/* Title & Actions Section */}
      <div className="bg-white dark:bg-gray-900 p-5 shadow-sm border-b dark:border-gray-800 z-10 shrink-0">
        <div className="flex justify-between items-start mb-4">
          <div className="text-right">
            <h1 className="text-base font-black text-gray-800 dark:text-white leading-tight">{displayTitle}</h1>
            <div className="flex items-center justify-end gap-2 mt-1">
              <span className="text-[9px] text-gray-400 font-bold">
                {lessonData?.lessonNumber ? `الدرس ${lessonData.lessonNumber}` : 'محتوى أكاديمي'}
              </span>
              <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
              <span className="text-[9px] text-primary font-black">
                {lessonData?.unit || 'قسم عام'}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => { trackClick('share-lesson'); handleShare(); }} 
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-primary"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button 
              onClick={() => { trackClick('save-lesson'); handleSave(); }} 
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                isSaved ? 'bg-yellow-400 text-white' : 'bg-gray-50 dark:bg-gray-800 text-gray-400'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            </button>
            <button 
              onClick={() => { trackClick('like-lesson'); handleLike(); }} 
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                isLiked ? 'bg-primary text-white' : 'bg-gray-50 dark:bg-gray-800 text-gray-400'
              }`}
            >
              <ThumbsUp className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
        <button 
          onClick={() => { trackClick('complete-lesson'); handleComplete(); }} 
          disabled={isFinished} 
          className={`w-full py-3.5 rounded-2xl flex items-center justify-center gap-2.5 transition-all text-[11px] font-black ${
            isFinished 
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
              : 'bg-gray-900 text-white hover:bg-gray-800'
          }`}
        >
          <Check className="w-4 h-4" />
          <span>{isFinished ? 'تم إكمال هذا الدرس بنجاح' : 'تحديد الدرس كمكتمل'}</span>
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex bg-white dark:bg-gray-900 px-2 pt-2 border-b dark:border-gray-800 sticky top-0 z-10 overflow-x-auto no-scrollbar shrink-0">
        {[
          { id: 'info', label: 'المحتوى', icon: Layout },
          { id: 'comments', label: 'المناقشة', icon: MessageCircle, badge: commentsList.length },
          { id: 'questions', label: 'الأسئلة', icon: FileText, badge: questions.length },
          { id: 'docs', label: 'المرفقات', icon: Paperclip, badge: attachments.length },
          { id: 'notes', label: 'ملاحظاتي', icon: StickyNote }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { trackClick(`tab-${tab.id}`); setActiveTab(tab.id as any); }}
            className={`min-w-[80px] flex-1 py-3 text-[10px] font-black border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-400'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="bg-gray-50 dark:bg-gray-800 px-1 py-0.5 rounded-md text-[8px]">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content - Scrollable Area */}
      <div className="flex-1 bg-gray-50 dark:bg-gray-950 overflow-y-auto no-scrollbar">
        {/* Info Tab */}
        {activeTab === 'info' && (
          <div className="p-4 space-y-6 animate-fade-in pb-10">
            {/* ✅ Linked Assignment Display */}
            {linkedAssignment && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 p-5 rounded-[2rem] border border-amber-200 dark:border-amber-800 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                      <ClipboardList className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-amber-800 dark:text-amber-400">واجب مرتبط</h4>
                      <p className="text-[9px] text-amber-600 dark:text-amber-500 font-bold">{linkedAssignment.title}</p>
                    </div>
                  </div>
                  <Badge variant="warning" className="text-[7px] px-2 py-1">
                    {linkedAssignment.points} نقطة
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[9px] text-amber-700 dark:text-amber-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>التسليم: {new Date(linkedAssignment.dueDate).toLocaleDateString('ar-EG')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] text-amber-700 dark:text-amber-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>من {new Date(linkedAssignment.startTime).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})} إلى {new Date(linkedAssignment.endTime).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  {linkedAssignment.description && (
                    <p className="text-[10px] font-bold text-amber-800 dark:text-amber-400 leading-relaxed bg-white/50 dark:bg-amber-900/20 p-3 rounded-xl">
                      {linkedAssignment.description}
                    </p>
                  )}
                </div>
              </div>
            )}

            {objectives.length > 0 && (
              <div className="bg-emerald-50 dark:bg-emerald-900/10 p-5 rounded-[2rem] border border-emerald-100 dark:border-emerald-900/30">
                <div className="flex items-center justify-end gap-2 mb-4">
                  <h4 className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase">ماذا سنتعلم؟</h4>
                  <Target className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="space-y-2">
                  {objectives.map((obj: string, i: number) => (
                    <div key={i} className="flex items-start justify-end gap-2">
                      <p className="text-[11px] font-bold text-gray-600 dark:text-gray-400 text-right">{obj}</p>
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1.5 shrink-0"></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {blocks.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <p className="text-xs font-bold">لا يوجد محتوى للعرض</p>
              </div>
            ) : (
              <div className="space-y-3">
                {blocks.map((block: any, index: number) => {
                  const isActive = currentMedia?.type === block.type && currentMedia?.url === block.url;
                  return (
                    <div 
                      key={block.id || index} 
                      onClick={() => handleBlockClick(block)}
                      className={`p-4 rounded-[1.8rem] border-2 flex items-center justify-between transition-all cursor-pointer pointer-events-auto group ${
                        isActive 
                          ? 'bg-primary/5 border-primary shadow-sm' 
                          : 'bg-white dark:bg-gray-900 border-transparent hover:border-gray-200 dark:hover:border-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner transition-colors ${
                          isActive 
                            ? 'bg-primary text-white' 
                            : 'bg-gray-50 dark:bg-gray-800 text-gray-400 group-hover:text-primary'
                        }`}>
                          {block.type === 'video' && <PlayCircle className="w-5 h-5" />}
                          {block.type === 'audio' && <Headphones className="w-5 h-5" />}
                          {block.type === 'pdf' && <FileText className="w-5 h-5" />}
                          {block.type === 'image' && <ImageIcon className="w-5 h-5" />}
                          {block.type === 'text' && <AlignRight className="w-5 h-5" />}
                          {block.type === 'link' && <LinkIcon className="w-5 h-5" />}
                        </div>
                        <div className="text-right">
                          <h5 className={`text-[11px] font-black ${isActive ? 'text-primary' : 'text-gray-800 dark:text-white'}`}>
                            {block.type === 'video' ? 'شرح الفيديو' : 
                             block.type === 'audio' ? 'شرح صوتي' : 
                             block.type === 'pdf' ? 'ملخص PDF' : 
                             block.type === 'image' ? 'وسيلة تعليمية' : 
                             block.type === 'text' ? 'محتوى نصي' : 'رابط خارجي'}
                          </h5>
                          <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">{block.type}</p>
                        </div>
                      </div>
                      <div className={`p-1.5 rounded-lg transition-transform group-hover:translate-x-1 ${
                        isActive ? 'bg-primary/10 text-primary' : 'text-gray-300'
                      }`}>
                        <ChevronRight className="w-4 h-4 rotate-180" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Comments Tab */}
        {activeTab === 'comments' && (
          <CommentSection
            comments={commentsList}
            currentUserUid={currentUserUid}
            userFollowStatus={userFollowStatus}
            lessonId={lessonId}
            newCommentText={newCommentText}
            setNewCommentText={setNewCommentText}
            commentTimestamp={commentTimestamp}
            setCommentTimestamp={setCommentTimestamp}
            currentMedia={currentMedia}
            currentTime={currentTime}
            onPostComment={handlePostComment}
            onCaptureTimestamp={handleCaptureTimestamp}
            onCommentClick={handleCommentClick}
            onFollowUser={async (uid) => {
              if (userFollowStatus[uid]) return;
              await set(ref(db, `comm/engagement/social_graph/requests/${uid}/${currentUserUid}`), {
                fromUID: currentUserUid,
                timestamp: serverTimestamp()
              });
              alert("تم إرسال طلب المتابعة");
            }}
            onReport={handleReport}
          />
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="p-4 space-y-4 animate-fade-in pb-20">
            <div className="bg-white dark:bg-gray-900 p-4 rounded-[1.8rem] border dark:border-gray-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-primary bg-primary/5 px-2 py-1 rounded-lg">
                    {Math.floor(currentTime / 60)}:{(Math.floor(currentTime % 60)).toString().padStart(2, '0')}
                  </span>
                  {currentMedia && (
                    <span className="text-[7px] font-black text-primary bg-primary/5 px-1.5 py-0.5 rounded">
                      {currentMedia.type === 'video' ? '🎬' : currentMedia.type === 'audio' ? '🎧' : '🖼️'} {currentMedia.type}
                    </span>
                  )}
                </div>
                <h4 className="text-[10px] font-black text-gray-400 uppercase">إضافة ملاحظة زمنية</h4>
              </div>
              <textarea
                value={newNoteText}
                onChange={e => setNewNoteText(e.target.value)}
                className="w-full p-4 bg-gray-50 dark:bg-gray-950 rounded-2xl text-right text-xs font-bold outline-none h-24 resize-none mb-3"
                placeholder="اكتب ملاحظتك هنا..."
              />
              <button
                onClick={handleSaveNote}
                className="w-full py-3 bg-primary text-white rounded-xl text-[10px] font-black shadow-lg shadow-primary/20 active:scale-95 transition-all"
              >
                حفظ الملاحظة
              </button>
            </div>
            <div className="space-y-3">
              {notes.map((note: any) => (
                <div
                  key={note.id}
                  className="bg-white dark:bg-gray-900 p-4 rounded-2xl border dark:border-gray-800 shadow-sm flex items-start justify-between group active:scale-[0.98] transition-all cursor-pointer"
                  onClick={() => handleNoteClick(note)}
                >
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                      note.mediaType === 'video' ? 'bg-red-50 text-red-500' :
                      note.mediaType === 'audio' ? 'bg-green-50 text-green-500' :
                      note.mediaType === 'image' ? 'bg-blue-50 text-blue-500' :
                      'bg-primary/5 text-primary'
                    }`}>
                      {note.mediaType === 'video' && <PlayCircle className="w-5 h-5" />}
                      {note.mediaType === 'audio' && <Headphones className="w-5 h-5" />}
                      {note.mediaType === 'image' && <ImageIcon className="w-5 h-5" />}
                      {!note.mediaType && <Clock className="w-5 h-5" />}
                    </div>
                    <span className="text-[8px] font-black text-primary">
                      {Math.floor(note.time / 60)}:{(Math.floor(note.time % 60)).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <div className="text-right flex-1 px-4">
                    <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300 leading-relaxed">{note.text}</p>
                    {note.mediaType && (
                      <span className="text-[7px] text-primary font-black mt-1 inline-block">
                        {note.mediaType === 'video' ? '🎬 فيديو' :
                         note.mediaType === 'audio' ? '🎧 صوت' : '🖼️ صورة'}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }}
                    className="p-1.5 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {notes.length === 0 && (
                <div className="text-center py-10 text-gray-400">
                  <StickyNote className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-xs font-bold">لا توجد ملاحظات بعد</p>
                  <p className="text-[9px] mt-1">أضف ملاحظة أثناء المشاهدة</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ✅ Questions Tab */}
        {activeTab === 'questions' && (
          <div className="p-4 space-y-4 animate-fade-in pb-20">
            {/* Ask Question */}
            <div className="bg-white dark:bg-gray-900 p-4 rounded-[1.8rem] border dark:border-gray-800 shadow-sm">
              <h4 className="text-[10px] font-black text-gray-400 uppercase mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                طرح سؤال جديد
              </h4>
              <textarea
                value={newQuestionText}
                onChange={e => setNewQuestionText(e.target.value)}
                className="w-full p-4 bg-gray-50 dark:bg-gray-950 rounded-2xl text-right text-xs font-bold outline-none h-24 resize-none mb-3"
                placeholder="اكتب سؤالك هنا..."
              />
              <button
                onClick={() => {
                  if (!newQuestionText.trim()) return;
                  const qRef = push(ref(db, `comm/engagement/questions/${lessonId}`));
                  set(qRef, {
                    senderId: currentUserUid,
                    senderName: userDisplayName,
                    senderAvatar: userData?.user_photo || '',
                    text: newQuestionText,
                    timestamp: serverTimestamp(),
                    answers: []
                  });
                  setNewQuestionText('');
                }}
                className="w-full py-3 bg-primary text-white rounded-xl text-[10px] font-black shadow-lg shadow-primary/20 active:scale-95 transition-all"
              >
                طرح السؤال
              </button>
            </div>

            {/* Questions List */}
            <div className="space-y-3">
              {questions.map((q: any) => (
                <div key={q.id} className="bg-white dark:bg-gray-900 p-4 rounded-2xl border dark:border-gray-800 shadow-sm">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300 leading-relaxed">{q.text}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[7px] text-gray-400">{q.senderName}</span>
                        <span className="text-[7px] text-gray-400">•</span>
                        <span className="text-[7px] text-gray-400">{new Date(q.timestamp).toLocaleDateString('ar-EG')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Answers */}
                  {q.answers && q.answers.length > 0 && (
                    <div className="mr-13 mt-3 space-y-2 border-r-2 border-primary/20 pr-3">
                      {q.answers.map((a: any, idx: number) => (
                        <div key={idx} className="bg-primary/5 p-3 rounded-xl">
                          <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300">{a.text}</p>
                          <span className="text-[7px] text-gray-400">{a.senderName}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Answer */}
                  {selectedQuestion === q.id ? (
                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        value={newAnswerText}
                        onChange={e => setNewAnswerText(e.target.value)}
                        placeholder="اكتب إجابتك..."
                        className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-950 rounded-xl text-xs font-bold outline-none"
                      />
                      <button
                        onClick={() => {
                          if (!newAnswerText.trim()) return;
                          const answersRef = ref(db, `comm/engagement/questions/${lessonId}/${q.id}/answers`);
                          push(answersRef, {
                            senderId: currentUserUid,
                            senderName: userDisplayName,
                            text: newAnswerText,
                            timestamp: serverTimestamp()
                          });
                          setNewAnswerText('');
                          setSelectedQuestion(null);
                        }}
                        className="px-4 py-2 bg-primary text-white rounded-xl text-[9px] font-black"
                      >
                        إرسال
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedQuestion(q.id)}
                      className="mt-2 text-[9px] font-black text-primary hover:text-primary/80 flex items-center gap-1"
                    >
                      <MessageCircle className="w-3 h-3" />
                      {q.answers?.length || 0} إجابة
                    </button>
                  )}
                </div>
              ))}
              {questions.length === 0 && (
                <div className="text-center py-10 text-gray-400">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-xs font-bold">لا توجد أسئلة بعد</p>
                  <p className="text-[9px] mt-1">كن أول من يطرح سؤالاً</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Docs Tab with Smart Resolver */}
        {activeTab === 'docs' && (
          <AttachmentSection attachments={attachments} trackClick={trackClick} />
        )}
      </div>

      {/* Debug Track Button */}
      <button
        onClick={() => {
          trackClick('debug-toggle');
          addLog('info', 'Debug panel toggle requested', { location: 'all-view' });
        }}
        className="fixed bottom-4 left-4 z-[999997] p-3 bg-red-500 text-white rounded-full shadow-2xl hover:bg-red-600 transition-all animate-pulse"
        title="تفعيل وضع التتبع"
      >
        <Bug className="w-5 h-5" />
      </button>
    </div>
  );
};

// ============================================
// Attachment Section Component (with Smart Resolver)
// ============================================

const AttachmentSection: React.FC<{ attachments: any[]; trackClick: (event: string, data?: any) => void }> = ({ attachments, trackClick }) => {
  const [loadingUrl, setLoadingUrl] = useState<string | null>(null);

  const handleOpenAttachment = async (att: any) => {
    trackClick('download-attachment', { name: att.name });
    
    // Resolve URL if it's a Telegram link
    setLoadingUrl(att.url);
    try {
        let finalUrl = att.url;
        if (att.url.includes('api.telegram.org')) {
            const fileId = att.fileId || att.url.split('/').pop();
            if (fileId) {
                const fresh = await ImageProcessingService.resolveFileId(fileId);
                if (fresh) finalUrl = fresh;
            }
        }
        window.open(finalUrl, '_blank');
    } catch (error) {
        console.error("Error opening attachment:", error);
    } finally {
        setLoadingUrl(null);
    }
  };

  return (
    <div className="p-4 space-y-3 animate-fade-in">
      {loadingUrl && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-2xl flex items-center gap-3 shadow-2xl">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-xs font-black uppercase tracking-widest">جاري تجهيز الملف...</span>
        </div>
      )}
      
      {attachments.map((att: any, idx: number) => (
        <div
          key={idx}
          className="bg-white dark:bg-gray-900 p-5 rounded-[2rem] border dark:border-gray-800 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all cursor-pointer"
          onClick={() => handleOpenAttachment(att)}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/5 rounded-[1.2rem] flex items-center justify-center text-primary shadow-inner group-hover:bg-primary group-hover:text-white transition-colors">
              <FileText className="w-6 h-6" />
            </div>
            <div className="text-right">
              <h4 className="font-black text-xs dark:text-white mb-1 truncate max-w-[180px]">{att.name}</h4>
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{att.type || 'DOC'}</p>
            </div>
          </div>
          <Download className="w-5 h-5 text-gray-200 group-hover:text-primary transition-colors" />
        </div>
      ))}
      {attachments.length === 0 && (
        <p className="text-center py-10 text-xs font-bold text-gray-400">لا توجد مرفقات</p>
      )}
    </div>
  );
};

export default AllViewPage;
