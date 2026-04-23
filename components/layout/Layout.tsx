import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Home,
  LayoutDashboard,
  Users,
  BookOpen,
  Calendar,
  CreditCard,
  LogOut,
  Bell,
  Search,
  Settings,
  Layers,
  Menu,
  X,
  Image,
  MessageSquare,
  ShieldCheck,
  School,
  Megaphone,
  History,
  UserCircle,
  Mail,
  ChevronRight,
  Smartphone,
  LifeBuoy,
  UserCheck,
  Moon,
  Sun
} from 'lucide-react';

import { ref, onValue, query, limitToLast } from 'firebase/database';
import { db } from '../../services/firebase';
import { SYS } from '../../constants/dbPaths';
import { cn } from '../../utils/cn';
import BottomDialog from '../common/BottomDialog';
import { useBranding } from '../../context/BrandingContext';
import CacheControl from '../common/CacheControl';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, loading, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const { branding } = useBranding();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  React.useEffect(() => {
    if (!loading && !profile) {
      navigate('/login', { replace: true });
    }
    // Strict redirect for pending users (students, teachers, parents)
    if (!loading && profile && (profile.status === 'pending' || !profile.status) &&
        profile.role !== 'admin' && profile.role !== 'super_admin' &&
        location.pathname !== '/pending-approval') {
      navigate('/pending-approval', { replace: true });
    }
  }, [profile, loading, navigate, location.pathname]);

  // Defer notifications loading to improve initial render
  React.useEffect(() => {
    // Delay non-critical data fetching until after initial paint
    const timer = setTimeout(() => {
      if (!db) return;

      const annRef = query(ref(db, SYS.ANNOUNCEMENTS), limitToLast(10));
      const unsubscribe = onValue(annRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = Object.values(snapshot.val());
          data.sort((a: any, b: any) => b.timestamp - a.timestamp);
          setNotifications(data);
        }
      });
      return () => unsubscribe();
    }, 1000); // Wait 1 second after mount

    return () => clearTimeout(timer);
  }, []);

  const getHomePath = () => {
    if (!profile) return '/';
    switch (profile.role) {
      case 'admin':
      case 'super_admin': return '/admin';
      case 'student': return '/student';
      case 'teacher': return '/teacher';
      case 'parent': return '/parent';
      default: return '/';
    }
  };

  // Organized menu items by sections for better navigation
  // Section markers are for organization only - filteredMenu will remove them
  const menuStructure = [
    // === MAIN NAVIGATION (All Users) ===
    { icon: <Home size={18} />, label: 'الرئيسية', path: getHomePath(), section: 'main' },
    { icon: <UserCircle size={18} />, label: 'ملفي الشخصي', path: '/profile', section: 'main' },
    
    // === ADMIN DASHBOARD & MANAGEMENT ===
    { icon: <LayoutDashboard size={18} />, label: 'مركز القيادة', path: '/admin', roles: ['admin', 'super_admin'], section: 'admin' },
    { icon: <Users size={18} />, label: 'إدارة المستخدمين', path: '/admin/users', roles: ['admin', 'super_admin'], section: 'admin' },
    { icon: <Layers size={18} />, label: 'إدارة الفصول', path: '/admin/classes', roles: ['admin', 'super_admin'], section: 'admin' },
    { icon: <UserCheck size={18} />, label: 'قبول الطلاب', path: '/admin/student-approvals', roles: ['admin', 'super_admin'], section: 'admin' },
    { icon: <ShieldCheck size={18} />, label: 'مركز المراجعة والقبول', path: '/admin/teacher-requests', roles: ['admin', 'super_admin'], section: 'admin' },
    
    // === COURSE & CONTENT MANAGEMENT (Admin + Teachers) ===
    { icon: <BookOpen size={18} />, label: 'رفع المقررات', path: '/admin/courses', roles: ['admin', 'super_admin', 'teacher'], section: 'courses' },
    { icon: <BookOpen size={18} />, label: 'المواد المعتمدة', path: '/admin/global-subjects', roles: ['admin', 'super_admin'], section: 'courses' },
    { icon: <Megaphone size={18} />, label: 'إدارة التعميمات', path: '/admin/announcements', roles: ['admin', 'super_admin'], section: 'courses' },
    { icon: <Image size={18} />, label: 'إدارة السلايدر', path: '/admin/slider', roles: ['admin', 'super_admin'], section: 'courses' },
    { icon: <Calendar size={18} />, label: 'الإعدادات الأكاديمية', path: '/admin/academic-settings', roles: ['admin', 'super_admin'], section: 'courses' },
    
    // === TEACHER SPECIFIC ===
    { icon: <School size={18} />, label: 'فصولي الدراسية', path: '/teacher', roles: ['teacher'], section: 'teacher' },
    
    // === COMMON FEATURES (All Users) ===
    { icon: <BookOpen size={18} />, label: 'المناهج الدراسية', path: '/academic', section: 'common' },
    { icon: <Calendar size={18} />, label: 'الجدول الزمني', path: '/schedule', section: 'common' },
    { icon: <MessageSquare size={18} />, label: 'الرسائل', path: '/chat', section: 'common' },
    { icon: <Mail size={18} />, label: 'الدعم الفني', path: '/support', roles: ['teacher', 'student', 'parent'], section: 'common' },
    
    // === ADMIN TOOLS ===
    { icon: <History size={18} />, label: 'سجل النشاطات', path: '/admin/logs', roles: ['admin', 'super_admin'], section: 'admin_tools' },
    { icon: <Smartphone size={18} />, label: 'جسر تيليجرام', path: '/admin/bridge', roles: ['admin', 'super_admin'], section: 'admin_tools' },
    { icon: <Mail size={18} />, label: 'مركز الدعم', path: '/admin/support', roles: ['admin', 'super_admin'], section: 'admin_tools' },
    { icon: <CreditCard size={18} />, label: 'الإدارة المالية', path: '/financial', roles: ['admin', 'super_admin', 'parent'], section: 'admin_tools' },
    { icon: <Settings size={18} />, label: 'إعدادات المنصة', path: '/settings', roles: ['admin', 'super_admin'], section: 'admin_tools' },
  ];

  // Filter menu items based on user role
  const filteredMenu = menuStructure.filter(item =>
    !item.roles || (profile && item.roles.includes(profile.role))
  );

  // Section labels for better organization
  const sectionLabels: Record<string, string> = {
    main: '',
    admin: 'الإدارة',
    courses: 'المقررات والمحتوى',
    teacher: 'المعلم',
    common: 'عام',
    admin_tools: 'أدوات متقدمة'
  };

  // Build menu with section separators
  const renderMenuWithSections = () => {
    let currentSection = '';
    const elements: React.ReactElement[] = [];

    filteredMenu.forEach((item, index) => {
      // Add section header if section changed
      if (item.section !== currentSection && sectionLabels[item.section]) {
        currentSection = item.section;
        elements.push(
          <div key={`section-${currentSection}`} className="pt-4 pb-2 px-3.5">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
              {sectionLabels[currentSection]}
            </span>
          </div>
        );
      }

      const isActive = location.pathname === item.path;
      elements.push(
        <Link
          key={item.path}
          to={item.path}
          onClick={() => setIsMobileMenuOpen(false)}
          style={isActive ? { backgroundColor: branding.secondaryColor } : {}}
          className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-300 group ${
            isActive
              ? 'text-brand-900 font-black shadow-lg scale-[1.02]'
              : 'text-white/60 hover:bg-white/5 hover:text-white'
          }`}
        >
          <span className={`${isActive ? 'text-brand-900' : 'text-white/40 group-hover:text-gold transition-colors'}`}>
            {item.icon}
          </span>
          <span className="text-[13px]">{item.label}</span>
        </Link>
      );
    });

    return elements;
  };

  return (
    <div className="flex min-h-screen bg-[#fcfdfe] font-sans text-slate-900" dir="rtl">
      {/* Sidebar */}
      <aside 
        style={{ backgroundColor: branding.primaryColor }}
        className={`
        fixed inset-y-0 right-0 z-50 w-64 border-l border-white/5 flex flex-col shadow-2xl transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-0
        ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-20 px-6 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform border border-white/10 p-1.5">
              <img src={branding.logoUrl} alt="E" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-xl font-black text-white tracking-tighter">{branding.platformName}</h1>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-1.5 text-white/50 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto scrollbar-hide">
          {renderMenuWithSections()}
        </nav>

        <div className="p-4 border-t border-white/10 bg-black/10 space-y-2">
          {/* Theme Toggle in Sidebar */}
          <button
            onClick={toggleTheme}
            className="w-full px-3 py-3 flex items-center gap-3 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-all text-[13px] font-bold group"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
            <span>{isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}</span>
          </button>

          <button
            onClick={logout}
            className="w-full px-3 py-3 flex items-center gap-3 text-white/40 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all text-[13px] font-bold group"
          >
            <LogOut size={18} className="group-hover:rotate-12 transition-transform" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/10 backdrop-blur-[1px] z-40 lg:hidden animate-in fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Main Content Area */}
       <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 transition-colors duration-300">
         {/* Hide global header for student dashboard */}
         {!location.pathname.startsWith('/student') && (
           <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30">
             <div className="flex items-center gap-4 flex-1">
               <button 
                 onClick={() => setIsMobileMenuOpen(true)}
                 className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all active:scale-95"
               >
                 <Menu size={20} />
               </button>
               <div className="relative max-w-sm w-full hidden md:block">
                 <input 
                   type="text" 
                   placeholder="البحث في النظام..." 
                   className="w-full pl-4 pr-10 py-2 bg-slate-100/50 border-transparent rounded-xl focus:bg-white focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500/20 outline-none transition-all text-[13px] font-medium"
                 />
                 <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
               </div>
             </div>

             <div className="flex items-center gap-3 md:gap-6 shrink-0 relative">
               {/* Cache Control (Enable/Disable/Clear) */}
               <CacheControl />

               {/* Theme Toggle Button */}
               <button
                 onClick={toggleTheme}
                 className="p-2 text-slate-400 hover:bg-slate-50 hover:text-brand-600 rounded-lg relative transition-all active:scale-95"
                 title={isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
               >
                 {isDark ? <Sun size={20} /> : <Moon size={20} />}
               </button>

               <button
                 onClick={() => setShowNotifications(true)}
                 className="p-2 text-slate-400 hover:bg-slate-50 hover:text-brand-600 rounded-lg relative transition-all"
               >
                 <Bell size={20} />
                 {notifications.length > 0 && (
                   <span className="absolute top-1.5 left-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                 )}
               </button>

               <div className="h-6 w-px bg-slate-100 mx-1"></div>
               
               <div 
                 onClick={() => setShowUserMenu(true)}
                 className="flex items-center gap-3 group cursor-pointer"
               >
                 <div className="text-left hidden md:block shrink-0">
                   <p className="text-[13px] font-bold text-slate-900 mb-0.5 text-right group-hover:text-brand-600 transition-colors">
                     {profile?.fullName || profile?.firstName || 'المستخدم'}
                   </p>
                   <p className="text-[10px] text-slate-400 font-medium text-right uppercase tracking-wider">
                     {profile?.role === 'admin' || profile?.role === 'super_admin' ? 'المدير' : 
                      profile?.role === 'teacher' ? 'معلم' : 
                      profile?.role === 'student' ? 'طالب' : 
                      profile?.role === 'parent' ? 'ولي أمر' : 'مستخدم'}
                   </p>
                 </div>
                 <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 font-bold text-[13px] shadow-sm ring-2 ring-white group-hover:ring-brand-500/10 transition-all">
                   {(profile?.fullName || profile?.firstName || 'م').charAt(0)}
                 </div>
               </div>
             </div>
           </header>
         )}

        {/* Notifications Dialog */}
        <BottomDialog
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
          title="التنبيهات الأخيرة"
        >
          <div className="space-y-4">
            {notifications.length === 0 ? (
              <div className="py-20 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                  <Bell size={32} />
                </div>
                <p className="text-slate-400 text-sm font-medium italic">لا توجد تنبيهات جديدة حالياً</p>
              </div>
            ) : (
              notifications.map((notif: any) => (
                <div key={notif.id} className="p-5 bg-slate-50/50 hover:bg-white hover:shadow-xl hover:shadow-brand-500/5 border border-transparent hover:border-brand-100 rounded-3xl transition-all duration-300 cursor-pointer group">
                  <div className="flex gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110",
                      notif.priority === 'urgent' ? 'bg-red-100 text-red-600' : 'bg-brand-100 text-brand-600'
                    )}>
                      <Bell size={20} />
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <div className="flex justify-between items-start">
                        <p className="text-[15px] font-black text-slate-900 group-hover:text-brand-600 transition-colors leading-tight">
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap bg-white px-2 py-1 rounded-full border border-slate-100 shadow-sm">
                          {new Date(notif.createdAt).toLocaleDateString('ar-SA')}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 font-medium leading-relaxed line-clamp-2">
                        {notif.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
            <Link 
              to="/academic" 
              onClick={() => setShowNotifications(false)}
              className="flex items-center justify-center gap-2 w-full py-4 mt-4 bg-brand-500 text-white rounded-2xl font-black text-sm hover:bg-brand-600 shadow-xl shadow-brand-500/20 transition-all active:scale-95"
            >
              <span>عرض كافة التعميمات</span>
              <ChevronRight size={18} className="rotate-180" />
            </Link>
          </div>
        </BottomDialog>

        {/* User Quick Menu Dialog */}
        <BottomDialog
          isOpen={showUserMenu}
          onClose={() => setShowUserMenu(false)}
          title="الحساب الشخصي"
        >
          <div className="space-y-6">
            <div className="flex items-center gap-5 p-6 bg-brand-50/50 rounded-[2rem] border border-brand-100/30">
              <div className="w-16 h-16 bg-brand-500 text-white rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg shadow-brand-500/30">
                {(profile?.fullName || profile?.firstName || 'م').charAt(0)}
              </div>
              <div className="space-y-1">
                <h4 className="text-xl font-black text-slate-900 leading-none">
                  {profile?.fullName || profile?.firstName || 'المستخدم'}
                </h4>
                <p className="text-slate-500 font-bold text-sm">
                  {profile?.role === 'admin' || profile?.role === 'super_admin' ? 'مدير المنصة' : 
                   profile?.role === 'teacher' ? 'عضو هيئة التدريس' : 
                   profile?.role === 'student' ? 'طالب' : 
                   profile?.role === 'parent' ? 'ولي أمر' : 'مستخدم'}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  <span className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">متصل الآن</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Link 
                to="/profile" 
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-all group"
              >
                <div className="w-11 h-11 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                  <UserCircle size={22} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black text-slate-800 leading-none mb-1">إعدادات الملف الشخصي</p>
                  <p className="text-[11px] text-slate-400 font-bold leading-none">تعديل بياناتك وكلمة المرور</p>
                </div>
                <ChevronRight size={18} className="text-slate-300 rotate-180" />
              </Link>

              <button 
                onClick={() => { setShowUserMenu(false); logout(); }}
                className="flex items-center gap-4 p-4 hover:bg-red-50 rounded-2xl transition-all group w-full text-right"
              >
                <div className="w-11 h-11 bg-red-50 text-red-400 rounded-xl flex items-center justify-center group-hover:bg-red-100 group-hover:text-red-600 transition-colors">
                  <LogOut size={22} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black text-red-600 leading-none mb-1">تسجيل الخروج</p>
                  <p className="text-[11px] text-red-300 font-bold leading-none">إغلاق الجلسة الحالية بأمان</p>
                </div>
              </button>
            </div>
          </div>
        </BottomDialog>
        
        <main className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
