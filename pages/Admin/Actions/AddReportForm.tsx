import React, { useState } from 'react';
import { FileText, ClipboardList, Loader2, CheckCircle2, MessageSquare } from 'lucide-react';
import { db } from '../../../services/firebase';
import { ref, push, set } from 'firebase/database';
import { SYS } from '../../../constants/dbPaths';

const AddReportForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    type: 'academic',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const reportRef = push(ref(db, `${SYS.MAINTENANCE.ACTIVITIES}/reports`));
      await set(reportRef, {
        ...formData,
        id: reportRef.key,
        createdAt: new Date().toISOString(),
        createdBy: 'Admin'
      });
      setDone(true);
      setTimeout(onSuccess, 2000);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إصدار التقرير');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-blue-600 animate-bounce" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">تم إصدار التقرير بنجاح!</h3>
        <p className="text-gray-500">جاري إغلاق النموذج...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700">عنوان التقرير</label>
        <div className="relative">
          <FileText className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            required
            className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            placeholder="مثال: تقرير الأداء الشهري - فبراير"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700">نوع التقرير</label>
        <div className="relative">
          <ClipboardList className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl appearance-none focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            value={formData.type}
            onChange={(e) => setFormData({...formData, type: e.target.value})}
          >
            <option value="academic">تقرير أكاديمي</option>
            <option value="attendance">تقرير غياب</option>
            <option value="behavior">تقرير سلوكي</option>
            <option value="financial">تقرير مالي</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700">تفاصيل إضافية</label>
        <div className="relative">
          <MessageSquare className="w-5 h-5 absolute right-3 top-4 text-gray-400" />
          <textarea
            required
            rows={4}
            className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
            placeholder="اكتب وصفاً موجزاً لمحتوى التقرير..."
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
          ></textarea>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'توليد التقرير'}
      </button>
    </form>
  );
};

export default AddReportForm;
