/**
 * EduSafa Learning - Advanced Exam Builder
 * 
 * صفحة احترافية لإنشاء الاختبارات والامتحانات الإلكترونية
 * مع دعم أنواع متعددة من الأسئلة
 */

import React, { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/ToastProvider';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  Plus, Trash2, Edit2, Save, Eye, EyeOff, Clock, CheckCircle,
  XCircle, AlertCircle, ChevronUp, ChevronDown, GripVertical,
  FileText, Type, List, CheckSquare, AlignLeft, Image, Link,
  Settings, Timer, Award, Target, BookOpen, HelpCircle
} from 'lucide-react';
import { db } from '../../services/firebase';
import { ref, get, set, push, update } from 'firebase/database';
import { EDU } from '../../constants/dbPaths';
import { sanitizeHTML } from '../../utils/security';

// ============================================================================
// Types
// ============================================================================

type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'matching' | 'ordering';

interface Question {
  id: string;
  type: QuestionType;
  question: string;
  explanation?: string;
  points: number;
  options?: string[];
  correctAnswer?: string | string[];
  order?: number;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio';
}

interface Exam {
  id: string;
  title: string;
  description: string;
  instructions: string;
  classId: string;
  subjectId: string;
  questions: Question[];
  duration: number;
  totalPoints: number;
  passPercentage: number;
  shuffleQuestions: boolean;
  showCorrectAnswers: boolean;
  allowReview: boolean;
  attempts: number;
  startDate?: string;
  dueDate?: string;
  status: 'draft' | 'published' | 'active' | 'closed';
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Main Component
// ============================================================================

const ExamBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const toast = useToast();

