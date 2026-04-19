import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  BookOpen, 
  TrendingUp,
  Clock,
  Calendar as CalendarIcon,
  ChevronRight,
  UserPlus,
  PlusCircle,
  FileText,
  Bell,
  CheckSquare,
  LayoutGrid,
  Megaphone,
  ShieldCheck
} from 'lucide-react';
import Modal from '../../components/common/Modal';
import AddStudentForm from '../Admin/Actions/AddStudentForm';
import AddTeacherForm from '../Admin/Actions/AddTeacherForm';
import AddReportForm from '../Admin/Actions/AddReportForm';
import AddClassForm from '../Admin/Actions/AddClassForm';
import { db } from '../../services/firebase';
import { ref, get } from 'firebase/database';
import { SYS, EDU, COMM } from '../../constants/dbPaths';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';

const QuickActionButton = ({ icon: Icon, label, color, onClick }: any) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center justify-between p-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl transition-all group active:scale-95"
  >
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-xl ${color || 'bg-white/20'}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <span className="font-bold text-sm text-white">{label}</span>
    </div>
    <ChevronRight className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
  </button>
);

const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-2xl ${color}`}>
        <Icon className="text-white w-6 h-6" />
      </div>
      {trend && (
        <span className="flex items-center text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded-lg">
          <TrendingUp className="w-3 h-3 mr-1" />
          {trend}
        </span>
      )}
    </div>
    <h3 className="text-gray-500 text-sm font-semibold mb-1 text-right">{title}</h3>
    <p className="text-2xl font-bold text-gray-900 text-right">{value}</p>
  </div>
);

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const { branding } = useBranding();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [counts, setCounts] = useState({ students: 0, teachers: 0, classes: 0 });

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const isTeacher = profile?.role === 'teacher';
  const isStudent = profile?.role === 'student';
  const isParent = profile?.role === 'parent';

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch from all three main branches
        const sysRef = ref(db, SYS.USERS);
        const eduRef = ref(db, EDU.SCH.CLASSES);
        
        const sysSnap = await get(sysRef);
        const eduSnap = await get(eduRef);
        
        if (sysSnap.exists()) {
          const users = Object.values(sysSnap.val());
          const studentsCount = users.filter((u: any) => u.role === 'student').length;
          const teachersCount = users.filter((u: any) => u.role === 'teacher').length;
          
          const classesCount = eduSnap.exists() ? Object.keys(eduSnap.val()).length : 0;

          setCounts({
            students: studentsCount,
            teachers: teachersCount,
            classes: classesCount
          });

          if (data.activities) {
            const acts = Object.values(data.activities);
            // Filter activities based on role if needed
            const filteredActs = isAdmin 
              ? acts 
              : acts.filter((a: any) => a.userId === profile?.uid || a.type.includes('announcement'));
              
            filteredActs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setActivities(filteredActs.slice(0, 10));
          }
        }
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
      }
    };
    fetchStats();
  }, [isAdmin, profile?.uid]);

  const stats = [
    { title: 'إجمالي الطلاب', value: counts.students.toLocaleString('ar-SA'), icon: Users, color: 'bg-blue-600', trend: '+٥٪' },
    { title: 'المعلمون', value: counts.teachers.toLocaleString('ar-SA'), icon: UserCheck, color: 'bg-purple-600', trend: '+٢٪' },
    { title: 'الفصول الدراسية', value: counts.classes.toLocaleString('ar-SA'), icon: BookOpen, color: 'bg-orange-500' },
    { title: 'نسبة الحضور', value: '٩٦٪', icon: Clock, color: 'bg-green-600', trend: '+١٪' },
  ];

  return (
    <div className="space-y-8" dir="rtl">
      {/* Modals - Only for Admin */}
      {isAdmin && (
        <>
          <Modal 
            isOpen={activeModal === 'student'} 
            onClose={() => setActiveModal(null)} 
            title="إضافة طالب جديد للمنصة"
          >
            <AddStudentForm onSuccess={() => setActiveModal(null)} />
          </Modal>

          <Modal 
            isOpen={activeModal === 'teacher'} 
            onClose={() => setActiveModal(null)} 
            title="إضافة معلم جديد للمنصة"
          >
            <AddTeacherForm onSuccess={() => setActiveModal(null)} />
          </Modal>

          <Modal 
            isOpen={activeModal === 'report'} 
            onClose={() => setActiveModal(null)} 
            title="إصدار تقرير جديد"
          >
            <AddReportForm onSuccess={() => setActiveModal(null)} />
          </Modal>

          <Modal 
            isOpen={activeModal === 'class'} 
            onClose={() => setActiveModal(null)} 
            title="إنشاء فصل دراسي ومواد"
          >
            <AddClassForm onSuccess={() => setActiveModal(null)} />
          </Modal>
        </>
      )}

      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isAdmin ? 'لوحة تحكم المدير' :
             isTeacher ? 'لوحة تحكم المعلم' :
             isStudent ? 'منصتي التعليمية' : 'بوابة ولي الأمر'}
          </h1>
          <p className="text-gray-500 mt-1">مرحباً بك {profile?.fullName || profile?.firstName} في نظام {branding.platformName}</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-2xl border border-gray-100 flex items-center gap-2 text-sm font-medium text-gray-600">
          <CalendarIcon className="w-4 h-4 text-blue-600" />
          {new Date().toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Stats Grid - Show different stats for Student/Teacher */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isAdmin ? (
          stats.map((stat, i) => <StatCard key={i} {...stat} />)
        ) : (
          // Custom stats for non-admins
          <>
            <StatCard title="حصص اليوم" value="٤" icon={Clock} color="bg-blue-600" />
            <StatCard title="الواجبات المعلقة" value="٢" icon={FileText} color="bg-orange-500" />
            <StatCard title="الرسائل الجديدة" value="٥" icon={Bell} color="bg-purple-600" />
            <StatCard title="معدل الأداء" value="٩٢٪" icon={TrendingUp} color="bg-green-600" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className={`${isAdmin ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100`}>
          <div className="flex justify-between items-center mb-6">
            <button className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:underline">
              عرض الكل <ChevronRight className="w-4 h-4" />
            </button>
            <h3 className="text-xl font-bold text-gray-800">آخر التحديثات والنشاطات</h3>
          </div>
          
          <div className="space-y-6">
            {activities.length === 0 ? (
              <div className="py-10 text-center text-gray-400 font-bold italic">لا توجد نشاطات مسجلة بعد</div>
            ) : (
              activities.map((act, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                    act.type.includes('student') ? 'bg-blue-50 text-blue-600' :
                    act.type.includes('teacher') ? 'bg-purple-50 text-purple-600' :
                    act.type.includes('announcement') ? 'bg-orange-50 text-orange-600' :
                    'bg-slate-50 text-slate-600'
                  }`}>
                    {act.type.includes('announcement') ? <Megaphone className="w-5 h-5" /> : 
                     act.type.includes('teacher') ? <ShieldCheck className="w-5 h-5" /> :
                     <LayoutGrid className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 text-right">
                    <h4 className="font-bold text-gray-800">{act.userName}</h4>
                    <p className="text-sm text-gray-500">{act.details}</p>
                  </div>
                  <div className="text-[10px] text-gray-400 font-bold">{new Date(act.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions - ONLY FOR ADMIN */}
        {isAdmin && (
          <div 
            style={{ backgroundColor: branding.primaryColor }}
            className="rounded-[3rem] p-8 text-white shadow-2xl shadow-blue-200 flex flex-col justify-between relative overflow-hidden h-full min-h-[500px]"
          >
            <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -ml-32 -mt-32 blur-3xl"></div>
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mb-24 blur-2xl"></div>
            
            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between mb-4">
                <LayoutGrid className="w-6 h-6 text-white/50" />
                <h3 className="text-xl font-bold">إجراءات سريعة</h3>
              </div>
              
              <div className="space-y-3">
                <QuickActionButton 
                  icon={UserPlus} 
                  label="إضافة طالب جديد" 
                  color="bg-green-500/30"
                  onClick={() => setActiveModal('student')}
                />
                <QuickActionButton 
                  icon={PlusCircle} 
                  label="إضافة معلم" 
                  color="bg-purple-500/30"
                  onClick={() => setActiveModal('teacher')}
                />
                <QuickActionButton 
                  icon={BookOpen} 
                  label="إنشاء فصل دراسي ومواد" 
                  color="bg-indigo-500/30"
                  onClick={() => setActiveModal('class')}
                />
                <QuickActionButton 
                  icon={CheckSquare} 
                  label="رصد الغياب اليومي" 
                  color="bg-orange-500/30"
                  onClick={() => setActiveModal('attendance')}
                />
                <QuickActionButton 
                  icon={Bell} 
                  label="إرسال تعميم عام" 
                  color="bg-red-500/30"
                  onClick={() => setActiveModal('announcement')}
                />
                <QuickActionButton 
                  icon={FileText} 
                  label="إصدار تقرير دوري" 
                  color="bg-blue-400/30"
                  onClick={() => setActiveModal('report')}
                />
              </div>
            </div>

            <div className="mt-8 p-6 bg-white/10 rounded-3xl border border-white/10 relative z-10 backdrop-blur-sm">
              <p className="text-sm font-bold text-white leading-relaxed mb-4">
                نظام {branding.platformName} يساعدك على إدارة مدرستك بكفاءة عالية. تواصل مع الدعم لأي استفسار.
              </p>
              <button className="w-full py-3 bg-white text-brand-900 rounded-xl font-bold text-sm hover:shadow-lg transition-all active:scale-[0.98]">
                الدعم الفني المباشر
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
