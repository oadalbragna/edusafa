import React, { useState, useEffect } from 'react';
import {
  Users,
  GraduationCap,
  BookOpen,
  DollarSign,
  TrendingUp,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  LayoutGrid,
  Activity,
  Calendar,
  BellRing,
  Megaphone,
  History,
  Mail,
  Settings,
  School as SchoolIcon,
  ShieldCheck,
  UserCheck,
  UploadCloud
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getDb as db } from '../../services/firebase';
import { ref, onValue } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { SYS, EDU } from '../../constants/dbPaths';

const data = [
  { name: 'Sep', revenue: 4500, students: 1200 },
  { name: 'Oct', revenue: 5200, students: 1250 },
  { name: 'Nov', revenue: 4800, students: 1280 },
  { name: 'Dec', revenue: 6100, students: 1320 },
  { name: 'Jan', revenue: 5900, students: 1350 },
  { name: 'Feb', revenue: 7200, students: 1420 },
];

const QuickAction = ({ icon, label, color, onClick }: any) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-3 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-brand-500/20 transition-all group w-full active:scale-95"
  >
    <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-current group-hover:scale-110 transition-transform shrink-0`}>
      {icon}
    </div>
    <span className="font-bold text-slate-700 text-[11px] md:text-xs text-center leading-tight">{label}</span>
  </button>
);

const StatCard = ({ icon, label, value, change, trend, gradient }: any) => (
  <div className={`relative overflow-hidden rounded-2xl p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 group ${gradient}`}>
    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
    <div className="relative z-10 text-white">
      <div className="flex justify-between items-start mb-6">
        <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md shadow-inner text-white group-hover:scale-110 transition-transform duration-300 border border-white/10">
          {icon}
        </div>
        <button className="text-white/40 hover:text-white transition-colors p-1">
          <MoreHorizontal size={16} />
        </button>
      </div>
      <div>
        <p className="text-[11px] text-white/70 font-bold uppercase tracking-wider mb-2">{label}</p>
        <div className="flex flex-col sm:flex-row sm:items-end gap-2">
          <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-none">{value}</h3>
          <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md border w-fit ${
            trend === 'up' ? 'bg-emerald-400/20 text-emerald-50 border-emerald-400/30' : 'bg-red-400/20 text-red-50 border-red-400/30'
          }`}>
            {trend === 'up' ? <ArrowUpRight size={10} className="mr-1" /> : <ArrowDownRight size={10} className="mr-1" />}
            {change}
          </span>
        </div>
      </div>
    </div>
  </div>
);

