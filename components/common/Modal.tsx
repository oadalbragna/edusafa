import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const Modal: React.FC<ModalProps> = React.memo(({ isOpen, onClose, title, children, className }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl">
      {/* Full Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      ></div>

      {/* Container */}
      <div 
        className={cn(
          "relative w-full max-w-2xl bg-white shadow-2xl transition-all duration-500",
          "rounded-t-[3rem] sm:rounded-[3.5rem] animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-10 sm:zoom-in-95",
          "max-h-[92vh] flex flex-col overflow-hidden",
          className
        )}
      >
        {/* Mobile Handle */}
        <div className="flex justify-center pt-4 pb-1 sm:hidden">
          <div className="w-14 h-1.5 bg-slate-200 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-10 py-6 border-b border-slate-50/50">
          {title ? (
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h3>
          ) : <div />}
          
          <button 
            onClick={onClose}
            className="p-3 bg-slate-50 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-2xl transition-all duration-300 active:scale-90"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-10 overflow-y-auto custom-scrollbar flex-1 overscroll-contain">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
});

export default Modal;
