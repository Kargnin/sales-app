import React from 'react';
import { Navigate, Outlet } from 'react-router';
import { useAuthStore } from '../stores/authStore.js';

export const GuestGuard: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();

  if (isAuthenticated && user) {
    // Redirect authenticated users to their corresponding dashboard
    return <Navigate to={user.role === 'admin' ? '/admin' : '/salesman'} replace />;
  }

  return <Outlet />;
};
