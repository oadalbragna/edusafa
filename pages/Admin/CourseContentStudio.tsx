/**
 * Course Content Studio - استوديو محتوى المقرر
 * 
 * واجهة متكاملة لرفع وإدارة المحتوى التعليمي
 * للمشرفين والمعلمين لإضافة الدروس والواجبات والاختبارات
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ref, push, set, onValue, remove, serverTimestamp, update } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getDb as db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/ToastProvider';
import {
  Upload, FileText, Video, BookOpen, ClipboardList, 
  Plus, Trash2, Edit2, Save, X, Eye, ArrowRight,
  File, FileCheck, FileQuestion, Image as ImageIcon,
  Link as LinkIcon, Loader2, CheckCircle2, AlertCircle
} from 'lucide-react';

// Types
interface ContentBlock {
  id: string;
  type: 'text' | 'video' | 'pdf' | 'image' | 'link' | 'assignment' | 'quiz';
  title: string;
  content?: string;
  url?: string;
  fileId?: string;
  order: number;
}

interface Lesson {
  id: string;
  title: string;
  description: string;
  lessonNumber: number;
  unit?: string;
  blocks: ContentBlock[];
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  status: 'draft' | 'published';
}

interface CourseData {
  id: string;
  name: string;
  level?: string;
  description?: string;
}

const CourseContentStudio: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const { showSuccess, showError, showWarning, showInfo } = useToast();

  // Get course info from navigation state or URL
  const courseData = location.state?.course as CourseData | null;
  const courseId = courseData?.id || '';

  // States
  const [loading, setLoading] = useState(false);
  const [existingLessons, setExistingLessons] = useState<Lesson[]>([]);
  const [activeTab, setActiveTab] = useState<'upload' | 'manage'>('upload');
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  // Lesson form
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonNumber, setLessonNumber] = useState('');
  const [lessonUnit, setLessonUnit] = useState('');
  const [lessonDescription, setLessonDescription] = useState('');
  
  // Content blocks
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [uploadingBlock, setUploadingBlock] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fetch existing lessons
  useEffect(() => {
    if (!courseId) return;

    const lessonsRef = ref(db, `edu/courses/${courseId}/lessons`);
    const unsubscribe = onValue(lessonsRef, (snapshot) => {
      if (snapshot.exists()) {
        const lessonsData = snapshot.val();
        const lessonsList: Lesson[] = Object.entries(lessonsData).map(([id, data]: [string, any]) => ({
          id,
          ...data
        }));
        lessonsList.sort((a, b) => b.createdAt - a.createdAt);
        setExistingLessons(lessonsList);
      } else {
        setExistingLessons([]);
      }
    });

    return () => unsubscribe();
  }, [courseId]);

  // Add new content block
  const addBlock = (type: ContentBlock['type']) => {
    const newBlock: ContentBlock = {
      id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      title: '',
      content: type === 'text' ? '' : undefined,
      url: undefined,
      order: blocks.length
    };
    setBlocks([...blocks, newBlock]);
  };

  // Remove block
  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
  };

  // Update block
  const updateBlock = (id: string, updates: Partial<ContentBlock>) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  // Handle file upload
  const handleFileUpload = async (blockId: string, file: File) => {
    if (!courseId || !profile?.uid) return;

    setUploadingBlock(blockId);
    setUploadProgress(0);

    try {
      const storage = getStorage();
      const timestamp = Date.now();
      const fileName = `${profile.uid}/${courseId}/${timestamp}_${file.name}`;
      const fileRef = storageRef(storage, `courses/${fileName}`);

      // Upload file
      const snapshot = await uploadBytes(fileRef, file, {
        customMetadata: {
          courseId,
          uploadedBy: profile.uid,
          timestamp: timestamp.toString()
        }
      });

      const downloadURL = await getDownloadURL(snapshot.ref);

      // Update block with file URL
      updateBlock(blockId, {
        url: downloadURL,
        fileId: fileName,
        title: file.name
      });

      showSuccess('تم رفع الملف بنجاح');
    } catch (error: any) {
      console.error('File upload error:', error);
      showError('فشل رفع الملف: ' + (error.message || 'خطأ غير معروف'));
    } finally {
      setUploadingBlock(null);
      setUploadProgress(0);
    }
  };

  // Save lesson
  const saveLesson = async (status: 'draft' | 'published' = 'draft') => {
    if (!courseId || !profile?.uid) {
      showError('بيانات المقرر غير مكتملة');
      return;
    }

    if (!lessonTitle.trim()) {
      showWarning('يرجى إدخال عنوان الدرس');
      return;
    }

    if (blocks.length === 0) {
      showWarning('يرجى إضافة محتوى واحد على الأقل');
      return;
    }

    setLoading(true);

    try {
      const lessonsRef = ref(db, `edu/courses/${courseId}/lessons`);
      const lessonId = editingLesson?.id || push(lessonsRef).key;

      if (!lessonId) {
        showError('فشل إنشاء معرف للدرس');
        setLoading(false);
        return;
      }

      const lessonData = {
        title: lessonTitle.trim(),
        description: lessonDescription.trim(),
        lessonNumber: parseInt(lessonNumber) || existingLessons.length + 1,
        unit: lessonUnit.trim() || undefined,
        blocks: blocks.map((b, i) => ({ ...b, order: i })),
        status,
        createdBy: profile.uid,
        createdAt: editingLesson?.createdAt || Date.now(),
        updatedAt: Date.now()
      };

      const lessonRef = ref(db, `edu/courses/${courseId}/lessons/${lessonId}`);
      await set(lessonRef, lessonData);

      showSuccess(status === 'published' ? 'تم نشر الدرس بنجاح ✨' : 'تم حفظ المسودة بنجاح');
      
      // Reset form
      resetForm();
      setActiveTab('manage');
    } catch (error: any) {
      console.error('Save lesson error:', error);
      showError('فشل حفظ الدرس: ' + (error.message || 'خطأ غير معروف'));
    } finally {
      setLoading(false);
    }
  };

  // Delete lesson
  const deleteLesson = async (lessonId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الدرس نهائياً؟ لا يمكن التراجع عن هذا الإجراء.')) {
      return;
    }

    try {
      const lessonRef = ref(db, `edu/courses/${courseId}/lessons/${lessonId}`);
      await remove(lessonRef);
      showInfo('تم حذف الدرس بنجاح');
    } catch (error: any) {
      showError('فشل حذف الدرس: ' + (error.message || 'خطأ غير معروف'));
    }
  };

  // Edit lesson
  const editLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setLessonTitle(lesson.title);
    setLessonNumber(lesson.lessonNumber.toString());
    setLessonUnit(lesson.unit || '');
    setLessonDescription(lesson.description);
    setBlocks(lesson.blocks || []);
    setActiveTab('upload');
    showInfo('تم تحميل بيانات الدرس للتعديل');
  };

  // Reset form
  const resetForm = () => {
    setLessonTitle('');
    setLessonNumber('');
    setLessonUnit('');
    setLessonDescription('');
    setBlocks([]);
    setEditingLesson(null);
  };

  // Toggle lesson status
  const toggleLessonStatus = async (lesson: Lesson) => {
    try {
      const newStatus = lesson.status === 'published' ? 'draft' : 'published';
      const lessonRef = ref(db, `edu/courses/${courseId}/lessons/${lesson.id}`);
      await update(lessonRef, {
        status: newStatus,
        updatedAt: Date.now()
      });
      showSuccess(newStatus === 'published' ? 'تم نشر الدرس' : 'تم تحويل الدرس إلى مسودة');
    } catch (error: any) {
      showError('فشل تحديث حالة الدرس');
    }
  };

  // Get block icon
  const getBlockIcon = (type: ContentBlock['type']) => {
    switch (type) {
      case 'text': return <FileText className="w-5 h-5" />;
      case 'video': return <Video className="w-5 h-5" />;
      case 'pdf': return <File className="w-5 h-5" />;
      case 'image': return <ImageIcon className="w-5 h-5" />;
      case 'link': return <LinkIcon className="w-5 h-5" />;
      case 'assignment': return <FileQuestion className="w-5 h-5" />;
      case 'quiz': return <FileCheck className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  // Get block type label
  const getBlockTypeLabel = (type: ContentBlock['type']) => {
    switch (type) {
      case 'text': return 'نص';
      case 'video': return 'فيديو';
      case 'pdf': return 'مستند PDF';
      case 'image': return 'صورة';
      case 'link': return 'رابط';
      case 'assignment': return 'واجب';
      case 'quiz': return 'اختبار';
      default: return 'محتوى';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowRight className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  استوديو محتوى المقرر
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {courseData?.name || 'مقرر غير محدد'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  resetForm();
                  setActiveTab('upload');
                }}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === 'upload'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Plus className="w-4 h-4 inline ml-1" />
                درس جديد
              </button>
              <button
                onClick={() => setActiveTab('manage')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === 'manage'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                إدارة الدروس ({existingLessons.length})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'upload' ? (
          <div className="space-y-6">
            {/* Lesson Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">بيانات الدرس</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    عنوان الدرس <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    placeholder="مثال: مقدمة في البرمجة"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    رقم الدرس
                  </label>
                  <input
                    type="number"
                    value={lessonNumber}
                    onChange={(e) => setLessonNumber(e.target.value)}
                    placeholder="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الوحدة
                  </label>
                  <input
                    type="text"
                    value={lessonUnit}
                    onChange={(e) => setLessonUnit(e.target.value)}
                    placeholder="الوحدة الأولى"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    وصف الدرس
                  </label>
                  <textarea
                    value={lessonDescription}
                    onChange={(e) => setLessonDescription(e.target.value)}
                    placeholder="وصف مختصر لمحتوى الدرس..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Content Blocks */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">محتوى الدرس</h2>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => addBlock('text')}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                  >
                    <FileText className="w-4 h-4 inline ml-1" />
                    نص
                  </button>
                  <button
                    onClick={() => addBlock('video')}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Video className="w-4 h-4 inline ml-1" />
                    فيديو
                  </button>
                  <button
                    onClick={() => addBlock('pdf')}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                  >
                    <File className="w-4 h-4 inline ml-1" />
                    مستند
                  </button>
                  <button
                    onClick={() => addBlock('assignment')}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                  >
                    <FileQuestion className="w-4 h-4 inline ml-1" />
                    واجب
                  </button>
                  <button
                    onClick={() => addBlock('quiz')}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                  >
                    <FileCheck className="w-4 h-4 inline ml-1" />
                    اختبار
                  </button>
                </div>
              </div>

              {blocks.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">لا يوجد محتوى بعد</p>
                  <p className="text-xs mt-1">اضغط على أحد الأزرار أعلاه لإضافة محتوى</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {blocks.map((block, index) => (
                    <div
                      key={block.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            {getBlockIcon(block.type)}
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            {index + 1}. {getBlockTypeLabel(block.type)}
                          </span>
                        </div>
                        <button
                          onClick={() => removeBlock(block.id)}
                          className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Block content based on type */}
                      {block.type === 'text' && (
                        <textarea
                          value={block.content || ''}
                          onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                          placeholder="اكتب المحتوى هنا..."
                          rows={4}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      )}

                      {(block.type === 'video' || block.type === 'pdf' || block.type === 'image') && (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={block.title || ''}
                            onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                            placeholder="عنوان الملف"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          
                          {!block.url ? (
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                              {uploadingBlock === block.id ? (
                                <div>
                                  <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-blue-600" />
                                  <p className="text-sm text-gray-600">جاري الرفع... {uploadProgress}%</p>
                                </div>
                              ) : (
                                <div>
                                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                  <p className="text-sm text-gray-600 mb-2">اختر ملف للرفع</p>
                                  <input
                                    type="file"
                                    accept={block.type === 'video' ? 'video/*' : block.type === 'pdf' ? '.pdf' : 'image/*'}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleFileUpload(block.id, file);
                                    }}
                                    className="hidden"
                                    id={`file-${block.id}`}
                                  />
                                  <label
                                    htmlFor={`file-${block.id}`}
                                    className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors text-sm font-medium"
                                  >
                                    اختيار ملف
                                  </label>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-green-800">{block.title}</p>
                                <p className="text-xs text-green-600 truncate">{block.url}</p>
                              </div>
                              <button
                                onClick={() => updateBlock(block.id, { url: undefined, fileId: undefined, title: '' })}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {(block.type === 'assignment' || block.type === 'quiz') && (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={block.title || ''}
                            onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                            placeholder={`عنوان ${block.type === 'assignment' ? 'الواجب' : 'الاختبار'}`}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <textarea
                            value={block.content || ''}
                            onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                            placeholder="تفاصيل الواجب أو الاختبار..."
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      )}

                      {block.type === 'link' && (
                        <input
                          type="url"
                          value={block.url || ''}
                          onChange={(e) => updateBlock(block.id, { url: e.target.value })}
                          placeholder="https://example.com/resource"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => saveLesson('draft')}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 inline animate-spin ml-2" />
                ) : (
                  <Save className="w-5 h-5 inline ml-2" />
                )}
                حفظ كمسودة
              </button>
              <button
                onClick={() => saveLesson('published')}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 inline animate-spin ml-2" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 inline ml-2" />
                )}
                نشر الدرس
              </button>
            </div>
          </div>
        ) : (
          /* Manage Lessons */
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">الدروس الموجودة</h2>
            </div>
            
            {existingLessons.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">لا توجد دروس بعد</p>
                <p className="text-sm">ابدأ بإضافة درس جديد من تبويب "درس جديد"</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {existingLessons.map((lesson) => (
                  <div key={lesson.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-gray-900">
                            درس {lesson.lessonNumber}: {lesson.title}
                          </span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            lesson.status === 'published'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {lesson.status === 'published' ? 'منشور' : 'مسودة'}
                          </span>
                        </div>
                        {lesson.unit && (
                          <p className="text-sm text-gray-500 mb-1">الوحدة: {lesson.unit}</p>
                        )}
                        {lesson.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">{lesson.description}</p>
                        )}
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          <span>{lesson.blocks?.length || 0} محتوى</span>
                          <span>
                            {new Date(lesson.createdAt).toLocaleDateString('ar-SA')}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleLessonStatus(lesson)}
                          className={`p-2 rounded-lg transition-colors ${
                            lesson.status === 'published'
                              ? 'hover:bg-gray-100 text-gray-600'
                              : 'hover:bg-blue-50 text-blue-600'
                          }`}
                          title={lesson.status === 'published' ? 'تحويل لمسودة' : 'نشر'}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => editLesson(lesson)}
                          className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                          title="تعديل"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteLesson(lesson.id)}
                          className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseContentStudio;
