import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Mail, 
  Phone, 
  UserPlus, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  Trash2, 
  Edit, 
  UserX,
  Shield,
  XCircle,
  FileText,
  UserCheck,
  GraduationCap,
  BookOpen,
  MessageSquare,
  CreditCard,
  Settings,
  AlertCircle
} from 'lucide-react';
import { db } from '../../../services/firebase';
import { SYS, EDU, COMM } from '../../../constants/dbPaths';
import { ref, onValue, remove, update } from 'firebase/database';
import { useAuth } from '../../../context/AuthContext';
import { logActivity } from '../../../utils/activityLogger';

import type { UserProfile, UserRole, UserPermissions, Class, Subject } from '../../../types';
import Modal from '../../../components/common/Modal';

const UsersManagement: React.FC = () => {
  const { profile: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRole, setActiveRole] = useState<UserRole | 'all'>('all');
  
  // Selected user for actions
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [userActivity, setUserActivity] = useState<any[]>([]);
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);

  // Permissions state
  const [permissions, setPermissions] = useState<UserPermissions>({});
  const [blockedClasses, setBlockedClasses] = useState<string[]>([]);
  const [blockedSubjects, setBlockedSubjects] = useState<string[]>([]);

  // New User State
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'student' as UserRole,
    phone: '',
    classId: '',           // For Student
    selectedClasses: [] as string[], // For Teacher
    selectedSubjects: [] as string[], // For Teacher
    studentLinks: [] as string[]    // For Parent
  });

  const fetchUserActivity = (uid: string) => {
    const activitiesRef = ref(db, SYS.MAINTENANCE.ACTIVITIES);
    const unsub = onValue(activitiesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const logs = Object.values(data).filter((act: any) => 
          act.targetId === uid || act.userId === uid
        ).sort((a: any, b: any) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setUserActivity(logs);
      } else {
        setUserActivity([]);
      }
    });
    return unsub;
  };

  const openHistoryModal = (user: UserProfile) => {
    setSelectedUser(user);
    setIsHistoryModalOpen(true);
    fetchUserActivity(user.uid);
  };

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.firstName) {
      alert('يرجى ملء كافة الحقول الأساسية');
      return;
    }

    // Role-specific validation
    if (newUser.role === 'student' && !newUser.classId) {
      alert('يرجى اختيار الفصل الدراسي للطالب');
      return;
    }
    if (newUser.role === 'teacher' && newUser.selectedClasses.length === 0) {
      alert('يرجى اختيار فصل واحد على الأقل للمعلم');
      return;
    }
    if (newUser.role === 'parent' && newUser.studentLinks.length === 0) {
      alert('يرجى ربط ابن واحد على الأقل بولي الأمر');
      return;
    }

    try {
      const { AuthService } = await import('../../../services/auth.service');
      
      const additionalData: any = {};
      if (newUser.role === 'student') {
        const cls = classes.find(c => c.id === newUser.classId);
        additionalData.classId = newUser.classId;
        additionalData.eduLevel = cls?.level;
        additionalData.grade = cls?.grade;
      } else if (newUser.role === 'teacher') {
        additionalData.selectedClasses = newUser.selectedClasses;
        additionalData.selectedSubjects = newUser.selectedSubjects;
      } else if (newUser.role === 'parent') {
        additionalData.studentLinks = newUser.studentLinks;
      }

      const result = await AuthService.registerManual({
        ...newUser,
        ...additionalData,
        fullName: `${newUser.firstName} ${newUser.lastName}`.trim(),
        status: 'approved'
      });

      if (result.success) {
        setIsAddModalOpen(false);
        setNewUser({
          email: '',
          password: '',
          firstName: '',
          lastName: '',
          role: 'student',
          phone: '',
          classId: '',
          selectedClasses: [],
          selectedSubjects: [],
          studentLinks: []
        });

        if (currentUser) {
          await logActivity({
            type: 'student_added', 
            userId: currentUser.uid,
            userName: currentUser.fullName || currentUser.firstName || 'Admin',
            details: `قام بإضافة مستخدم جديد: ${newUser.firstName} ${newUser.lastName} برتبة ${newUser.role}`,
            targetId: result.user?.uid,
            targetName: result.user?.fullName
          });
        }
      } else {
        alert(result.error);
      }
    } catch (err) {
      alert('حدث خطأ أثناء إضافة المستخدم');
    }
  };

  const handleDeleteUser = async (uid: string) => {
    try {
      await remove(ref(db, `sys/users/${uid}`));
      
      if (currentUser && selectedUser) {
        await logActivity({
          type: 'user_rejected', // Using user_rejected as a proxy for deletion
          userId: currentUser.uid,
          userName: currentUser.fullName || currentUser.firstName || 'Admin',
          details: `قام بحذف حساب المستخدم: ${selectedUser.fullName || selectedUser.firstName}`,
          targetId: uid,
          targetName: selectedUser.fullName || selectedUser.firstName
        });
      }
      
      setIsDeleteModalOpen(false);
    } catch (err) {
      alert('حدث خطأ أثناء حذف المستخدم');
    }
  };

  useEffect(() => {
    const usersRef = ref(db, 'sys/users');
    const unsubUsers = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const usersList = Object.keys(data).map(key => ({
          ...data[key],
          uid: key
        }));
        setUsers(usersList);
      } else {
        setUsers([]);
      }
      setLoading(false);
    });

    const classesRef = ref(db, 'edu/sch/classes');
    const unsubClasses = onValue(classesRef, (snapshot) => {
      if (snapshot.exists()) {
        setClasses(Object.values(snapshot.val()));
      }
    });

    const curriculaRef = ref(db, 'edu/curricula');
    const unsubSubjects = onValue(curriculaRef, (snapshot) => {
       if (snapshot.exists()) {
          const curricula = Object.values(snapshot.val()) as any[];
          const uniqueSubjects = Array.from(new Map(curricula.map(c => [c.subject, { id: c.subject, name: c.subject, level: c.level }])).values());
          setSubjects(uniqueSubjects as any);
       }
    });

    return () => {
      unsubUsers();
      unsubClasses();
      unsubSubjects();
    };
  }, []);

  const openEditModal = (user: UserProfile) => {
    setSelectedUser(user);
    setPendingRole(null);
    setPermissions(user.permissions || {
      readOnly: false,
      uploadEditDelete: true,
      announcements: true,
      messaging: true,
      accessMaterials: true,
      interact: true,
      manageStudents: user.role === 'teacher',
      gradeStudents: user.role === 'teacher',
      addAssignments: user.role === 'teacher',
      viewReports: user.role === 'teacher' || user.role === 'parent',
      participateDiscussions: user.role === 'student',
      uploadFiles: user.role === 'student',
      viewResults: user.role === 'student' || user.role === 'parent',
      monitorMultipleStudents: user.role === 'parent',
      receiveAttendanceNotifications: user.role === 'parent'
    });
    setBlockedClasses(user.blockedClasses || []);
    setBlockedSubjects(user.blockedSubjects || []);
    setIsEditModalOpen(true);
  };

  const handleUpdateRoleAndPermissions = async () => {
    if (!selectedUser || !currentUser) return;
    try {
      const isRoleChanged = pendingRole && pendingRole !== selectedUser.role;
      const updates: any = { 
        role: pendingRole || selectedUser.role,
        permissions,
        blockedClasses,
        blockedSubjects
      };
      
      await update(ref(db, `sys/users/${selectedUser.uid}`), updates);
      
      // Log activity
      if (isRoleChanged) {
        await logActivity({
          type: 'role_updated',
          userId: currentUser.uid,
          userName: currentUser.fullName || currentUser.firstName || 'Admin',
          details: `قام بتغيير رتبة المستخدم ${selectedUser.fullName || selectedUser.firstName} من ${selectedUser.role} إلى ${pendingRole}`,
          targetId: selectedUser.uid,
          targetName: selectedUser.fullName || selectedUser.firstName
        });
      } else {
        await logActivity({
          type: 'permission_updated',
          userId: currentUser.uid,
          userName: currentUser.fullName || currentUser.firstName || 'Admin',
          details: `قام بتحديث صلاحيات المستخدم ${selectedUser.fullName || selectedUser.firstName}`,
          targetId: selectedUser.uid,
          targetName: selectedUser.fullName || selectedUser.firstName
        });
      }

      setIsEditModalOpen(false);
      setPendingRole(null);
    } catch (err) {
      alert('حدث خطأ أثناء تحديث بيانات المستخدم');
    }
  };

  const filteredUsers = users.filter(user => {
    const fullName = (user.fullName || `${user.firstName} ${user.lastName}`).toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || 
                         user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.phone?.includes(searchQuery);
    const matchesRole = activeRole === 'all' || user.role === activeRole;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: UserRole) => {
    const styles = {
      admin: 'bg-red-50 text-red-600 border-red-100',
      super_admin: 'bg-purple-50 text-purple-600 border-purple-100',
      teacher: 'bg-blue-50 text-blue-600 border-blue-100',
      student: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      parent: 'bg-orange-50 text-orange-600 border-orange-100'
    };
    const labels = {
      admin: 'مدير',
      super_admin: 'مدير عام',
      teacher: 'معلم',
      student: 'طالب',
      parent: 'ولي أمر'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-[10px] font-black border ${styles[role]}`}>
        {labels[role]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <RefreshCw className="animate-spin text-blue-600 w-12 h-12" />
        <p className="text-slate-500 font-bold animate-pulse">جاري تحميل قاعدة بيانات المستخدمين...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700" dir="rtl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Users className="text-blue-600" size={32} />
            إدارة الكادر والمستخدمين
          </h1>
          <p className="text-slate-500 font-medium mt-1">التحكم الكامل في صلاحيات وبيانات مستخدمي المنصة</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex-1 md:flex-none btn-premium btn-primary flex items-center justify-center gap-2 shadow-xl shadow-blue-100 px-8"
          >
            <UserPlus size={18} />
            <span>إضافة مستخدم</span>
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">إجمالي المستخدمين</p>
          <h3 className="text-3xl font-black text-slate-900 mt-2">{users.length}</h3>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-400"></div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">المعلمون</p>
          <h3 className="text-3xl font-black text-slate-900 mt-2">{users.filter(u => u.role === 'teacher').length}</h3>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">الطلاب</p>
          <h3 className="text-3xl font-black text-slate-900 mt-2">{users.filter(u => u.role === 'student').length}</h3>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">متصل الآن</p>
          <h3 className="text-3xl font-black text-emerald-600 mt-2">{users.filter(u => u.status === 'online').length}</h3>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="ابحث عن اسم، بريد إلكتروني، أو رقم هاتف..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-12 pl-4 py-3.5 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-bold text-slate-900"
          />
        </div>
        <div className="flex flex-wrap gap-2 w-full lg:w-auto justify-center">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'student', label: 'الطلاب' },
            { id: 'teacher', label: 'المعلمون' },
            { id: 'parent', label: 'أولياء الأمور' },
            { id: 'admin', label: 'المديرين' }
          ].map(role => (
            <button
              key={role.id}
              onClick={() => setActiveRole(role.id as any)}
              className={`px-5 py-3 rounded-2xl text-xs font-black transition-all ${
                activeRole === role.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              {role.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users List/Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-right min-w-[1000px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">المستخدم</th>
              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">الصلاحية</th>
              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">التواصل</th>
              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">المستوى</th>
              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">الحالة</th>
              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-left">التحكم</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.map((user) => (
              <tr key={user.uid} className="hover:bg-blue-50/20 transition-colors group">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm relative">
                      <span className="font-black text-lg">{(user.fullName || user.firstName || '?').charAt(0)}</span>
                      {user.status === 'online' && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full animate-pulse shadow-sm"></span>
                      )}
                    </div>
                    <div>
                      <p className="font-black text-slate-900">{user.fullName || `${user.firstName} ${user.lastName}`}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">ID: {user.uid?.slice(0, 8)}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5">
                  {getRoleBadge(user.role)}
                </td>
                <td className="px-8 py-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-slate-600 font-bold">
                      <Mail size={12} className="text-slate-300" /> {user.email}
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-2 text-xs text-slate-600 font-bold">
                        <Phone size={12} className="text-slate-300" /> {user.phone}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-8 py-5">
                  {user.role === 'student' ? (
                    <div className="text-xs font-bold text-slate-600">
                      <p>{user.eduLevel === 'primary' ? 'ابتدائي' : 'متوسط'}</p>
                      <p className="text-blue-500 mt-0.5">الصف {user.grade}</p>
                    </div>
                  ) : (
                    <span className="text-slate-300 italic text-xs">غير محدد</span>
                  )}
                </td>
                <td className="px-8 py-5">
                  {user.status === 'online' ? (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                      <span className="text-[10px] font-black text-green-600">متصل الآن</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-bold">
                      <Clock size={14} />
                      {user.lastSeen ? new Date(user.lastSeen).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : 'منذ فترة'}
                    </div>
                  )}
                </td>
                                  <td className="px-8 py-5 text-left">
                                    <div className="flex items-center justify-end gap-2">
                                      <button 
                                        onClick={() => openHistoryModal(user)}
                                        className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all"
                                        title="عرض سجل العمليات"
                                      >
                                        <Clock size={18} />
                                      </button>
                                      <button 
                                        onClick={() => openEditModal(user)}
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                        title="تعديل الصلاحيات"
                                      >
                                        <Edit size={18} />
                                      </button>
                                      <button 
                                        onClick={() => {setSelectedUser(user); setIsDeleteModalOpen(true);}}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                        title="حذف المستخدم"
                                      >
                                        <Trash2 size={18} />
                                      </button>
                                    </div>
                                  </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Role Modal */}
      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => {setIsEditModalOpen(false); setPendingRole(null);}} 
        title="تعديل صلاحيات المستخدم"
      >
        {selectedUser && (
          <div className="space-y-6">
            <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-xl shadow-lg">
                {(selectedUser.fullName || selectedUser.firstName)?.[0]}
              </div>
              <div>
                <p className="font-black text-slate-900">{selectedUser.fullName || `${selectedUser.firstName} ${selectedUser.lastName}`}</p>
                <p className="text-xs text-slate-500 font-bold">{selectedUser.email}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-black text-slate-700 block">اختر الرتبة الجديدة:</label>
              <div className="grid grid-cols-1 gap-2">
                {(['student', 'teacher', 'parent', 'admin'] as UserRole[]).map((role) => (
                  <button
                    key={role}
                    onClick={() => setPendingRole(role)}
                    className={`p-4 rounded-2xl border-2 text-right font-black transition-all flex justify-between items-center ${
                      (pendingRole ? pendingRole === role : selectedUser.role === role) 
                      ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-sm' 
                      : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>{role === 'admin' ? 'مدير نظام' : role === 'teacher' ? 'معلم' : role === 'student' ? 'طالب' : 'ولي أمر'}</span>
                    {(pendingRole || selectedUser.role) === role && <CheckCircle2 size={20} className="animate-in zoom-in" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Permissions & Restrictions */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Shield size={16} className="text-blue-600" /> إدارة الصلاحيات المخصصة
              </h4>

              {/* General Permissions */}
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 p-2 rounded-lg">صلاحيات عامة</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      checked={permissions.readOnly || false}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setPermissions(prev => ({ ...prev, readOnly: val }));
                      }}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">القراءة فقط</span>
                      <span className="text-[10px] text-slate-400">منع المستخدم من أي تعديل أو رفع</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      checked={permissions.messaging !== false}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setPermissions(prev => ({ ...prev, messaging: val }));
                      }}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">نظام المراسلات</span>
                      <span className="text-[10px] text-slate-400">السماح بإرسال واستقبال الرسائل</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      checked={permissions.interact !== false}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setPermissions(prev => ({ ...prev, interact: val }));
                      }}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">التفاعل العام</span>
                      <span className="text-[10px] text-slate-400">التعليقات، التفاعلات، والمشاركة</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Teacher Specific Permissions */}
              {((pendingRole || selectedUser.role) === 'teacher' || (pendingRole || selectedUser.role) === 'admin') && (
                <div className="space-y-3 pt-2">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 p-2 rounded-lg flex items-center gap-2">
                    <GraduationCap size={14} /> صلاحيات المعلم / الإدارة
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        checked={permissions.uploadEditDelete !== false}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setPermissions(prev => ({ ...prev, uploadEditDelete: val }));
                        }}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700">إدارة المحتوى</span>
                        <span className="text-[10px] text-slate-400">رفع وتعديل وحذف المحاضرات</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        checked={permissions.announcements !== false}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setPermissions(prev => ({ ...prev, announcements: val }));
                        }}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700">نشر الإعلانات</span>
                        <span className="text-[10px] text-slate-400">إرسال تنبيهات عامة للفصول</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        checked={permissions.manageStudents !== false}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setPermissions(prev => ({ ...prev, manageStudents: val }));
                        }}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700">إدارة الطلاب</span>
                        <span className="text-[10px] text-slate-400">قبول/رفض وحظر الطلاب</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        checked={permissions.gradeStudents !== false}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setPermissions(prev => ({ ...prev, gradeStudents: val }));
                        }}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700">رصد الدرجات</span>
                        <span className="text-[10px] text-slate-400">تقييم الطلاب ووضع العلامات</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        checked={permissions.addAssignments !== false}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setPermissions(prev => ({ ...prev, addAssignments: val }));
                        }}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700">الواجبات والاختبارات</span>
                        <span className="text-[10px] text-slate-400">إضافة المهام الدراسية والتقييمات</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        checked={permissions.financialManage || false}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setPermissions(prev => ({ ...prev, financialManage: val }));
                        }}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700">الإدارة المالية</span>
                        <span className="text-[10px] text-slate-400">إصدار الفواتير وتحصيل الرسوم</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Student Specific Permissions */}
              {((pendingRole || selectedUser.role) === 'student') && (
                <div className="space-y-3 pt-2">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 p-2 rounded-lg flex items-center gap-2">
                    <BookOpen size={14} /> صلاحيات الطالب
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        checked={permissions.accessMaterials !== false}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setPermissions(prev => ({ ...prev, accessMaterials: val }));
                        }}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700">المقررات الدراسية</span>
                        <span className="text-[10px] text-slate-400">الوصول للمواد والمحاضرات</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        checked={permissions.participateDiscussions !== false}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setPermissions(prev => ({ ...prev, participateDiscussions: val }));
                        }}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700">نقاشات الفصول</span>
                        <span className="text-[10px] text-slate-400">المشاركة في الحوارات الصفية</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        checked={permissions.uploadFiles !== false}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setPermissions(prev => ({ ...prev, uploadFiles: val }));
                        }}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700">رفع الملفات</span>
                        <span className="text-[10px] text-slate-400">تسليم الواجبات والملفات الخاصة</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        checked={permissions.viewResults !== false}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setPermissions(prev => ({ ...prev, viewResults: val }));
                        }}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700">عرض النتائج</span>
                        <span className="text-[10px] text-slate-400">رؤية الدرجات والتقارير الأكاديمية</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Parent Specific Permissions */}
              {((pendingRole || selectedUser.role) === 'parent') && (
                <div className="space-y-3 pt-2">
                  <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest bg-orange-50 p-2 rounded-lg flex items-center gap-2">
                    <Users size={14} /> صلاحيات ولي الأمر
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        checked={permissions.monitorMultipleStudents !== false}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setPermissions(prev => ({ ...prev, monitorMultipleStudents: val }));
                        }}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700">متابعة متعددة</span>
                        <span className="text-[10px] text-slate-400">ربط ومتابعة أكثر من طالب</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        checked={permissions.receiveAttendanceNotifications !== false}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setPermissions(prev => ({ ...prev, receiveAttendanceNotifications: val }));
                        }}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700">تنبيهات الحضور</span>
                        <span className="text-[10px] text-slate-400">استلام إشعارات غياب/حضور الأبناء</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        checked={permissions.viewReports !== false}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setPermissions(prev => ({ ...prev, viewReports: val }));
                        }}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700">التقارير المالية</span>
                        <span className="text-[10px] text-slate-400">عرض فواتير ومستحقات الأبناء</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              <div className="pt-4 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-700 flex items-center gap-2">
                      <XCircle size={16} className="text-red-500" /> حظر الإشراف/التواجد في فصول محددة
                    </label>
                    <select 
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-bold"
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val && !blockedClasses.includes(val)) {
                          setBlockedClasses(prev => [...prev, val]);
                        }
                      }}
                      value=""
                    >
                      <option value="">اختر الفصول المراد حظرها...</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name} - الصف {c.grade}</option>
                      ))}
                    </select>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {blockedClasses.map(clsId => {
                        const cls = classes.find(c => c.id === clsId);
                        return (
                          <span key={clsId} className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-black flex items-center gap-2 border border-red-100">
                            {cls?.name || 'فصل غير معروف'}
                            <button onClick={() => setBlockedClasses(prev => prev.filter(id => id !== clsId))} className="hover:text-red-800"><XCircle size={14} /></button>
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-700 flex items-center gap-2">
                      <XCircle size={16} className="text-red-500" /> حظر الوصول/الرفع لمواد محددة
                    </label>
                    <select 
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-bold"
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val && !blockedSubjects.includes(val)) {
                          setBlockedSubjects(prev => [...prev, val]);
                        }
                      }}
                      value=""
                    >
                      <option value="">اختر المواد المراد حظرها...</option>
                      {subjects.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.level})</option>
                      ))}
                    </select>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {blockedSubjects.map(subId => {
                        const sub = subjects.find(s => s.id === subId);
                        return (
                          <span key={subId} className="px-3 py-1 bg-orange-50 text-orange-600 rounded-full text-xs font-black flex items-center gap-2 border border-orange-100">
                            {sub?.name || 'مادة غير معروفة'}
                            <button onClick={() => setBlockedSubjects(prev => prev.filter(id => id !== subId))} className="hover:text-orange-800"><XCircle size={14} /></button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

            {/* Save Button for Permissions if no role change, else combined confirmation */}
            <div className="pt-6 border-t border-slate-100">
              {(!pendingRole || pendingRole === selectedUser.role) ? (
                <button 
                  onClick={handleUpdateRoleAndPermissions}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={20} />
                  حفظ الصلاحيات والتعديلات
                </button>
              ) : (
                /* Confirmation Step */
                <div className="space-y-4 animate-in slide-in-from-bottom-4">
                   <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-3">
                      <CheckCircle2 className="text-blue-600 shrink-0 mt-0.5" size={20} />
                      <p className="text-xs font-bold text-blue-700 leading-relaxed">
                         هل أنت متأكد من تغيير رتبة المستخدم إلى <span className="underline decoration-blue-300 font-black">"{pendingRole === 'admin' ? 'مدير نظام' : pendingRole === 'teacher' ? 'معلم' : pendingRole === 'student' ? 'طالب' : 'ولي أمر'}"</span>؟
                      </p>
                   </div>
                   <button 
                     onClick={handleUpdateRoleAndPermissions}
                     className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                   >
                     <CheckCircle2 size={20} />
                     تأكيد تعيين الدور الجديد
                   </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="تأكيد حذف المستخدم">
        {selectedUser && (
          <div className="space-y-6 text-center">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <UserX size={40} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">هل أنت متأكد من الحذف؟</h3>
              <p className="text-slate-500 font-bold mt-2">
                سيتم إزالة المستخدم <span className="text-red-600">"{selectedUser.fullName || selectedUser.firstName}"</span> نهائياً من النظام. لا يمكن التراجع عن هذا الإجراء.
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => handleDeleteUser(selectedUser.uid)}
                className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-100 hover:bg-red-700 transition-all"
              >
                نعم، احذف المستخدم
              </button>
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add User Modal */}
      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        title="إضافة مستخدم جديد للنظام"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">الاسم الأول</label>
              <input 
                type="text" 
                value={newUser.firstName}
                onChange={(e) => setNewUser(prev => ({...prev, firstName: e.target.value}))}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="مثال: مبارك"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">الاسم الأخير</label>
              <input 
                type="text" 
                value={newUser.lastName}
                onChange={(e) => setNewUser(prev => ({...prev, lastName: e.target.value}))}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="مثال: عزوز"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">البريد الإلكتروني (أو اسم المستخدم)</label>
            <div className="relative">
              <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="email" 
                value={newUser.email}
                onChange={(e) => setNewUser(prev => ({...prev, email: e.target.value}))}
                className="w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="user@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">كلمة المرور المؤقتة</label>
            <div className="relative">
              <Shield className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="password" 
                value={newUser.password}
                onChange={(e) => setNewUser(prev => ({...prev, password: e.target.value}))}
                className="w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">الرتبة الوظيفية</label>
            <div className="grid grid-cols-2 gap-2">
              {(['student', 'teacher', 'parent', 'admin'] as UserRole[]).map((role) => (
                <button
                  key={role}
                  onClick={() => setNewUser(prev => ({
                    ...prev, 
                    role,
                    classId: '',
                    selectedClasses: [],
                    selectedSubjects: [],
                    studentLinks: []
                  }))}
                  className={`p-3 rounded-xl border-2 text-sm font-black transition-all ${
                    newUser.role === role 
                    ? 'border-blue-600 bg-blue-50 text-blue-600' 
                    : 'border-slate-100 bg-white text-slate-500'
                  }`}
                >
                  {role === 'admin' ? 'مدير' : role === 'teacher' ? 'معلم' : role === 'student' ? 'طالب' : 'ولي أمر'}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Fields based on Role */}
          <div className="pt-4 border-t border-slate-100 space-y-4 animate-in fade-in duration-500">
            {newUser.role === 'student' && (
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700 flex items-center gap-2">
                  <GraduationCap size={16} className="text-blue-600" /> الفصل الدراسي للطالب
                </label>
                <select 
                  value={newUser.classId}
                  onChange={(e) => setNewUser(prev => ({ ...prev, classId: e.target.value }))}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-bold"
                >
                  <option value="">اختر الفصل الدراسي...</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name} - الصف {c.grade}</option>
                  ))}
                </select>
              </div>
            )}

            {newUser.role === 'teacher' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700 flex items-center gap-2">
                    <Shield size={16} className="text-blue-600" /> الفصول الدراسية (إشراف)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {classes.map(c => (
                      <button
                        key={c.id}
                        onClick={() => {
                          const exists = newUser.selectedClasses.includes(c.id);
                          setNewUser(prev => ({
                            ...prev,
                            selectedClasses: exists 
                              ? prev.selectedClasses.filter(id => id !== c.id)
                              : [...prev.selectedClasses, c.id]
                          }));
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                          newUser.selectedClasses.includes(c.id)
                          ? 'border-blue-600 bg-blue-50 text-blue-600'
                          : 'border-slate-50 bg-slate-50 text-slate-500'
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700 flex items-center gap-2">
                    <BookOpen size={16} className="text-blue-600" /> المقررات والمواد (تدريس)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {subjects.map((s: any) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          const exists = newUser.selectedSubjects.includes(s.id);
                          setNewUser(prev => ({
                            ...prev,
                            selectedSubjects: exists 
                              ? prev.selectedSubjects.filter(id => id !== s.id)
                              : [...prev.selectedSubjects, s.id]
                          }));
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                          newUser.selectedSubjects.includes(s.id)
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-600'
                          : 'border-slate-50 bg-slate-50 text-slate-500'
                        }`}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {newUser.role === 'parent' && (
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700 flex items-center gap-2">
                  <Users size={16} className="text-blue-600" /> ربط الأبناء (الطلاب)
                </label>
                <div className="relative mb-2">
                   <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                   <input 
                     type="text"
                     placeholder="ابحث عن اسم الطالب..."
                     className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                     onChange={(e) => {
                       const val = e.target.value.toLowerCase();
                       // We can use this to highlight or scroll to student
                     }}
                   />
                </div>
                <div className="max-h-[150px] overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                  {users.filter(u => u.role === 'student').map(student => (
                    <label 
                      key={student.uid}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${
                        newUser.studentLinks.includes(student.uid) ? 'bg-orange-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <input 
                        type="checkbox"
                        checked={newUser.studentLinks.includes(student.uid)}
                        onChange={(e) => {
                          const exists = newUser.studentLinks.includes(student.uid);
                          setNewUser(prev => ({
                            ...prev,
                            studentLinks: exists 
                              ? prev.studentLinks.filter(id => id !== student.uid)
                              : [...prev.studentLinks, student.uid]
                          }));
                        }}
                        className="w-4 h-4 rounded text-orange-600"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700">{student.fullName || student.firstName}</span>
                        <span className="text-[10px] text-slate-400">الصف {student.grade || 'غير محدد'}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={handleAddUser}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
          >
            <UserCheck size={20} />
            تأكيد إضافة المستخدم
          </button>
        </div>
      </Modal>

      {/* User History/Logs Modal */}
      <Modal 
        isOpen={isHistoryModalOpen} 
        onClose={() => setIsHistoryModalOpen(false)} 
        title={`سجل نشاطات: ${selectedUser?.fullName || selectedUser?.firstName || 'المستخدم'}`}
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {userActivity.length > 0 ? (
            userActivity.map((log, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${
                    log.type.includes('added') || log.type.includes('approved') ? 'bg-green-100 text-green-700' :
                    log.type.includes('updated') || log.type.includes('permission') ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-200 text-slate-700'
                  }`}>
                    {log.type}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                    <Clock size={10} /> {new Date(log.createdAt).toLocaleString('ar-SA')}
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-700 leading-relaxed">{log.details}</p>
                <div className="flex items-center gap-2 pt-2 border-t border-slate-200/50">
                   <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-[8px] text-white font-black">
                      {log.userName?.[0]}
                   </div>
                   <span className="text-[10px] text-slate-500 font-bold">بواسطة: {log.userName}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 space-y-3">
               <AlertCircle size={48} className="mx-auto text-slate-200" />
               <p className="text-slate-400 font-bold">لا توجد نشاطات مسجلة لهذا المستخدم حتى الآن</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default UsersManagement;
