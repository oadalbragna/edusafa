import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users,
  BookOpen,
  UserCheck,
  LayoutGrid,
  Plus,
  Trash2,
  Loader2,
  ArrowRight,
  Search,
  FolderOpen,
  FolderPlus,
  Edit3,
  ChevronDown,
  ChevronLeft,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { db } from '../../services/firebase';
import { SYS, EDU } from '../../constants/dbPaths';
import { ref, get, set, push, update, remove, onValue, off } from 'firebase/database';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/ToastProvider';
import Modal from '../../components/common/Modal';
import type { SubjectCategory, CategorizedSubject } from '../../types';

interface ClassData {
  id: string;
  name: string;
  level: 'primary' | 'middle' | 'high';
  grade: string;
  stageName?: string;
  gradeName?: string;
  status: 'public' | 'hidden' | 'coming_soon' | 'teachers_only' | 'admin_only';
  createdAt: string;
}

interface Teacher {
  uid: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  role: string;
}

const CATEGORY_COLORS = [
  { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'bg-blue-100', hover: 'hover:border-blue-400' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'bg-emerald-100', hover: 'hover:border-emerald-400' },
  { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: 'bg-purple-100', hover: 'hover:border-purple-400' },
  { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: 'bg-amber-100', hover: 'hover:border-amber-400' },
  { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', icon: 'bg-rose-100', hover: 'hover:border-rose-400' },
  { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', icon: 'bg-cyan-100', hover: 'hover:border-cyan-400' },
];

const SUBJECT_ICONS = ['📚', '📐', '🔬', '🌍', '🎨', '💻', '📖', '🎵', '⚽', '🧮', '📝', '🔭', '🌱', '🏛️', '✏️', '📊'];

const ClassDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { showError, showSuccess } = useToast();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  const [classData, setClassData] = useState<ClassData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'categories' | 'students'>('categories');

  // Categories & Subjects
  const [categories, setCategories] = useState<SubjectCategory[]>([]);
  const [categorizedSubjects, setCategorizedSubjects] = useState<Record<string, CategorizedSubject[]>>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  // Modal States
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<SubjectCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    nameAr: '',
    description: '',
    color: CATEGORY_COLORS[0].bg,
    icon: '📚',
    status: 'active' as 'active' | 'inactive'
  });

  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<CategorizedSubject | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    nameAr: '',
    code: '',
    description: '',
    teacherId: '',
    color: '#3b82f6',
    icon: '📚',
    status: 'public' as 'public' | 'hidden' | 'coming_soon' | 'teachers_only' | 'admin_only',
    isCertified: true
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);

  // Load class data
  useEffect(() => {
    if (!id) return;
    const classRef = ref(db, EDU.SCH.class(id));
    
    const handleClassData = (snapshot: any) => {
      if (snapshot.exists()) {
        setClassData({ id: snapshot.key!, ...snapshot.val() });
      }
      setLoading(false);
    };

    onValue(classRef, handleClassData);
    return () => off(classRef);
  }, [id]);

  // Load teachers
  useEffect(() => {
    if (!isAdmin) return;
    const usersRef = ref(db, SYS.USERS);
    
    const handleTeachers = (snapshot: any) => {
      if (snapshot.exists()) {
        const allUsers = Object.entries(snapshot.val()).map(([uid, data]: [string, any]) => ({
          uid,
          ...data
        }));
        setTeachers(allUsers.filter((u: Teacher) => u.role === 'teacher'));
      }
    };

    onValue(usersRef, handleTeachers);
    return () => off(usersRef);
  }, [isAdmin]);

  // Load categories
  useEffect(() => {
    if (!id || !classData) return;
    const categoriesRef = ref(db, `edu/sch/classes/${classData.level}/${classData.grade}/${id}/subject_categories`);
    
    const handleCategories = (snapshot: any) => {
      if (snapshot.exists()) {
        const cats: SubjectCategory[] = [];
        snapshot.forEach((child: any) => {
          cats.push({ id: child.key, ...child.val() });
        });
        cats.sort((a, b) => a.order - b.order);
        setCategories(cats);
      } else {
        setCategories([]);
      }
    };

    onValue(categoriesRef, handleCategories);
    return () => off(categoriesRef);
  }, [id, classData]);

  // Load subjects for each category
  useEffect(() => {
    if (!id || !classData || categories.length === 0) return;

    const subjectsMap: Record<string, CategorizedSubject[]> = {};
    let loadedCount = 0;

    categories.forEach((category) => {
      const subjectsRef = ref(db, `edu/sch/classes/${classData.level}/${classData.grade}/${id}/subject_categories/${category.id}/subjects`);
      
      const handleSubjects = (snapshot: any) => {
        if (snapshot.exists()) {
          const subs: CategorizedSubject[] = [];
          snapshot.forEach((child: any) => {
            subs.push({ id: child.key, ...child.val() });
          });
          subs.sort((a, b) => a.order - b.order);
          subjectsMap[category.id] = subs;
        } else {
          subjectsMap[category.id] = [];
        }
        
        loadedCount++;
        if (loadedCount === categories.length) {
          setCategorizedSubjects({ ...subjectsMap });
        }
      };

      onValue(subjectsRef, handleSubjects);
    });

    return () => {
      categories.forEach((category) => {
        off(ref(db, `edu/sch/classes/${classData.level}/${classData.grade}/${id}/subject_categories/${category.id}/subjects`));
      });
    };
  }, [id, classData, categories]);

  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  // Category CRUD
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !categoryForm.name) return;
    
    setSaving(true);
    try {
      if (editingCategory) {
        // Update existing category
        const categoryRef = ref(db, EDU.SCH.classSubjectCategory(id, editingCategory.id));
        await update(categoryRef, {
          name: categoryForm.name,
          nameAr: categoryForm.nameAr || categoryForm.name,
          description: categoryForm.description,
          color: categoryForm.color,
          icon: categoryForm.icon,
          status: categoryForm.status
        });
      } else {
        // Create new category
        const categoriesRef = ref(db, EDU.SCH.classSubjectCategories(id));
        const newCategoryRef = push(categoriesRef);
        const order = categories.length;
        
        await set(newCategoryRef, {
          name: categoryForm.name,
          nameAr: categoryForm.nameAr || categoryForm.name,
          description: categoryForm.description,
          color: categoryForm.color,
          icon: categoryForm.icon,
          order,
          status: categoryForm.status,
          classId: id,
          createdAt: new Date().toISOString(),
          createdBy: profile?.uid
        });
      }
      
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      resetCategoryForm();
    } catch (error) {
      console.error('Error saving category:', error);
      showError('خطأ في الحفظ', 'حدث خطأ أثناء حفظ الفئة');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!id) return;
    if (!window.confirm('هل أنت متأكد من حذف هذه الفئة وجميع المواد بداخلها؟')) return;
    
    try {
      // Delete category and its subjects
      const categoryRef = ref(db, EDU.SCH.classSubjectCategory(id, categoryId));
      const subjectsRef = ref(db, EDU.SCH.classCategorySubjects(id, categoryId));
      
      await remove(subjectsRef);
      await remove(categoryRef);
    } catch (error) {
      console.error('Error deleting category:', error);
      showError('خطأ في الحذف', 'حدث خطأ أثناء حذف الفئة');
    }
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      nameAr: '',
      description: '',
      color: CATEGORY_COLORS[0].bg,
      icon: '📚',
      status: 'active'
    });
  };

  // Subject CRUD
  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedCategoryId || !subjectForm.name) return;
    
    setSaving(true);
    try {
      if (editingSubject) {
        // Update existing subject
        const subjectRef = ref(db, EDU.SCH.classCategorySubject(id, selectedCategoryId, editingSubject.id));
        await update(subjectRef, {
          name: subjectForm.name,
          nameAr: subjectForm.nameAr || subjectForm.name,
          code: subjectForm.code,
          description: subjectForm.description,
          teacherId: subjectForm.teacherId,
          teacherName: teachers.find(t => t.uid === subjectForm.teacherId)?.fullName || '',
          color: subjectForm.color,
          icon: subjectForm.icon,
          status: subjectForm.status,
          isCertified: subjectForm.isCertified
        });
      } else {
        // Create new subject
        const subjectsRef = ref(db, EDU.SCH.classCategorySubjects(id, selectedCategoryId));
        const newSubjectRef = push(subjectsRef);
        const currentSubjects = categorizedSubjects[selectedCategoryId] || [];
        const order = currentSubjects.length;
        
        const teacher = teachers.find(t => t.uid === subjectForm.teacherId);
        
        await set(newSubjectRef, {
          name: subjectForm.name,
          nameAr: subjectForm.nameAr || subjectForm.name,
          code: subjectForm.code,
          description: subjectForm.description,
          categoryId: selectedCategoryId,
          classId: id,
          teacherId: subjectForm.teacherId,
          teacherName: teacher?.fullName || `${teacher?.firstName || ''} ${teacher?.lastName || ''}`.trim(),
          color: subjectForm.color,
          icon: subjectForm.icon,
          order,
          status: subjectForm.status,
          isCertified: subjectForm.isCertified,
          lectureCount: 0,
          assignmentCount: 0,
          materialCount: 0,
          createdAt: new Date().toISOString(),
          createdBy: profile?.uid
        });
        
        // Auto-expand the category when adding a new subject
        setExpandedCategories(prev => new Set([...prev, selectedCategoryId]));
      }
      
      setIsSubjectModalOpen(false);
      setEditingSubject(null);
      setSelectedCategoryId('');
      resetSubjectForm();
    } catch (error) {
      console.error('Error saving subject:', error);
      showError('خطأ في الحفظ', 'حدث خطأ أثناء حفظ المادة');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSubject = async (categoryId: string, subjectId: string) => {
    if (!id) return;
    if (!window.confirm('هل أنت متأكد من حذف هذه المادة؟')) return;

    try {
      const subjectRef = ref(db, EDU.SCH.classCategorySubject(id, categoryId, subjectId));
      await remove(subjectRef);
    } catch (error) {
      console.error('Error deleting subject:', error);
      showError('خطأ في الحذف', 'حدث خطأ أثناء حذف المادة');
    }
  };

  const resetSubjectForm = () => {
    setSubjectForm({
      name: '',
      nameAr: '',
      code: '',
      description: '',
      teacherId: '',
      color: '#3b82f6',
      icon: '📚',
      status: 'public',
      isCertified: true
    });
  };

  const getCategoryColorClass = (color: string, index: number) => {
    const colorObj = CATEGORY_COLORS.find(c => c.bg === color) || CATEGORY_COLORS[index % CATEGORY_COLORS.length];
    return colorObj;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      public: 'عام',
      hidden: 'مخفي',
      coming_soon: 'قريباً',
      teachers_only: 'للمعلمين',
      admin_only: 'للمشرفين'
    };
    return labels[status] || status;
  };

  const getStatusBadgeClass = (status: string) => {
    const badges: Record<string, string> = {
      public: 'bg-green-100 text-green-700',
      hidden: 'bg-gray-100 text-gray-700',
      coming_soon: 'bg-orange-100 text-orange-700',
      teachers_only: 'bg-blue-100 text-blue-700',
      admin_only: 'bg-purple-100 text-purple-700'
    };
    return badges[status] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin w-12 h-12 text-blue-600" />
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="text-center py-20 text-gray-500 font-bold">
        <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
        <p>تعذر العثور على بيانات الفصل الدراسي.</p>
        <button
          onClick={() => navigate('/admin/classes')}
          className="mt-4 text-blue-600 hover:underline"
        >
          العودة لقائمة الفصول
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in pb-10" dir="rtl">
      {/* Header */}
      <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-blue-50 rounded-full -ml-32 -mt-32 opacity-50"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
              <h1 className="text-3xl font-black text-gray-900">{classData.name}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-black ${
                classData.status === 'public' ? 'bg-green-100 text-green-600' :
                classData.status === 'coming_soon' ? 'bg-orange-100 text-orange-600' :
                classData.status === 'teachers_only' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'
              }`}>
                {classData.status === 'public' ? 'متاح للجميع' :
                 classData.status === 'coming_soon' ? 'قريباً' :
                 classData.status === 'teachers_only' ? 'للمعلمين فقط' :
                 classData.status === 'admin_only' ? 'للإدارة فقط' : 'مخفي'}
              </span>
            </div>
            <p className="text-gray-500 font-medium mr-12">
              المرحلة {classData.level === 'primary' ? 'الابتدائية' : classData.level === 'middle' ? 'المتوسطة' : 'الثانوية'} • الصف {classData.grade}
            </p>
          </div>
          <div className="flex gap-4 mr-12 md:mr-0">
            <div className="bg-purple-50 px-6 py-3 rounded-2xl text-center">
              <span className="block text-2xl font-black text-purple-700">
                {Object.values(categorizedSubjects).reduce((sum, subs) => sum + subs.length, 0)}
              </span>
              <span className="text-xs font-bold text-purple-600">مادة</span>
            </div>
            <div className="bg-blue-50 px-6 py-3 rounded-2xl text-center">
              <span className="block text-2xl font-black text-blue-700">{categories.length}</span>
              <span className="text-xs font-bold text-blue-600">فئة</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white p-2 rounded-2xl border border-gray-100 gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
        <button
          onClick={() => setActiveTab('categories')}
          className={`flex-1 min-w-[120px] py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'categories' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <FolderOpen className="w-5 h-5" /> الفئات والمواد
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`flex-1 min-w-[120px] py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'students' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Users className="w-5 h-5" /> قائمة طلاب الفصل
        </button>
      </div>

      {/* Tab Content - Categories & Subjects */}
      {activeTab === 'categories' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          {/* Actions Bar */}
          <div className="flex justify-between items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="بحث في الفئات والمواد..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-12 pl-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none w-full"
              />
            </div>
            {isAdmin && (
              <button
                onClick={() => {
                  resetCategoryForm();
                  setEditingCategory(null);
                  setIsCategoryModalOpen(true);
                }}
                className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95 whitespace-nowrap"
              >
                <FolderPlus className="w-5 h-5" /> إضافة فئة جديدة
              </button>
            )}
          </div>

          {/* Categories List */}
          {categories.length === 0 ? (
            <div className="py-20 text-center bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
              <FolderOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 font-bold text-lg">لا توجد فئات مواد بعد</p>
              <p className="text-gray-400 text-sm mt-2">ابدأ بإنشاء فئات لتنظيم المواد الدراسية</p>
              {isAdmin && (
                <button
                  onClick={() => {
                    resetCategoryForm();
                    setIsCategoryModalOpen(true);
                  }}
                  className="mt-6 bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all"
                >
                  إنشاء أول فئة
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {categories
                .filter(cat => !searchQuery || cat.name.includes(searchQuery) || cat.nameAr?.includes(searchQuery))
                .map((category, index) => {
                  const isExpanded = expandedCategories.has(category.id);
                  const subjects = categorizedSubjects[category.id] || [];
                  const colorClass = getCategoryColorClass(category.color, index);

                  return (
                    <div
                      key={category.id}
                      className={`bg-white rounded-3xl border-2 ${colorClass.border} ${colorClass.hover} transition-all overflow-hidden`}
                    >
                      {/* Category Header */}
                      <div
                        onClick={() => toggleCategory(category.id)}
                        className={`p-6 ${colorClass.bg} cursor-pointer flex items-center justify-between`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 ${colorClass.icon} rounded-2xl flex items-center justify-center text-2xl`}>
                            {category.icon || '📁'}
                          </div>
                          <div>
                            <h3 className={`text-xl font-black ${colorClass.text}`}>
                              {category.nameAr || category.name}
                            </h3>
                            {category.description && (
                              <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-xs font-bold text-gray-500">
                                {subjects.length} مادة
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                category.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {category.status === 'active' ? 'نشط' : 'غير نشط'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isAdmin && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingCategory(category);
                                  setCategoryForm({
                                    name: category.name,
                                    nameAr: category.nameAr || '',
                                    description: category.description || '',
                                    color: category.color || CATEGORY_COLORS[0].bg,
                                    icon: category.icon || '📚',
                                    status: category.status
                                  });
                                  setIsCategoryModalOpen(true);
                                }}
                                className="p-2 bg-white rounded-xl hover:bg-blue-50 transition-colors"
                              >
                                <Edit3 className="w-4 h-4 text-gray-600" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCategory(category.id);
                                }}
                                className="p-2 bg-white rounded-xl hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </>
                          )}
                          <button className="p-2 bg-white rounded-xl hover:bg-gray-50 transition-colors">
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5 text-gray-600" />
                            ) : (
                              <ChevronLeft className="w-5 h-5 text-gray-600" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Subjects List */}
                      {isExpanded && (
                        <div className="p-6">
                          {/* Add Subject Button */}
                          {isAdmin && (
                            <button
                              onClick={() => {
                                resetSubjectForm();
                                setEditingSubject(null);
                                setSelectedCategoryId(category.id);
                                setIsSubjectModalOpen(true);
                              }}
                              className="w-full mb-6 p-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-500 font-bold hover:border-blue-400 hover:text-blue-600 transition-all flex items-center justify-center gap-2"
                            >
                              <Plus className="w-5 h-5" /> إضافة مادة جديدة
                            </button>
                          )}

                          {/* Subjects Grid */}
                          {subjects.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 rounded-2xl">
                              <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                              <p className="text-gray-500 font-bold">لا توجد مواد في هذه الفئة</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {subjects
                                .filter(sub => !searchQuery || sub.name.includes(searchQuery) || sub.nameAr?.includes(searchQuery))
                                .map((subject) => (
                                  <div
                                    key={subject.id}
                                    className="bg-white p-5 rounded-2xl border border-gray-200 hover:shadow-lg transition-all group"
                                  >
                                    <div className="flex items-start justify-between mb-4">
                                      <div className="flex items-center gap-3">
                                        <div
                                          className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                                          style={{ backgroundColor: `${subject.color || '#3b82f6'}20` }}
                                        >
                                          {subject.icon || '📚'}
                                        </div>
                                        <div>
                                          <h4 className="font-black text-gray-900">
                                            {subject.nameAr || subject.name}
                                          </h4>
                                          {subject.code && (
                                            <span className="text-xs text-gray-500 font-bold">
                                              {subject.code}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          onClick={() => {
                                            navigate(`/subject/${subject.id}`);
                                          }}
                                          className="p-1.5 hover:bg-green-50 rounded-lg transition-colors"
                                          title="عرض تفاصيل المادة"
                                        >
                                          <Eye className="w-4 h-4 text-green-600" />
                                        </button>
                                        {isAdmin && (
                                          <>
                                            <button
                                              onClick={() => {
                                                setEditingSubject(subject);
                                                setSelectedCategoryId(category.id);
                                                setSubjectForm({
                                                  name: subject.name,
                                                  nameAr: subject.nameAr || '',
                                                  code: subject.code || '',
                                                  description: subject.description || '',
                                                  teacherId: subject.teacherId || '',
                                                  color: subject.color || '#3b82f6',
                                                  icon: subject.icon || '📚',
                                                  status: subject.status,
                                                  isCertified: subject.isCertified ?? true
                                                });
                                                setIsSubjectModalOpen(true);
                                              }}
                                              className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                                              title="تعديل المادة"
                                            >
                                              <Edit3 className="w-4 h-4 text-gray-600" />
                                            </button>
                                            <button
                                              onClick={() => handleDeleteSubject(category.id, subject.id)}
                                              className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                              title="حذف المادة"
                                            >
                                              <Trash2 className="w-4 h-4 text-red-600" />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>

                                    {/* Teacher Info */}
                                    <div className="flex items-center gap-2 mb-3 text-sm">
                                      <UserCheck className="w-4 h-4 text-blue-500" />
                                      <span className="text-gray-600 font-bold">
                                        {subject.teacherName || 'لم يعين معلم'}
                                      </span>
                                    </div>

                                    {/* Stats */}
                                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                                      {subject.lectureCount !== undefined && (
                                        <span>📖 {subject.lectureCount} درس</span>
                                      )}
                                      {subject.assignmentCount !== undefined && (
                                        <span>📝 {subject.assignmentCount} واجب</span>
                                      )}
                                    </div>

                                    {/* Status Badge */}
                                    <div className="flex items-center justify-between">
                                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusBadgeClass(subject.status)}`}>
                                        {getStatusLabel(subject.status)}
                                      </span>
                                      {subject.isCertified && (
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                      )}
                                    </div>
                                  </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab Content - Students */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4">
          <div className="p-8 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-xl font-black text-gray-800">الطلاب المسجلون</h3>
            <div className="relative">
              <Search className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="بحث عن طالب..."
                className="pr-12 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
          </div>
          <div className="py-20 text-center text-gray-400 font-bold">
            <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>سيتم عرض قائمة الطلاب هنا</p>
          </div>
        </div>
      )}

      {/* Category Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setEditingCategory(null);
          resetCategoryForm();
        }}
        title={editingCategory ? 'تعديل فئة المواد' : 'إضافة فئة مواد جديدة'}
      >
        <form onSubmit={handleSaveCategory} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">اسم الفئة *</label>
            <input
              type="text"
              required
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none font-bold"
              placeholder="مثال: المواد الأساسية"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">الاسم بالعربية</label>
            <input
              type="text"
              value={categoryForm.nameAr}
              onChange={(e) => setCategoryForm({ ...categoryForm, nameAr: e.target.value })}
              className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none font-bold"
              placeholder="المواد الأساسية"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">الوصف</label>
            <textarea
              value={categoryForm.description}
              onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
              className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none font-bold resize-none"
              rows={3}
              placeholder="وصف مختصر للفئة..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">الأيقونة</label>
              <div className="grid grid-cols-4 gap-2">
                {SUBJECT_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setCategoryForm({ ...categoryForm, icon })}
                    className={`p-3 text-2xl rounded-xl transition-all ${
                      categoryForm.icon === icon
                        ? 'bg-blue-100 border-2 border-blue-500 scale-110'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">اللون</label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORY_COLORS.map((color, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCategoryForm({ ...categoryForm, color: color.bg })}
                    className={`p-3 ${color.bg} rounded-xl border-2 transition-all ${
                      categoryForm.color === color.bg
                        ? `${color.border} scale-105`
                        : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <span className={`text-xs font-bold ${color.text}`}>
                      {color.text.split('-')[1]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">الحالة</label>
            <select
              value={categoryForm.status}
              onChange={(e) => setCategoryForm({ ...categoryForm, status: e.target.value as 'active' | 'inactive' })}
              className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none font-bold"
            >
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                {editingCategory ? 'حفظ التعديلات' : 'إنشاء الفئة'}
              </>
            )}
          </button>
        </form>
      </Modal>

      {/* Subject Modal */}
      <Modal
        isOpen={isSubjectModalOpen}
        onClose={() => {
          setIsSubjectModalOpen(false);
          setEditingSubject(null);
          setSelectedCategoryId('');
          resetSubjectForm();
        }}
        title={editingSubject ? 'تعديل المادة' : 'إضافة مادة جديدة'}
      >
        <form onSubmit={handleSaveSubject} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">اسم المادة *</label>
            <input
              type="text"
              required
              value={subjectForm.name}
              onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
              className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none font-bold"
              placeholder="مثال: الرياضيات"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">الاسم بالعربية</label>
            <input
              type="text"
              value={subjectForm.nameAr}
              onChange={(e) => setSubjectForm({ ...subjectForm, nameAr: e.target.value })}
              className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none font-bold"
              placeholder="الرياضيات"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">رمز المادة</label>
              <input
                type="text"
                value={subjectForm.code}
                onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none font-bold"
                placeholder="MATH101"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">تعيين معلم</label>
              <select
                value={subjectForm.teacherId}
                onChange={(e) => setSubjectForm({ ...subjectForm, teacherId: e.target.value })}
                className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none font-bold"
              >
                <option value="">لا يوجد معلم</option>
                {teachers.map(t => (
                  <option key={t.uid} value={t.uid}>
                    {t.fullName || `${t.firstName || ''} ${t.lastName || ''}`.trim()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">الأيقونة</label>
              <div className="grid grid-cols-4 gap-2">
                {SUBJECT_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setSubjectForm({ ...subjectForm, icon })}
                    className={`p-3 text-xl rounded-xl transition-all ${
                      subjectForm.icon === icon
                        ? 'bg-blue-100 border-2 border-blue-500 scale-110'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">اللون</label>
              <input
                type="color"
                value={subjectForm.color}
                onChange={(e) => setSubjectForm({ ...subjectForm, color: e.target.value })}
                className="w-full h-32 rounded-xl cursor-pointer"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">حالة الظهور</label>
            <select
              value={subjectForm.status}
              onChange={(e) => setSubjectForm({ ...subjectForm, status: e.target.value as any })}
              className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none font-bold"
            >
              <option value="public">عام - متاح للجميع</option>
              <option value="hidden">مخفي</option>
              <option value="coming_soon">قريباً</option>
              <option value="teachers_only">للمعلمين فقط</option>
              <option value="admin_only">للمشرفين فقط</option>
            </select>
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
            <input
              type="checkbox"
              id="certified"
              checked={subjectForm.isCertified}
              onChange={(e) => setSubjectForm({ ...subjectForm, isCertified: e.target.checked })}
              className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="certified" className="text-sm font-bold text-gray-700 cursor-pointer">
              مادة معتمدة
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                {editingSubject ? 'حفظ التعديلات' : 'إضافة المادة'}
              </>
            )}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default ClassDetails;
