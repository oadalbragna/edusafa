import React, { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  Calendar, 
  Filter, 
  User, 
  Database, 
  Clock, 
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { getDb as db } from '../../../services/firebase';
import { SYS, EDU, COMM } from '../../constants/dbPaths';
import { ref, onValue, remove, query, limitToLast } from 'firebase/database';

const ActivityLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    const logsRef = query(ref(db, 'sys/maintenance/activities'), limitToLast(200));
    const unsubscribe = onValue(logsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = Object.values(snapshot.val());
        data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setLogs(data);
      } else {
        setLogs([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.userName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         log.details?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || log.type.includes(filterType);
    return matchesSearch && matchesType;
  });

  const clearLogs = async () => {
    if (window.confirm('تحذير: هل أنت متأكد من مسح كافة السجلات؟ لا يمكن التراجع عن هذا الإجراء.')) {
      await remove(ref(db, 'sys/maintenance/activities'));
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <History className="text-blue-600" size={32} />
            سجل العمليات والنشاطات
          </h1>
          <p className="text-slate-500 font-medium mt-1">مراقبة كافة تحركات المستخدمين وتعديلات النظام لحظياً</p>
        </div>
        <div className="flex gap-3">
           <button className="bg-white border-2 border-slate-100 text-slate-600 px-6 py-3.5 rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
              <Download size={18} />
              تصدير Excel
           </button>
           <button 
             onClick={clearLogs}
             className="bg-red-50 text-red-600 px-6 py-3.5 rounded-2xl font-bold hover:bg-red-100 transition-all flex items-center gap-2"
           >
              <Trash2 size={18} />
              مسح السجلات
           </button>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="البحث باسم المستخدم أو تفاصيل العملية..."
            className="w-full pr-12 pl-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-4 w-full md:w-auto">
           <div className="relative flex-1 md:w-48">
              <Filter className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <select 
                className="w-full pr-10 pl-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xs appearance-none"
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
              >
                <option value="all">كل العمليات</option>
                <option value="student">إدارة الطلاب</option>
                <option value="teacher">إدارة المعلمين</option>
                <option value="class">الفصول والمواد</option>
                <option value="material">رفع المحتوى</option>
                <option value="attendance">الحضور والغياب</option>
              </select>
           </div>
           <div className="relative flex-1 md:w-48">
              <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input type="date" className="w-full pr-10 pl-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xs" />
           </div>
        </div>
      </div>

      {/* Logs Timeline */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right min-w-[800px]">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">توقيت العملية</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">المستخدم</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">النشاط</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">التفاصيل</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-slate-400 italic">لا توجد سجلات تطابق بحثك</td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                       <div className="flex items-center gap-2 text-slate-500 font-bold text-xs">
                          <Clock size={14} className="text-slate-300" />
                          {new Date(log.createdAt).toLocaleString('ar-SA')}
                       </div>
                    </td>
                    <td className="px-8 py-5">
                       <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                             <User size={16} />
                          </div>
                          <span className="font-black text-slate-800 text-sm">{log.userName}</span>
                       </div>
                    </td>
                    <td className="px-8 py-5">
                       <span className={`px-3 py-1 rounded-lg text-[10px] font-black border ${
                         log.type.includes('student') ? 'bg-blue-50 text-blue-600 border-blue-100' :
                         log.type.includes('teacher') ? 'bg-purple-50 text-purple-600 border-purple-100' :
                         log.type.includes('class') ? 'bg-orange-50 text-orange-600 border-orange-100' :
                         'bg-slate-50 text-slate-600 border-slate-100'
                       }`}>
                          {log.type.toUpperCase()}
                       </span>
                    </td>
                    <td className="px-8 py-5 font-bold text-slate-600 text-sm">{log.details}</td>
                    <td className="px-8 py-5 text-left">
                       <span className="inline-flex items-center gap-1.5 text-green-600 font-black text-[10px]">
                          <Database size={12} />
                          نجاح
                       </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Placeholder */}
        <div className="p-6 border-t border-slate-50 flex justify-between items-center bg-slate-50/30">
           <p className="text-xs font-bold text-slate-400">عرض {filteredLogs.length} من إجمالي {logs.length} سجل</p>
           <div className="flex gap-2">
              <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-blue-600 transition-all cursor-not-allowed opacity-50"><ChevronRight size={18} /></button>
              <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-blue-600 transition-all cursor-not-allowed opacity-50"><ChevronLeft size={18} /></button>
           </div>
        </div>
      </div>

      {/* Security Info Card */}
      <div className="p-8 bg-blue-600 rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-blue-200">
         <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-white/20 rounded-[2rem] flex items-center justify-center backdrop-blur-md">
               <AlertCircle size={40} />
            </div>
            <div>
               <h3 className="text-2xl font-black">حماية البيانات والشفافية</h3>
               <p className="text-blue-100 font-medium max-w-xl leading-relaxed">
                  يتم الاحتفاظ بسجلات العمليات لمدة ٩٠ يوماً لضمان أعلى مستويات الأمان والشفافية في إدارة المنصة التعليمية.
               </p>
            </div>
         </div>
         <button className="px-10 py-4 bg-white text-blue-600 rounded-2xl font-black shadow-xl hover:bg-blue-50 transition-all">
            سياسة الأمان
         </button>
      </div>
    </div>
  );
};

export default ActivityLogs;
