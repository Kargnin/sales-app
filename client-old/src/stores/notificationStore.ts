import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '../api/client.js';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useAuthStore } from './authStore.js';

export interface AppNotification {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  message: string;
  type: 'shop_approval' | 'order_status' | 'system' | 'new_order' | 'new_visit';
  isRead: boolean;
  relatedEntityId: string | null;
  createdAt: string;
}

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  isPolling: boolean;
  pollingIntervalId: number | null;
  lastNotifiedIds: string[];

  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      isPolling: false,
      pollingIntervalId: null,
      lastNotifiedIds: [], // Keep track of notifications we already fired a local popup for

      fetchNotifications: async () => {
        try {
          const authUser = useAuthStore.getState().user;
          if (!authUser) return; // Don't fetch if not logged in

          const response = await apiClient.get('/notifications?limit=5');
          const fetchedNotifications: AppNotification[] = response.data;
          
          const unreadCount = fetchedNotifications.filter((n) => !n.isRead).length;

          // Trigger Local Notifications for NEW unread ones
          const { lastNotifiedIds } = get();
          const newUnread = fetchedNotifications.filter(
            (n) => !n.isRead && !lastNotifiedIds.includes(n.id)
          );

          if (newUnread.length > 0) {
            try {
              const permStatus = await LocalNotifications.checkPermissions();
              let hasPermission = permStatus.display === 'granted';
              
              if (!hasPermission && permStatus.display !== 'denied') {
                const request = await LocalNotifications.requestPermissions();
                hasPermission = request.display === 'granted';
              }

              if (hasPermission) {
                await LocalNotifications.schedule({
                  notifications: newUnread.map((n, i) => ({
                    title: n.title,
                    body: n.message,
                    id: new Date().getTime() + i, // Unique int ID for capacitor
                    schedule: { at: new Date(Date.now() + 100) }, // Trigger immediately
                  })),
                });
              }
            } catch (err) {
              console.warn('Local notifications failed or not available in this environment', err);
            }

            // Update local memory of notified IDs
            const updatedNotifiedIds = [
              ...lastNotifiedIds,
              ...newUnread.map((n) => n.id),
            ].slice(-100); // Keep last 100

            set({
              notifications: fetchedNotifications,
              unreadCount,
              lastNotifiedIds: updatedNotifiedIds,
            });
          } else {
            set({
              notifications: fetchedNotifications,
              unreadCount,
            });
          }
        } catch (error) {
          console.error('Failed to fetch notifications:', error);
        }
      },

      markAsRead: async (id: string) => {
        try {
          await apiClient.patch(`/notifications/${id}/read`);
          set((state) => {
            const updated = state.notifications.map((n) =>
              n.id === id ? { ...n, isRead: true } : n
            );
            return {
              notifications: updated,
              unreadCount: updated.filter((n) => !n.isRead).length,
            };
          });
        } catch (error) {
          console.error('Failed to mark notification as read:', error);
        }
      },

      markAllAsRead: async () => {
        try {
          await apiClient.patch('/notifications/mark-all-read');
          set((state) => ({
            notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
            unreadCount: 0,
          }));
        } catch (error) {
          console.error('Failed to mark all as read:', error);
        }
      },

      startPolling: () => {
        const { isPolling, pollingIntervalId } = get();
        if (isPolling) return; // already polling

        // Fetch immediately, then every 15 seconds
        get().fetchNotifications();
        const id = window.setInterval(() => {
          get().fetchNotifications();
        }, 15000);

        set({ isPolling: true, pollingIntervalId: id as unknown as number });
      },

      stopPolling: () => {
        const { pollingIntervalId } = get();
        if (pollingIntervalId) {
          clearInterval(pollingIntervalId);
        }
        set({ isPolling: false, pollingIntervalId: null });
      },
    }),
    {
      name: 'sales-app-notifications',
      partialize: (state) => ({
        lastNotifiedIds: state.lastNotifiedIds, // Persist what we've notified
      }),
    }
  )
);
