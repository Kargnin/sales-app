import React from 'react';
import { Navigate, Outlet } from 'react-router';
import { useAuthStore } from '../stores/authStore.js';

interface GuestGuardProps {
  children?: React.ReactNode;
}

export const GuestGuard: React.FC<GuestGuardProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (isAuthenticated && user) {
    return <Navigate to={user.role === 'admin' ? '/tabs/dashboard' : '/tabs/dashboard'} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
