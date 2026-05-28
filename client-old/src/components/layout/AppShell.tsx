import { useRef } from 'react';
import { Outlet, useLocation } from 'react-router';
import {
  IonSplitPane,
  IonMenu,
  IonRouterOutlet,
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonLabel,
} from '@ionic/react';
import { useAuthStore } from '../../stores/authStore.js';
import { MenuDrawer } from './MenuDrawer.js';
import { AdminDashboardPage } from '../../features/dashboard/AdminDashboardPage.js';
import { SalesmanDashboardPage } from '../../features/dashboard/SalesmanDashboardPage.js';
import { ProfilePage } from '../../pages/Profile.js';
import { NotificationsPage } from '../../pages/Notifications.js';
import { AdminShopDetails } from '../../pages/admin/AdminShopDetails.js';
import { AdminOrderDetails } from '../../pages/admin/AdminOrderDetails.js';
import { AdminEmployeeDetails } from '../../pages/admin/AdminEmployeeDetails.js';
import { AdminProductDetails } from '../../pages/admin/AdminProductDetails.js';
import './AppShell.css';

import { PageLayout } from './PageLayout.js';

// ── Tab Placeholder Pages ──

const ShopsTabPage: React.FC = () => (
  <PageLayout title={<h1 style={{ margin: 0, fontSize: 23, fontWeight: 600, color: 'var(--stitch-text-heading)' }}>Shops</h1>}>
    <div className="page-padding">
      <h2 className="greeting-text">Shops</h2>
      <p className="greeting-subtitle">Coming soon...</p>
    </div>
  </PageLayout>
);

const OrdersTabPage: React.FC = () => (
  <PageLayout title={<h1 style={{ margin: 0, fontSize: 23, fontWeight: 600, color: 'var(--stitch-text-heading)' }}>Orders</h1>}>
    <div className="page-padding">
      <h2 className="greeting-text">Orders</h2>
      <p className="greeting-subtitle">Coming soon...</p>
    </div>
  </PageLayout>
);

const CatalogTabPage: React.FC = () => (
  <PageLayout title={<h1 style={{ margin: 0, fontSize: 23, fontWeight: 600, color: 'var(--stitch-text-heading)' }}>Catalog</h1>}>
    <div className="page-padding">
      <h2 className="greeting-text">Product Catalog</h2>
      <p className="greeting-subtitle">Coming soon...</p>
    </div>
  </PageLayout>
);

// ── Dashboard Tab ──

const DashboardTabPage: React.FC = () => {
  const { user } = useAuthStore();
  return user?.role === 'admin' ? <AdminDashboardPage /> : <SalesmanDashboardPage />;
};

// ── Detail Pages (outside tabs, inside menu shell) ──

const ShopDetailPage: React.FC = () => (
  <PageLayout title={<h1 style={{ margin: 0, fontSize: 23, fontWeight: 600, color: 'var(--stitch-text-heading)' }}>Shop Details</h1>}>
    <div className="page-padding"><AdminShopDetails /></div>
  </PageLayout>
);

const OrderDetailPage: React.FC = () => (
  <PageLayout title={<h1 style={{ margin: 0, fontSize: 23, fontWeight: 600, color: 'var(--stitch-text-heading)' }}>Order Details</h1>}>
    <div className="page-padding"><AdminOrderDetails /></div>
  </PageLayout>
);

const EmployeeDetailPage: React.FC = () => (
  <PageLayout title={<h1 style={{ margin: 0, fontSize: 23, fontWeight: 600, color: 'var(--stitch-text-heading)' }}>Employee</h1>}>
    <div className="page-padding"><AdminEmployeeDetails /></div>
  </PageLayout>
);

const ProductDetailPage: React.FC = () => (
  <PageLayout title={<h1 style={{ margin: 0, fontSize: 23, fontWeight: 600, color: 'var(--stitch-text-heading)' }}>Product</h1>}>
    <div className="page-padding"><AdminProductDetails /></div>
  </PageLayout>
);

const ProfilePageWrapper: React.FC = () => (
  <PageLayout title={<h1 style={{ margin: 0, fontSize: 23, fontWeight: 600, color: 'var(--stitch-text-heading)' }}>Profile</h1>}>
    <div className="page-padding"><ProfilePage /></div>
  </PageLayout>
);

const NotificationsPageWrapper: React.FC = () => (
  <PageLayout title={<h1 style={{ margin: 0, fontSize: 23, fontWeight: 600, color: 'var(--stitch-text-heading)' }}>Notifications</h1>}>
    <div className="page-padding"><NotificationsPage /></div>
  </PageLayout>
);

// ── Tabs Layout ──

export const TabsLayout: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const getTabClass = (path: string) => {
    const isActive = currentPath === path;
    return `flex flex-col items-center justify-center w-full h-full select-none ${
      isActive ? 'text-[var(--stitch-accent)]' : 'text-[var(--stitch-text-muted)]'
    }`;
  };

  const getIconStyle = (path: string) => {
    const isActive = currentPath === path;
    return isActive ? { fontVariationSettings: "'FILL' 1" } : {};
  };

  return (
    <IonTabs>
      <IonRouterOutlet>
        <Outlet />
      </IonRouterOutlet>
      <IonTabBar slot="bottom">
        <IonTabButton tab="dashboard" href="/tabs/dashboard" className="flex-1 h-full">
          <div className={getTabClass('/tabs/dashboard')}>
            <span className="material-symbols-outlined text-[24px] pointer-events-none" style={getIconStyle('/tabs/dashboard')}>dashboard</span>
            <span className="text-[12px] font-medium mt-1 pointer-events-none">Dashboard</span>
          </div>
        </IonTabButton>
        <IonTabButton tab="shops" href="/tabs/shops" className="flex-1 h-full">
          <div className={getTabClass('/tabs/shops')}>
            <span className="material-symbols-outlined text-[24px] pointer-events-none" style={getIconStyle('/tabs/shops')}>storefront</span>
            <span className="text-[12px] font-medium mt-1 pointer-events-none">Shops</span>
          </div>
        </IonTabButton>
        <IonTabButton tab="orders" href="/tabs/orders" className="flex-1 h-full">
          <div className={getTabClass('/tabs/orders')}>
            <span className="material-symbols-outlined text-[24px] pointer-events-none" style={getIconStyle('/tabs/orders')}>shopping_cart</span>
            <span className="text-[12px] font-medium mt-1 pointer-events-none">Orders</span>
          </div>
        </IonTabButton>
        <IonTabButton tab="catalog" href="/tabs/catalog" className="flex-1 h-full">
          <div className={getTabClass('/tabs/catalog')}>
            <span className="material-symbols-outlined text-[24px] pointer-events-none" style={getIconStyle('/tabs/catalog')}>menu_book</span>
            <span className="text-[12px] font-medium mt-1 pointer-events-none">Catalog</span>
          </div>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>
  );
};

// ── App Shell (menu + split pane + router outlet) ──

export const AppShell: React.FC = () => {
  const menuRef = useRef<HTMLIonMenuElement>(null);
  const closeMenu = () => menuRef.current?.close();

  return (
    <IonSplitPane contentId="main" when="md">
        <IonMenu ref={menuRef} contentId="main" side="start" type="overlay" className="app-menu">
          <MenuDrawer onNav={closeMenu} />
        </IonMenu>

        <IonRouterOutlet id="main">
          <Outlet />
        </IonRouterOutlet>
      </IonSplitPane>
  );
};

// Re-export page components for use in router config
export {
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
};
