import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useNotificationStore } from '../stores/notificationStore.js';
import { useAuthStore } from '../stores/authStore.js';
import { apiClient } from '../api/client.js';
import { LocalNotifications } from '@capacitor/local-notifications';

// Mock dependencies
vi.mock('../api/client.js', () => ({
  apiClient: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    checkPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
    requestPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
    schedule: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../stores/authStore.js', () => ({
  useAuthStore: {
    getState: vi.fn().mockReturnValue({
      user: { id: 'user-1', username: 'admin_test', role: 'admin' },
    }),
  },
}));

const mockNotifications = [
  {
    id: 'notif-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    title: 'New Outlet Added',
    message: 'Outlet Soap Star requires approval.',
    type: 'shop_approval' as const,
    isRead: false,
    relatedEntityId: 'shop-1',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'notif-2',
    tenantId: 'tenant-1',
    userId: 'user-1',
    title: 'Order Placed',
    message: 'New order for ₹500 placed.',
    type: 'new_order' as const,
    isRead: false,
    relatedEntityId: 'order-1',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'notif-3',
    tenantId: 'tenant-1',
    userId: 'user-1',
    title: 'System Alert',
    message: 'System upgrade completed.',
    type: 'system' as const,
    isRead: true,
    relatedEntityId: null,
    createdAt: new Date().toISOString(),
  },
];

describe('Zustand notificationStore Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset store state
    useNotificationStore.setState({
      notifications: [],
      unreadCount: 0,
      isPolling: false,
      pollingIntervalId: null,
      lastNotifiedIds: [],
    });
  });

  it('early returns on fetchNotifications if no authenticated user is logged in', async () => {
    vi.mocked(useAuthStore.getState).mockReturnValueOnce({ user: null } as any);

    await useNotificationStore.getState().fetchNotifications();

    expect(apiClient.get).not.toHaveBeenCalled();
    expect(useNotificationStore.getState().notifications).toEqual([]);
    expect(useNotificationStore.getState().unreadCount).toBe(0);
  });

  it('fetches notifications, calculates unread counts, and triggers Capacitor local push alerts', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockNotifications });

    await useNotificationStore.getState().fetchNotifications();

    const state = useNotificationStore.getState();
    expect(apiClient.get).toHaveBeenCalledWith('/notifications?limit=5');
    expect(state.notifications).toEqual(mockNotifications);
    
    // Mock notifications has 2 unread (notif-1 and notif-2) and 1 read (notif-3)
    expect(state.unreadCount).toBe(2);

    // Verify Capacitor push permissions are queried and notifications scheduled
    expect(LocalNotifications.checkPermissions).toHaveBeenCalled();
    expect(LocalNotifications.schedule).toHaveBeenCalledWith({
      notifications: expect.arrayContaining([
        expect.objectContaining({ title: 'New Outlet Added', body: 'Outlet Soap Star requires approval.' }),
        expect.objectContaining({ title: 'Order Placed', body: 'New order for ₹500 placed.' }),
      ]),
    });

    // Verify lastNotifiedIds contains the unread notification IDs
    expect(state.lastNotifiedIds).toContain('notif-1');
    expect(state.lastNotifiedIds).toContain('notif-2');
  });

  it('does not trigger a second local notification for unread alerts that were already scheduled', async () => {
    // Prime the store with notified IDs
    useNotificationStore.setState({ lastNotifiedIds: ['notif-1', 'notif-2'] });

    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockNotifications });

    await useNotificationStore.getState().fetchNotifications();

    const state = useNotificationStore.getState();
    expect(state.unreadCount).toBe(2);
    // Should NOT schedule local push because they are present in lastNotifiedIds
    expect(LocalNotifications.schedule).not.toHaveBeenCalled();
  });

  it('marks a single notification as read in the API and updates the local state cleanly', async () => {
    // Populate the store
    useNotificationStore.setState({
      notifications: mockNotifications,
      unreadCount: 2,
    });

    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { success: true } });

    await useNotificationStore.getState().markAsRead('notif-1');

    expect(apiClient.patch).toHaveBeenCalledWith('/notifications/notif-1/read');

    const state = useNotificationStore.getState();
    const target = state.notifications.find(n => n.id === 'notif-1');
    expect(target?.isRead).toBe(true);
    // Unread count decrements to 1
    expect(state.unreadCount).toBe(1);
  });

  it('marks all notifications as read in the API and resets unread count to 0 in local state', async () => {
    // Populate the store
    useNotificationStore.setState({
      notifications: mockNotifications,
      unreadCount: 2,
    });

    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { success: true } });

    await useNotificationStore.getState().markAllAsRead();

    expect(apiClient.patch).toHaveBeenCalledWith('/notifications/mark-all-read');

    const state = useNotificationStore.getState();
    const hasUnread = state.notifications.some(n => !n.isRead);
    expect(hasUnread).toBe(false);
    expect(state.unreadCount).toBe(0);
  });

  it('manages background polling cycles correctly starting and stopping intervals', () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] });

    // Start polling
    useNotificationStore.getState().startPolling();
    let state = useNotificationStore.getState();
    expect(state.isPolling).toBe(true);
    expect(state.pollingIntervalId).not.toBeNull();

    // Stop polling
    useNotificationStore.getState().stopPolling();
    state = useNotificationStore.getState();
    expect(state.isPolling).toBe(false);
    expect(state.pollingIntervalId).toBeNull();
  });
});
