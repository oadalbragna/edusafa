import React from 'react';
import { Filter } from 'lucide-react';
import { useClassHierarchy } from '../../hooks/useClassHierarchy';

interface Props {
  level: string;
  grade: string;
  onLevelChange: (level: string) => void;
  onGradeChange: (grade: string) => void;
}

export const ClassFilterBar: React.FC<Props> = ({ level, grade, onLevelChange, onGradeChange }) => {
  const { hierarchy, loading } = useClassHierarchy();

  if (loading) return <div className="text-sm font-bold text-slate-400">جاري تحميل الفلاتر...</div>;

  const levels = Object.keys(hierarchy);

  return (
    <div className="flex gap-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm items-center">
      <Filter className="text-blue-600" size={20} />
      
      <select 
        value={level} 
        onChange={(e) => { onLevelChange(e.target.value); onGradeChange(''); }}
        className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none"
      >
        <option value="">كل المراحل</option>
        {levels.map(l => <option key={l} value={l}>{l === 'primary' ? 'ابتدائي' : l === 'middle' ? 'متوسط' : 'ثانوي'}</option>)}
      </select>

      {level && hierarchy[level] && (
        <select 
          value={grade} 
          onChange={(e) => onGradeChange(e.target.value)}
          className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none"
        >
          <option value="">كل الصفوف</option>
          {Object.keys(hierarchy[level]).map(g => <option key={g} value={g}>الصف {g}</option>)}
        </select>
      )}
    </div>
  );
};
