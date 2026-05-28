import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router';
import { IonApp } from '@ionic/react';
import { Login } from './pages/auth/Login.js';
import { Register } from './pages/auth/Register.js';
import { SalesmanSelfRegister } from './pages/auth/SalesmanSelfRegister.js';
import { PublicInvoice } from './pages/orders/PublicInvoice.js';
import { useAuthStore } from './stores/authStore.js';
import { AppShell } from './components/layout/AppShell.js';
import {
  TabsLayout,
  DashboardTabPage,
  ShopsTabPage,
  OrdersTabPage,
  CatalogTabPage,
  ShopDetailPage,
  OrderDetailPage,
  EmployeeDetailPage,
  ProductDetailPage,
  ProfilePageWrapper,
  NotificationsPageWrapper,
} from './components/layout/AppShell.js';
import { Toaster } from './components/ui/sonner.js';

// ── Guest layout (centered form for login/register) ──

const GuestLayout: React.FC = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100dvh',
    padding: '24px 16px',
    background: '#fbfaf9',
    fontFamily: 'Inter, sans-serif',
  }}>
    <div style={{ textAlign: 'center', marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
        <svg viewBox="0 0 32 32" width="32" height="32">
          <circle cx="16" cy="16" r="14" fill="#ff3e00" opacity="0.12" />
          <circle cx="16" cy="16" r="9" fill="#ff3e00" opacity="0.08" />
          <circle cx="12" cy="13" r="2" fill="#121212" />
          <circle cx="20" cy="13" r="2" fill="#121212" />
          <path d="M12 19 Q16 23 20 19" stroke="#121212" strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color: '#121212', margin: 0 }}>
          SalesApp
        </h1>
      </div>
      <p style={{ fontSize: 14, color: '#848281', margin: 0 }}>
        Multi-Tenant Sales & Order Management
      </p>
    </div>
    <Outlet />
  </div>
);

const PublicInvoiceLayout: React.FC = () => (
  <div style={{ background: '#fbfaf9', fontFamily: 'Inter, sans-serif', minHeight: '100dvh' }}>
    <PublicInvoice />
  </div>
);

// ── Route guards ──

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const GuestOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/tabs/dashboard" replace />;
  return <>{children}</>;
};

// ── Root layout ──

const RootLayout: React.FC = () => {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <AppShell />;
  }

  // Unauthenticated: guest flow with centered layout
  return <GuestLayout />;
};

// ── Router (single root, one source of truth) ──

const router = createBrowserRouter([
  // Public (no auth required)
  { path: '/orders/confirm/:token', element: <PublicInvoiceLayout /> },
  // Everything else under single root
  {
    path: '/',
    element: <RootLayout />,
    children: [
      // Guest routes
      { path: 'login', element: <GuestOnly><Login /></GuestOnly> },
      { path: 'register', element: <GuestOnly><Register /></GuestOnly> },
      { path: 'register/salesman', element: <GuestOnly><SalesmanSelfRegister /></GuestOnly> },
      // Authenticated routes
      {
        path: 'tabs',
        element: <RequireAuth><TabsLayout /></RequireAuth>,
        children: [
          { path: 'dashboard', element: <DashboardTabPage /> },
          { path: 'shops', element: <ShopsTabPage /> },
          { path: 'orders', element: <OrdersTabPage /> },
          { path: 'catalog', element: <CatalogTabPage /> },
        ],
      },
      { path: 'shop/:shopId', element: <RequireAuth><ShopDetailPage /></RequireAuth> },
      { path: 'order/:orderId', element: <RequireAuth><OrderDetailPage /></RequireAuth> },
      { path: 'admin/employee/:employeeId', element: <RequireAuth><EmployeeDetailPage /></RequireAuth> },
      { path: 'admin/product/:productId', element: <RequireAuth><ProductDetailPage /></RequireAuth> },
      { path: 'profile', element: <RequireAuth><ProfilePageWrapper /></RequireAuth> },
      { path: 'notifications', element: <RequireAuth><NotificationsPageWrapper /></RequireAuth> },
      // Default redirect
      { index: true, element: <Navigate to="/login" replace /> },
    ],
  },
]);

// ── Mount ──

function App() {
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'sales-app-auth') {
        useAuthStore.persist.rehydrate();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    let unsub: (() => void) | undefined;
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
    } else {
      unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (unsub) unsub();
    };
  }, []);

  if (!hydrated) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100dvh', background: '#fbfaf9', fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 32 }}>⏳</span>
          <span style={{ fontSize: 14, color: '#848281', fontWeight: 500 }}>Restoring session...</span>
        </div>
      </div>
    );
  }

  return (
    <IonApp>
      <RouterProvider router={router} />
      <Toaster closeButton position="top-right" />
    </IonApp>
  );
}

export default App;
