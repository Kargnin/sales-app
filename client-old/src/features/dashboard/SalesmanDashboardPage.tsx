import { useMemo } from 'react';
import {
  IonIcon,
  IonButton,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
} from '@ionic/react';
import {
  mapOutline,
  trendingUpOutline,
  checkmarkCircleOutline,
  calendarOutline,
  addOutline,
} from 'ionicons/icons';
import { useShops } from '../../hooks/useShops.js';
import { useVisits } from '../../hooks/useVisits.js';
import { useOrders } from '../../hooks/useOrders.js';
import { useAuthStore } from '../../stores/authStore.js';
import { StatCard } from './components/StatCard.js';
import { VisitRow } from './components/VisitRow.js';
import { PageLayout } from '../../components/layout/PageLayout.js';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}


export const SalesmanDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const { shops, isLoading: shopsLoading } = useShops();
  const { visits, isLoading: visitsLoading } = useVisits();
  const { orders, isLoading: ordersLoading } = useOrders();

  const isLoading = shopsLoading || visitsLoading || ordersLoading;

  const myShops = useMemo(() => shops.filter((s) => s.status === 'approved'), [shops]);

  const myVisitsToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return visits.filter((v) => {
      if (v.salesmanId !== user?.id) return false;
      return new Date(v.visitedAt) >= today;
    }).length;
  }, [visits, user?.id]);

  const myOrdersThisWeek = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return orders.filter((o) => {
      if (o.salesmanId !== user?.id) return false;
      if (o.status === 'cancelled') return false;
      return new Date(o.createdAt) >= weekAgo;
    }).length;
  }, [orders, user?.id]);

  const recentVisits = useMemo(() => {
    return [...visits]
      .filter((v) => v.salesmanId === user?.id)
      .sort((a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime())
      .slice(0, 5);
  }, [visits, user?.id]);

  const pendingOrders = useMemo(() => {
    return orders.filter((o) => {
      if (o.salesmanId !== user?.id) return false;
      return o.status === 'pending_approval' || o.status === 'confirmed';
    }).length;
  }, [orders, user?.id]);

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    return parts.map((p) => p[0]).join('').toUpperCase().slice(0, 2);
  };

  const getTimeStr = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const hasData = shops.length > 0 || visits.length > 0;

  const titleNode = (
    <h1 style={{
      fontSize: 23, fontWeight: 600, color: 'var(--stitch-text-heading)',
      letterSpacing: '-0.44px', margin: 0, lineHeight: 1.2,
    }}>
      My Stats
    </h1>
  );

  if (isLoading && !hasData) {
    return (
      <PageLayout title={titleNode}>
        <div className="state-container">
          <IonSpinner name="dots" />
          <span style={{ color: 'var(--stitch-text-muted)' }}>Loading your stats...</span>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={titleNode}>
      <IonRefresher slot="fixed">
        <IonRefresherContent
          pullingIcon={null}
          refreshingSpinner="dots"
          style={{ color: 'var(--stitch-accent)' }}
        />
      </IonRefresher>

      <div className="page-padding">
        {/* Greeting */}
        <div style={{ marginBottom: 24 }}>
          <h1 className="greeting-text">{getGreeting()}, {user?.username || 'Partner'}</h1>
          <p className="greeting-subtitle">Ready to make your rounds?</p>
        </div>

        {/* KPI Stat Cards */}
        <div className="stats-grid">
          <StatCard
            label="My Shops"
            value={String(myShops.length)}
            subtitle="Active outlets"
            icon={mapOutline}
            iconColor="ember"
            loading={isLoading}
          />
          <StatCard
            label="Visits Today"
            value={String(myVisitsToday)}
            subtitle="Check-ins"
            icon={checkmarkCircleOutline}
            iconColor="success"
            loading={isLoading}
          />
          <StatCard
            label="Pending Orders"
            value={String(pendingOrders)}
            subtitle="Awaiting approval"
            icon={trendingUpOutline}
            iconColor={pendingOrders > 0 ? 'ember' : 'success'}
            loading={isLoading}
          />
          <StatCard
            label="Orders (Week)"
            value={String(myOrdersThisWeek)}
            subtitle="This week"
            icon={calendarOutline}
            iconColor="info"
            loading={isLoading}
          />
        </div>

        {/* Recent Visits */}
        <div className="section-header">
          <h2 className="section-title">Recent Visits</h2>
          <a className="section-link" href="/visits">View All</a>
        </div>

        <div className="stitch-card">
          {recentVisits.length === 0 ? (
            <div className="state-container" style={{ padding: '24px 0' }}>
              <IonIcon
                icon={mapOutline}
                style={{ fontSize: 32, color: 'var(--stitch-text-muted)', opacity: 0.4 }}
              />
              <span style={{ fontSize: 14, color: 'var(--stitch-text-muted)' }}>
                No visits yet today. Time to hit the road!
              </span>
            </div>
          ) : (
            recentVisits.map((v) => (
              <VisitRow
                key={v.id}
                initials={getInitials(v.salesmanName || 'You')}
                name={v.salesmanName || 'You'}
                shopName={v.shopName}
                status="completed"
                time={getTimeStr(v.visitedAt)}
              />
            ))
          )}
        </div>

        {/* Quick Actions */}
        <div className="section-header">
          <h2 className="section-title">Quick Actions</h2>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <IonButton
            routerLink="/tabs/shops"
            color="primary"
            style={{
              '--border-radius': '9999px',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            <IonIcon slot="start" icon={mapOutline} />
            Visit a Shop
          </IonButton>
          <IonButton
            routerLink="/tabs/orders"
            color="secondary"
            style={{
              '--border-radius': '9999px',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            <IonIcon slot="start" icon={addOutline} />
            Place Order
          </IonButton>
        </div>
      </div>
    </PageLayout>
  );
};
