import React, { useState, useEffect } from 'react';
import { RefreshCw, Zap, ZapOff, Trash2 } from 'lucide-react';
import { cache } from '../../services/cache.service';
import { CacheManager } from '../../utils/cacheManager';
import { cn } from '../../utils/cn';

const CacheControl: React.FC = () => {
  const [isEnabled, setIsEnabled] = useState(cache.getEnabled());
  const [isClearing, setIsClearing] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const toggleCache = () => {
    const newState = !isEnabled;
    cache.setEnabled(newState);
    setIsEnabled(newState);
    
    // Show temporary notification style status
    const msg = newState ? 'تم تفعيل التخزين المؤقت' : 'تم تعطيل التخزين المؤقت وتفريغه';
    console.log(msg);
  };

  const clearAllCache = () => {
    if (window.confirm('هل أنت متأكد من رغبتك في مسح جميع البيانات المخزنة مؤقتاً؟ سيؤدي ذلك لإعادة تحميل الصفحة.')) {
      setIsClearing(true);
      CacheManager.clearAllCache();
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Cache Toggle */}
      <button
        onClick={toggleCache}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={cn(
          "p-2 rounded-xl transition-all duration-300 relative group",
          isEnabled 
            ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 shadow-sm" 
            : "bg-slate-100 text-slate-400 hover:bg-slate-200"
        )}
        title={isEnabled ? 'التخزين المؤقت مفعل' : 'التخزين المؤقت معطل'}
      >
        {isEnabled ? <Zap size={18} className="fill-current" /> : <ZapOff size={18} />}
        
        {/* Simple Label Tooltip for desktop */}
        <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-800 text-white text-[10px] font-black rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl">
          {isEnabled ? 'تعطيل الكاش الذكي' : 'تفعيل الكاش الذكي'}
        </span>
      </button>

      {/* Clear Cache Button */}
      <button
        onClick={clearAllCache}
        disabled={isClearing}
        className={cn(
          "p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all relative group",
          isClearing && "animate-pulse"
        )}
        title="تفريغ الكاش بالكامل"
      >
        <Trash2 size={18} className={isClearing ? 'animate-spin' : ''} />
        
        <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-red-600 text-white text-[10px] font-black rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl">
          تفريغ الكاش بالكامل
        </span>
      </button>
    </div>
  );
};

export default CacheControl;
