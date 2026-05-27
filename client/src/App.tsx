import React from 'react';
import { RouterProvider, createHashRouter, Routes, Route, Navigate } from 'react-router';
import { Login } from './pages/auth/Login.js';
import { Register } from './pages/auth/Register.js';
import { SalesmanSelfRegister } from './pages/auth/SalesmanSelfRegister.js';
import { AdminDashboard } from './pages/admin/AdminDashboard.js';
import { AdminShopDetails } from './pages/admin/AdminShopDetails.js';
import { AdminEmployeeDetails } from './pages/admin/AdminEmployeeDetails.js';
import { AdminOrderDetails } from './pages/admin/AdminOrderDetails.js';
import { AdminProductDetails } from './pages/admin/AdminProductDetails.js';
import { SalesmanDashboard } from './pages/salesman/SalesmanDashboard.js';
import { PublicInvoice } from './pages/orders/PublicInvoice.js';
import { AuthGuard } from './guards/AuthGuard.js';
import { GuestGuard } from './guards/GuestGuard.js';
import { useAuthStore } from './stores/authStore.js';
import { SidebarLayout } from './components/layout/SidebarLayout.js';
import { Toaster } from './components/ui/sonner.js';
import { ProfilePage } from './pages/Profile.js';
import { NotificationsPage } from './pages/Notifications.js';
import { RouteErrorFallback } from './components/ui/RouteErrorFallback.js';

function AppContent() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <div className="app-shell bg-[#050806] min-h-screen text-slate-100 font-sans">
      <Routes>
        {/* Public Unauthenticated Invoice Page */}
        <Route path="/orders/confirm/:token" element={<PublicInvoice />} />

        {/* Authenticated App shell & Guest Pages */}
        <Route
          path="/*"
          element={
            !isAuthenticated ? (
              <div className="guest-container">
                <header className="guest-header">
                  <div className="guest-logo">
                    <span className="guest-logo-icon">🧼</span>
                    <h1>SalesApp</h1>
                  </div>
                  <p className="guest-tagline">Multi-Tenant Sales & Order Management</p>
                </header>

                <Routes>
                  <Route element={<GuestGuard />}>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/register/salesman" element={<SalesmanSelfRegister />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
              </div>
            ) : (
              <SidebarLayout>
                <Routes>
                  <Route element={<AuthGuard allowedRoles={['admin']} />}>
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/admin/employee/:employeeId" element={<AdminEmployeeDetails />} />
                    <Route path="/admin/product/:productId" element={<AdminProductDetails />} />
                  </Route>
                  <Route element={<AuthGuard allowedRoles={['admin', 'salesman']} />}>
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/shop/:shopId" element={<AdminShopDetails />} />
                    <Route path="/order/:orderId" element={<AdminOrderDetails />} />
                    <Route path="/notifications" element={<NotificationsPage />} />
                  </Route>
                  <Route element={<AuthGuard allowedRoles={['salesman']} />}>
                    <Route path="/salesman" element={<SalesmanDashboard />} />
                  </Route>
                  <Route
                    path="/"
                    element={
                      <Navigate to={user?.role === 'admin' ? '/admin' : '/salesman'} replace />
                    }
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </SidebarLayout>
            )
          }
        />
      </Routes>
      <Toaster closeButton position="top-right" />
    </div>
  );
}

// Create a static Hash Router Instance wrapping AppContent
const router = createHashRouter([
  {
    path: '*',
    element: <AppContent />,
    errorElement: <RouteErrorFallback />,
  },
]);

function App() {
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    // Sync session state across multiple tabs/windows via localStorage changes
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'sales-app-auth') {
        useAuthStore.persist.rehydrate();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    let unsub: (() => void) | undefined;

    // Check if already hydrated from previous imports
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
    } else {
      // Subscribe to rehydration completion
      unsub = useAuthStore.persist.onFinishHydration(() => {
        setHydrated(true);
      });
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (unsub) {
        unsub();
      }
    };
  }, []);

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#080c0a] text-emerald-400 font-semibold font-sans">
        <div className="flex flex-col items-center gap-3">
          <span className="animate-spin text-3xl">⏳</span>
          <span className="text-sm tracking-wide text-slate-400">Restoring secure session...</span>
        </div>
      </div>
    );
  }

  return <RouterProvider router={router} />;
}

export default App;


