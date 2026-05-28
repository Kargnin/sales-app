import React, { ReactNode } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonContent,
  IonMenuButton,
} from '@ionic/react';

interface PageLayoutProps {
  title?: ReactNode;
  rightSlot?: ReactNode;
  children: ReactNode;
  contentStyle?: React.CSSProperties;
  hideMenuButton?: boolean;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  title,
  rightSlot,
  children,
  contentStyle,
  hideMenuButton = false,
}) => {
  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '8px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {!hideMenuButton && (
                <IonMenuButton style={{ color: 'var(--stitch-text-heading)', marginLeft: '-8px' }} />
              )}
              {title}
            </div>
            <div>
              {rightSlot}
            </div>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent style={contentStyle}>
        {children}
      </IonContent>
    </IonPage>
  );
};
