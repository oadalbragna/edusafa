import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Smartphone, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowRight, 
  ShieldCheck, 
  Zap,
  Lock,
  RefreshCw
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CashipayService } from '../../services/cashipay.service';
import { useAuth } from '../../context/AuthContext';

const CashipayPayment: React.FC = () => {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // استخراج البيانات من الرابط (Amount, OrderId)
  const queryParams = new URLSearchParams(location.search);
  const amount = queryParams.get('amount') || '500'; // مبلغ افتراضي للتجربة
  const orderId = queryParams.get('orderId') || `ORD-${Date.now()}`;

  const [step, setStep] = useState<'initiate' | 'otp' | 'success' | 'failed'>('initiate');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState(profile?.phone || '');
  const [otp, setOtp] = useState('');
  const [reference, setReference] = useState<string>('');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // محرك التحقق التلقائي (Auto-Polling)
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (reference && step === 'otp') {
      setIsPolling(true);
      interval = setInterval(async () => {
        try {
          const res = await CashipayService.getStatus(reference);
          if (res.success && res.data?.status === 'COMPLETED') {
            setStep('success');
            clearInterval(interval);
          } else if (res.data?.status === 'FAILED' || res.data?.status === 'EXPIRED') {
            setError('انتهت صلاحية الجلسة أو فشلت العملية. يرجى المحاولة مرة أخرى.');
            setStep('initiate');
            clearInterval(interval);
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 5000); // فحص كل 5 ثوانٍ
    }

    return () => {
      if (interval) clearInterval(interval);
      setIsPolling(false);
    };
  }, [reference, step]);

  const handleInitiate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await CashipayService.initiate({
        amount: parseFloat(amount),
        customerPhone: phone,
        merchantOrderId: orderId,
        customerEmail: profile?.email || 'customer@example.com',
        description: 'رسوم تسجيل طالب جديد - منصة إيدوسافا'
      });

      if (res.success && res.reference) {
        setReference(res.reference);
        if (res.qr_data) setQrCode(res.qr_data);
        setStep('otp');
      } else {
        setError(res.message || 'فشل في بدء عملية الدفع');
      }
    } catch (err) {
      setError('حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) return;
    setLoading(true);
    setError(null);
    try {
      const res = await CashipayService.confirmOtp(reference, otp);
      if (res.success && res.status === 'COMPLETED') {
        setStep('success');
      } else {
        setError(res.message || 'رمز التحقق غير صحيح');
      }
    } catch (err) {
      setError('فشل في التحقق من الرمز');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-md w-full text-center space-y-6 border-t-8 border-emerald-500">
          <div className="flex justify-center">
            <div className="bg-emerald-50 p-6 rounded-full animate-pulse">
              <CheckCircle2 className="w-16 h-16 text-emerald-600" />
            </div>
          </div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">تم الدفع بنجاح!</h2>
          <p className="text-slate-500 font-bold leading-relaxed px-4">
            تم استلام مبلغ <span className="text-emerald-600 font-black">{parseFloat(amount).toLocaleString()} ج.س</span> عبر كاشي. سيتم تفعيل حسابك لحظياً.
          </p>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
            <div className="flex justify-between text-xs font-bold text-slate-400">
              <span>الرقم المرجعي:</span>
              <span className="text-slate-800 font-mono">{reference}</span>
            </div>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="w-full py-5 bg-brand-500 text-white rounded-[2rem] font-black shadow-xl shadow-brand-500/20 hover:bg-brand-600 transition-all flex items-center justify-center gap-2 group"
          >
            العودة للرئيسية
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform rotate-180" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] py-12 px-4" dir="rtl">
      <div className="max-w-xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-brand-500 text-white rounded-[2.5rem] mb-2 shadow-2xl shadow-brand-500/30">
            <CreditCard className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">بوابة كاشي (Cashi)</h1>
          <p className="text-slate-500 font-bold">بوابة الدفع الإلكتروني المتكاملة - Alsoug.com</p>
        </div>

        {/* Step Indicator */}
        <div className="flex justify-center items-center gap-4">
           <div className={`w-3 h-3 rounded-full ${step === 'initiate' ? 'bg-brand-500 animate-ping' : 'bg-brand-200'}`}></div>
           <div className={`h-1 w-12 rounded-full ${step === 'otp' ? 'bg-brand-500' : 'bg-brand-100'}`}></div>
           <div className={`w-3 h-3 rounded-full ${step === 'otp' ? 'bg-brand-500 animate-ping' : 'bg-brand-100'}`}></div>
        </div>

        {/* Payment Card */}
        <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden">
          <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/20 rounded-full -mr-32 -mt-32 blur-3xl"></div>
             <div className="relative z-10 flex justify-between items-center">
                <div>
                   <p className="text-xs font-black text-slate-400 uppercase tracking-widest">إجمالي المبلغ المطلوب</p>
                   <p className="text-4xl font-black mt-1">{parseFloat(amount).toLocaleString()} <span className="text-sm font-bold text-slate-400">ج.س</span></p>
                </div>
                <div className="text-right">
                   <Zap className="text-brand-500 w-8 h-8 ml-auto mb-2" />
                   <p className="text-[10px] font-black uppercase text-brand-400">Secure Payment Gateway</p>
                </div>
             </div>
          </div>

          <div className="p-10 space-y-8">
            {error && (
              <div className="p-4 bg-red-50 border-r-4 border-red-500 text-red-700 flex items-center gap-3 rounded-2xl text-sm font-bold animate-in shake">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            {step === 'initiate' && (
              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-sm font-black text-slate-700 mr-2 flex items-center gap-2">
                       <Smartphone size={16} className="text-brand-500" />
                       رقم الهاتف المسجل في كاشي
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0xxxxxxxxx"
                      className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] font-black text-xl text-slate-800 outline-none focus:ring-4 focus:ring-brand-500/10 transition-all tracking-widest"
                      dir="ltr"
                    />
                 </div>
                 <button
                   onClick={handleInitiate}
                   disabled={loading || !phone}
                   className="w-full py-5 bg-brand-500 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-brand-500/20 hover:bg-brand-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                 >
                   {loading ? <Loader2 className="animate-spin" /> : 'طلب رمز التحقق (OTP)'}
                 </button>
              </div>
            )}

            {step === 'otp' && (
              <div className="space-y-6 animate-in slide-in-from-bottom-4">
                 {qrCode && (
                   <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 text-center space-y-4 mb-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">أو امسح رمز الـ QR للدفع</p>
                      <div className="flex justify-center">
                         <img src={qrCode} alt="QR Code" className="w-40 h-40 rounded-xl shadow-inner border-2 border-white" />
                      </div>
                   </div>
                 )}

                 <div className="text-center space-y-2">
                    <p className="text-sm font-black text-slate-700">أدخل الرمز المرسل لهاتفك</p>
                    <div className="flex items-center justify-center gap-2">
                       <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                       <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">بانتظار تأكيد الدفع تلقائياً...</p>
                    </div>
                    <p className="text-[11px] font-bold text-slate-400 italic">الرمز التجريبي: 123456</p>
                 </div>
                 
                 <div className="flex justify-center gap-2" dir="ltr">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      autoComplete="one-time-code"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-48 text-center py-5 bg-slate-50 border-2 border-brand-100 rounded-[2rem] font-black text-3xl text-brand-600 outline-none focus:ring-4 focus:ring-brand-500/10 transition-all tracking-[0.5em]"
                    />
                 </div>

                 <button
                   onClick={handleVerifyOtp}
                   disabled={loading || otp.length < 5}
                   className="w-full py-5 bg-emerald-500 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-emerald-200 hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                 >
                   {loading ? <Loader2 className="animate-spin" /> : 'تأكيد الدفع الآن'}
                 </button>

                 <button 
                   onClick={() => setStep('initiate')}
                   className="w-full text-xs font-bold text-slate-400 flex items-center justify-center gap-2 hover:text-slate-600"
                 >
                   <RefreshCw size={14} /> إعادة إرسال الرمز أو تغيير الهاتف
                 </button>
              </div>
            )}
          </div>
        </div>

        {/* Safety Badge */}
        <div className="flex flex-col items-center gap-4 py-4">
           <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/5 rounded-full border border-slate-900/10">
              <ShieldCheck className="text-slate-400 w-4 h-4" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">تشفير آمن 256 بت (SSL)</span>
           </div>
           <div className="flex gap-8 grayscale opacity-40">
              <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-6" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-6" />
           </div>
        </div>
      </div>
    </div>
  );
};

export default CashipayPayment;
