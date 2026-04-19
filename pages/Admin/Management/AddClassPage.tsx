import React from 'react';
import AddClassForm from '../Actions/AddClassForm';
import { ArrowRight, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AddClassPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/admin/classes')}
          className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-blue-600 hover:border-blue-100 transition-all"
        >
          <ArrowRight size={24} />
        </button>
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Layers className="text-blue-600" size={28} />
            إضافة فصل دراسي جديد
          </h1>
          <p className="text-gray-500 font-medium">قم بتعبئة البيانات أدناه لإنشاء بيئة تعليمية جديدة</p>
        </div>
      </div>

      <div className="premium-card">
        <AddClassForm onSuccess={() => {}} />
      </div>

      <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 flex items-start gap-4">
        <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200">
          <Layers size={20} />
        </div>
        <div>
          <h4 className="text-blue-900 font-black">نصيحة للإدارة</h4>
          <p className="text-blue-700/80 text-sm font-bold mt-1">
            عند إنشاء الفصل، يمكنك لاحقاً إضافة المواد الدراسية وتعيين المعلمين من خلال صفحة تفاصيل الفصل.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AddClassPage;
