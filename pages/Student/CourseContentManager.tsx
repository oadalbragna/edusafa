
import React, { useState, useEffect } from 'react';
import {
  ArrowRight, School, ArrowLeft, BookOpen
} from 'lucide-react';
import { ref, onValue } from 'firebase/database';
import { getDb as db } from '../../services/firebase';
import { useTheme } from '../../context/ThemeContext';

// School View Only
import SchoolView from './course-manager/views/SchoolView';

interface CourseContentManagerProps {
  onBack: () => void;
}

const CourseContentManager: React.FC<CourseContentManagerProps> = ({ onBack }) => {
  const { dir } = useTheme();
  const [allTeachers, setAllTeachers] = useState<any[]>([]);

  // Fetch staff for assignment
  useEffect(() => {
    const teachersRef = ref(db, 'sys/users/profiles');
    const unsub = onValue(teachersRef, (snap) => {
        if (snap.exists()) {
            const list = Object.entries(snap.val())
                .filter(([_, v]: any) => v.is_type === 'teacher' || v.is_type === 'admin')
                .map(([k, v]: any) => ({ uid: k, ...v }));
            setAllTeachers(list);
        }
    });
    return () => unsub();
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-gray-950 pb-20 relative animate-in fade-in duration-700" dir={dir}>

      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-6 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-5">
                <button
                    onClick={onBack}
                    className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
                >
                   {dir === 'rtl' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
                </button>
                <div>
                   <h1 className="text-xl font-black text-gray-800 dark:text-white tracking-tight">إدارة المحتوى الدراسي</h1>
                   <p className="text-[10px] text-primary font-black uppercase tracking-widest mt-1">
                     التعليم العام - المرحلة الابتدائية، المتوسطة، والثانوية
                   </p>
                </div>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                <BookOpen className="w-7 h-7" />
            </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 py-10">
        <SchoolView onBack={onBack} allTeachers={allTeachers} />
      </main>
    </div>
  );
};

export default CourseContentManager;
