import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotificationsPage } from '../pages/Notifications.js';
import { useNotificationStore } from '../stores/notificationStore.js';
import { useAuthStore } from '../stores/authStore.js';
import { apiClient } from '../api/client.js';
import { toast } from 'sonner';

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../api/client.js', () => ({
  apiClient: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

let mockUser = {
  id: 'user-admin-1',
  username: 'admin_test',
  tenantId: 'tenant-1',
  role: 'admin' as const,
  email: 'admin_test@example.com',
  phone: '1234567890',
  status: 'active' as const,
  createdAt: new Date(),
};

const paginatedResponsePage1 = {
  notifications: [
    { id: 'notif-1', tenantId: 'tenant-1', userId: 'user-admin-1', title: 'New Order Received', message: 'Shop North Star Foods ordered items', type: 'new_order', isRead: false, relatedEntityId: 'order-123', createdAt: new Date().toISOString() },
    { id: 'notif-2', tenantId: 'tenant-1', userId: 'user-admin-1', title: 'Outlet Approved', message: 'Shop South Star Foods approved', type: 'shop_approval', isRead: true, relatedEntityId: 'shop-456', createdAt: new Date(Date.now() - 3600000).toISOString() },
  ],
  pagination: {
    totalCount: 12,
    totalPages: 2,
    currentPage: 1,
    limit: 10,
  },
};

const paginatedResponsePage2 = {
  notifications: [
    { id: 'notif-11', tenantId: 'tenant-1', userId: 'user-admin-1', title: 'New Visit Visit', message: 'Salesman checked into Shop A', type: 'new_visit', isRead: false, relatedEntityId: 'salesman-789', createdAt: new Date(Date.now() - 7200000).toISOString() },
  ],
  pagination: {
    totalCount: 12,
    totalPages: 2,
    currentPage: 2,
    limit: 10,
  },
};

const testQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
      staleTime: 0,
    },
  },
});

describe('NotificationsPage Paginated TDD Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    testQueryClient.clear();
    
    // Set Zustand authStore state directly
    useAuthStore.setState({ 
      user: mockUser,
      token: 'mock-token',
      isAuthenticated: true
    });

    // Reset notificationStore state
    useNotificationStore.setState({
      notifications: [],
      unreadCount: 2,
    });

    // Setup direct global mock overrides
    vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
      console.log('--- TDD DEBUG: global mock get called with URL:', url);
      if (url.includes('page=')) {
        if (url.includes('page=1')) {
          return { data: paginatedResponsePage1 } as any;
        }
        if (url.includes('page=2')) {
          return { data: paginatedResponsePage2 } as any;
        }
        return { data: { notifications: [], pagination: { totalCount: 0, totalPages: 1, currentPage: 1, limit: 10 } } } as any;
      }
      // Non-paginated fallback (flat array)
      return { data: paginatedResponsePage1.notifications } as any;
    });

    vi.mocked(apiClient.patch).mockResolvedValue({ data: { success: true } } as any);
  });

  it('renders title, overview cards, and paginated notifications from page 1', async () => {
    render(
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter>
          <NotificationsPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Header checks
    expect(screen.getByText('Notifications Control Centre')).toBeInTheDocument();
    
    // Overview metric
    await waitFor(() => {
      expect(screen.getByText(/Total Records:/i)).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText(/Page/i)).toBeInTheDocument();
      const pageElements = screen.getAllByText('1');
      expect(pageElements.length).toBeGreaterThan(0);
    });

    // Content cards
    expect(screen.getByText('New Order Received')).toBeInTheDocument();
    expect(screen.getByText('Shop North Star Foods ordered items')).toBeInTheDocument();
    expect(screen.getByText('Outlet Approved')).toBeInTheDocument();
  });

  it('navigates to the second page when the Next button is clicked', async () => {
    render(
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter>
          <NotificationsPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Wait for load
    await screen.findByText('New Order Received');

    // Find and click the Next pagination button
    const nextBtn = screen.getByRole('button', { name: /Next/i });
    expect(nextBtn).toBeEnabled();
    fireEvent.click(nextBtn);

    // Should query page 2
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/notifications?page=2&limit=10');
    });

    // Verify page 2 content loaded
    await waitFor(() => {
      expect(screen.getByText('New Visit Visit')).toBeInTheDocument();
      expect(screen.queryByText('New Order Received')).not.toBeInTheDocument();
    });
  });

  it('marks a notification read and triggers correct navigation targets on click', async () => {
    const markAsReadSpy = vi.spyOn(useNotificationStore.getState(), 'markAsRead');
    
    render(
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter>
          <NotificationsPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Wait for load
    const unreadNotifCard = await screen.findByText('New Order Received');
    fireEvent.click(unreadNotifCard);

    // Assert markAsRead called for the correct id
    expect(markAsReadSpy).toHaveBeenCalledWith('notif-1');

    // Assert navigate was called with correct path for order_status / new_order relatedEntityId
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/order/order-123');
    });
  });

  it('allows user to trigger Mark All Read and triggers api patch successfully', async () => {
    const markAllAsReadSpy = vi.spyOn(useNotificationStore.getState(), 'markAllAsRead');

    render(
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter>
          <NotificationsPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await screen.findByText('New Order Received');

    const markAllBtn = screen.getByRole('button', { name: /Mark All Read/i });
    fireEvent.click(markAllBtn);

    await waitFor(() => {
      expect(markAllAsReadSpy).toHaveBeenCalled();
      expect(apiClient.patch).toHaveBeenCalledWith('/notifications/mark-all-read');
      expect(toast.success).toHaveBeenCalledWith('All notifications marked as read');
    });
  });
});
