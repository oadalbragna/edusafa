import React from 'react';
import { LucideIcon } from 'lucide-react';

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon: LucideIcon;
  error?: string;
  showTogglePassword?: boolean;
  onTogglePassword?: () => void;
  isPasswordShown?: boolean;
}

export const AuthInput: React.FC<AuthInputProps> = ({ 
  label, 
  icon: Icon, 
  error, 
  showTogglePassword, 
  onTogglePassword, 
  isPasswordShown,
  ...props 
}) => {
  return (
    <div className="space-y-2">
      {label && <label className="text-[13px] font-black text-slate-700 block mr-1">{label}</label>}
      <div className="relative group">
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
          <Icon size={18} />
        </div>
        <input 
          {...props}
          type={showTogglePassword ? (isPasswordShown ? 'text' : 'password') : props.type}
          className={`w-full pr-12 pl-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500/30 focus:bg-white transition-all font-bold text-sm ${props.className}`}
        />
        {showTogglePassword && onTogglePassword && (
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-500 transition-colors"
          >
            {/* Password toggle icon could be added here if needed */}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500 font-bold mr-1">{error}</p>}
    </div>
  );
};
