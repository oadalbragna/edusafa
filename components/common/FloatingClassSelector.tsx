import React, { useState } from 'react';
import { LayoutGrid, CheckCircle2, ChevronUp, Filter } from 'lucide-react';
import { useClass } from '../../context/ClassContext';

export const FloatingClassSelector = ({ assignedClasses, onSelect }: { assignedClasses: any[], onSelect: (cls: any) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [active, setActive] = useState<any>(null);

  return (
    <div className="fixed bottom-6 right-6 z-[999]">
      {isOpen && (
        <div className="mb-4 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 w-72 animate-in slide-in-from-bottom-5">
          <h4 className="text-xs font-black text-slate-400 uppercase mb-3 px-2">اختر الفصل النشط</h4>
          <div className="space-y-1">
            {assignedClasses.map((cls) => (
              <button 
                key={cls.classId}
                onClick={() => { 
                  setActive(cls); 
                  onSelect(cls); 
                  setIsOpen(false); 
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${
                  active?.classId === cls.classId ? 'bg-brand-50 text-brand-600' : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                {cls.className} ({cls.grade})
                {active?.classId === cls.classId && <CheckCircle2 size={14} />}
              </button>
            ))}
          </div>
        </div>
      )}
      
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-6 py-4 bg-slate-900 text-white rounded-full shadow-2xl hover:scale-105 transition-all"
      >
        <Filter size={18} />
        <span className="text-xs font-black">{active ? active.className : 'اختر الفصل'}</span>
        <ChevronUp size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
    </div>
  );
};
