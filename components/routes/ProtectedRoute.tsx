/**
 * EduSafa Learning - Protected Route Component
 * 
 * Wrapper for routes that require authentication and/or specific roles
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requireApproval?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requireApproval = true
}) => {
  const { profile, loading } = useAuth();
  const location = useLocation();

  // Show loading while checking auth
  if (loading) {
    return <LoadingSpinner fullScreen text="جاري التحقق من الصلاحيات..." />;
  }

  // Redirect to login if not authenticated
  if (!profile) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect to pending approval page if account not approved
  if (requireApproval && (profile.status === 'pending' || !profile.status)) {
    if (profile.role !== 'admin' && profile.role !== 'super_admin') {
      return <Navigate to="/pending-approval" replace />;
    }
  }

  // Redirect if account rejected
  if (profile.status === 'rejected') {
    return (
      <Navigate
        to="/login"
        state={{
          from: location,
          error: 'تم رفض حسابك. يرجى التواصل مع الدعم الفني.'
        }}
        replace
      />
    );
  }

  // Check role-based access
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    // Redirect to appropriate dashboard based on user's role
    const roleDashboards: Record<string, string> = {
      admin: '/admin',
      super_admin: '/admin',
      teacher: '/teacher',
      student: '/student',
      parent: '/parent'
    };

    const redirectPath = roleDashboards[profile.role] || '/';
    
    return (
      <Navigate
        to={redirectPath}
        state={{
          from: location,
          error: 'ليس لديك الصلاحية للوصول إلى هذه الصفحة'
        }}
        replace
      />
    );
  }

  // All checks passed, render children
  return <>{children}</>;
};

/**
 * Admin-only route wrapper
 * Also allows teachers if allowSupervisors is true
 */
export const AdminRoute: React.FC<{ children: React.ReactNode; allowSupervisors?: boolean }> = ({ children, allowSupervisors = false }) => {
  const { profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner fullScreen text="جاري التحقق من الصلاحيات..." />;
  }

  if (!profile) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Allow admins and super_admins
  if (profile.role === 'admin' || profile.role === 'super_admin') {
    return <>{children}</>;
  }

  // Allow teachers if allowSupervisors is true
  if (allowSupervisors && profile.role === 'teacher') {
    return <>{children}</>;
  }

  // Redirect to appropriate dashboard
  const roleDashboards: Record<string, string> = {
    admin: '/admin',
    super_admin: '/admin',
    teacher: '/teacher',
    student: '/student',
    parent: '/parent'
  };

  const redirectPath = roleDashboards[profile.role] || '/';

  return (
    <Navigate
      to={redirectPath}
      state={{
        from: location,
        error: 'ليس لديك الصلاحية للوصول إلى هذه الصفحة'
      }}
      replace
    />
  );
};

/**
 * Teacher-only route wrapper
 */
export const TeacherRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ProtectedRoute allowedRoles={['teacher']} requireApproval={true}>
      {children}
    </ProtectedRoute>
  );
};

/**
 * Student-only route wrapper
 */
export const StudentRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ProtectedRoute allowedRoles={['student']} requireApproval={true}>
      {children}
    </ProtectedRoute>
  );
};

/**
 * Parent-only route wrapper
 */
export const ParentRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ProtectedRoute allowedRoles={['parent']} requireApproval={true}>
      {children}
    </ProtectedRoute>
  );
};

/**
 * Route wrapper for pending approval users
 */
export const PendingApprovalRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner fullScreen text="جاري التحميل..." />;
  }

  if (!profile) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Only show pending approval page to users who are actually pending
  if (profile.status !== 'pending' && profile.status !== undefined) {
    const roleDashboards: Record<string, string> = {
      admin: '/admin',
      super_admin: '/admin',
      teacher: '/teacher',
      student: '/student',
      parent: '/parent'
    };
    return <Navigate to={roleDashboards[profile.role] || '/'} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
