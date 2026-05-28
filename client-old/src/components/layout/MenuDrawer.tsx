import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonIcon,
  IonBadge,
} from '@ionic/react';
import {
  gridOutline,
  storefrontOutline,
  cartOutline,
  bookOutline,
  timeOutline,
  peopleOutline,
  checkmarkCircleOutline,
  settingsOutline,
  helpCircleOutline,
  logOutOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';
import { useAuthStore } from '../../stores/authStore.js';
import { useNavigate, useLocation } from 'react-router';
import './AppShell.css';

interface MenuDrawerProps {
  onNav: () => void;
}

export const MenuDrawer: React.FC<MenuDrawerProps> = ({ onNav }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const role = user?.role;

  const handleNav = (path: string) => {
    navigate(path);
    onNav();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  const primaryItems = [
    { label: 'Dashboard', icon: gridOutline, path: '/tabs/dashboard' },
    { label: 'Shops', icon: storefrontOutline, path: '/tabs/shops' },
    { label: 'Orders', icon: cartOutline, path: '/tabs/orders' },
    { label: 'Catalog', icon: bookOutline, path: '/tabs/catalog' },
    { label: 'Visit History', icon: timeOutline, path: '/visits' },
  ];

  const adminItems = [
    { label: 'Team Management', icon: peopleOutline, path: '/admin/team' },
    { label: 'Shop Approvals', icon: checkmarkCircleOutline, path: '/admin/approvals' },
  ];

  const secondaryItems = [
    { label: 'Settings', icon: settingsOutline, path: '/profile' },
    { label: 'Support', icon: helpCircleOutline, path: '/support' },
  ];

  return (
    <>
      <IonHeader className="ion-no-border">
        <IonToolbar className="menu-toolbar">
          <div className="menu-mascot-container">
            <div className="menu-mascot">
              {/* Wobbly blob mascot placeholder - replace with actual asset */}
              <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="mascot-svg">
                <circle cx="32" cy="32" r="28" fill="#ff3e00" opacity="0.12" />
                <circle cx="32" cy="32" r="18" fill="#ff3e00" opacity="0.08" />
                <circle cx="24" cy="26" r="3" fill="#121212" />
                <circle cx="40" cy="26" r="3" fill="#121212" />
                <path d="M24 38 Q32 46 40 38" stroke="#121212" strokeWidth="3" strokeLinecap="round" fill="none" />
              </svg>
            </div>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent className="menu-content">
        {/* User Profile */}
        <div className="menu-profile" onClick={() => handleNav('/profile')}>
          <div className="menu-avatar">
            {user?.username?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="menu-profile-info">
            <span className="menu-username">{user?.username}</span>
            <span className="menu-role">
              <IonIcon icon={shieldCheckmarkOutline} />
              {role === 'admin' ? 'Admin' : 'Salesman'}
            </span>
          </div>
        </div>

        <IonList lines="none" className="menu-list">
          {/* Primary Navigation */}
          <IonListHeader className="menu-section-header">Navigation</IonListHeader>
          {primaryItems.map((item) => (
            <IonItem
              key={item.path}
              button
              detail={false}
              onClick={() => handleNav(item.path)}
              className={`menu-item ${isActive(item.path) ? 'menu-item-active' : ''}`}
            >
              <IonIcon slot="start" icon={item.icon} />
              <IonLabel>{item.label}</IonLabel>
            </IonItem>
          ))}

          {/* Admin-only items */}
          {role === 'admin' && adminItems.map((item) => (
            <IonItem
              key={item.path}
              button
              detail={false}
              onClick={() => handleNav(item.path)}
              className={`menu-item ${isActive(item.path) ? 'menu-item-active' : ''}`}
            >
              <IonIcon slot="start" icon={item.icon} />
              <IonLabel>{item.label}</IonLabel>
            </IonItem>
          ))}
        </IonList>

        <IonList lines="none" className="menu-list menu-secondary">
          <IonListHeader className="menu-section-header">More</IonListHeader>
          {secondaryItems.map((item) => (
            <IonItem
              key={item.path}
              button
              detail={false}
              onClick={() => handleNav(item.path)}
              className="menu-item"
            >
              <IonIcon slot="start" icon={item.icon} />
              <IonLabel>{item.label}</IonLabel>
            </IonItem>
          ))}

          <IonItem
            button
            detail={false}
            onClick={handleLogout}
            className="menu-item menu-item-logout"
          >
            <IonIcon slot="start" icon={logOutOutline} />
            <IonLabel>Logout</IonLabel>
          </IonItem>
        </IonList>
      </IonContent>
    </>
  );
};
