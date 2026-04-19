import React, { useEffect, useState } from 'react';
import { useBranding } from '../../context/BrandingContext';

/**
 * UnifiedSplash - واجهة البداية الموحدة
 * تعرض محتوى جذاب يشبه واجهة الطالب لبضع ثوانٍ قبل الدخول للتطبيق
 */
const UnifiedSplash: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [phase, setPhase] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const { branding } = useBranding();

  // Phases timeline (optimized for fast startup):
  // Phase 0 (0-0.5s): شعار + اسم المنصة
  // Phase 1 (0.5-1.0s): عرض عناصر واجهة الطالب (محاكاة)
  // Phase 2 (1.0-1.3s): انتقالية مع رسالة ترحيب
  // Phase 3 (1.5s+): Fade out وتسليم التحكم

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => {
        setIsVisible(false);
        setTimeout(onComplete, 200);
      }, 1300),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div
      style={{ backgroundColor: branding.primaryColor }}
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-400 ${
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
      }`}
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating Orbs */}
        <div
          className="absolute top-[15%] left-[10%] w-32 h-32 rounded-full opacity-10 animate-float-slow"
          style={{ background: `radial-gradient(circle, ${branding.secondaryColor}, transparent)` }}
        />
        <div
          className="absolute bottom-[20%] right-[15%] w-24 h-24 rounded-full opacity-10 animate-float-medium"
          style={{ background: `radial-gradient(circle, #fff, transparent)` }}
        />
        <div
          className="absolute top-[60%] left-[20%] w-20 h-20 rounded-full opacity-10 animate-float-fast"
          style={{ background: `radial-gradient(circle, ${branding.secondaryColor}, transparent)` }}
        />

        {/* Grid Pattern Overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-2xl mx-4">
        
        {/* PHASE 0: Logo + Brand */}
        <div
          className={`transition-all duration-500 ${
            phase === 0 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8 absolute inset-0'
          }`}
        >
          <div className="flex flex-col items-center">
            {/* Logo with Glow */}
            <div className="relative mb-6">
              <div
                className="absolute inset-0 rounded-3xl blur-xl opacity-40 animate-pulse"
                style={{ backgroundColor: branding.secondaryColor }}
              />
              <div
                className="relative w-28 h-28 rounded-3xl flex items-center justify-center p-4"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}
              >
                <img
                  src={branding.logoUrl}
                  alt="Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/150/ffffff/000000?text=E';
                  }}
                />
              </div>
            </div>

            {/* Platform Name */}
            <h1 className="text-4xl font-black text-white tracking-wider mb-2">
              {branding.platformName}
            </h1>
            <p className="text-white/60 text-sm font-semibold tracking-[0.15em]">
              المنصة التعليمية الذكية
            </p>

            {/* Progress Bar */}
            <div className="mt-8 w-48 h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all ease-out"
                style={{
                  width: phase >= 1 ? '100%' : '33%',
                  transitionDuration: '500ms',
                  background: `linear-gradient(90deg, ${branding.secondaryColor}, ${branding.secondaryColor}88)`
                }}
              />
            </div>
          </div>
        </div>

        {/* PHASE 1: Student UI Preview Mockup */}
        <div
          className={`transition-all duration-500 ${
            phase === 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 absolute inset-0'
          }`}
        >
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6">
            {/* Header Mockup */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white/70" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z"/>
                  </svg>
                </div>
                <div>
                  <div className="h-3 w-24 bg-white/20 rounded-full mb-1" />
                  <div className="h-2 w-16 bg-white/10 rounded-full" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/10" />
                <div className="w-8 h-8 rounded-lg bg-white/10" />
              </div>
            </div>

            {/* Cards Grid Mockup */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-white/5 rounded-2xl p-3 animate-pulse"
                  style={{ animationDelay: `${i * 0.15}s` }}
                >
                  <div className="h-12 rounded-xl bg-white/10 mb-2" />
                  <div className="h-2 w-3/4 bg-white/15 rounded-full mb-1" />
                  <div className="h-2 w-1/2 bg-white/10 rounded-full" />
                </div>
              ))}
            </div>

            {/* Progress Section Mockup */}
            <div className="bg-white/5 rounded-2xl p-4">
              <div className="flex justify-between items-center mb-3">
                <div className="h-3 w-20 bg-white/20 rounded-full" />
                <div className="h-2 w-12 bg-white/10 rounded-full" />
              </div>
              <div className="flex gap-2">
                <div className="flex-1 h-16 rounded-xl bg-white/10" />
                <div className="flex-1 h-16 rounded-xl bg-white/10" />
                <div className="flex-1 h-16 rounded-xl bg-white/10" />
              </div>
            </div>

            {/* Bottom Nav Mockup */}
            <div className="flex justify-center gap-6 mt-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className={`w-6 h-6 rounded-lg ${i === 0 ? 'bg-white/20' : 'bg-white/10'}`} />
                  <div className="h-1.5 w-8 bg-white/10 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* PHASE 2: Welcome Message */}
        <div
          className={`transition-all duration-500 ${
            phase === 2 ? 'opacity-100 scale-100' : 'opacity-0 scale-95 absolute inset-0'
          }`}
        >
          <div className="text-center">
            {/* Success Icon */}
            <div className="relative inline-flex mb-6">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${branding.secondaryColor}20` }}
              >
                <svg
                  className="w-10 h-10"
                  style={{ color: branding.secondaryColor }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                    className="animate-draw-check"
                  />
                </svg>
              </div>
              <div
                className="absolute inset-0 rounded-full animate-ping opacity-20"
                style={{ backgroundColor: branding.secondaryColor }}
              />
            </div>

            {/* Welcome Text */}
            <h2 className="text-2xl font-black text-white mb-2">
              مرحباً بك
            </h2>
            <p className="text-white/60 text-sm mb-6">
              جاري تحضير بيئة التعلم الخاصة بك
            </p>

            {/* Final Progress */}
            <div className="w-56 h-1.5 bg-white/10 rounded-full mx-auto overflow-hidden">
              <div
                className="h-full rounded-full animate-progress-fill"
                style={{
                  background: `linear-gradient(90deg, ${branding.secondaryColor}, ${branding.secondaryColor}88)`
                }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          25% { transform: translateY(-20px) translateX(10px); }
          50% { transform: translateY(-10px) translateX(-15px); }
          75% { transform: translateY(-30px) translateX(5px); }
        }
        @keyframes float-medium {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          33% { transform: translateY(-25px) translateX(-10px); }
          66% { transform: translateY(-15px) translateX(20px); }
        }
        @keyframes float-fast {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-35px); }
        }
        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }
        .animate-float-medium {
          animation: float-medium 6s ease-in-out infinite;
        }
        .animate-float-fast {
          animation: float-fast 4s ease-in-out infinite;
        }
        @keyframes progress-fill {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .animate-progress-fill {
          animation: progress-fill 0.8s ease-out forwards;
        }
        @keyframes draw-check {
          0% { stroke-dasharray: 24; stroke-dashoffset: 24; }
          100% { stroke-dashoffset: 0; }
        }
        .animate-draw-check {
          stroke-dasharray: 24;
          animation: draw-check 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default UnifiedSplash;
