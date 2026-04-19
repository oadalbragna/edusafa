import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Send, 
  Paperclip, 
  Search, 
  MoreVertical, 
  User, 
  Loader2,
  Phone,
  Video as VideoIcon,
  ChevronRight,
  CreditCard,
  Share2,
  ShieldCheck,
  CheckCircle2,
  Image as ImageIcon,
  Mic,
  Square,
  X,
  FileIcon,
  Download,
  Smile,
  Trash2,
  ChevronLeft,
  Settings,
  Info,
  Eraser,
  Volume2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/ToastProvider';
import { db } from '../../services/firebase';
import { SYS, EDU, COMM } from '../../constants/dbPaths';
import { TelegramService } from '../../services/telegram.service';
import { ref, push, set, onValue, serverTimestamp, query, limitToLast, get, remove, update } from 'firebase/database';
import type { Message } from '../../types';

const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { showError } = useToast();
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [chats, setChats] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatUser, setChatUser] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const usersRef = ref(db, 'sys/users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) setAllUsers(snapshot.val());
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!profile) return;
    const fetchContacts = async () => {
      try {
        onValue(ref(db, 'comm/chats'), (snapshot) => {
          if (snapshot.exists()) {
            const allChats = Object.values(snapshot.val());
            const myChats = allChats.filter((c: any) => c.participants && c.participants.includes(profile.uid));
            setChats(myChats.sort((a: any, b: any) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0)));
          }
        });

        if (profile.role === 'student') {
          const classRef = ref(db, `edu/sch/classes/${profile.classId}`);
          const classSnap = await get(classRef);
          if (classSnap.exists()) {
            const teacherIds = (classSnap.val().subjects || []).map((s: any) => s.teacherId).filter(Boolean);
            setTeachers(Object.values(allUsers).filter((u: any) => teacherIds.includes(u.uid)));
          }
        } else if (profile.role === 'parent') {
          const children = Object.values(allUsers).filter((u: any) => u.uid === profile.studentLink || u.parentUid === profile.uid || u.parentEmail === profile.email) as any[];
          const teachersList: any[] = [];
          for (const child of children) {
            const classSnap = await get(ref(db, `edu/sch/classes/${child.classId}`));
            if (classSnap.exists()) {
              const teacherIds = (classSnap.val().subjects || []).map((s: any) => s.teacherId).filter(Boolean);
              teachersList.push(...Object.values(allUsers).filter((u: any) => teacherIds.includes(u.uid)).map(u => ({...u, childName: child.firstName})));
            }
          }
          setTeachers(Array.from(new Map(teachersList.map(item => [item['uid'], item])).values()));
        }

        if (profile.role !== 'admin' && profile.role !== 'super_admin') {
          const admins = Object.values(allUsers).filter((u: any) => u.role === 'admin' || u.role === 'super_admin');
          setTeachers(prev => Array.from(new Map([...admins.map(a => ({...a, isAdminContact: true})), ...prev].map(item => [item['uid'], item])).values()));
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    if (Object.keys(allUsers).length > 0) fetchContacts();
  }, [profile, allUsers]);

  useEffect(() => {
    if (!activeChat) return;
    const unsubscribe = onValue(query(ref(db, `comm/messages/${activeChat}`), limitToLast(100)), (snapshot) => {
      if (snapshot.exists()) {
        setMessages(Object.values(snapshot.val()) as Message[]);
        scrollToBottom();
      } else setMessages([]);
    });
    return () => unsubscribe();
  }, [activeChat]);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleSendMessage = async (text: string = inputText, type: Message['type'] = 'text', fileUrl?: string) => {
    if ((!text.trim() && !fileUrl) || !activeChat || !profile) return;
    try {
      const newMessageRef = push(ref(db, `comm/messages/${activeChat}`));
      const messageData: Message = { id: newMessageRef.key!, senderId: profile.uid, senderName: profile.fullName || 'المستخدم', text, timestamp: serverTimestamp(), type, fileUrl, isDeleted: false };
      await set(newMessageRef, messageData);
      await update(ref(db, `comm/chats/${activeChat}`), { id: activeChat, participants: activeChat.split('_'), lastMessage: type === 'text' ? text : `[${type}]`, lastTimestamp: serverTimestamp(), lastSenderId: profile.uid });
      setInputText('');
      scrollToBottom();
    } catch (err) {
      showError('فشل إرسال الرسالة', 'يرجى المحاولة مرة أخرى');
    }
  };

  const clearChat = async () => { if (!activeChat || !window.confirm('هل تريد مسح المحادثة؟')) return; };
  const handleDeleteMessage = async (msgId: string) => {
    if (!activeChat || !window.confirm('حذف الرسالة؟')) return;
    await update(ref(db, `comm/messages/${activeChat}/${msgId}`), { isDeleted: true, text: 'تم حذف هذه الرسالة' });
  };

  const handleReaction = async (msgId: string, emoji: string) => {
    if (!activeChat || !profile) return;
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    const current = msg.reactions || {};
    const users = current[emoji] || [];
    const updated = users.includes(profile.uid) ? users.filter(id => id !== profile.uid) : [...users, profile.uid];
    const newReactions = { ...current, [emoji]: updated };
    if (updated.length === 0) delete newReactions[emoji];
    await update(ref(db, `comm/messages/${activeChat}/${msgId}`), { reactions: newReactions });
    setShowEmojiPicker(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'file') => {
    const file = e.target.files?.[0];
    if (!file || !activeChat) return;
    setUploading(true);
    try {
      // Use TelegramService for all file uploads
      const res = await TelegramService.uploadFile(file, `${type}_chats`, activeChat);
      if (res.success && res.url) {
        await handleSendMessage(file.name, type, res.url);
        showSuccess('تم إرسال الملف بنجاح');
      } else {
        showError('فشل رفع الملف', res.error || 'يرجى المحاولة مرة أخرى');
      }
    } catch (err: any) {
      showError('خطأ في رفع الملف', err.message);
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], 'voice_note.webm', { type: 'audio/webm' });
        setUploading(true);
        try {
          const res = await TelegramService.uploadFile(audioFile, 'recordings', activeChat);
          if (res.success && res.url) handleSendMessage('رسالة صوتية', 'audio', res.url);
        } finally { setUploading(false); }
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => setRecordingDuration(p => p + 1), 1000);
    } catch (err) {
      showError('الميكروفون غير متاح', 'يرجى التحقق من الأذونات');
    }
  };

  const stopRecording = () => { if (mediaRecorder) { mediaRecorder.stop(); setIsRecording(false); clearInterval(timerRef.current); } };

  return (
    <div className="fixed inset-0 lg:relative lg:h-[calc(100vh-140px)] flex flex-col md:flex-row bg-white lg:rounded-[3rem] shadow-2xl overflow-hidden font-sans z-[60] lg:z-auto" dir="rtl">
      <style>{`
        @keyframes heartbeat { 0% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.5); opacity: 0.4; } 100% { transform: scale(1); opacity: 0.8; } }
        .pulse-ring { animation: heartbeat 1.5s ease-in-out infinite; }
        .pulse-ring-delayed { animation: heartbeat 1.5s ease-in-out 0.75s infinite; }
      `}</style>

      {/* Sidebar */}
      <div className={`w-full md:w-96 border-l border-slate-100 flex flex-col bg-slate-50/50 ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 pb-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-slate-900">صندوق الوارد</h2>
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><Volume2 size={20} /></div>
          </div>
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input type="text" placeholder="بحث..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pr-11 pl-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 transition-all" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 custom-scrollbar">
          {chats.map((chat, idx) => {
            const otherUserId = chat.participants?.find((id: string) => id !== profile?.uid);
            const otherUser = allUsers[otherUserId];
            if (!otherUser) return null;
            const isSel = activeChat === chat.id;
            return (
              <button key={idx} onClick={() => { setActiveChat(chat.id); setChatUser(otherUser); }} className={`w-full p-4 rounded-[2.2rem] flex items-center gap-4 transition-all mb-2 ${isSel ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'bg-white hover:bg-slate-100 border border-slate-100'}`}>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shrink-0 ${isSel ? 'bg-white/20' : 'bg-blue-50 text-blue-600'}`}>{otherUser.fullName?.[0] || 'ط'}</div>
                <div className="flex-1 text-right min-w-0">
                  <p className="font-black text-sm truncate">{otherUser.fullName || `${otherUser.firstName} ${otherUser.lastName}`}</p>
                  <p className={`text-[10px] truncate ${isSel ? 'text-white/70' : 'text-slate-400'}`}>{chat.lastMessage || 'محادثة جديدة'}</p>
                </div>
              </button>
            );
          })}
          {teachers.filter(t => !chats.some(c => c.id === [profile!.uid, t.uid].sort().join('_'))).map((t, idx) => (
            <button key={idx} onClick={() => { const id = [profile!.uid, t.uid].sort().join('_'); setActiveChat(id); setChatUser(t); }} className="w-full p-4 rounded-[2rem] flex items-center gap-4 transition-all bg-white hover:bg-slate-50 border border-slate-100/50 mb-2">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black bg-slate-50 text-slate-400 shrink-0">{t.fullName?.[0]}</div>
              <div className="flex-1 text-right min-w-0"><p className="font-black text-sm truncate">{t.fullName || `${t.firstName} ${t.lastName}`}</p></div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col bg-white relative ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
        {activeChat ? (
          <>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white/95 backdrop-blur-md sticky top-0 z-30 shadow-sm">
              <div className="flex items-center gap-3">
                <button onClick={() => setActiveChat(null)} className="md:hidden p-2 text-slate-400"><ChevronLeft size={24} /></button>
                <div className="relative">
                  <div className="w-11 h-11 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-black">{chatUser.fullName?.[0]}</div>
                  <span className={`absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${chatUser.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                </div>
                <div className="min-w-0"><h3 className="font-black text-slate-900 text-sm truncate">{chatUser.fullName || `${chatUser.firstName} ${chatUser.lastName}`}</h3></div>
              </div>
              <div className="flex items-center gap-1">
                 <button className="p-2.5 text-slate-400 hover:bg-blue-50 rounded-xl"><Phone size={18} /></button>
                 <button onClick={() => setShowMenu(!showMenu)} className="p-2.5 text-slate-400 hover:bg-slate-50 rounded-xl"><MoreVertical size={18} /></button>
                 {showMenu && (
                   <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-50 animate-in fade-in zoom-in-95">
                      <button onClick={clearChat} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 text-slate-600 font-black text-xs transition-all"><Eraser size={16}/> مسح المحادثة</button>
                      <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 text-red-500 font-black text-xs transition-all" onClick={() => setActiveChat(null)}><Trash2 size={16}/> إغلاق</button>
                   </div>
                 )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 bg-[#f8fafc] custom-scrollbar scroll-smooth">
              {messages.map((msg) => {
                const isMe = msg.senderId === profile?.uid;
                const isInv = msg.type === 'invoice';
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-start' : 'justify-end'} group animate-in slide-in-from-bottom-2 duration-300`}>
                    <div className={`relative max-w-[85%] md:max-w-[70%] flex flex-col ${isMe ? 'items-start' : 'items-end'}`}>
                      <div onClick={() => !msg.isDeleted && setShowEmojiPicker(msg.id)} className={`p-4 rounded-[2.2rem] shadow-sm transition-all hover:shadow-lg cursor-pointer ${msg.isDeleted ? 'bg-slate-100 text-slate-400 italic' : isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-slate-100 rounded-tl-none'}`}>
                        {isInv ? (
                          <div className="space-y-3 text-right" dir="rtl">
                             <div className="flex items-center gap-2 border-b border-amber-200/50 pb-2"><CreditCard size={16} className="text-amber-600"/><p className="font-black text-[10px] text-amber-800 uppercase">إشعار فاتورة</p></div>
                             <h4 className="text-xs font-black text-slate-900 leading-tight">{msg.invoiceData?.description}</h4>
                             <div className="grid grid-cols-2 gap-2">
                                <div className="p-2 bg-white rounded-xl border border-amber-100 text-center"><p className="text-[8px] text-slate-400 font-bold">المطلوب</p><p className="text-sm font-black text-slate-900">{msg.invoiceData?.amount?.toLocaleString()}</p></div>
                                <div className="p-2 bg-white rounded-xl border border-amber-100 text-center"><p className="text-[8px] text-slate-400 font-bold">المتبقي</p><p className="text-sm font-black text-amber-600">{msg.invoiceData?.balance?.toLocaleString()}</p></div>
                             </div>
                             {!isMe && !msg.isDeleted && <button onClick={() => navigate('/financial')} className="w-full py-3 bg-amber-600 text-white rounded-xl font-black text-[10px] shadow-lg">سداد الفاتورة</button>}
                          </div>
                        ) : (
                          <div className="space-y-2">
                             {!msg.isDeleted && (
                               <>
                                 {msg.type === 'image' && <img src={msg.fileUrl} className="max-w-full rounded-2xl mb-2" onClick={() => window.open(msg.fileUrl)} />}
                                 {msg.type === 'audio' && <audio src={msg.fileUrl} controls className="h-8 w-full" />}
                                 {msg.type === 'file' && <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[11px] font-black"><FileIcon size={14}/> {msg.text}</a>}
                               </>
                             )}
                             <p className="font-bold text-[14px] whitespace-pre-wrap">{msg.text}</p>
                          </div>
                        )}
                      </div>
                      <span className="text-[8px] text-slate-400 mt-1">{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                    </div>
                  </div>
                );
              })}
              <div className="h-32" /><div ref={messagesEndRef} />
            </div>

            <div className="absolute bottom-6 left-4 right-4 md:left-10 md:right-10 z-40">
              {isRecording ? (
                <div className="flex items-center gap-4 bg-white/90 backdrop-blur-2xl p-5 rounded-[2.5rem] border border-blue-500/20 shadow-2xl">
                  <div className="relative flex items-center justify-center w-12 h-12"><div className="absolute inset-0 bg-red-500 rounded-full opacity-20 pulse-ring"></div><div className="relative w-4 h-4 bg-red-500 rounded-full shadow-lg"></div></div>
                  <div className="flex-1 font-black text-red-600 text-lg">{Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}</div>
                  <button onClick={stopRecording} className="w-14 h-14 bg-red-600 text-white rounded-[1.5rem] flex items-center justify-center active:scale-90 transition-all"><Square size={24} /></button>
                </div>
              ) : (
                <div className="bg-white/90 backdrop-blur-2xl p-3 md:p-4 rounded-[2.8rem] border border-white/50 shadow-2xl flex items-end gap-3" dir="ltr">
                  <button onClick={() => handleSendMessage()} disabled={!inputText.trim() || uploading} className={`w-14 h-14 rounded-[1.8rem] flex items-center justify-center transition-all shadow-xl active:scale-90 ${!inputText.trim() ? 'bg-slate-100 text-slate-300' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                    {uploading ? <Loader2 className="animate-spin" size={24} /> : <Send size={26} />}
                  </button>
                  <div className="flex-1 bg-slate-100/50 rounded-[2rem] px-5 py-1">
                    <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if(inputText.trim()) handleSendMessage(); } }} placeholder="Type a message..." className="w-full bg-transparent border-none outline-none font-bold text-slate-800 py-3 text-sm resize-none max-h-[160px] custom-scrollbar" rows={1} onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`; }} />
                  </div>
                  <div className="flex items-center gap-1 mb-1">
                    <button onClick={startRecording} className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all"><Mic size={24} /></button>
                    <label className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-blue-600 cursor-pointer"><ImageIcon size={24} /><input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'image')} /></label>
                  </div>
                </div>
              )}
            </div>

            {showEmojiPicker && (
              <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 animate-in fade-in duration-300">
                <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-xl" onClick={() => setShowEmojiPicker(null)}></div>
                <div className="relative z-[510] w-full max-w-lg flex flex-col items-center gap-8">
                  {(() => {
                    const msg = messages.find(m => m.id === showEmojiPicker);
                    if (!msg) return null;
                    const isMe = msg.senderId === profile?.uid;
                    return (
                      <div className={`w-full flex ${isMe ? 'justify-start' : 'justify-end'} animate-in zoom-in-95`}>
                        <div className={`p-6 rounded-[2.5rem] shadow-2xl max-w-[90%] ${isMe ? 'bg-blue-600 text-white' : 'bg-white text-slate-800'}`}>{msg.text}</div>
                      </div>
                    );
                  })()}
                  <div className="bg-white/90 backdrop-blur-2xl p-5 rounded-[3rem] shadow-2xl flex flex-wrap justify-center gap-4 animate-in slide-in-from-bottom-10">
                    {['👍', '❤️', '😂', '😮', '😢', '🔥'].map(emoji => (
                      <button key={emoji} onClick={() => handleReaction(showEmojiPicker, emoji)} className="w-14 h-14 flex items-center justify-center hover:bg-blue-50 rounded-2xl text-3xl transition-all hover:scale-125 hover:rotate-6 shadow-sm">{emoji}</button>
                    ))}
                    <div className="w-full flex justify-between px-2">
                       <button onClick={() => setShowEmojiPicker(null)} className="px-8 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs">إلغاء</button>
                       {messages.find(m => m.id === showEmojiPicker)?.senderId === profile?.uid && (
                         <button onClick={() => { handleDeleteMessage(showEmojiPicker); setShowEmojiPicker(null); }} className="px-8 py-3 bg-red-50 text-red-600 rounded-2xl font-black text-xs flex items-center gap-2"><Trash2 size={16} /> حذف</button>
                       )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-50/20 text-center space-y-6">
             <div className="w-32 h-32 bg-white rounded-[3.5rem] flex items-center justify-center text-blue-100 shadow-2xl"><User size={64} opacity={0.2} /></div>
             <div><h3 className="text-xl md:text-2xl font-black text-slate-800">صندوق المحادثات</h3><p className="text-slate-400 font-bold text-xs">تواصل آمن وسريع مع المعلمين</p></div>
             <button className="px-8 py-4 bg-white border border-slate-200 rounded-[2.5rem] text-slate-500 font-black text-[11px] flex items-center gap-2 shadow-sm"><ShieldCheck size={18} className="text-blue-500" /> تواصل مشفر بالكامل</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;