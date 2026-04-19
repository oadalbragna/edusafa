import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  X,
  UploadCloud,
  CheckCircle2, 
  Loader2,
  Printer,
  RefreshCw,
  Wallet,
  PlusCircle,
  Filter,
  Download,
  History,
  QrCode,
  Layout,
  Edit,
  Trash2,
  UserCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  FileText,
  Calendar,
    Share2
  } from 'lucide-react';
  import { 
    ResponsiveContainer, 
   
  AreaChart, 
  Area, 
  XAxis, 
  CartesianGrid, 
  Tooltip
} from 'recharts';
import { getDb as db } from '../../services/firebase';
import { TelegramService } from '../../services/telegram.service';
import { ref, onValue, push, set, update, remove } from 'firebase/database';
import { useAuth } from '../../context/AuthContext';
import { SYS, EDU, COMM } from '../../constants/dbPaths';
import Modal from '../../components/common/Modal';
import type { Payment, UserProfile, FeeType, PaymentStatus, PaymentHistory, EditLog } from '../../types';

const FinancialManagement: React.FC = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const isParent = profile?.role === 'parent';
  const isStudent = profile?.role === 'student';

  // -- Core Data States --
  const [payments, setPayments] = useState<Payment[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<PlatformSettings | null>(null);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // -- Smart Filters Engine --
  const [filterQuery, setFilterQuery] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterStatus, setFilterStatus] = useState<PaymentStatus | 'all'>('all');
  const [filterFeeType, setFilterType] = useState<FeeType | 'all'>('all');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  // -- Modal States --
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isBankManagementOpen, setIsBankManagementOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Payment | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  // -- Bank Form State --
  const [newBank, setNewBank] = useState<Partial<BankAccount>>({ bankName: '', accountName: '', accountNumber: '', active: true, instructions: '' });

  // -- Share Logic --
  const handleShareToUser = async (targetUserId: string, targetName: string) => {
    if (!selectedInvoice || !profile) return;
    setIsUploading(true);
    try {
      // Chat ID logic must match ChatPage: [id1, id2].sort().join('_')
      const chatId = [profile.uid, targetUserId].sort().join('_');
      const messagesRef = ref(db, `${COMM.MESSAGES}/${chatId}`);

      const invoiceMessage = {
        id: `msg_inv_${Date.now()}`,
        senderId: profile.uid,
        senderName: profile.fullName || 'الإدارة المالية',
        text: `إشعار فاتورة: ${selectedInvoice.description}`,
        type: 'invoice',
        invoiceData: {
          id: selectedInvoice.id,
          description: selectedInvoice.description,
          amount: selectedInvoice.totalAmount,
          balance: selectedInvoice.balance,
          dueDate: selectedInvoice.dueDate,
          status: selectedInvoice.status
        },
        timestamp: Date.now(),
        read: false
      };

      await push(messagesRef, invoiceMessage);

      // Update Chat Metadata to make it appear in the list
      await set(ref(db, `${COMM.CHATS}/${chatId}`), {
        id: chatId,
        participants: [profile.uid, targetUserId],
        lastMessage: `📄 فاتورة: ${selectedInvoice.description}`,
        lastTimestamp: Date.now()
      });

      alert(`تم إرسال الفاتورة إلى ${targetName} بنجاح`);
    } catch (err: any) {
      alert(`فشل الإرسال: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // -- Installment Logic States --
  const [installmentCount, setInstallmentCount] = useState(2);
  const [generatedInstallments, setGeneratedInstallments] = useState<{ amount: number, dueDate: string }[]>([]);

  // -- Invoicing Logic States --
  const [targetType, setTargetType] = useState<'individual' | 'class' | 'level' | 'debtors' | 'teachers'>('individual');
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showUserResults, setShowUserResults] = useState(false);

  const [newInvoice, setNewInvoice] = useState({
    description: '',
    amount: 0,
    feeType: 'tuition' as FeeType,
    dueDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [editInvoice, setEditInvoice] = useState<Partial<Payment>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string>('');
  const [selectedBankId, setSelectedBankId] = useState('');
  const [selectedInstallmentId, setSelectedInstallmentId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(0);

  // -- Fetch Data --
  useEffect(() => {
    const pRef = ref(db, SYS.FINANCIAL.PAYMENTS);
    const uRef = ref(db, SYS.USERS);
    const cRef = ref(db, EDU.SCH.CLASSES);
    const sRef = ref(db, SYS.SYSTEM.SETTINGS);
    const bRef = ref(db, SYS.SYSTEM.BANKS);

    const unsubP = onValue(pRef, (snap) => {
      if (snap.exists()) setPayments(Object.values(snap.val()));
      else setPayments([]);
      setLoading(false);
    });

    const unsubU = onValue(uRef, (snap) => {
      if (snap.exists()) setAllUsers(Object.values(snap.val()));
    });

    const unsubC = onValue(cRef, (snap) => {
      if (snap.exists()) setClasses(Object.values(snap.val()));
    });

    const unsubS = onValue(sRef, (snap) => {
      if (snap.exists()) setSchoolSettings(snap.val());
    });

    const unsubB = onValue(bRef, (snap) => {
      if (snap.exists()) setBanks(Object.values(snap.val()));
      else setBanks([]);
    });

    return () => { unsubP(); unsubU(); unsubC(); unsubS(); unsubB(); };
  }, []);

  // -- User Mapping for Performance --
  const userMap = useMemo(() => {
    const map: Record<string, UserProfile> = {};
    allUsers.forEach(u => map[u.uid] = u);
    return map;
  }, [allUsers]);

  // -- Filtering Logic --
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const user = userMap[p.studentId];
      const userName = (user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`).toLowerCase();
      const matchesQuery = p.description.toLowerCase().includes(filterQuery.toLowerCase()) || 
                          userName.includes(filterQuery.toLowerCase()) ||
                          p.id.toLowerCase().includes(filterQuery.toLowerCase());
      
      const matchesClass = filterClass === 'all' || user?.classId === filterClass;
      const matchesLevel = filterLevel === 'all' || user?.eduLevel === filterLevel;
      const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
      const matchesType = filterFeeType === 'all' || p.feeType === filterFeeType;

      let hasAccess = isAdmin;
      if (isStudent) hasAccess = p.studentId === profile?.uid;
      if (isParent) {
        const linkedIds = allUsers.filter(u => 
          u.uid === profile?.studentLink || u.parentUid === profile?.uid || u.parentEmail === profile?.email
        ).map(u => u.uid);
        hasAccess = linkedIds.includes(p.studentId);
      }

      return matchesQuery && matchesClass && matchesLevel && matchesStatus && matchesType && hasAccess;
    });
  }, [payments, userMap, filterQuery, filterClass, filterLevel, filterStatus, filterFeeType, isAdmin, isStudent, isParent, profile, allUsers]);

  const groupedPayments = useMemo(() => {
    const groups: Record<string, { payments: Payment[], total: number, paid: number, balance: number, hasReview: boolean }> = {};
    filteredPayments.forEach(p => {
      if (!groups[p.studentId]) {
        groups[p.studentId] = { payments: [], total: 0, paid: 0, balance: 0, hasReview: false };
      }
      groups[p.studentId].payments.push(p);
      groups[p.studentId].total += (p.totalAmount || 0);
      groups[p.studentId].paid += (p.paidAmount || 0);
      groups[p.studentId].balance += (p.balance || 0);
      if (p.status === 'reviewing') groups[p.studentId].hasReview = true;
    });
    return groups;
  }, [filteredPayments]);

  const toggleUserExpansion = (uid: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  // -- Analytics Logic --
  const stats = useMemo(() => {
    const total = filteredPayments.reduce((acc, curr) => acc + (Number(curr.totalAmount) || 0), 0);
    const paid = filteredPayments.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0);
    const pending = total - paid;
    const rate = total > 0 ? Math.round((paid / total) * 100) : 0;
    return { total, paid, pending, rate };
  }, [filteredPayments]);

  const chartData = useMemo(() => {
    return [
      { name: 'أكتوبر', revenue: 450000 },
      { name: 'نوفمبر', revenue: 520000 },
      { name: 'ديسمبر', revenue: 480000 },
      { name: 'يناير', revenue: 610000 },
      { name: 'فبراير', revenue: 750000 },
      { name: 'مارس', revenue: stats.paid },
    ];
  }, [stats]);

  // -- Handlers --
  const handleBankManagement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setIsUploading(true);
    try {
      const bRef = push(ref(db, SYS.SYSTEM.BANKS));
      await set(bRef, { ...newBank, id: bRef.key });
      setNewBank({ bankName: '', accountName: '', accountNumber: '', active: true, instructions: '' });
      alert('تم إضافة الحساب البنكي بنجاح');
    } catch (err: any) { alert(err.message); } finally { setIsUploading(false); }
  };

  const handleDeleteBank = async (id: string) => {
    if (!isAdmin || !window.confirm('حذف هذا البنك؟')) return;
    await remove(ref(db, `${SYS.SYSTEM.BANKS}/${id}`));
  };

  const handleApprovePayment = async (invoiceId: string, historyId: string) => {
    if (!isAdmin) return;
    const inv = payments.find(p => p.id === invoiceId);
    if (!inv) return;

    const record = inv.history?.find(h => h.id === historyId);
    if (!record) return;

    setIsUploading(true);
    try {
      const newPaid = (inv.paidAmount || 0) + record.amount;
      const newBalance = inv.totalAmount - newPaid;
      const newStatus = newBalance <= 0 ? 'paid' : 'partial';

      // Update basic payment info
      await update(ref(db, `${SYS.FINANCIAL.PAYMENTS}/${invoiceId}`), {
        paidAmount: newPaid,
        balance: newBalance,
        status: newStatus,
        history: inv.history?.map(h => h.id === historyId ? { ...h, recordedBy: profile?.fullName || 'مدير' } : h)
      });

      // Send automated success message to student inbox
      const chatId = [profile!.uid, inv.studentId].sort().join('_');
      const messagesRef = ref(db, `${COMM.MESSAGES}/${chatId}`);
      
      const successMessage = {
        id: `msg_pay_ok_${Date.now()}`,
        senderId: profile!.uid,
        senderName: profile!.fullName || 'الإدارة المالية',
        text: `✅ تم اعتماد عملية السداد بنجاح لمبلغ (${record.amount.toLocaleString()} ج.س) لصالح: ${inv.description}. الرصيد المتبقي: ${newBalance.toLocaleString()} ج.س.`,
        type: 'payment_success',
        timestamp: Date.now(),
        read: false
      };
      await push(messagesRef, successMessage);

      // Update old "Pay Now" messages to "Completed"
      const snapshot = await get(messagesRef);
      if (snapshot.exists()) {
        const msgs = snapshot.val();
        const updates: any = {};
        Object.entries(msgs).forEach(([mId, m]: [string, any]) => {
          if (m.type === 'invoice' && m.invoiceData?.id === invoiceId) {
            updates[`${mId}/text`] = `✅ تم السداد: ${m.text.replace('إشعار فاتورة:', '')}`;
            updates[`${mId}/status`] = 'completed';
          }
        });
        if (Object.keys(updates).length > 0) {
          await update(messagesRef, updates);
        }
      }

      alert('تم اعتماد العملية وإشعار الطالب بنجاح');
    } catch (err) { alert('فشل الاعتماد'); } finally { setIsUploading(false); }
  };

  const handleIssueInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setIsUploading(true);
    try {
      let targets: string[] = [];
      if (targetType === 'individual' && selectedTargetId) targets = [selectedTargetId];
      else if (targetType === 'class') targets = allUsers.filter(u => u.classId === selectedTargetId).map(u => u.uid);
      else if (targetType === 'level') targets = allUsers.filter(u => u.eduLevel === selectedTargetId).map(u => u.uid);
      else if (targetType === 'debtors') targets = Array.from(new Set(payments.filter(p => (p.balance || 0) > 0).map(p => p.studentId)));
      else if (targetType === 'teachers') targets = allUsers.filter(u => u.role === 'teacher').map(u => u.uid);

      if (targets.length === 0) throw new Error('يرجى اختيار المستهدفين بشكل صحيح');

      const batch = targets.map(uid => {
        const payRef = push(ref(db, SYS.FINANCIAL.PAYMENTS));
        const invoice: Payment = {
          id: payRef.key!,
          studentId: uid,
          targetRole: targetType === 'teachers' ? 'teacher' : 'student',
          description: newInvoice.description,
          totalAmount: newInvoice.amount,
          paidAmount: 0,
          balance: newInvoice.amount,
          feeType: newInvoice.feeType,
          dueDate: newInvoice.dueDate,
          status: 'unpaid',
          notes: newInvoice.notes,
          createdAt: new Date().toISOString(),
          history: [],
          editLogs: []
        };
        return set(payRef, invoice);
      });

      await Promise.all(batch);
      alert('تم إصدار الفواتير بنجاح');
      setIsInvoiceModalOpen(false);
      setNewInvoice({ description: '', amount: 0, feeType: 'tuition', dueDate: new Date().toISOString().split('T')[0], notes: '' });
    } catch (err: any) { alert(err.message); } finally { setIsUploading(false); }
  };

  const handleUpdateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || !isAdmin) return;
    
    setIsUploading(true);
    try {
      const log: EditLog = {
        date: new Date().toISOString(),
        user: profile?.fullName || 'مدير',
        field: 'تعديل شامل',
        oldValue: selectedInvoice,
        newValue: editInvoice
      };

      const updatedData = {
        ...selectedInvoice,
        ...editInvoice,
        balance: (Number(editInvoice.totalAmount) || selectedInvoice.totalAmount) - (selectedInvoice.paidAmount || 0),
        editLogs: [...(selectedInvoice.editLogs || []), log]
      };

      await update(ref(db, `${SYS.FINANCIAL.PAYMENTS}/${selectedInvoice.id}`), updatedData);
      alert('تم تحديث الفاتورة بنجاح');
      setIsEditModalOpen(false);
    } catch (err) { alert('فشل التعديل'); } finally { setIsUploading(false); }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!isAdmin || !window.confirm('هل أنت متأكد من حذف هذه الفاتورة؟')) return;
    try {
      await remove(ref(db, `${SYS.FINANCIAL.PAYMENTS}/${id}`));
      setIsDetailModalOpen(false);
    } catch (err) { alert('فشل الحذف'); }
  };

  const handleScheduleInstallments = async () => {
    if (!selectedInvoice || generatedInstallments.length === 0) return;
    setIsUploading(true);
    try {
      const installments = generatedInstallments.map((inst, idx) => ({
        id: `inst_${idx}_${Date.now()}`,
        amount: inst.amount,
        dueDate: inst.dueDate,
        status: 'unpaid' as const
      }));

      await update(ref(db, `${SYS.FINANCIAL.PAYMENTS}/${selectedInvoice.id}`), {
        installments
      });

      alert('تمت جدولة الأقساط بنجاح');
      setIsInstallmentModalOpen(false);
      setIsDetailModalOpen(false);
    } catch (err) { alert('فشل الجدولة'); } finally { setIsUploading(false); }
  };

  const handleRecordPayment = async (amount: number, method: 'cash' | 'bankak', proof?: File, installmentId?: string) => {
    if (!selectedInvoice || !profile) return;
    setIsUploading(true);
    try {
      let proofUrl = '';
      if (proof) {
        const res = await TelegramService.uploadFile(proof, 'payments', selectedInvoice.id);
        if (res.success && res.url) {
          proofUrl = res.url;
        } else {
          throw new Error(res.error || "فشل رفع إثبات السداد");
        }
      }

      const newPaid = (Number(selectedInvoice.paidAmount) || 0) + amount;
      const newBalance = (selectedInvoice.totalAmount || 0) - (isStudent || isParent ? (Number(selectedInvoice.paidAmount) || 0) : newPaid);
      const newStatus: PaymentStatus = (isStudent || isParent) ? 'reviewing' : (newBalance <= 0 ? 'paid' : 'partial');

      // Update installments if one was selected
      let updatedInstallments = selectedInvoice.installments || [];
      if (installmentId) {
        updatedInstallments = updatedInstallments.map(inst => 
          inst.id === installmentId ? { ...inst, status: (isStudent || isParent ? inst.status : 'paid' as const) } : inst
        );
      }

      const historyItem: PaymentHistory = {
        id: Math.random().toString(36).substr(2, 9),
        amount,
        date: new Date().toISOString(),
        method,
        proofUrl,
        recordedBy: profile.fullName || (isStudent ? 'الطالب' : isParent ? 'ولي الأمر' : 'نظام')
      };

      await update(ref(db, `${SYS.FINANCIAL.PAYMENTS}/${selectedInvoice.id}`), {
        paidAmount: (isStudent || isParent) ? (selectedInvoice.paidAmount || 0) : newPaid,
        balance: (isStudent || isParent) ? (selectedInvoice.balance || 0) : newBalance,
        status: newStatus,
        history: [...(selectedInvoice.history || []), historyItem],
        installments: updatedInstallments
      });

      alert((isStudent || isParent) ? 'تم إرسال إشعار السداد بنجاح، سيتم تأكيده من قبل الإدارة' : 'تم تسجيل الدفع بنجاح');
      setIsPaymentModalOpen(false);
      setIsDetailModalOpen(false);
    } catch (err) { alert('فشل التسجيل'); } finally { setIsUploading(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in pb-20" dir="rtl">
      {/* Header & Stats Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[3rem] p-8 border border-slate-200 shadow-sm relative">
           <div className="flex justify-between items-center mb-8">
              <div>
                 <h2 className="text-2xl font-black text-slate-900">الأداء المالي التحليلي</h2>
                 <p className="text-slate-400 text-sm font-bold mt-1">عرض حالة السيولة والتحصيل لعام ٢٠٢٦</p>
              </div>
              <div className="flex gap-2">
                 <button className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-blue-50 transition-all"><RefreshCw size={20}/></button>
                 {isAdmin && (
                   <>
                    <button onClick={() => setIsBankManagementOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-white text-slate-900 border border-slate-200 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all"><Wallet size={18}/> إدارة البنوك</button>
                    <button onClick={() => setIsInvoiceModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all"><PlusCircle size={18}/> إصدار فاتورة</button>
                   </>
                 )}
              </div>
           </div>
           
           <div className="h-40 w-full mb-8">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                    <Tooltip />
                    <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} fill="#2563eb" fillOpacity={0.05} />
                 </AreaChart>
              </ResponsiveContainer>
           </div>

           <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-100">
              <div className="text-center">
                 <p className="text-[10px] font-black text-slate-400 uppercase mb-1">المحصل</p>
                 <h4 className="text-lg font-black text-slate-900">{(stats.paid || 0).toLocaleString()} <span className="text-[10px]">ج.س</span></h4>
              </div>
              <div className="text-center border-x border-slate-100">
                 <p className="text-[10px] font-black text-slate-400 uppercase mb-1">المعلق</p>
                 <h4 className="text-lg font-black text-amber-600">{(stats.pending || 0).toLocaleString()} <span className="text-[10px]">ج.س</span></h4>
              </div>
              <div className="text-center">
                 <p className="text-[10px] font-black text-slate-400 uppercase mb-1">النسبة</p>
                 <h4 className="text-lg font-black text-emerald-600">{stats.rate}%</h4>
              </div>
           </div>
        </div>

        <div className="bg-slate-900 rounded-[3rem] p-8 text-white relative overflow-hidden flex flex-col justify-between shadow-2xl">
           <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
           <div className="space-y-6 relative z-10">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10"><Wallet size={28}/></div>
              <h3 className="text-3xl font-black leading-tight tracking-tight">نظام المالية<br/>المتكامل ERP</h3>
              <p className="text-slate-400 text-sm font-medium leading-relaxed">أتمتة كاملة لإصدار الفواتير، متابعة الأقساط، وصرف الرواتب بدقة وأمان.</p>
           </div>
           <div className="pt-8 relative z-10">
              <button onClick={() => setIsFilterExpanded(!isFilterExpanded)} className="w-full py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                 <Filter size={18}/> {isFilterExpanded ? 'إغلاق الفلترة' : 'محرك الفلترة الذكي'}
              </button>
           </div>
        </div>
      </div>

      {/* Advanced Filters */}
      {isFilterExpanded && (
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm animate-in slide-in-from-top-4 duration-300">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">البحث النصي</label>
                 <div className="relative">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={16}/>
                    <input type="text" placeholder="اسم، بيان..." className="w-full pr-10 pl-4 py-3 bg-slate-50 border-none rounded-xl font-bold text-sm outline-none" value={filterQuery} onChange={e=>setFilterQuery(e.target.value)} />
                 </div>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">الفصل</label>
                 <select className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold text-sm outline-none" value={filterClass} onChange={e=>setFilterClass(e.target.value)}>
                    <option value="all">الكل</option>
                    {classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">المرحلة</label>
                 <select className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold text-sm outline-none" value={filterLevel} onChange={e=>setFilterLevel(e.target.value)}>
                    <option value="all">الكل</option>
                    <option value="primary">ابتدائي</option>
                    <option value="middle">متوسط</option>
                    <option value="high">ثانوي</option>
                 </select>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">الحالة</label>
                 <select className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold text-sm outline-none" value={filterStatus} onChange={e=>setFilterStatus(e.target.value as any)}>
                    <option value="all">الكل</option>
                    <option value="unpaid">غير مدفوع</option>
                    <option value="partial">جزئي</option>
                    <option value="paid">مكتمل</option>
                    <option value="reviewing">قيد المراجعة</option>
                 </select>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">النوع</label>
                 <select className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold text-sm outline-none" value={filterFeeType} onChange={e=>setFilterType(e.target.value as any)}>
                    <option value="all">الكل</option>
                    <option value="tuition">دراسة</option>
                    <option value="transport">مواصلات</option>
                    <option value="salary">رواتب</option>
                 </select>
              </div>
           </div>
        </div>
      )}

      {/* Main Table with User Grouping */}
      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full text-right">
               <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                     <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">المستفيد / البيان</th>
                     <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">المبلغ</th>
                     <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">المحصل</th>
                     <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">المتبقي</th>
                     <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest text-center">الحالة</th>
                     <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest text-left">التحكم</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {Object.entries(groupedPayments).map(([uid, group]) => {
                    const user = userMap[uid];
                    const fullName = user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}` || 'مستخدم غير معروف';
                    const isExpanded = expandedUsers.has(uid);
                    
                    return (
                      <React.Fragment key={uid}>
                        {/* User Summary Row */}
                        <tr 
                          onClick={() => toggleUserExpansion(uid)}
                          className={`cursor-pointer transition-all relative ${isExpanded ? 'bg-blue-50/30' : 'hover:bg-slate-50'} ${group.hasReview ? 'bg-amber-50/30' : ''}`}
                        >
                           {group.hasReview && <div className="absolute inset-0 bg-amber-400/5 animate-pulse pointer-events-none"></div>}
                           <td className="px-8 py-6">
                              <div className="flex items-center gap-4 relative z-10">
                                 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black transition-all ${isExpanded ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'} ${group.hasReview ? 'ring-4 ring-amber-400/20' : ''}`}>
                                    {fullName.charAt(0)}
                                 </div>
                                 <div>
                                    <p className="font-black text-slate-900 flex items-center gap-2">
                                       {fullName}
                                       <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded-md text-[10px] font-bold">{group.payments.length} فواتير</span>
                                       {group.hasReview && <span className="px-2 py-0.5 bg-amber-500 text-white rounded-md text-[9px] font-black animate-bounce shadow-lg shadow-amber-200">طلب جديد</span>}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">{user?.classId ? classes.find(c=>c.id===user.classId)?.name : 'قسم عام'}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-8 py-6 font-black text-slate-900 relative z-10">{(group.total || 0).toLocaleString()}</td>
                           <td className="px-8 py-6 font-black text-emerald-600 relative z-10">{(group.paid || 0).toLocaleString()}</td>
                           <td className="px-8 py-6 font-black text-amber-600 relative z-10">{(group.balance || 0).toLocaleString()}</td>
                           <td className="px-8 py-6 text-center relative z-10">
                              <div className="flex items-center justify-center">
                                 {isExpanded ? <ChevronUp className="text-blue-600" /> : <ChevronDown className="text-slate-300" />}
                              </div>
                           </td>
                           <td className="px-8 py-6 text-left relative z-10">
                              <span className="text-[10px] font-black text-blue-600 underline">عرض الكشف</span>
                           </td>
                        </tr>

                        {/* Expanded Invoices List */}
                        {isExpanded && group.payments.map(p => (
                          <tr key={p.id} className={`bg-slate-50/50 animate-in slide-in-from-top-2 duration-200 ${p.status === 'reviewing' ? 'bg-amber-50/20' : ''}`}>
                             <td className="px-12 py-4">
                                <div className="flex items-center gap-3">
                                   <div className={`w-8 h-8 bg-white rounded-xl flex items-center justify-center text-blue-50 shadow-sm border border-slate-100 ${p.status === 'reviewing' ? 'animate-bounce shadow-amber-200 text-amber-600 border-amber-200' : 'text-blue-500'}`}><FileText size={14}/></div>
                                   <div>
                                      <p className="font-bold text-slate-700 text-sm">{p.description}</p>
                                      <p className="text-[9px] font-bold text-slate-400">#{p.id.slice(0, 8)} • {p.feeType}</p>
                                   </div>
                                </div>
                             </td>
                             <td className="px-8 py-4 font-black text-slate-600 text-sm">{(p.totalAmount || 0).toLocaleString()}</td>
                             <td className="px-8 py-4 font-black text-emerald-500 text-sm">{(p.paidAmount || 0).toLocaleString()}</td>
                             <td className="px-8 py-4 font-black text-amber-500 text-sm">{(p.balance || 0).toLocaleString()}</td>
                             <td className="px-8 py-4 text-center">
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black border flex items-center justify-center gap-1 w-fit mx-auto ${
                                  p.status === 'paid' ? 'bg-green-50 text-green-600 border-green-100' :
                                  p.status === 'partial' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                  p.status === 'reviewing' ? 'bg-amber-500 text-white border-amber-600 shadow-lg shadow-amber-200 animate-pulse' :
                                  'bg-amber-50 text-amber-600 border-amber-100'
                                }`}>
                                   {p.status === 'paid' ? 'مكتمل' : p.status === 'partial' ? 'جزئي' : p.status === 'reviewing' ? 'انتظار الموافقة' : 'معلق'}
                                </span>
                             </td>
                             <td className="px-8 py-4 text-left">
                                <div className="flex justify-end gap-2">
                                   <button onClick={(e) => { e.stopPropagation(); setSelectedInvoice(p); setIsDetailModalOpen(true); }} className="p-2 bg-white text-slate-400 rounded-lg hover:text-blue-600 shadow-sm border border-slate-100 transition-all"><Layout size={14} /></button>
                                   {isAdmin && (
                                     <>
                                       <button onClick={(e) => { e.stopPropagation(); setSelectedInvoice(p); setEditInvoice(p); setIsEditModalOpen(true); }} className="p-2 bg-white text-slate-400 rounded-lg hover:text-amber-600 shadow-sm border border-slate-100 transition-all"><Edit size={14} /></button>
                                       <button onClick={(e) => { e.stopPropagation(); handleDeleteInvoice(p.id); }} className="p-2 bg-white text-slate-400 rounded-lg hover:text-red-600 shadow-sm border border-slate-100 transition-all"><Trash2 size={14} /></button>
                                     </>
                                   )}
                                </div>
                             </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
               </tbody>
            </table>
         </div>
      </div>

      {/* Details & History Modal */}
      <Modal isOpen={isDetailModalOpen} onClose={()=>setIsDetailModalOpen(false)} title="سجل وتفاصيل الفاتورة">
         {selectedInvoice && (
           <div className="space-y-8">
              <div className="bg-slate-900 rounded-[3rem] p-8 text-white relative">
                 <div className="flex justify-between border-b border-white/10 pb-4 mb-6">
                    <h4 className="font-black text-xl">#{selectedInvoice.id.slice(0, 8)}</h4>
                    <p className="text-slate-400 text-sm">{new Date(selectedInvoice.createdAt).toLocaleDateString('ar-SA')}</p>
                 </div>
                 <div className="grid grid-cols-2 gap-8 text-center">
                    <div><p className="text-[10px] text-blue-400 uppercase font-black mb-1">المبلغ المطلوب</p><p className="text-3xl font-black">{(selectedInvoice.totalAmount || 0).toLocaleString()}</p></div>
                    <div className="border-r border-white/10"><p className="text-[10px] text-amber-400 uppercase font-black mb-1">المتبقي</p><p className="text-3xl font-black">{(selectedInvoice.balance || 0).toLocaleString()}</p></div>
                 </div>
              </div>

              <div className="space-y-4">
                 <h4 className="font-black flex items-center gap-2 text-slate-900"><History size={18} className="text-blue-600"/> سجل السداد</h4>
                 <div className="space-y-2">
                    {selectedInvoice.history?.map((h, i) => (
                      <div key={i} className={`p-5 rounded-2xl flex justify-between items-center border ${h.recordedBy === 'مدير' || h.recordedBy === 'نظام' ? 'bg-slate-50 border-slate-100' : 'bg-amber-50 border-amber-200 shadow-lg shadow-amber-100'}`}>
                         <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm border ${h.recordedBy === 'مدير' || h.recordedBy === 'نظام' ? 'bg-white text-emerald-600 border-emerald-50' : 'bg-white text-amber-600 border-amber-200'}`}>
                               {h.recordedBy === 'مدير' || h.recordedBy === 'نظام' ? <CheckCircle2 size={24}/> : <Clock size={24} className="animate-spin" />}
                            </div>
                            <div>
                               <p className="font-black text-slate-800">{(h.amount || 0).toLocaleString()} ج.س</p>
                               <p className="text-[10px] text-slate-400 font-bold uppercase">{h.method} • {new Date(h.date).toLocaleString('ar-SA')}</p>
                               {h.recordedBy !== 'مدير' && h.recordedBy !== 'نظام' && <p className="text-[9px] font-black text-amber-600 mt-1 uppercase tracking-widest">بانتظار مراجعة الإدارة</p>}
                            </div>
                         </div>
                         <div className="flex gap-2">
                            {h.proofUrl && <a href={h.proofUrl} target="_blank" rel="noreferrer" className="p-3 bg-white text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white border border-slate-100 shadow-sm transition-all"><Download size={18}/></a>}
                            {isAdmin && (h.recordedBy !== 'مدير' && h.recordedBy !== 'نظام') && (
                              <button onClick={() => handleApprovePayment(selectedInvoice.id, h.id)} disabled={isUploading} className="px-4 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] hover:bg-emerald-700 shadow-lg shadow-emerald-100 flex items-center gap-2">
                                <CheckCircle2 size={14}/> اعتماد
                              </button>
                            )}
                         </div>
                      </div>
                    ))}
                    {(!selectedInvoice.history || selectedInvoice.history.length === 0) && (
                      <div className="py-12 text-center text-slate-400 italic bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-100">لا توجد عمليات سداد</div>
                    )}
                 </div>
              </div>

              {/* Installments Table */}
              {selectedInvoice.installments && selectedInvoice.installments.length > 0 && (
                <div className="space-y-4">
                   <h4 className="font-black flex items-center gap-2 text-slate-900"><Calendar size={18} className="text-amber-600"/> خطة الأقساط المجدولة</h4>
                   <div className="bg-amber-50/30 rounded-3xl border border-amber-100/50 overflow-hidden">
                      <table className="w-full text-right text-xs">
                         <thead className="bg-amber-100/50">
                            <tr>
                               <th className="p-4 font-black">القسط</th>
                               <th className="p-4 font-black">المبلغ</th>
                               <th className="p-4 font-black">تاريخ الاستحقاق</th>
                               <th className="p-4 font-black text-center">الحالة</th>
                            </tr>
                         </thead>
                         <tbody>
                            {selectedInvoice.installments.map((inst, idx) => (
                              <tr key={idx} className="border-t border-amber-100/30">
                                 <td className="p-4 font-bold">الدفعة {idx + 1}</td>
                                 <td className="p-4 font-black text-slate-700">{(inst.amount || 0).toLocaleString()} ج.س</td>
                                 <td className="p-4 text-slate-500 font-bold">{new Date(inst.dueDate).toLocaleDateString('ar-SA')}</td>
                                 <td className="p-4 text-center">
                                    <span className={`px-2 py-1 rounded-lg font-black text-[8px] ${inst.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                       {inst.status === 'paid' ? 'مُسدد' : 'مُنتظر'}
                                    </span>
                                 </td>
                              </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>
              )}

              <div className="flex gap-3">
                 {selectedInvoice.balance > 0 && (
                   <button onClick={() => { setPaymentAmount(selectedInvoice.balance); setIsPaymentModalOpen(true); }} className="flex-1 py-5 bg-blue-600 text-white rounded-[2rem] font-black shadow-xl shadow-blue-100 flex items-center justify-center gap-3 active:scale-95 transition-all">
                      <QrCode size={24}/> {isStudent || isParent ? 'سداد الآن' : 'تسجيل سداد'}
                   </button>
                 )}
                 {isAdmin && selectedInvoice.balance > 0 && !selectedInvoice.installments && (
                   <button onClick={() => {
                     const perInstallment = Math.round(selectedInvoice.balance / 2);
                     setGeneratedInstallments([
                       { amount: perInstallment, dueDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0] },
                       { amount: selectedInvoice.balance - perInstallment, dueDate: new Date(Date.now() + 60*24*60*60*1000).toISOString().split('T')[0] }
                     ]);
                     setIsInstallmentModalOpen(true);
                   }} className="flex-1 py-5 bg-amber-50 text-amber-700 rounded-[2rem] font-black border border-amber-100 flex items-center justify-center gap-2">
                      <Calendar size={20}/> جدولة أقساط
                   </button>
                 )}
                 <button onClick={() => window.print()} className="px-8 py-5 bg-slate-100 text-slate-600 rounded-[2rem] font-black hover:bg-slate-200 transition-all"><Printer size={24}/></button>
                 {isAdmin && (
                   <button 
                     onClick={() => setIsShareModalOpen(true)}
                     disabled={isUploading}
                     className="px-8 py-5 bg-brand-50 text-brand-600 rounded-[2rem] font-black hover:bg-brand-100 transition-all flex items-center gap-2"
                     title="مشاركة في المحادثة"
                   >
                     <Share2 size={24}/>
                     <span className="hidden md:inline text-xs">مشاركة</span>
                   </button>
                 )}
              </div>
           </div>
         )}
      </Modal>

      {/* Bank Management Modal */}
      <Modal isOpen={isBankManagementOpen} onClose={()=>setIsBankManagementOpen(false)} title="إدارة حسابات السداد البنكي">
         <div className="space-y-6">
            <form onSubmit={handleBankManagement} className="space-y-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
               <h4 className="text-sm font-black text-slate-900 mb-2 uppercase tracking-widest">إضافة حساب جديد</h4>
               <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="اسم البنك (مثلاً: بنكك)" required className="px-5 py-3 bg-white rounded-xl border border-slate-200 font-bold text-sm" value={newBank.bankName} onChange={e=>setNewBank({...newBank, bankName: e.target.value})} />
                  <input type="text" placeholder="اسم الحساب الكامل" required className="px-5 py-3 bg-white rounded-xl border border-slate-200 font-bold text-sm" value={newBank.accountName} onChange={e=>setNewBank({...newBank, accountName: e.target.value})} />
               </div>
               <input type="text" placeholder="رقم الحساب البنكي" required className="w-full px-5 py-3 bg-white rounded-xl border border-slate-200 font-black text-sm" value={newBank.accountNumber} onChange={e=>setNewBank({...newBank, accountNumber: e.target.value})} />
               <textarea placeholder="تعليمات إضافية (اختياري)..." className="w-full px-5 py-3 bg-white rounded-xl border border-slate-200 font-bold text-sm" rows={2} value={newBank.instructions} onChange={e=>setNewBank({...newBank, instructions: e.target.value})} />
               <button type="submit" disabled={isUploading} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100">
                  <PlusCircle size={18}/> إضافة الحساب البنكي
               </button>
            </form>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
               {banks.map(bank => (
                 <div key={bank.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex justify-between items-center group">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><Wallet size={20}/></div>
                       <div>
                          <p className="font-black text-slate-900 text-sm">{bank.bankName}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{bank.accountNumber} • {bank.accountName}</p>
                       </div>
                    </div>
                    <button onClick={() => handleDeleteBank(bank.id)} className="p-2 text-slate-300 hover:text-red-500 transition-all"><Trash2 size={16}/></button>
                 </div>
               ))}
               {banks.length === 0 && <p className="text-center py-6 text-slate-400 italic text-xs">لا توجد حسابات بنكية مضافة</p>}
            </div>
         </div>
      </Modal>

      {/* Share Selection Modal */}
      <Modal isOpen={isShareModalOpen} onClose={()=>setIsShareModalOpen(false)} title="اختيار مستلم الفاتورة">
         {selectedInvoice && (
           <div className="space-y-6">
              <div className="p-6 bg-blue-50 border border-blue-100 rounded-[2rem] flex items-center gap-4">
                 <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black">📄</div>
                 <div>
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">مشاركة فاتورة:</p>
                    <p className="font-black text-blue-900 leading-tight">{selectedInvoice.description}</p>
                 </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                 {/* Option: Student */}
                 {userMap[selectedInvoice.studentId] && (
                   <button 
                     onClick={() => handleShareToUser(selectedInvoice.studentId, userMap[selectedInvoice.studentId].fullName || 'الطالب')}
                     disabled={isUploading}
                     className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-3xl hover:border-brand-500 hover:bg-brand-50/30 transition-all group"
                   >
                      <div className="flex items-center gap-4 text-right">
                         <div className="w-12 h-12 bg-slate-100 text-slate-400 group-hover:bg-brand-500 group-hover:text-white rounded-2xl flex items-center justify-center transition-all">
                            <UserCheck size={24} />
                         </div>
                         <div>
                            <p className="font-black text-slate-900 leading-none mb-1">إرسال للطالب</p>
                            <p className="text-[11px] text-slate-400 font-bold">{userMap[selectedInvoice.studentId].fullName}</p>
                         </div>
                      </div>
                      <ChevronRight size={18} className="text-slate-300 rotate-180" />
                   </button>
                 )}

                 {/* Option: Parent */}
                 {userMap[selectedInvoice.studentId]?.parentUid && (
                   <button 
                     onClick={() => handleShareToUser(userMap[selectedInvoice.studentId].parentUid!, 'ولي الأمر')}
                     disabled={isUploading}
                     className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-3xl hover:border-brand-500 hover:bg-brand-50/30 transition-all group"
                   >
                      <div className="flex items-center gap-4 text-right">
                         <div className="w-12 h-12 bg-slate-100 text-slate-400 group-hover:bg-brand-500 group-hover:text-white rounded-2xl flex items-center justify-center transition-all">
                            <Users size={24} />
                         </div>
                         <div>
                            <p className="font-black text-slate-900 leading-none mb-1">إرسال لولي الأمر</p>
                            <p className="text-[11px] text-slate-400 font-bold">المسؤول عن حساب الطالب</p>
                         </div>
                      </div>
                      <ChevronRight size={18} className="text-slate-300 rotate-180" />
                   </button>
                 )}
              </div>

              {isUploading && (
                <div className="flex items-center justify-center gap-3 text-blue-600 py-4">
                   <Loader2 className="animate-spin" size={20} />
                   <span className="font-black text-xs uppercase tracking-widest">جاري إرسال الإشعار...</span>
                </div>
              )}
           </div>
         )}
      </Modal>

      {/* Edit Invoice Modal */}
      <Modal isOpen={isEditModalOpen} onClose={()=>setIsEditModalOpen(false)} title="تعديل الفاتورة">
         <form onSubmit={handleUpdateInvoice} className="space-y-6">
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3">
               <AlertTriangle className="text-amber-600" size={20}/>
               <p className="text-xs font-bold text-amber-700 leading-relaxed italic">انتباه: تغيير المبلغ الإجمالي سيؤثر تلقائياً على الرصيد المتبقي.</p>
            </div>
            <div className="space-y-2">
               <label className="text-sm font-black text-slate-700">البيان المالي</label>
               <input type="text" className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold" value={editInvoice.description} onChange={e=>setEditInvoice({...editInvoice, description: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700">المبلغ الإجمالي</label>
                  <input type="number" className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-blue-600" value={editInvoice.totalAmount} onChange={e=>setEditInvoice({...editInvoice, totalAmount: Number(e.target.value)})} />
               </div>
               <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700">حالة الفاتورة</label>
                  <select className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold" value={editInvoice.status} onChange={e=>setEditInvoice({...editInvoice, status: e.target.value as any})}>
                     <option value="unpaid">غير مدفوع</option>
                     <option value="partial">مدفوع جزئي</option>
                     <option value="paid">مكتمل</option>
                     <option value="reviewing">قيد المراجعة</option>
                  </select>
               </div>
            </div>
            <button type="submit" disabled={isUploading} className="w-full py-5 bg-amber-600 text-white rounded-[2rem] font-black shadow-xl">
               {isUploading ? <Loader2 className="animate-spin" /> : 'حفظ التعديلات'}
            </button>
         </form>
      </Modal>

      {/* Invoice Creation Modal */}
      <Modal isOpen={isInvoiceModalOpen} onClose={()=>setIsInvoiceModalOpen(false)} title="إصدار فواتير ذكية">
         <form onSubmit={handleIssueInvoice} className="space-y-6">
            <div className="bg-slate-50 p-6 rounded-[2.5rem] space-y-4">
               <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                  {[
                    { id: 'individual', label: 'طالب محدد' },
                    { id: 'class', label: 'فصل دراسي' },
                    { id: 'level', label: 'مرحلة كاملة' },
                    { id: 'debtors', label: 'المتأخرين' },
                    { id: 'teachers', label: 'المعلمون' }
                  ].map(t => (
                    <button key={t.id} type="button" onClick={() => { setTargetType(t.id as any); setSelectedTargetId(''); setUserSearchTerm(''); }} className={`p-3 rounded-xl border-2 text-[10px] font-black transition-all ${targetType === t.id ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-sm' : 'border-white bg-white text-slate-400 hover:border-blue-100'}`}>{t.label}</button>
                  ))}
               </div>
               
               {targetType === 'individual' && (
                 <div className="relative">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                    <input type="text" placeholder="ابحث عن الطالب..." className="w-full pr-12 pl-4 py-4 bg-white rounded-2xl font-bold outline-none border border-slate-100" value={userSearchTerm} onChange={e=>{setUserSearchTerm(e.target.value); setShowUserResults(true);}} />
                    {showUserResults && userSearchTerm.length > 0 && (
                      <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl max-h-48 overflow-y-auto p-2">
                         {allUsers.filter(u=> (u.fullName || u.firstName || '').toLowerCase().includes(userSearchTerm.toLowerCase())).map(u=>(
                           <button key={u.uid} type="button" onClick={()=>{setSelectedTargetId(u.uid); setUserSearchTerm(u.fullName || `${u.firstName} ${u.lastName}`); setShowUserResults(false);}} className="w-full p-3 text-right hover:bg-blue-50 rounded-xl text-sm font-bold flex justify-between">
                              <span>{u.fullName || `${u.firstName} ${u.lastName}`}</span>
                              <span className="text-[10px] text-slate-400">ID: {u.uid.slice(0,6)}</span>
                           </button>
                         ))}
                      </div>
                    )}
                 </div>
               )}
               {targetType === 'class' && (
                 <select className="w-full p-4 bg-white rounded-2xl font-bold outline-none border border-slate-100" onChange={e=>setSelectedTargetId(e.target.value)}>
                    <option value="">-- اختر الفصل --</option>
                    {classes.map(c=><option key={c.id} value={c.id}>{c.name} - الصف {c.grade}</option>)}
                 </select>
               )}
               {targetType === 'level' && (
                 <select className="w-full p-4 bg-white rounded-2xl font-bold outline-none border border-slate-100" onChange={e=>setSelectedTargetId(e.target.value)}>
                    <option value="">-- اختر المرحلة --</option>
                    <option value="primary">الابتدائية</option>
                    <option value="middle">المتوسطة</option>
                    <option value="high">الثانوية</option>
                 </select>
               )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <input type="text" required className="px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold" placeholder="بيان الفاتورة..." value={newInvoice.description} onChange={e=>setNewInvoice({...newInvoice, description: e.target.value})} />
               <select className="px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold" value={newInvoice.feeType} onChange={e=>setNewInvoice({...newInvoice, feeType: e.target.value as any})}>
                  <option value="tuition">رسوم دراسية</option>
                  <option value="transport">مواصلات</option>
                  <option value="books">كتب</option>
                  <option value="activities">أنشطة</option>
                  <option value="salary">رواتب</option>
               </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <input type="number" required className="px-6 py-4 bg-slate-50 border-none rounded-2xl font-black text-blue-600" placeholder="المبلغ..." value={newInvoice.amount} onChange={e=>setNewInvoice({...newInvoice, amount: Number(e.target.value)})} />
               <input type="date" required className="px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold" value={newInvoice.dueDate} onChange={e=>setNewInvoice({...newInvoice, dueDate: e.target.value})} />
            </div>

            <button type="submit" disabled={isUploading || (targetType === 'individual' && !selectedTargetId)} className={`w-full py-5 rounded-[2.5rem] font-black shadow-xl transition-all flex items-center justify-center gap-3 ${isUploading ? 'bg-slate-100 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'}`}>
               {isUploading ? <Loader2 className="animate-spin" /> : <PlusCircle />} <span>إصدار الفواتير</span>
            </button>
         </form>
      </Modal>

      {/* Installment Modal */}
      <Modal isOpen={isInstallmentModalOpen} onClose={()=>setIsInstallmentModalOpen(false)} title="إعداد خطة الأقساط المجدولة">
         <div className="space-y-6">
            <div className="p-6 bg-amber-50 border border-amber-100 rounded-[2rem] flex gap-4">
               <AlertTriangle className="text-amber-600 shrink-0" size={24}/>
               <p className="text-xs font-bold text-amber-700 leading-relaxed">
                  سيتم تقسيم المبلغ المتبقي <span className="font-black text-amber-900">({(selectedInvoice?.balance || 0).toLocaleString()} ج.س)</span> على الدفعات المحددة أدناه. يمكنك تعديل المبالغ والتواريخ يدوياً.
               </p>
            </div>

            <div className="flex items-center justify-between px-4">
               <label className="text-sm font-black text-slate-700">عدد الأقساط</label>
               <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                  <button 
                    onClick={() => {
                      const count = Math.max(2, installmentCount - 1);
                      setInstallmentCount(count);
                      const per = Math.floor(selectedInvoice!.balance / count);
                      setGeneratedInstallments(Array(count).fill(0).map((_, i) => ({
                        amount: i === count - 1 ? (selectedInvoice!.balance - (per * (count - 1))) : per,
                        dueDate: new Date(Date.now() + (i+1)*30*24*60*60*1000).toISOString().split('T')[0]
                      })));
                    }}
                    className="w-10 h-10 bg-white rounded-xl shadow-sm text-slate-400 hover:text-red-500 transition-all font-black text-xl"
                  >-</button>
                  <span className="font-black text-lg w-8 text-center">{installmentCount}</span>
                  <button 
                    onClick={() => {
                      const count = Math.min(12, installmentCount + 1);
                      setInstallmentCount(count);
                      const per = Math.floor(selectedInvoice!.balance / count);
                      setGeneratedInstallments(Array(count).fill(0).map((_, i) => ({
                        amount: i === count - 1 ? (selectedInvoice!.balance - (per * (count - 1))) : per,
                        dueDate: new Date(Date.now() + (i+1)*30*24*60*60*1000).toISOString().split('T')[0]
                      })));
                    }}
                    className="w-10 h-10 bg-white rounded-xl shadow-sm text-slate-400 hover:text-emerald-500 transition-all font-black text-xl"
                  >+</button>
               </div>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
               {generatedInstallments.map((inst, idx) => (
                 <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4 animate-in fade-in zoom-in-95">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-[10px] font-black shrink-0">{idx + 1}</div>
                    <div className="flex-1">
                       <input 
                         type="number" 
                         value={inst.amount} 
                         onChange={(e) => {
                           const updated = [...generatedInstallments];
                           updated[idx].amount = Number(e.target.value);
                           setGeneratedInstallments(updated);
                         }}
                         className="w-full bg-transparent border-b border-slate-200 py-1 font-black text-slate-800 outline-none focus:border-blue-500 transition-all"
                       />
                    </div>
                    <input 
                      type="date" 
                      value={inst.dueDate} 
                      onChange={(e) => {
                        const updated = [...generatedInstallments];
                        updated[idx].dueDate = e.target.value;
                        setGeneratedInstallments(updated);
                      }}
                      className="bg-white px-3 py-2 rounded-xl text-[10px] font-bold text-slate-500 outline-none border border-slate-100"
                    />
                 </div>
               ))}
            </div>

            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl">
               <span className="text-xs font-bold text-blue-600">إجمالي الجدولة:</span>
               <span className="font-black text-blue-900">
                  {generatedInstallments.reduce((acc, c) => acc + c.amount, 0).toLocaleString()} ج.س
               </span>
            </div>

            <button 
              onClick={handleScheduleInstallments}
              disabled={isUploading || generatedInstallments.reduce((acc, c) => acc + c.amount, 0) !== selectedInvoice?.balance}
              className={`w-full py-5 rounded-[2.5rem] font-black shadow-xl transition-all flex items-center justify-center gap-3 ${
                isUploading || generatedInstallments.reduce((acc, c) => acc + c.amount, 0) !== selectedInvoice?.balance
                ? 'bg-slate-100 text-slate-400' 
                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100 active:scale-95'
              }`}
            >
               <CheckCircle2 size={24}/>
               <span>اعتماد خطة الأقساط</span>
            </button>
            {generatedInstallments.reduce((acc, c) => acc + c.amount, 0) !== selectedInvoice?.balance && (
              <p className="text-[10px] text-red-500 text-center font-bold">* الإجمالي لا يطابق رصيد الفاتورة</p>
            )}
         </div>
      </Modal>

      {/* Recording Payment Modal */}
      <Modal isOpen={isPaymentModalOpen} onClose={()=>{setIsPaymentModalOpen(false); setPaymentProof(null); setProofPreview('');}} title={isStudent || isParent ? "سداد الرسوم دراسية" : "تسجيل سداد مالي"}>
         <form onSubmit={(e) => {
           e.preventDefault();
           const method = (e.target as any).method.value;
           
           if ((isStudent || isParent) && !paymentProof) {
             alert('يرجى إرفاق صورة إشعار السداد');
             return;
           }

           handleRecordPayment(paymentAmount, method, paymentProof || undefined, selectedInstallmentId);
         }} className="space-y-6">
            <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 flex items-center gap-4">
               <UserCheck className="text-blue-600" size={32}/>
               <div>
                  <p className="text-xs font-bold text-blue-700">تحصيل لصالح الفاتورة:</p>
                  <p className="font-black text-blue-900 leading-none mt-1">#{selectedInvoice?.id.slice(0, 8)} - {selectedInvoice?.description}</p>
               </div>
            </div>

            {(isStudent || isParent) && (
              <div className="space-y-4">
                <div className="space-y-2">
                   <label className="text-sm font-black text-slate-700">اختر البنك للسداد</label>
                   <select 
                     name="bankId" 
                     required
                     className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500/10"
                     onChange={(e) => setSelectedBankId(e.target.value)}
                   >
                      <option value="">-- اختر البنك --</option>
                      {banks.filter(b => b.active).map(b => (
                        <option key={b.id} value={b.id}>{b.bankName}</option>
                      ))}
                   </select>
                </div>

                {selectedBankId && (
                  <div className="p-6 bg-slate-900 rounded-[2.5rem] text-white space-y-4 shadow-xl border border-white/10 animate-in zoom-in-95 duration-300">
                    <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                      <Wallet className="text-blue-400" size={20} />
                      <h4 className="font-black text-sm uppercase tracking-widest">بيانات الحساب البنكي</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">اسم الحساب بالكامل</p>
                        <p className="font-black text-lg">{banks.find(b => b.id === selectedBankId)?.accountName}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">رقم الحساب البنكي</p>
                        <p className="font-black text-2xl text-blue-400 tracking-wider">{banks.find(b => b.id === selectedBankId)?.accountNumber}</p>
                      </div>
                      {banks.find(b => b.id === selectedBankId)?.instructions && (
                        <div className="space-y-1 pt-2 border-t border-white/5">
                          <p className="text-[10px] text-amber-400 font-bold uppercase">تعليمات السداد</p>
                          <p className="text-xs text-slate-300 font-medium leading-relaxed">{banks.find(b => b.id === selectedBankId)?.instructions}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedInvoice?.installments && selectedInvoice.installments.some(i => i.status === 'unpaid') && (
              <div className="space-y-4">
                 <label className="text-sm font-black text-slate-700 mr-2 uppercase tracking-widest">نوع السداد المطلوب</label>
                 <div className="grid grid-cols-2 gap-3">
                    <button 
                      type="button"
                      onClick={() => {
                        setSelectedInstallmentId('');
                        setPaymentAmount(selectedInvoice.balance);
                      }}
                      className={`p-4 rounded-2xl border-2 font-black text-xs transition-all ${!selectedInstallmentId ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-lg shadow-blue-100' : 'border-slate-100 bg-white text-slate-400 hover:border-blue-100'}`}
                    >
                      سداد عام (كامل المتبقي)
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        const unpaid = selectedInvoice.installments?.find(i => i.status === 'unpaid');
                        if (unpaid) {
                          setSelectedInstallmentId(unpaid.id);
                          setPaymentAmount(unpaid.amount);
                        }
                      }}
                      className={`p-4 rounded-2xl border-2 font-black text-xs transition-all ${selectedInstallmentId ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-lg shadow-amber-100' : 'border-slate-100 bg-white text-slate-400 hover:border-blue-100'}`}
                    >
                      سداد قسط محدد
                    </button>
                 </div>
                 
                 {selectedInstallmentId && (
                   <select 
                     name="installmentId" 
                     value={selectedInstallmentId}
                     className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500/10 animate-in slide-in-from-top-2"
                     onChange={(e) => {
                       setSelectedInstallmentId(e.target.value);
                       const inst = selectedInvoice.installments?.find(i => i.id === e.target.value);
                       if (inst) setPaymentAmount(inst.amount);
                     }}
                   >
                      {selectedInvoice.installments.filter(i => i.status === 'unpaid').map((inst, idx) => (
                        <option key={inst.id} value={inst.id}>الدفعة {idx + 1} - {(inst.amount || 0).toLocaleString()} ج.س</option>
                      ))}
                   </select>
                 )}
              </div>
            )}

            <div className="space-y-2">
               <label className="text-sm font-black text-slate-700">المبلغ المسدد حالياً</label>
               <div className="relative group">
                 <input 
                   name="amount" 
                                        type="text" 
                                        required 
                                        value={(paymentAmount || 0).toLocaleString('en-US')}
                                        onChange={(e) => {                     const val = Number(e.target.value.replace(/,/g, ''));
                     if (!isNaN(val)) setPaymentAmount(val);
                   }}
                   className="w-full p-8 bg-slate-50 rounded-[2.5rem] font-black text-5xl text-center text-blue-600 outline-none border-2 border-transparent focus:border-blue-500 transition-all shadow-inner" 
                 />
                 <span className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xl uppercase tracking-widest pointer-events-none group-focus-within:text-blue-200">ج.س</span>
               </div>
               <p className="text-center text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-widest">يرجى التأكد من مطابقة المبلغ للمحول فعلياً</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700">وسيلة الدفع</label>
                  <select name="method" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" defaultValue={(isStudent || isParent) ? 'bankak' : 'cash'}>
                     <option value="cash">نقداً (Cash)</option>
                     <option value="bankak">تطبيق بنكك</option>
                     <option value="transfer">تحويل بنكي</option>
                  </select>
               </div>
               <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700">إرفاق إشعار السداد { (isStudent || isParent) && <span className="text-red-500">*</span> }</label>
                  <div className="relative group">
                    <input 
                      type="file" 
                      required={isStudent || isParent} 
                      className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                      onChange={e => {
                        if (e.target.files?.[0]) {
                          setPaymentProof(e.target.files[0]);
                          setProofPreview(URL.createObjectURL(e.target.files[0]));
                        }
                      }} 
                    />
                    <div className={`w-full p-4 border-2 border-dashed rounded-2xl flex items-center justify-center gap-3 transition-all ${paymentProof ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-400 group-hover:border-blue-400 group-hover:bg-blue-50'}`}>
                       {paymentProof ? (
                         <>
                           <CheckCircle2 size={20}/>
                           <span className="text-xs font-black truncate max-w-[150px]">{paymentProof.name}</span>
                         </>
                       ) : (
                         <>
                           <UploadCloud size={20}/>
                           <span className="text-xs font-black">اضغط لرفع صورة الإشعار</span>
                         </>
                       )}
                    </div>
                  </div>
               </div>
            </div>

            {proofPreview && (
              <div className="relative w-full h-32 rounded-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95">
                 <img src={proofPreview} alt="Proof" className="w-full h-full object-cover" />
                 <button 
                  type="button"
                  onClick={() => { setPaymentProof(null); setProofPreview(''); }}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg shadow-lg"
                 >
                   <X size={14} />
                 </button>
              </div>
            )}
            <button type="submit" disabled={isUploading || ((isStudent || isParent) && !selectedBankId)} className={`w-full py-5 rounded-[2.5rem] font-black shadow-xl transition-all flex items-center justify-center gap-3 ${isUploading || ((isStudent || isParent) && !selectedBankId) ? 'bg-slate-100 text-slate-400' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
               {isUploading ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} <span>{isStudent || isParent ? 'إرسال إشعار السداد' : 'اعتماد وحفظ السداد'}</span>
            </button>
         </form>
      </Modal>
    </div>
  );
};

export default FinancialManagement;
