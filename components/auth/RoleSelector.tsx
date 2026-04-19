import React from 'react';
import { GraduationCap, UserCheck, Users, ShieldCheck, LucideIcon } from 'lucide-react';

export type UserType = 'student' | 'teacher' | 'parent' | 'admin' | null;

interface RoleOption {
  id: UserType;
  label: string;
  icon: LucideIcon;
}

interface RoleSelectorProps {
  selectedRole: UserType;
  onSelectRole: (role: UserType) => void;
}

const roles: RoleOption[] = [
  { id: 'student', label: 'طالب', icon: GraduationCap },
  { id: 'teacher', label: 'معلم', icon: UserCheck },
  { id: 'parent', label: 'ولي أمر', icon: Users },
  { id: 'admin', label: 'مشرف', icon: ShieldCheck }
];

export const RoleSelector: React.FC<RoleSelectorProps> = ({ selectedRole, onSelectRole }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {roles.map((role) => (
        <button
          key={role.id}
          type="button"
          onClick={() => onSelectRole(role.id)}
          className={`p-4 md:p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 active:scale-95 ${
            selectedRole === role.id 
            ? `border-brand-500 bg-brand-50 shadow-sm ring-4 ring-brand-500/5` 
            : 'border-white bg-white hover:border-slate-100 hover:shadow-md'
          }`}
        >
          <div className={`p-3 rounded-xl transition-all duration-300 ${
            selectedRole === role.id 
            ? 'bg-brand-500 text-white scale-110 shadow-lg shadow-brand-500/20' 
            : 'bg-slate-50 text-slate-400 group-hover:bg-brand-50'
          }`}>
            <role.icon className="w-6 h-6 md:w-7 md:h-7" />
          </div>
          <span className={`text-xs md:text-sm font-bold ${selectedRole === role.id ? 'text-brand-600' : 'text-slate-500'}`}>{role.label}</span>
        </button>
      ))}
    </div>
  );
};
