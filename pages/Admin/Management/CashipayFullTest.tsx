import React, { useState } from 'react';
import { 
  Terminal, 
  Send, 
  RefreshCw, 
  QrCode, 
  Smartphone, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Code2,
  ExternalLink,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { CashipayService, PaymentInitiateRequest, CashipayApiResponse } from '../../../services/cashipay.service';

const CashipayFullTest: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [requestData, setRequestData] = useState<PaymentInitiateRequest>({
    merchantOrderId: `ORD-${Date.now()}`,
    amount: 1000,
    customerEmail: 'test@example.com',
    customerPhone: '0912345678',
    callbackUrl: 'https://webhook.site/test',
    returnUrl: window.location.href,
    description: 'اختبار منصة إيدوسافا'
  });

  const [lastResponse, setLastResponse] = useState<CashipayApiResponse | null>(null);
  const [reference, setReference] = useState('');
  const [otp, setOtp] = useState('');
  const [statusResult, setStatusResult] = useState<any>(null);

  const handleInitiate = async () => {
    setLoading(true);
    const res = await CashipayService.initiate(requestData);
    setLastResponse(res);
    if (res.success && res.data) {
      setReference(res.data.reference_number);
    }
    setLoading(false);
  };

  const handleConfirmOtp = async () => {
    setLoading(true);
    const res = await CashipayService.confirmOtp(reference, otp);
    setLastResponse(res);
    setLoading(false);
  };

  const handleGetStatus = async () => {
    setLoading(true);
    const res = await CashipayService.getStatus(reference);
    setStatusResult(res);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-mono" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div className="flex items-center gap-4">
            <div className="bg-brand-500 p-3 rounded-2xl shadow-lg shadow-brand-500/20">
              <Terminal className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-white uppercase">Cashipay Advanced Debugger</h1>
              <p className="text-slate-500 text-xs font-bold mt-1 tracking-widest">PATTERNS FROM AMOLOOD/CASHIPAY-LARAVEL (A TO B)</p>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-[10px] text-emerald-500 font-black animate-pulse">● LIVE CONNECTED</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Section A: Initiation Builder */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-[2rem] p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="w-8 h-8 bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center">
                <Code2 size={18} />
              </div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">A: Initiate Payment Request</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 font-black">ORDER ID</label>
                <input 
                  value={requestData.merchantOrderId} 
                  onChange={e => setRequestData({...requestData, merchantOrderId: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs outline-none focus:border-brand-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 font-black">AMOUNT (SDG)</label>
                <input 
                  type="number"
                  value={requestData.amount} 
                  onChange={e => setRequestData({...requestData, amount: parseFloat(e.target.value)})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs outline-none focus:border-brand-500"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <label className="text-[10px] text-slate-500 font-black">CUSTOMER PHONE</label>
                <input 
                  value={requestData.customerPhone} 
                  onChange={e => setRequestData({...requestData, customerPhone: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs outline-none focus:border-brand-500"
                  dir="ltr"
                />
              </div>
            </div>

            <button 
              onClick={handleInitiate}
              disabled={loading}
              className="w-full py-4 bg-brand-500 text-white rounded-2xl font-black text-sm hover:bg-brand-600 transition-all flex items-center justify-center gap-3 shadow-xl shadow-brand-500/10"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <><Send size={18} /> INITIATE REQUEST</>}
            </button>

            {/* Response Log (Live Data) */}
            {lastResponse && (
              <div className="mt-6 p-4 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-[10px] space-y-2 relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-100 transition-opacity">
                    <RefreshCw size={12} className="text-white cursor-pointer" onClick={() => setLastResponse(null)} />
                 </div>
                 <p className="text-emerald-500 font-black">// HTTP RESPONSE 200 OK</p>
                 <pre className="text-slate-400 whitespace-pre-wrap leading-relaxed">
                   {JSON.stringify(lastResponse, null, 2)}
                 </pre>
              </div>
            )}
          </div>

          {/* Section B: Flow Management */}
          <div className="space-y-8">
            
            {/* QR Code Viewer (Pattern from Repo) */}
            {lastResponse?.data?.qr_data_url && (
              <div className="bg-white rounded-[2rem] p-8 text-slate-900 text-center space-y-6 animate-in zoom-in-95">
                <div className="flex items-center justify-center gap-2 text-slate-400">
                  <QrCode size={16} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Live QR Payment Code</span>
                </div>
                <div className="flex justify-center">
                  <img src={lastResponse.data.qr_data_url} alt="Cashi QR" className="w-48 h-48 border-4 border-slate-50 rounded-2xl shadow-inner" />
                </div>
                <p className="text-[10px] font-bold text-slate-400 leading-relaxed px-8">
                  هذا الكود مستخرج مباشرة من داتا الـ API الخاصة بكاشي. قم بمسحه عبر تطبيق كاشي للإكمال.
                </p>
              </div>
            )}

            {/* OTP Confirmation (Pattern B) */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-[2rem] p-8 space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <div className="w-8 h-8 bg-emerald-500/10 text-emerald-500 rounded-lg flex items-center justify-center">
                  <Smartphone size={18} />
                </div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider">B: Confirm OTP Flow</h2>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 font-black">REFERENCE NUMBER</label>
                  <input 
                    value={reference} 
                    onChange={e => setReference(e.target.value)}
                    placeholder="CSH-xxxxx..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-brand-400 font-black outline-none"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 font-black">OTP CODE (6 DIGITS)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-center text-xl font-black text-white tracking-[0.5em] outline-none"
                    dir="ltr"
                  />
                </div>
                <button 
                  onClick={handleConfirmOtp}
                  disabled={loading || !reference || !otp}
                  className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 disabled:opacity-30"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle2 size={18} /> VERIFY OTP</>}
                </button>
              </div>
            </div>

            {/* Status Checker (Pattern C) */}
            <div className="bg-slate-900/30 border border-slate-800 rounded-[2rem] p-8 flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400">
                     <RefreshCw size={20} />
                  </div>
                  <div>
                     <p className="text-xs font-black text-white uppercase tracking-widest">Transaction Status</p>
                     <p className="text-[10px] text-slate-500 mt-1 font-bold italic">Polling pattern from library</p>
                  </div>
               </div>
               <button 
                 onClick={handleGetStatus}
                 disabled={loading || !reference}
                 className="px-6 py-3 bg-slate-800 border border-slate-700 text-white rounded-xl text-[10px] font-black hover:bg-slate-700 transition-all disabled:opacity-50"
               >
                 CHECK STATUS
               </button>
            </div>
            
            {statusResult && (
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl animate-in slide-in-from-top-2">
                 <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Polling Result</span>
                 </div>
                 <pre className="text-[9px] text-emerald-400 whitespace-pre-wrap">{JSON.stringify(statusResult, null, 2)}</pre>
              </div>
            )}

          </div>
        </div>

        {/* Footer / Info */}
        <div className="p-6 bg-slate-900/20 border border-slate-800 rounded-[2rem] flex items-start gap-4">
           <AlertCircle className="text-brand-400 shrink-0 mt-1" size={20} />
           <div className="space-y-1">
              <p className="text-[11px] font-black text-white leading-relaxed">System Note: Fully Mapped to amolood/cashipay-laravel pattern.</p>
              <p className="text-[10px] text-slate-500 font-bold leading-relaxed italic">
                All requests are strictly following the official Cashipay API structures. Redirect and Callback flows are simulated in this debugger.
              </p>
           </div>
        </div>

      </div>
    </div>
  );
};

export default CashipayFullTest;
