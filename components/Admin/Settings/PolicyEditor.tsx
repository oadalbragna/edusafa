import React, { useState, useRef } from 'react';
import { 
  Bold, 
  Italic, 
  Highlighter, 
  Smile, 
  Type, 
  Eye, 
  Edit3,
  Undo2,
  Trash2
} from 'lucide-react';

interface PolicyEditorProps {
  value: string;
  onChange: (val: string) => void;
  title: string;
}

const PolicyEditor: React.FC<PolicyEditorProps> = ({ value, onChange, title }) => {
  const [isPreview, setIsPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertFormat = (prefix: string, suffix: string) => {
    if (!textareaRef.current) return;
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = textareaRef.current.value;
    const selected = text.substring(start, end);
    const before = text.substring(0, start);
    const after = text.substring(end);

    const newValue = `${before}${prefix}${selected}${suffix}${after}`;
    onChange(newValue);
    
    // Reset focus and selection
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPos = start + prefix.length + selected.length + suffix.length;
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  const renderPreview = (text: string) => {
    if (!text) return <p className="text-slate-400 italic">لا يوجد محتوى للعرض...</p>;

    // Basic parser for our custom tags
    // **bold** -> <strong>
    // *italic* -> <em>
    // #highlight# -> <mark>
    // Enhanced parser with auto-detection for project name and better typography
    // Escape HTML entities first for safety
    const escapeHtml = (str: string) => {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    };

    let processed = escapeHtml(text)
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-black text-slate-900 border-b-2 border-blue-100">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-blue-600 font-bold bg-blue-50/50 px-1 rounded">$1</em>')
      .replace(/#(.*?)#/g, '<mark class="bg-gradient-to-r from-yellow-100 to-yellow-200 px-1.5 py-0.5 rounded-md font-black text-slate-900 shadow-sm">$1</mark>')
      .replace(/(EduSafa|إيدوسافا|المنصة التعليمية)/g, '<span class="text-blue-600 font-black decoration-blue-500/30 decoration-wavy underline underline-offset-4">$1</span>')
      .replace(/^(.*?)[:：]/gm, '<h5 class="text-slate-900 font-black mb-2 mt-4 flex items-center gap-2"><span class="w-1.5 h-4 bg-blue-500 rounded-full"></span>$1:</h5>')
      .replace(/\n/g, '<br />');

    return (
      <div 
        className="prose prose-slate max-w-none text-right leading-relaxed text-slate-700 font-medium"
        dangerouslySetInnerHTML={{ __html: processed }}
      />
    );
  };

  const emojis = ['⚖️', '🛡️', '📜', '✅', '⚠️', '📍', '📧', '📱'];

  return (
    <div className="space-y-4 bg-white rounded-[2.5rem] p-6 border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between border-b border-slate-50 pb-4">
        <h4 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <Type className="text-blue-600" size={20} /> {title}
        </h4>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setIsPreview(false)}
            className={`px-4 py-2 rounded-lg text-xs font-black flex items-center gap-2 transition-all ${!isPreview ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Edit3 size={14} /> تحرير
          </button>
          <button 
            onClick={() => setIsPreview(true)}
            className={`px-4 py-2 rounded-lg text-xs font-black flex items-center gap-2 transition-all ${isPreview ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Eye size={14} /> معاينة
          </button>
        </div>
      </div>

      {!isPreview ? (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <button 
              onClick={() => insertFormat('**', '**')}
              className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm active:scale-90"
              title="خط عريض"
            >
              <Bold size={18} />
            </button>
            <button 
              onClick={() => insertFormat('*', '*')}
              className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm active:scale-90"
              title="خط مائل"
            >
              <Italic size={18} />
            </button>
            <button 
              onClick={() => insertFormat('#', '#')}
              className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-yellow-600 hover:border-yellow-200 transition-all shadow-sm active:scale-90"
              title="تظليل النص"
            >
              <Highlighter size={18} />
            </button>
            
            <div className="w-px h-8 bg-slate-200 mx-1"></div>
            
            <div className="flex items-center gap-1.5">
              {emojis.map(emoji => (
                <button 
                  key={emoji}
                  onClick={() => insertFormat(emoji, '')}
                  className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm text-lg active:scale-90"
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="flex-1"></div>

            <button 
              onClick={() => onChange('')}
              className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
              title="مسح الكل"
            >
              <Trash2 size={18} />
            </button>
          </div>

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="اكتب المحتوى هنا... يمكنك استخدام الأزرار في الأعلى للتنسيق"
            rows={12}
            className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl outline-none font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/20 transition-all resize-none leading-relaxed"
            dir="rtl"
          />
          
          <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-2xl border border-blue-100/50">
            <Smile className="text-blue-500 shrink-0" size={16} />
            <p className="text-[10px] text-blue-600 font-black leading-none uppercase tracking-widest">
              نصيحة: استخدم **للنص العريض**، *للنص المائل*، و #للتظليل#.
            </p>
          </div>
        </div>
      ) : (
        <div className="min-h-[300px] p-8 bg-white border border-slate-100 rounded-3xl overflow-y-auto max-h-[500px] shadow-inner scrollbar-hide">
          {renderPreview(value)}
        </div>
      )}
    </div>
  );
};

export default PolicyEditor;
