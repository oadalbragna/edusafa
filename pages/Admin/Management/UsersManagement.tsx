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
  XCircle
} from 'lucide-react';
import { db } from '../../../services/firebase';
import { SYS, EDU, COMM } from '../../../constants/dbPaths';
import { ref, onValue, remove, update } from 'firebase/database';

import type { UserProfile, UserRole, UserPermissions, Class, Subject } from '../../../types';
import Modal from '../../../components/common/Modal';

const UsersManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRole, setActiveRole] = useState<UserRole | 'all'>('all');
  
  // Selected user for actions
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);

  // Permissions state
  const [permissions, setPermissions] = useState<UserPermissions>({});
  const [blockedClasses, setBlockedClasses] = useState<string[]>([]);
  const [blockedSubjects, setBlockedSubjects] = useState<string[]>([]);

  useEffect(() => {
    const usersRef = ref(db, 'sys/users');
    const unsubUsers = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        setUsers(Object.values(snapshot.val()));
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
      interact: true
    });
    setBlockedClasses(user.blockedClasses || []);
    setBlockedSubjects(user.blockedSubjects || []);
    setIsEditModalOpen(true);
  };

  const handleUpdateRoleAndPermissions = async () => {
    if (!selectedUser) return;
    try {
      const updates: any = { 
        role: pendingRole || selectedUser.role,
        permissions,
        blockedClasses,
        blockedSubjects
      };
      await update(ref(db, `sys/users/${selectedUser.uid}`), updates);
      setIsEditModalOpen(false);
      setPendingRole(null);
    } catch (err) {
      alert('حدث خطأ أثناء تحديث بيانات المستخدم');
    }
  };

  const handleDeleteUser = async (uid: string) => {
    try {
      await remove(ref(db, `sys/users/${uid}`));
      setIsDeleteModalOpen(false);
    } catch (err) {
      alert('حدث خطأ أثناء حذف المستخدم');
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
          <button className="flex-1 md:flex-none btn-premium btn-primary flex items-center justify-center gap-2 shadow-xl shadow-blue-100 px-8">
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
                                        onClick={() => openEditModal(user)}
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                      >
                                        <Edit size={18} />
                                      </button>
                                      <button 
                                        onClick={() => {setSelectedUser(user); setIsDeleteModalOpen(true);}}                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
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
                      (pendingRole || selectedUser.role) === role 
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
            {(selectedUser.role === 'teacher' || selectedUser.role === 'student') && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Shield size={16} className="text-blue-600" /> إدارة الصلاحيات المخصصة
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      checked={permissions.readOnly || false}
                      onChange={(e) => setPermissions(prev => ({ ...prev, readOnly: e.target.checked }))}
                    />
                    <span className="text-sm font-bold text-slate-700">القراءة فقط (منع التعديل)</span>
                  </label>

                  {selectedUser.role === 'teacher' && (
                    <>
                      <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                          checked={permissions.uploadEditDelete !== false}
                          onChange={(e) => setPermissions(prev => ({ ...prev, uploadEditDelete: e.target.checked }))}
                        />
                        <span className="text-sm font-bold text-slate-700">الرفع والتعديل والحذف</span>
                      </label>
                      <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                          checked={permissions.announcements !== false}
                          onChange={(e) => setPermissions(prev => ({ ...prev, announcements: e.target.checked }))}
                        />
                        <span className="text-sm font-bold text-slate-700">نشر الإعلانات</span>
                      </label>
                    </>
                  )}

                  {selectedUser.role === 'student' && (
                    <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        checked={permissions.accessMaterials !== false}
                        onChange={(e) => setPermissions(prev => ({ ...prev, accessMaterials: e.target.checked }))}
                      />
                      <span className="text-sm font-bold text-slate-700">الحصول على المقررات</span>
                    </label>
                  )}

                  <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      checked={permissions.messaging !== false}
                      onChange={(e) => setPermissions(prev => ({ ...prev, messaging: e.target.checked }))}
                    />
                    <span className="text-sm font-bold text-slate-700">المراسلات مع {selectedUser.role === 'teacher' ? 'الطلاب' : 'المعلمين'}</span>
                  </label>
                  
                  <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      checked={permissions.interact !== false}
                      onChange={(e) => setPermissions(prev => ({ ...prev, interact: e.target.checked }))}
                    />
                    <span className="text-sm font-bold text-slate-700">التفاعل العام بالمنصة</span>
                  </label>
                </div>

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
            )}

            {/* Save Button for Permissions if no role change, else combined confirmation */}
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
              <div className="pt-6 border-t border-slate-100 space-y-4 animate-in slide-in-from-bottom-4">
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
    </div>
  );
};

export default UsersManagement;
