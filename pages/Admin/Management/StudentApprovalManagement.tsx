import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  UserCheck,
  UserX,
  RefreshCw,
  Mail,
  Phone,
  Shield,
  AlertCircle,
  Filter
} from 'lucide-react';
import { db } from '../../../services/firebase';
import { ref, onValue, update, push, set, serverTimestamp } from 'firebase/database';
import { SYS, EDU, COMM } from '../../../constants/dbPaths';
import type { UserProfile } from '../../../types';
import Modal from '../../../components/common/Modal';

const StudentApprovalManagement: React.FC = () => {
  const [pendingStudents, setPendingStudents] = useState<UserProfile[]>([]);
  const [allStudents, setAllStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'pending' | 'approved' | 'rejected'>('pending');

  // Selected student for actions
  const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const usersRef = ref(db, SYS.USERS);
    const unsub = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const users = Object.values(snapshot.val()) as UserProfile[];
        const students = users.filter(u => u.role === 'student');
        setAllStudents(students);
        setPendingStudents(students.filter(s => s.status === 'pending'));
      } else {
        setAllStudents([]);
        setPendingStudents([]);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleApprove = async () => {
    if (!selectedStudent) return;

    setIsProcessing(true);
    try {
      const updates: any = {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: 'admin'
      };

      // If student has a classId, assign them to the class
      if (selectedStudent.classId) {
        const classRef = ref(db, EDU.SCH.class(selectedStudent.classId));
        const classSnapshot = await onValue(classRef, (snapshot) => {
          if (snapshot.exists()) {
            const classData = snapshot.val();
            // Add student to class students list if needed
            const studentUpdates: any = {};
            studentUpdates[`${EDU.SCH.class(selectedStudent.classId)}/students/${selectedStudent.uid}`] = {
              uid: selectedStudent.uid,
              name: selectedStudent.fullName || `${selectedStudent.firstName} ${selectedStudent.lastName}`,
              joinedAt: new Date().toISOString()
            };
            update(ref(db), studentUpdates);
          }
        }, { onlyOnce: true });
      }

      await update(ref(db, SYS.user(selectedStudent.uid)), updates);

      // Send notification
      const notificationRef = push(ref(db, COMM.NOTIFICATIONS));
      await set(notificationRef, {
        id: notificationRef.key,
        userId: selectedStudent.uid,
        title: 'تم تفعيل حسابك!',
        message: `مرحباً ${selectedStudent.firstName}، تم تفعيل حسابك بنجاح. يمكنك الآن الوصول إلى جميع ميزات المنصة.`,
        type: 'approval',
        read: false,
        createdAt: serverTimestamp()
      });

      setIsApproveModalOpen(false);
      setSelectedStudent(null);
    } catch (err) {
      alert('حدث خطأ أثناء تفعيل الحساب');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedStudent || !rejectionReason.trim()) return;
    
    setIsProcessing(true);
    try {
      const updates: any = {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectionReason: rejectionReason
      };

      await update(ref(db, `sys/users/${selectedStudent.uid}`), updates);

      // Send rejection notification
      const notificationRef = push(ref(db, COMM.NOTIFICATIONS));
      await set(notificationRef, {
        id: notificationRef.key,
        userId: selectedStudent.uid,
        title: 'حالة طلب الانضمام',
        message: `عذراً ${selectedStudent.firstName}، تم رفض طلب انضمامك للسبب التالي: ${rejectionReason}`,
        type: 'rejection',
        read: false,
        createdAt: serverTimestamp()
      });

      setIsRejectModalOpen(false);
      setSelectedStudent(null);
      setRejectionReason('');
    } catch (err) {
      alert('حدث خطأ أثناء رفض الحساب');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredStudents = allStudents.filter(student => {
    const fullName = (student.fullName || `${student.firstName} ${student.lastName}`).toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         student.phone?.includes(searchQuery);
    
    if (filterTab === 'pending') {
      return matchesSearch && (student.status === 'pending' || !student.status);
    } else if (filterTab === 'approved') {
      return matchesSearch && student.status === 'approved';
    } else {
      return matchesSearch && student.status === 'rejected';
    }
  });

  const getStatusBadge = (status?: string) => {
    const styles = {
      pending: 'bg-amber-50 text-amber-600 border-amber-100',
      approved: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      rejected: 'bg-red-50 text-red-600 border-red-100'
    };
    const labels = {
      pending: 'قيد المراجعة',
      approved: 'مفعّل',
      rejected: 'مرفوض'
    };
    const statusKey = (status || 'pending') as keyof typeof styles;
    
    return (
      <span className={`px-3 py-1.5 rounded-full text-[10px] font-black border ${styles[statusKey]}`}>
        {labels[statusKey]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <RefreshCw className="animate-spin text-blue-600 w-12 h-12" />
        <p className="text-slate-500 font-bold animate-pulse">جاري تحميل طلبات الانضمام...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Users className="text-blue-600" size={32} />
            إدارة قبول طلبات الطلاب
          </h1>
          <p className="text-slate-500 font-medium mt-1">مراجعة والموافقة على طلبات انضمام الطلاب للمنصة</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <Clock className="text-amber-500" size={20} />
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">طلبات معلقة</p>
              <p className="text-2xl font-black text-slate-900">{pendingStudents.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-[2.5rem] border border-amber-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-600 text-xs font-black uppercase tracking-widest mb-2">بانتظار المراجعة</p>
              <h3 className="text-4xl font-black text-amber-700">{pendingStudents.length}</h3>
              <p className="text-amber-600/70 text-xs font-bold mt-1">طالب ينتظر التفعيل</p>
            </div>
            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
              <Clock size={32} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-6 rounded-[2.5rem] border border-emerald-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-600 text-xs font-black uppercase tracking-widest mb-2">تم تفعيلهم</p>
              <h3 className="text-4xl font-black text-emerald-700">{allStudents.filter(s => s.status === 'approved').length}</h3>
              <p className="text-emerald-600/70 text-xs font-bold mt-1">طالب نشط</p>
            </div>
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
              <CheckCircle2 size={32} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-pink-50 p-6 rounded-[2.5rem] border border-red-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-600 text-xs font-black uppercase tracking-widest mb-2">تم رفضهم</p>
              <h3 className="text-4xl font-black text-red-700">{allStudents.filter(s => s.status === 'rejected').length}</h3>
              <p className="text-red-600/70 text-xs font-bold mt-1">طلب مرفوض</p>
            </div>
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-red-600">
              <XCircle size={32} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="ابحث عن طالب بالاسم، البريد، أو الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-12 pl-4 py-3.5 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-bold text-slate-900"
          />
        </div>
        <div className="flex gap-2 w-full lg:w-auto justify-center">
          {[
            { id: 'pending', label: 'قيد المراجعة', icon: Clock, count: pendingStudents.length },
            { id: 'approved', label: 'المقبولون', icon: CheckCircle2 },
            { id: 'rejected', label: 'المرفوضون', icon: XCircle }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black transition-all ${
                filterTab === tab.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
              {tab.count !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                  filterTab === tab.id ? 'bg-white/20' : 'bg-slate-200'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Students List */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-right min-w-[1000px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">الطالب</th>
              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">المرحلة</th>
              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">التواصل</th>
              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">تاريخ الطلب</th>
              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">الحالة</th>
              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-left">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStudents.map((student) => (
              <tr key={student.uid} className="hover:bg-blue-50/20 transition-colors group">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-all shadow-sm">
                      <span className="font-black text-lg">{(student.fullName || student.firstName || '?').charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-black text-slate-900">{student.fullName || `${student.firstName} ${student.lastName}`}</p>
                      <p className="text-[10px] text-slate-400 font-bold">ID: {student.uid?.slice(0, 8)}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <div className="text-xs font-bold text-slate-600">
                    <p>{student.eduLevel === 'primary' ? 'ابتدائي' : student.eduLevel === 'middle' ? 'متوسط' : 'ثانوي'}</p>
                    <p className="text-blue-500 mt-0.5">الصف {student.grade}</p>
                    {student.classId && (
                      <p className="text-emerald-500 text-[10px] mt-0.5">فصل: {student.classId}</p>
                    )}
                  </div>
                </td>
                <td className="px-8 py-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-slate-600 font-bold">
                      <Mail size={12} className="text-slate-300" /> {student.email}
                    </div>
                    {student.phone && (
                      <div className="flex items-center gap-2 text-xs text-slate-600 font-bold">
                        <Phone size={12} className="text-slate-300" /> {student.phone}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-8 py-5">
                  <div className="text-xs text-slate-500 font-bold">
                    {student.createdAt ? new Date(student.createdAt).toLocaleDateString('ar-SA') : 'غير متوفر'}
                  </div>
                </td>
                <td className="px-8 py-5">
                  {getStatusBadge(student.status)}
                  {student.status === 'rejected' && student.rejectionReason && (
                    <p className="text-[9px] text-red-500 mt-1 font-bold">{student.rejectionReason}</p>
                  )}
                </td>
                <td className="px-8 py-5 text-left">
                  <div className="flex items-center justify-end gap-2">
                    {student.status === 'pending' || !student.status ? (
                      <>
                        <button
                          onClick={() => {setSelectedStudent(student); setIsApproveModalOpen(true);}}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all hover:scale-110"
                          title="قبول"
                        >
                          <UserCheck size={20} />
                        </button>
                        <button
                          onClick={() => {setSelectedStudent(student); setIsRejectModalOpen(true);}}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all hover:scale-110"
                          title="رفض"
                        >
                          <UserX size={20} />
                        </button>
                      </>
                    ) : (
                      <span className="text-slate-300 text-xs font-bold">تمت المراجعة</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredStudents.length === 0 && (
          <div className="py-24 text-center">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Filter className="w-12 h-12 text-slate-300" />
            </div>
            <p className="text-slate-400 font-black text-xl">لا توجد طلاب في هذا التصنيف</p>
            <p className="text-slate-400 text-sm font-bold mt-1">جرب تغيير فلتر البحث</p>
          </div>
        )}
      </div>

      {/* Approve Modal */}
      <Modal
        isOpen={isApproveModalOpen}
        onClose={() => {setIsApproveModalOpen(false); setSelectedStudent(null);}}
        title="تفعيل حساب طالب"
      >
        {selectedStudent && (
          <div className="space-y-6">
            <div className="p-6 bg-gradient-to-br from-emerald-50 to-green-50 rounded-[2rem] border border-emerald-100">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                  <UserCheck size={32} />
                </div>
                <div>
                  <p className="font-black text-slate-900 text-lg">{selectedStudent.fullName || `${selectedStudent.firstName} ${selectedStudent.lastName}`}</p>
                  <p className="text-sm text-slate-500 font-bold">{selectedStudent.email}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-slate-600 font-bold flex items-center gap-2">
                  <Shield size={16} className="text-emerald-600" />
                  المرحلة: {selectedStudent.eduLevel === 'primary' ? 'ابتدائي' : 'متوسط'}
                </p>
                <p className="text-slate-600 font-bold flex items-center gap-2">
                  <Users size={16} className="text-emerald-600" />
                  الصف: {selectedStudent.grade}
                </p>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <p className="text-sm font-bold text-blue-700 flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                عند تفعيل هذا الحساب، سيتمكن الطالب من الوصول الكامل لجميع ميزات المنصة التعليمية.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                disabled={isProcessing}
                className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? <RefreshCw className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                تأكيد التفعيل
              </button>
              <button
                onClick={() => {setIsApproveModalOpen(false); setSelectedStudent(null);}}
                className="px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => {setIsRejectModalOpen(false); setSelectedStudent(null); setRejectionReason('');}}
        title="رفض طلب الانضمام"
      >
        {selectedStudent && (
          <div className="space-y-6">
            <div className="p-6 bg-gradient-to-br from-red-50 to-pink-50 rounded-[2rem] border border-red-100">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center">
                  <UserX size={32} />
                </div>
                <div>
                  <p className="font-black text-slate-900 text-lg">{selectedStudent.fullName || `${selectedStudent.firstName} ${selectedStudent.lastName}`}</p>
                  <p className="text-sm text-slate-500 font-bold">{selectedStudent.email}</p>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-black text-slate-700 block mb-3">سبب الرفض:</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm font-bold resize-none"
                rows={4}
                placeholder="اكتب سبب رفض الطلب..."
              />
            </div>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <p className="text-sm font-bold text-amber-700 flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                سيتم إشعار الطالب بسبب الرفض ولن يتمكن من استخدام المنصة.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleReject}
                disabled={isProcessing || !rejectionReason.trim()}
                className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? <RefreshCw className="animate-spin" size={20} /> : <XCircle size={20} />}
                تأكيد الرفض
              </button>
              <button
                onClick={() => {setIsRejectModalOpen(false); setSelectedStudent(null); setRejectionReason('');}}
                className="px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-all"
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

export default StudentApprovalManagement;
