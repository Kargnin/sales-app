import React, { useMemo } from 'react';
import {
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonFab,
  IonMenuButton,
} from '@ionic/react';
import { useShops } from '../../hooks/useShops.js';
import { useEmployees } from '../../hooks/useEmployees.js';
import { useVisits } from '../../hooks/useVisits.js';
import { useOrders } from '../../hooks/useOrders.js';
import { PageLayout } from '../../components/layout/PageLayout.js';

interface VisitMock {
  id: string;
  salesmanName: string;
  shopName: string;
  status: 'Completed' | 'In Progress';
  visitedAt: string;
}

const MOCK_VISITS: VisitMock[] = [
  {
    id: 'mock-1',
    salesmanName: 'John Doe',
    shopName: 'Corner Market',
    status: 'Completed',
    visitedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  },
  {
    id: 'mock-2',
    salesmanName: 'Alice Smith',
    shopName: 'Downtown Deli',
    status: 'In Progress',
    visitedAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
  },
  {
    id: 'mock-3',
    salesmanName: 'Robert Jones',
    shopName: 'Mega Supermarket',
    status: 'Completed',
    visitedAt: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
  },
];

function getInitials(name: string): string {
  const parts = name.split(' ');
  return parts.map((p) => p[0]).join('').toUpperCase().slice(0, 2);
}

function getTimeStr(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// ── Stitch-style Borderless Stat Card ──

interface StatCardProps {
  value: string;
  label: string;
  valueColor?: string;
  subtext: string;
  subtextIcon: string;
  iconColor: string;
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  value,
  label,
  valueColor,
  subtext,
  subtextIcon,
  iconColor,
  loading,
}) => {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px 0' }}>
        <div style={{ fontSize: '13px', color: 'var(--stitch-text-muted)' }}>{label}</div>
        <IonSpinner name="dots" style={{ color: 'var(--stitch-text-muted)', height: '24px' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '8px 0' }}>
      <div style={{
        fontSize: '13px',
        fontWeight: 400,
        color: 'var(--stitch-text-muted)',
        marginBottom: '4px',
        lineHeight: '1.4',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '32px',
        fontWeight: 600,
        color: valueColor || 'var(--stitch-text-heading)',
        lineHeight: '1.2',
      }}>
        {value}
      </div>
      <div style={{
        fontSize: '13px',
        fontWeight: 500,
        color: iconColor,
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        marginTop: '6px',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'inherit' }}>
          {subtextIcon}
        </span>
        {subtext}
      </div>
    </div>
  );
};

// ── Stitch-style Borderless Visit Row ──

