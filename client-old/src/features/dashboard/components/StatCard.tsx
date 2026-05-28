import { IonIcon, IonSkeletonText } from '@ionic/react';
import type { FC } from 'react';

interface StatCardProps {
  label: string;
  value: string;
  subtitle?: string;
  icon: string;
  iconColor: 'ember' | 'midnight' | 'success' | 'info';
  trend?: { direction: 'up' | 'down'; value: string };
  loading?: boolean;
}

export const StatCard: FC<StatCardProps> = ({ label, value, subtitle, icon, iconColor, trend, loading }) => {
  if (loading) {
    return (
      <div className="stat-card">
        <IonSkeletonText animated style={{ width: 36, height: 36, borderRadius: 8 }} />
        <IonSkeletonText animated style={{ width: '60%', height: 24 }} />
        <IonSkeletonText animated style={{ width: '40%', height: 12 }} />
      </div>
    );
  }

  return (
    <div className="stat-card">
      <div className={`stat-card-icon ${iconColor}`}>
        <IonIcon icon={icon} />
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">
        {label}
        {subtitle && <span style={{ color: 'var(--stitch-text-muted)', marginLeft: 4 }}>{subtitle}</span>}
      </div>
      {trend && (
        <div className={`stat-badge ${trend.direction}`}>
          {trend.direction === 'up' ? '▲' : '▼'} {trend.value}
        </div>
      )}
    </div>
  );
};
