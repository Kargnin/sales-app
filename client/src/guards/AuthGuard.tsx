import React from 'react';
import { Navigate, Outlet } from 'react-router';
import { useAuthStore } from '../stores/authStore.js';
import type { UserRole } from '@sales-app/shared';

interface AuthGuardProps {
  allowedRoles?: UserRole[];
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect based on their role if they don't have permission for this route
    return <Navigate to={user.role === 'admin' ? '/admin' : '/salesman'} replace />;
  }

  return <Outlet />;
};