const AdminDashboard: React.FC = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const navigate = useNavigate();
  const [classes, setClasses] = useState<any[]>([]);
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    classes: 0,
    pendingStudents: 0,
    pendingRequests: 0,
    supportMessages: 0,
    onlineUsers: 0
  });
  const [growthData, setGrowthData] = useState<any[]>([]);

  useEffect(() => {
    const classesRef = ref(db, EDU.SCH.CLASSES);
    const usersRef = ref(db, SYS.USERS);
    const supportRef = ref(db, SYS.MAINTENANCE.SUPPORT_TICKETS);

    const unsubClasses = onValue(classesRef, (snapshot) => {
      if (snapshot.exists()) {
        const clsData = Object.values(snapshot.val());
        setClasses(clsData);
        setStats(prev => ({ ...prev, classes: clsData.length }));
      }
    });

    const unsubUsers = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const users = Object.values(snapshot.val()) as any[];
        setStats(prev => ({
          ...prev,
          students: users.filter(u => u.role === 'student').length,
          pendingStudents: users.filter(u => u.role === 'student' && (u.status === 'pending' || !u.status)).length,
          teachers: users.filter(u => u.role === 'teacher').length,
          pendingRequests: users.filter(u => u.status === 'pending').length,
          onlineUsers: users.filter(u => u.status === 'online').length
        }));

        // Calculate real growth data (users per month for the last 6 months)
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentMonth = new Date().getMonth();
        const last6Months = [];
        for (let i = 5; i >= 0; i--) {
          const m = (currentMonth - i + 12) % 12;
          last6Months.push({ name: months[m], students: 0, count: 0 });
        }

        users.forEach(u => {
          if (u.createdAt) {
            const date = new Date(u.createdAt);
            const mName = months[date.getMonth()];
            const dataPoint = last6Months.find(d => d.name === mName);
            if (dataPoint) dataPoint.count++;
          }
        });
        
        // Cumulative count for growth look
        let total = 0;
        const finalGrowth = last6Months.map(d => {
          total += d.count;
          return { ...d, students: total };
        });
        setGrowthData(finalGrowth);
      }
    });

    const unsubSupport = onValue(supportRef, (snapshot) => {
      if (snapshot.exists()) {
        const messages = Object.values(snapshot.val());
        setStats(prev => ({ ...prev, supportMessages: messages.length }));
      }
    });

    return () => {
      unsubClasses();
      unsubUsers();
      unsubSupport();
    };
  }, []);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      
      {/* Dynamic Hero Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 bg-white p-6 md:p-10 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-brand-50 rounded-full -ml-48 -mt-48 blur-[100px] opacity-50"></div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-50 text-brand-600 rounded-full text-[10px] font-bold tracking-wider uppercase mb-3">
            <Activity size={12} className="animate-pulse" /> Live Analysis
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">مرحباً بك في مركز قيادة EduSafa</h1>
          <p className="text-slate-500 font-medium text-sm md:text-base max-w-lg">تابع أداء المنظومة التعليمية، نمو الطلاب، وحالة التحصيل المالي في الوقت الفعلي.</p>
        </div>
        <div className="relative z-10 flex flex-wrap gap-3 w-full lg:w-auto">
          <button className="flex-1 lg:flex-none px-6 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center gap-2 text-sm">
            <Calendar size={18} className="text-slate-400" /> الجدول الدراسي
          </button>
          <button 
            onClick={() => navigate('/admin/slider')}
            className="flex-1 lg:flex-none bg-brand-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-brand-500/20 hover:bg-brand-600 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
          >
            إدارة الواجهة <ChevronRight size={18} className="rotate-180" />
          </button>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
        <StatCard icon={<Users size={24} />} label="إجمالي الطلاب" value={stats.students.toLocaleString()} change={`${stats.onlineUsers} متصل`} trend="up" gradient="bg-slate-900" />
        <StatCard icon={<GraduationCap size={24} />} label="الكادر التعليمي" value={stats.teachers.toLocaleString()} change="نشط" trend="up" gradient="bg-brand-600" />
        <StatCard icon={<UserCheck size={24} />} label="طلاب بانتظار التفعيل" value={stats.pendingStudents.toLocaleString()} change={`${stats.pendingStudents} معلق`} trend={stats.pendingStudents > 0 ? 'down' : 'up'} gradient="bg-amber-500" />
        <StatCard icon={<ShieldCheck size={24} />} label="طلبات الانضمام" value={stats.pendingRequests.toLocaleString()} change="طلب" trend={stats.pendingRequests > 0 ? 'down' : 'up'} gradient="bg-teal-600" />
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Area (8 cols) */}
        <div className="lg:col-span-8 space-y-10">
          
          {/* Charts Area */}
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <TrendingUp className="text-brand-500" size={20} /> مؤشر النمو والتفاعل الرقمي
                </h3>
                <p className="text-[11px] text-slate-400 font-bold mt-1 uppercase">Analytics for the last 6 months</p>
              </div>
              <div className="flex bg-slate-100/50 p-1 rounded-xl border border-slate-100">
                <button className="px-5 py-2 bg-white text-brand-600 font-bold rounded-lg shadow-sm text-xs transition-all">إيرادات</button>
                <button className="px-5 py-2 text-slate-400 font-bold rounded-lg text-xs hover:text-slate-600 transition-all">طلاب</button>
              </div>
            </div>
            
            <div className="h-[320px] w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 600}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 600}} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', fontSize: '12px', fontWeight: 'bold' }} />
                  <Area type="monotone" dataKey="students" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorStudents)" dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tools Grid */}
          {isAdmin && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 px-1">
                <LayoutGrid className="text-brand-500" size={20} />
                <h3 className="text-xl font-bold text-slate-800 tracking-tight">إدارة النظام الذكية</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <QuickAction icon={<Megaphone size={20} className="text-orange-600" />} label="التعميمات" onClick={() => navigate('/admin/announcements')} color="bg-orange-500" />
                <QuickAction icon={<Mail size={20} className="text-brand-600" />} label="مركز الدعم" onClick={() => navigate('/admin/support')} color="bg-brand-500" />
                <QuickAction icon={<BookOpen size={20} className="text-blue-600" />} label="المواد المعتمدة" onClick={() => navigate('/admin/global-subjects')} color="bg-blue-500" />
                <QuickAction icon={<UploadCloud size={20} className="text-indigo-600" />} label="رفع المقررات" onClick={() => navigate('/admin/courses')} color="bg-indigo-500" />
                <QuickAction icon={<History size={20} className="text-purple-600" />} label="سجل النشاط" onClick={() => navigate('/admin/logs')} color="bg-purple-500" />
                <QuickAction icon={<UserCheck size={20} className="text-emerald-600" />} label="قبول الطلاب" onClick={() => navigate('/admin/student-approvals')} color="bg-emerald-500" />
                <QuickAction icon={<ShieldCheck size={20} className="text-teal-600" />} label="طلبات المعلمين" onClick={() => navigate('/admin/teacher-requests')} color="bg-teal-500" />
                <QuickAction icon={<Calendar size={20} className="text-emerald-600" />} label="الضبط" onClick={() => navigate('/admin/academic-settings')} color="bg-emerald-500" />
                <QuickAction icon={<DollarSign size={20} className="text-amber-600" />} label="المالية" onClick={() => navigate('/financial')} color="bg-amber-500" />
              </div>
            </div>
          )}

          {/* Classes Preview */}
          <div className="space-y-6">
            <div className="flex justify-between items-end px-1">
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">الفصول الدراسية النشطة</h3>
                <p className="text-xs text-slate-400 font-medium">متابعة حالة الفصول وتوزيع الطلاب</p>
              </div>
              <button onClick={() => navigate('/admin/classes')} className="text-brand-600 font-bold text-xs hover:underline bg-brand-50 px-4 py-2 rounded-xl transition-all">
                عرض كافة الفصول
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {classes.slice(0, 4).map((cls: any, idx: number) => (
                <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-brand-500/20 transition-all cursor-pointer group" onClick={() => navigate(`/admin/class/${cls.id}`)}>
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform ${cls.level === 'primary' ? 'bg-emerald-50 text-emerald-600' : 'bg-brand-50 text-brand-600'}`}>
                        <LayoutGrid size={22} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors leading-tight">{cls.name}</h4>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{cls.level === 'primary' ? 'ابتدائي' : 'متوسط'} • الصف {cls.grade}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-8 pt-5 border-t border-slate-50">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-tighter">الطلاب</p>
                      <p className="text-base font-black text-slate-700">{cls.students?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-tighter">المواد</p>
                      <p className="text-base font-black text-slate-700">{cls.subjects?.length || 0}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Area (4 cols) */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Notifications List */}
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <BellRing className="text-amber-500" size={20} /> تنبيهات هامة
              </h3>
              {stats.pendingRequests > 0 && (
                <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-100 animate-pulse">{stats.pendingRequests} جديد</span>
              )}
            </div>
            
            <div className="space-y-4">
              {stats.pendingRequests > 0 ? (
                <div 
                  onClick={() => navigate('/admin/teacher-requests')}
                  className="p-4 bg-red-50/50 rounded-xl hover:bg-red-50 transition-colors cursor-pointer border border-red-100 group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black text-red-600 uppercase tracking-widest italic">طلبات معلقة</span>
                    <span className="text-[9px] text-red-400 font-bold">بانتظار المراجعة</span>
                  </div>
                  <p className="text-[13px] font-bold text-red-900 leading-snug">هناك {stats.pendingRequests} طلبات انضمام جديدة (طلاب، معلمين، أولياء أمور) بانتظار موافقتك</p>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                  <p className="text-[13px] font-bold text-emerald-800 leading-snug">جميع طلبات الانضمام مكتملة ✅</p>
                </div>
              )}

              {stats.supportMessages > 0 && (
                <div 
                  onClick={() => navigate('/admin/support')}
                  className="p-4 bg-brand-50/50 rounded-xl hover:bg-brand-50 transition-colors cursor-pointer border border-brand-100 group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest">Support</span>
                    <span className="text-[9px] text-brand-400 font-bold">رسائل جديدة</span>
                  </div>
                  <p className="text-[13px] font-bold text-brand-900 leading-snug">تم استلام {stats.supportMessages} رسائل دعم فني جديدة</p>
                </div>
              )}
            </div>
            
            <button 
              onClick={() => navigate('/admin/logs')}
              className="w-full mt-8 py-3.5 bg-slate-50 hover:bg-brand-500 hover:text-white text-slate-500 rounded-xl font-bold text-xs transition-all border border-slate-100"
            >
              عرض سجل النشاطات الكامل
            </button>
          </div>

          {/* Support Enterprise Card */}
          <div className="bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden group shadow-xl">
             <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/10 rounded-full -mr-24 -mt-24 blur-[60px] group-hover:scale-125 transition-transform duration-1000"></div>
             <div className="relative z-10 text-center space-y-6">
               <div className="w-16 h-16 bg-white/5 rounded-2xl mx-auto flex items-center justify-center backdrop-blur-md border border-white/10 shadow-inner">
                 <SchoolIcon className="w-8 h-8 text-brand-400" />
               </div>
               <div className="space-y-2">
                 <h4 className="text-xl font-black tracking-tight leading-tight">الدعم الفني للإدارة</h4>
                 <p className="text-slate-400 text-[11px] font-medium leading-relaxed">فريقنا متواجد لضمان استقرار المنصة وتقديم الدعم التقني والتعليمي اللازم.</p>
               </div>
               <button className="w-full bg-brand-500 text-white py-4 rounded-xl font-bold text-xs shadow-lg shadow-brand-500/20 hover:bg-brand-600 transition-all active:scale-95">
                 فتح تذكرة دعم مباشر
               </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