  // State
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exam, setExam] = useState<Partial<Exam>>({
    title: '',
    description: '',
    instructions: '',
    duration: 60,
    totalPoints: 0,
    passPercentage: 50,
    shuffleQuestions: false,
    showCorrectAnswers: true,
    allowReview: true,
    attempts: 1,
    status: 'draft',
    questions: []
  });

  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // ============================================================================
  // Effects
  // ============================================================================

  React.useEffect(() => {
    if (id) {
      loadExam(id);
    }
  }, [id]);

  // ============================================================================
  // Load Exam
  // ============================================================================

  const loadExam = async (examId: string) => {
    try {
      setLoading(true);
      // Try new path first, then fallback to legacy path
      const examRef = ref(db, `${EDU.EXAMS}/${examId}`);
      const snapshot = await get(examRef);

      if (snapshot.exists()) {
        setExam(snapshot.val());
      } else {
        // Fallback to legacy path
        const legacyExamRef = ref(db, `${EDU.SCH.CLASSES}/exam/${examId}`);
        const legacySnapshot = await get(legacyExamRef);
        
        if (legacySnapshot.exists()) {
          setExam(legacySnapshot.val());
        } else {
          toast.showError('الاختبار غير موجود');
          navigate('/teacher');
        }
      }
    } catch (error) {
      console.error('Error loading exam:', error);
      toast.showError('خطأ في تحميل الاختبار');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // Question Management
  // ============================================================================

  const addQuestion = useCallback((type: QuestionType) => {
    const newQuestion: Question = {
      id: `q_${Date.now()}`,
      type,
      question: '',
      points: 1,
      options: type === 'multiple_choice' ? ['', '', '', ''] : undefined,
      correctAnswer: type === 'true_false' ? 'true' : undefined,
      order: (exam.questions?.length || 0) + 1
    };

    setExam(prev => ({
      ...prev,
      questions: [...(prev.questions || []), newQuestion]
    }));

    setActiveQuestionIndex((exam.questions?.length || 0));
  }, [exam.questions]);

  const updateQuestion = useCallback((index: number, updates: Partial<Question>) => {
    setExam(prev => {
      const questions = [...(prev.questions || [])];
      questions[index] = { ...questions[index], ...updates };
      return { ...prev, questions };
    });
  }, []);

  const deleteQuestion = useCallback((index: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا السؤال؟')) return;

    setExam(prev => {
      const questions = [...(prev.questions || [])];
      questions.splice(index, 1);
      return { ...prev, questions };
    });

    if (activeQuestionIndex === index) {
      setActiveQuestionIndex(null);
    }
  }, [activeQuestionIndex]);

  const duplicateQuestion = useCallback((index: number) => {
    setExam(prev => {
      const questions = [...(prev.questions || [])];
      const duplicate = { 
        ...questions[index], 
        id: `q_${Date.now()}`,
        order: (prev.questions?.length || 0) + 1
      };
      questions.splice(index + 1, 0, duplicate);
      return { ...prev, questions };
    });
  }, []);

  const moveQuestion = useCallback((index: number, direction: 'up' | 'down') => {
    setExam(prev => {
      const questions = [...(prev.questions || [])];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      
      if (newIndex < 0 || newIndex >= questions.length) return prev;
      
      [questions[index], questions[newIndex]] = [questions[newIndex], questions[index]];
      return { ...prev, questions };
    });
  }, []);

  // ============================================================================
  // Save Exam
  // ============================================================================

  const saveExam = async () => {
    if (!exam.title?.trim()) {
      toast.showError('يرجى إدخال عنوان الاختبار');
      return;
    }

    if (!exam.questions?.length) {
      toast.showError('يرجى إضافة سؤال واحد على الأقل');
      return;
    }

    if (!exam.classId || !exam.subjectId) {
      toast.showError('يرجى اختيار الفصل والمادة');
      return;
    }

    try {
      setSaving(true);

      const examData: Partial<Exam> = {
        ...exam,
        title: sanitizeHTML(exam.title),
        description: sanitizeHTML(exam.description || ''),
        instructions: sanitizeHTML(exam.instructions || ''),
        totalPoints: exam.questions?.reduce((sum, q) => sum + (q.points || 0), 0) || 0,
        updatedAt: new Date().toISOString()
      };

      if (id) {
        // Update existing exam - use new global path
        const examRef = ref(db, `${EDU.EXAMS}/${id}`);
        await update(examRef, examData);
        
        // Also update in class-specific path for backward compatibility
        const classExamRef = ref(db, `${EDU.SCH.CLASSES}/${exam.classId}/exams/${id}`);
        await update(classExamRef, examData);
        
        toast.showSuccess('تم تحديث الاختبار بنجاح');
      } else {
        // Create new exam - use new global path
        const newExamRef = push(ref(db, EDU.EXAMS));
        const examWithMeta = {
          ...examData,
          id: newExamRef.key,
          createdAt: new Date().toISOString()
        };
        await set(newExamRef, examWithMeta);
        
        // Also store in class-specific path for backward compatibility
        const classExamRef = push(ref(db, `${EDU.SCH.CLASSES}/${exam.classId}/exams`));
        await set(classExamRef, { ...examWithMeta, id: classExamRef.key });
        
        toast.showSuccess('تم إنشاء الاختبار بنجاح');
      }

      // Navigate back to teacher dashboard
      navigate('/teacher');
    } catch (error: any) {
      console.error('Error saving exam:', error);
      toast.showError('فشل حفظ الاختبار', error.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (loading) {
    return <LoadingSpinner fullScreen text="جاري تحميل الاختبار..." />;
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/teacher')}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <ChevronUp className="w-5 h-5 rotate-90" />
              </button>
              <div>
                <h1 className="text-xl font-black text-slate-900">منشئ الاختبارات</h1>
                <p className="text-xs text-slate-500">أنشئ اختبارات إلكترونية احترافية</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPreview(true)}
                className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-xl font-bold text-sm hover:bg-slate-50"
              >
                <Eye className="w-4 h-4" />
                معاينة
              </button>
              <button
                onClick={saveExam}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-xl font-bold text-sm hover:bg-brand-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'جاري الحفظ...' : 'حفظ الاختبار'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Questions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Add Question Button */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-700 mb-4">إضافة سؤال</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <QuestionTypeButton
                  icon={List}
                  label="اختيار من متعدد"
                  onClick={() => addQuestion('multiple_choice')}
                />
                <QuestionTypeButton
                  icon={CheckSquare}
                  label="صح أو خطأ"
                  onClick={() => addQuestion('true_false')}
                />
                <QuestionTypeButton
                  icon={Type}
                  label="إجابة قصيرة"
                  onClick={() => addQuestion('short_answer')}
                />
                <QuestionTypeButton
                  icon={AlignLeft}
                  label="مقالة"
                  onClick={() => addQuestion('essay')}
                />
                <QuestionTypeButton
                  icon={Image}
                  label="مطابقة"
                  onClick={() => addQuestion('matching')}
                />
                <QuestionTypeButton
                  icon={GripVertical}
                  label="ترتيب"
                  onClick={() => addQuestion('ordering')}
                />
              </div>
            </div>

            {/* Questions List */}
            {exam.questions?.map((question, index) => (
              <QuestionCard
                key={question.id}
                question={question}
                index={index}
                isActive={activeQuestionIndex === index}
                onFocus={() => setActiveQuestionIndex(index)}
                onUpdate={(updates) => updateQuestion(index, updates)}
                onDelete={() => deleteQuestion(index)}
                onDuplicate={() => duplicateQuestion(index)}
                onMoveUp={() => moveQuestion(index, 'up')}
                onMoveDown={() => moveQuestion(index, 'down')}
              />
            ))}

            {exam.questions?.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <HelpCircle className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-bold text-slate-700 mb-2">لا توجد أسئلة بعد</h3>
                <p className="text-slate-500 mb-4">ابدأ بإضافة أسئلة للاختبار</p>
              </div>
            )}
          </div>

          {/* Sidebar - Exam Settings */}
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-700 mb-4">معلومات الاختبار</h2>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">العنوان</label>
                <input
                  type="text"
                  value={exam.title}
                  onChange={(e) => setExam(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  placeholder="عنوان الاختبار"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">الوصف</label>
                <textarea
                  value={exam.description}
                  onChange={(e) => setExam(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  placeholder="وصف الاختبار"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">التعليمات</label>
                <textarea
                  value={exam.instructions}
                  onChange={(e) => setExam(prev => ({ ...prev, instructions: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  placeholder="تعليمات للطلاب"
                  rows={3}
                />
              </div>
            </div>

            {/* Settings */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                إعدادات الاختبار
              </h2>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">المدة (دقائق)</label>
                <div className="relative">
                  <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="number"
                    value={exam.duration}
                    onChange={(e) => setExam(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                    className="w-full pl-4 pr-12 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">نسبة النجاح (%)</label>
                <div className="relative">
                  <Target className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={exam.passPercentage}
                    onChange={(e) => setExam(prev => ({ ...prev, passPercentage: parseInt(e.target.value) || 0 }))}
                    className="w-full pl-4 pr-12 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">عدد المحاولات</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={exam.attempts}
                  onChange={(e) => setExam(prev => ({ ...prev, attempts: parseInt(e.target.value) || 1 }))}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-200">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exam.shuffleQuestions}
                    onChange={(e) => setExam(prev => ({ ...prev, shuffleQuestions: e.target.checked }))}
                    className="w-5 h-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm font-bold text-slate-700">خلط الأسئلة</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exam.showCorrectAnswers}
                    onChange={(e) => setExam(prev => ({ ...prev, showCorrectAnswers: e.target.checked }))}
                    className="w-5 h-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm font-bold text-slate-700">عرض الإجابات الصحيحة بعد التسليم</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exam.allowReview}
                    onChange={(e) => setExam(prev => ({ ...prev, allowReview: e.target.checked }))}
                    className="w-5 h-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm font-bold text-slate-700">السماح بمراجعة الإجابات</span>
                </label>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl p-6 text-white">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold">عدد الأسئلة</span>
                  <span className="text-2xl font-black">{exam.questions?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold">إجمالي النقاط</span>
                  <span className="text-2xl font-black">
                    {exam.questions?.reduce((sum, q) => sum + (q.points || 0), 0) || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold">المدة</span>
                  <span className="text-2xl font-black">{exam.duration} دقيقة</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <PreviewModal
          exam={exam}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
};

// ============================================================================
// Sub-Components
// ============================================================================

const QuestionTypeButton: React.FC<{
  icon: any;
  label: string;
  onClick: () => void;
}> = ({ icon: Icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-2 p-4 border-2 border-slate-200 rounded-xl hover:border-brand-500 hover:bg-brand-50 transition-all"
  >
    <Icon className="w-6 h-6 text-brand-600" />
    <span className="font-bold text-sm text-slate-700">{label}</span>
  </button>
);

const QuestionCard: React.FC<{
  question: Question;
  index: number;
  isActive: boolean;
  onFocus: () => void;
  onUpdate: (updates: Partial<Question>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}> = ({ question, index, isActive, onFocus, onUpdate, onDelete, onDuplicate, onMoveUp, onMoveDown }) => {
  const icons: Record<QuestionType, any> = {
    multiple_choice: List,
    true_false: CheckSquare,
    short_answer: Type,
    essay: AlignLeft,
    matching: Image,
    ordering: GripVertical
  };

  const Icon = icons[question.type];

  return (
    <div
      className={`bg-white rounded-2xl border-2 transition-all ${isActive ? 'border-brand-500 shadow-lg shadow-brand-500/10' : 'border-slate-200'}`}
      onClick={onFocus}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-brand-100 text-brand-600 p-2 rounded-lg">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-700">السؤال {index + 1}</span>
              <span className="text-xs text-slate-500 mr-2">
                {question.type === 'multiple_choice' ? 'اختيار من متعدد' :
                 question.type === 'true_false' ? 'صح أو خطأ' :
                 question.type === 'short_answer' ? 'إجابة قصيرة' :
                 question.type === 'essay' ? 'مقالة' :
                 question.type === 'matching' ? 'مطابقة' : 'ترتيب'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <ChevronUp className="w-4 h-4 rotate-180" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
              className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-brand-50"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Question Text */}
        <textarea
          value={question.question}
          onChange={(e) => onUpdate({ question: e.target.value })}
          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 mb-4"
          placeholder="اكتب السؤال هنا..."
          rows={3}
          onClick={(e) => e.stopPropagation()}
        />

        {/* Points */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-600" />
            <label className="text-sm font-bold text-slate-700">النقاط:</label>
            <input
              type="number"
              min="1"
              value={question.points}
              onChange={(e) => onUpdate({ points: parseInt(e.target.value) || 1 })}
              className="w-20 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>

        {/* Options for Multiple Choice */}
        {question.type === 'multiple_choice' && question.options && (
          <div className="space-y-3">
            <p className="text-sm font-bold text-slate-700">الخيارات:</p>
            {question.options.map((option, optIndex) => (
              <div key={optIndex} className="flex items-center gap-3">
                <input
                  type="radio"
                  name={`correct-${question.id}`}
                  checked={question.correctAnswer === String(optIndex)}
                  onChange={() => onUpdate({ correctAnswer: String(optIndex) })}
                  className="w-4 h-4 text-brand-600"
                />
                <input
                  type="text"
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...question.options!];
                    newOptions[optIndex] = e.target.value;
                    onUpdate({ options: newOptions });
                  }}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  placeholder={`الخيار ${optIndex + 1}`}
                />
              </div>
            ))}
          </div>
        )}

        {/* True/False */}
        {question.type === 'true_false' && (
          <div className="flex gap-3">
            <label className="flex items-center gap-2 flex-1 p-3 border border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50">
              <input
                type="radio"
                name={`tf-${question.id}`}
                checked={question.correctAnswer === 'true'}
                onChange={() => onUpdate({ correctAnswer: 'true' })}
                className="w-4 h-4 text-brand-600"
              />
              <span className="font-bold text-slate-700">صح</span>
            </label>
            <label className="flex items-center gap-2 flex-1 p-3 border border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50">
              <input
                type="radio"
                name={`tf-${question.id}`}
                checked={question.correctAnswer === 'false'}
                onChange={() => onUpdate({ correctAnswer: 'false' })}
                className="w-4 h-4 text-brand-600"
              />
              <span className="font-bold text-slate-700">خطأ</span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
};

const PreviewModal: React.FC<{
  exam: Partial<Exam>;
  onClose: () => void;
}> = ({ exam, onClose }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
      <div className="p-6 border-b border-slate-200">
        <h2 className="text-2xl font-black text-slate-900 mb-2">{exam.title}</h2>
        <p className="text-slate-500">{exam.description}</p>
      </div>

      <div className="p-6 space-y-6">
        <div className="bg-slate-50 rounded-2xl p-6">
          <h3 className="font-bold text-slate-700 mb-4">معلومات الاختبار</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-500 mb-1">المدة</p>
              <p className="font-bold text-slate-900">{exam.duration} دقيقة</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">عدد الأسئلة</p>
              <p className="font-bold text-slate-900">{exam.questions?.length}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">إجمالي النقاط</p>
              <p className="font-bold text-slate-900">{exam.totalPoints}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">نسبة النجاح</p>
              <p className="font-bold text-slate-900">{exam.passPercentage}%</p>
            </div>
          </div>
        </div>

        {exam.instructions && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <h3 className="font-bold text-amber-900 mb-2">التعليمات</h3>
            <p className="text-amber-700">{exam.instructions}</p>
          </div>
        )}

        <div className="space-y-4">
          <h3 className="font-bold text-slate-700">الأسئلة</h3>
          {exam.questions?.map((q, i) => (
            <div key={q.id} className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="flex items-start gap-3 mb-3">
                <span className="bg-brand-100 text-brand-600 px-3 py-1 rounded-lg font-bold text-sm">
                  {i + 1}
                </span>
                <p className="font-bold text-slate-900 flex-1">{q.question}</p>
                <span className="text-amber-600 font-bold text-sm">{q.points} نقطة</span>
              </div>
              
              {q.type === 'multiple_choice' && q.options && (
                <div className="space-y-2 mr-6">
                  {q.options.map((opt, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-slate-300 rounded-full" />
                      <span className="text-slate-700">{opt}</span>
                    </div>
                  ))}
                </div>
              )}

              {q.type === 'true_false' && (
                <div className="flex gap-4 mr-6">
                  <span className="text-slate-700">صح</span>
                  <span className="text-slate-700">خطأ</span>
                </div>
              )}

              {q.type === 'short_answer' && (
                <div className="mr-6">
                  <div className="border-b-2 border-slate-300 h-8" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 border-t border-slate-200 flex justify-end">
        <button
          onClick={onClose}
          className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200"
        >
          إغلاق
        </button>
      </div>
    </div>
  </div>
);

export default ExamBuilder;
