import React from 'react';
import { Navigate, Outlet } from 'react-router';
import { useAuthStore } from '../stores/authStore.js';
import type { UserRole } from '@sales-app/shared';

interface AuthGuardProps {
  allowedRoles?: UserRole[];
  children?: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ allowedRoles, children }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'admin' ? '/tabs/dashboard' : '/tabs/dashboard'} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
