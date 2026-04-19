import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface BottomDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  showCloseButton?: boolean;
}

const BottomDialog: React.FC<BottomDialogProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  className,
  showCloseButton = true
}) => {
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

  // Use Portal to render at the end of body to escape any parent clipping/stacking context
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl">
      {/* Backdrop - Now covers the ENTIRE screen */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      ></div>

      {/* Dialog Container */}
      <div 
        className={cn(
          "relative w-full max-w-xl bg-white shadow-[0_-20px_80px_-20px_rgba(0,0,0,0.3)] transition-all duration-500",
          // Mobile: Bottom sheet style | Desktop: Centered modal
          "rounded-t-[3rem] sm:rounded-[3rem] animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-20 sm:zoom-in-95",
          "max-h-[94vh] flex flex-col overflow-hidden mb-safe",
          className
        )}
      >
        {/* Drag Handle (Mobile only) - Visual cue for sliding */}
        <div className="flex justify-center pt-4 pb-2 sm:hidden cursor-grab active:cursor-grabbing">
          <div className="w-16 h-1.5 bg-slate-200 rounded-full"></div>
        </div>

        {/* Header - Fixed at top of dialog */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-8 py-6 border-b border-slate-50/80">
            {title ? (
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h3>
            ) : <div />}
            
            {showCloseButton && (
              <button 
                onClick={onClose}
                className="p-3 bg-slate-50 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-[1.25rem] transition-all duration-300 active:scale-90"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>
        )}

        {/* Content Area - Independent Scroll */}
        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 overscroll-contain">
          {children}
        </div>

        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-brand-500/5 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none"></div>
      </div>
    </div>,
    document.body
  );
};

export default BottomDialog;
