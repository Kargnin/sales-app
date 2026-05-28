import { IonIcon } from '@ionic/react';
import { storefrontOutline } from 'ionicons/icons';
import type { FC } from 'react';

interface VisitRowProps {
  initials: string;
  name: string;
  shopName: string;
  status: 'completed' | 'in-progress';
  time: string;
}

export const VisitRow: FC<VisitRowProps> = ({ initials, name, shopName, status, time }) => (
  <div className="visit-row">
    <div className="visit-avatar">{initials}</div>
    <div className="visit-info">
      <div className="visit-name">{name}</div>
      <div className="visit-shop">
        <IonIcon icon={storefrontOutline} style={{ fontSize: 12 }} />
        {shopName}
      </div>
    </div>
    <span className={`visit-status ${status}`}>
      {status === 'completed' ? 'Completed' : 'In Progress'}
    </span>
    <span className="visit-time">{time}</span>
  </div>
);