const VisitRow: React.FC<{
  name: string;
  shopName: string;
  status: 'Completed' | 'In Progress';
  time: string;
}> = ({ name, shopName, status, time }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 0',
    borderBottom: '1px solid var(--stitch-stone-border)',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: 'var(--stitch-stone-border, #f2f0ed)',
        color: 'var(--stitch-text-heading)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        fontSize: '15px',
        flexShrink: 0,
      }}>
        {getInitials(name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--stitch-text-heading)', margin: 0 }}>
          {name}
        </div>
        <div style={{
          fontSize: '12px',
          color: 'var(--stitch-text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          marginTop: '2px',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
            storefront
          </span>
          {shopName}
        </div>
      </div>
    </div>
    <div style={{ textAlign: 'right' }}>
      <div style={{
        fontSize: '15px',
        fontWeight: 500,
        color: status === 'Completed' ? 'var(--stitch-text-heading)' : 'var(--stitch-warning, #ffbb26)',
      }}>
        {status}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--stitch-text-muted)', marginTop: '2px' }}>
        {time}
      </div>
    </div>
  </div>
);

// ── Page ──

export const AdminDashboardPage: React.FC = () => {
  const { shops, isLoading: shopsLoading } = useShops();
  const { employees, isLoading: empLoading } = useEmployees();
  const { visits, isLoading: visitsLoading } = useVisits();
  const { orders, isLoading: ordersLoading } = useOrders();

  // Dev-gated fallback loading states. If in local DEV mode with empty databases, 
  // immediately show the Stitch mock values without a loading spinner block.
  const isSalesLoading = (import.meta as any).env?.DEV && orders.length === 0 ? false : ordersLoading;
  const isEmployeesLoading = (import.meta as any).env?.DEV && employees.length === 0 ? false : empLoading;
  const isShopsLoading = (import.meta as any).env?.DEV && shops.length === 0 ? false : shopsLoading;
  const isVisitsLoading = (import.meta as any).env?.DEV && visits.length === 0 ? false : visitsLoading;

  const isPageLoading = (import.meta as any).env?.DEV && orders.length === 0 && shops.length === 0 && visits.length === 0
    ? false
    : (shopsLoading && empLoading && visitsLoading && ordersLoading);

  const totalSales = useMemo(() =>
    orders.filter((o) => o.status !== 'cancelled').reduce((sum, o) => sum + parseFloat(o.totalAmount), 0),
  [orders]);

  const activeSalesmen = useMemo(() =>
    employees.filter((e) => e.role === 'salesman' && e.status === 'active').length,
  [employees]);

  const pendingApprovals = useMemo(() =>
    shops.filter((s) => s.status === 'pending_approval').length,
  [shops]);

  const visitsThisWeek = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return visits.filter((v) => new Date(v.visitedAt) >= weekAgo).length;
  }, [visits]);

  // Dev-gated fallback mock data check
  const useMockVisits = (import.meta as any).env?.DEV && visits.length === 0;
  const displayVisits = useMockVisits ? MOCK_VISITS : (visits as any[]).slice(0, 3);

  const hasData = orders.length > 0 || shops.length > 0 || displayVisits.length > 0;

  const titleNode = (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <IonMenuButton autoHide={false}>
        <div style={{
          position: 'relative',
          width: 40,
          height: 40,
          marginRight: 12,
          borderRadius: '50%',
          overflow: 'hidden',
          border: '1px solid var(--stitch-stone-border)',
          background: 'var(--stitch-surface-elevated, #ffffff)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <img
            alt="Brand mascot illustration"
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.1)', objectPosition: 'top' }}
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBD-5SeaK6Z40ZXXwsqvdwfL4pmlDqpMxSfn4G3eHQUdm2-YtMqQNjx6BotdyMUcpARS3T3QB62nplGtJB6eG3LCdu7qaHUbiJvK5IYuPiyhlqFnyW2Bm-9gFWqR20Np9JGHLgQcNJLV73Afd2D0Y7_YjwFZrFOwVnae3h3TWXeK5Z6nNuvXAuPVYNSYA7IwqFZJI5RHFQ4cfSqs9X0KqzjTDHa929vGGqGajkkfbNyxnLs7MvyG4zR_C1nQH18KcLIh2xoqgDXEPU"
          />
        </div>
      </IonMenuButton>
      <h1 style={{
        fontSize: 23,
        fontWeight: 600,
        color: 'var(--stitch-text-heading)',
        letterSpacing: '-0.44px',
        margin: 0,
        lineHeight: 1.2,
      }}>
        {getGreeting()}, Partner
      </h1>
    </div>
  );

  const rightSlotNode = (
    <div style={{
      width: 40,
      height: 40,
      borderRadius: '50%',
      background: 'var(--stitch-surface-elevated, #ffffff)',
      border: '1px solid var(--stitch-stone-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
    }}>
      <span className="material-symbols-outlined" style={{ color: 'var(--stitch-text-heading)', fontSize: '22px' }}>
        notifications
      </span>
    </div>
  );

  // Dev-gated fallback values for Stats
  const displayTotalSales = (import.meta as any).env?.DEV && orders.length === 0 
    ? '$24.5k' 
    : (totalSales >= 1000 ? `$${(totalSales / 1000).toFixed(1)}k` : `$${totalSales.toFixed(0)}`);
  
  const displayActiveSalesmen = (import.meta as any).env?.DEV && employees.length === 0 
    ? '42' 
    : String(activeSalesmen);

  const displayPendingApprovals = (import.meta as any).env?.DEV && shops.length === 0 
    ? '8' 
    : String(pendingApprovals);

  const displayVisitsCount = (import.meta as any).env?.DEV && visits.length === 0 
    ? '156' 
    : String(visitsThisWeek);

  return (
    <PageLayout title={titleNode} rightSlot={rightSlotNode} hideMenuButton>
      <IonRefresher slot="fixed">
        <IonRefresherContent
          pullingIcon={undefined}
          refreshingSpinner="dots"
          style={{ color: 'var(--stitch-accent)' }}
        />
      </IonRefresher>

      <div style={{ padding: '24px 20px 100px', maxWidth: 800, margin: '0 auto' }}>
        {isPageLoading && !hasData ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: 60,
            gap: 16,
            color: 'var(--stitch-text-muted)',
          }}>
            <IonSpinner name="dots" />
            <span>Loading dashboard...</span>
          </div>
        ) : (
          <>
            {/* ── Overview ── */}
            <h2 style={{
              fontSize: 19,
              fontWeight: 600,
              letterSpacing: '-0.25px',
              color: 'var(--stitch-text-heading)',
              margin: '0 0 20px',
            }}>
              Overview
            </h2>

            {/* ── Stat Cards Grid (2x2) ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '24px 16px',
              marginBottom: 36,
            }}>
              <StatCard
                value={displayTotalSales}
                label="Total Sales"
                subtext="+12%"
                subtextIcon="trending_up"
                iconColor="var(--stitch-success, #00ca48)"
                loading={isSalesLoading}
              />
              <StatCard
                value={displayActiveSalesmen}
                label="Active Salesmen"
                subtext="Online now"
                subtextIcon="group"
                iconColor="var(--stitch-success, #00ca48)"
                loading={isEmployeesLoading}
              />
              <StatCard
                value={displayPendingApprovals}
                label="Pending Approvals"
                valueColor="var(--stitch-warning, #ffbb26)"
                subtext={Number(displayPendingApprovals) > 0 ? 'New shops' : 'All clear'}
                subtextIcon="storefront"
                iconColor="var(--stitch-warning, #ffbb26)"
                loading={isShopsLoading}
              />
              <StatCard
                value={displayVisitsCount}
                label="Total Visits"
                subtext="This week"
                subtextIcon="calendar_today"
                iconColor="var(--stitch-text-muted, #848281)"
                loading={isVisitsLoading}
              />
            </div>

            {/* ── Recent Visits ── */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}>
              <h2 style={{
                fontSize: 19,
                fontWeight: 600,
                letterSpacing: '-0.25px',
                color: 'var(--stitch-text-heading)',
                margin: 0,
              }}>
                Recent Visits
              </h2>
              <a href="/visits" style={{
                fontSize: 15,
                fontWeight: 500,
                color: 'var(--stitch-text-muted)',
                textDecoration: 'none',
              }}>
                View All
              </a>
            </div>

            <div style={{
              background: 'transparent',
              marginBottom: 24,
            }}>
              {displayVisits.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--stitch-text-muted)', fontSize: 14 }}>
                  No visits recorded yet
                </div>
              ) : (
                displayVisits.map((v) => (
                  <VisitRow
                    key={v.id}
                    name={v.salesmanName || 'Unknown'}
                    shopName={v.shopName}
                    status={(v as any).status || 'Completed'}
                    time={getTimeStr(v.visitedAt)}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Floating Action Button ── */}
      <IonFab vertical="bottom" horizontal="end" slot="fixed" style={{ bottom: '24px', right: '20px' }}>
        <a href="/tabs/catalog" style={{ textDecoration: 'none' }}>
          <div style={{
            background: 'var(--stitch-midnight, #121212)',
            color: '#ffffff',
            borderRadius: '9999px',
            padding: '12px 24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex', alignItems: 'center', gap: '8px',
            cursor: 'pointer',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>
              add
            </span>
            <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.2px' }}>New Product</span>
          </div>
        </a>
      </IonFab>
    </PageLayout>
  );
};
