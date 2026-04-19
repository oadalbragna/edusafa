/**
 * EduSafa Learning - Reusable Loading Components
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  text,
  fullScreen = false,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const content = (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-brand-600`} />
      {text && (
        <p className="text-sm font-bold text-slate-600 animate-pulse">{text}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return content;
};

interface LoadingSkeletonProps {
  type?: 'text' | 'card' | 'list' | 'table' | 'avatar';
  count?: number;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  type = 'text',
  count = 1,
  className = ''
}) => {
  const skeletons = [];

  for (let i = 0; i < count; i++) {
    skeletons.push(
      <div key={i} className={`animate-pulse ${className}`}>
        {type === 'text' && (
          <>
            <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          </>
        )}

        {type === 'card' && (
          <div className="bg-white rounded-2xl p-6 border border-slate-100">
            <div className="h-4 bg-slate-200 rounded w-1/4 mb-4"></div>
            <div className="h-6 bg-slate-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2 mb-4"></div>
            <div className="flex gap-2">
              <div className="h-8 bg-slate-200 rounded w-20"></div>
              <div className="h-8 bg-slate-200 rounded w-20"></div>
            </div>
          </div>
        )}

        {type === 'list' && (
          <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-100">
            <div className="w-12 h-12 bg-slate-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-slate-200 rounded w-1/2"></div>
            </div>
          </div>
        )}

        {type === 'table' && (
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <div className="flex gap-4">
                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
              </div>
            </div>
            <div className="p-4 space-y-4">
              {[1, 2, 3].map(row => (
                <div key={row} className="flex gap-4">
                  <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {type === 'avatar' && (
          <div className="w-12 h-12 bg-slate-200 rounded-full"></div>
        )}
      </div>
    );
  }

  return <>{skeletons}</>;
};

interface PageLoaderProps {
  message?: string;
}

export const PageLoader: React.FC<PageLoaderProps> = ({ message = 'جاري التحميل...' }) => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <LoadingSpinner size="lg" text={message} />
    </div>
  );
};

interface InlineLoaderProps {
  text?: string;
}

export const InlineLoader: React.FC<InlineLoaderProps> = ({ text = 'جاري التحميل...' }) => {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
      <span className="text-sm font-bold text-slate-600">{text}</span>
    </div>
  );
};

export default LoadingSpinner;
