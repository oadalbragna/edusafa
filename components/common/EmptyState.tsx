/**
 * EduSafa Learning - Empty State Component
 */

import React from 'react';

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      {Icon && (
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
          <Icon className="w-10 h-10 text-slate-300" />
        </div>
      )}
      
      <h3 className="text-xl font-bold text-slate-700 mb-2">{title}</h3>
      
      {description && (
        <p className="text-slate-500 font-medium text-sm max-w-md mb-6">
          {description}
        </p>
      )}
      
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-3 bg-brand-500 text-white rounded-xl font-bold text-sm
                     hover:bg-brand-600 transition-all active:scale-95
                     shadow-lg shadow-brand-500/20"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

/**
 * Pre-configured empty states for common scenarios
 */

export const NoDataEmptyState: React.FC<{ onRefresh?: () => void }> = ({ onRefresh }) => (
  <EmptyState
    icon={({ className, ...props }) => (
      <svg className={className} {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )}
    title="لا توجد بيانات"
    description="لا توجد بيانات لعرضها حالياً. حاول تحديث الصفحة أو العودة لاحقاً."
    actionLabel="تحديث"
    onAction={onRefresh}
  />
);

export const NoResultsEmptyState: React.FC<{ onClear?: () => void }> = ({ onClear }) => (
  <EmptyState
    icon={({ className, ...props }) => (
      <svg className={className} {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    )}
    title="لا توجد نتائج"
    description="لم يتم العثور على نتائج تطابق بحثك. حاول استخدام كلمات مختلفة."
    actionLabel="مسح البحث"
    onAction={onClear}
  />
);

export const NoPermissionsEmptyState: React.FC = () => (
  <EmptyState
    icon={({ className, ...props }) => (
      <svg className={className} {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    )}
    title="ليس لديك صلاحية"
    description="ليس لديك الصلاحية للوصول إلى هذا القسم. يرجى التواصل مع المسؤول."
  />
);

export const NoNotificationsEmptyState: React.FC = () => (
  <EmptyState
    icon={({ className, ...props }) => (
      <svg className={className} {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    )}
    title="لا توجد إشعارات"
    description="لا توجد إشعارات جديدة حالياً. سنقوم بإعلامك عند وصول إشعارات جديدة."
  />
);

export const NoMessagesEmptyState: React.FC = () => (
  <EmptyState
    icon={({ className, ...props }) => (
      <svg className={className} {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    )}
    title="لا توجد رسائل"
    description="ابدأ محادثة جديدة أو تحقق لاحقاً للرسائل الواردة."
  />
);

export default EmptyState;
