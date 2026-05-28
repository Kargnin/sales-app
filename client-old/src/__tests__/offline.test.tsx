import { vi, describe, it, expect, beforeEach } from 'vitest';

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { SalesmanDashboard } from '../pages/salesman/SalesmanDashboard.js';
import { useOfflineStore } from '../stores/offlineStore.js';
import { useAppStore } from '../stores/appStore.js';
import { useAuthStore } from '../stores/authStore.js';
import { apiClient } from '../api/client.js';
import { toast } from 'sonner';

// Permanently mock Sonner toast methods to prevent rendering/timing issues in test environment
toast.error = vi.fn();
toast.success = vi.fn();
toast.warning = vi.fn();
toast.loading = vi.fn();
toast.dismiss = vi.fn();

// Mock Geolocation browser API
const mockGeolocation = {
  getCurrentPosition: vi.fn().mockImplementation((success) =>
    success({
      coords: {
        latitude: 18.9750,
        longitude: 72.8258,
        accuracy: 15,
      },
    } as any)
  ),
};
vi.stubGlobal('navigator', {
  geolocation: mockGeolocation,
});

// Mock Auth State
const mockUser = {
  id: 'salesman-1',
  username: 'salesman_test',
  email: 'salesman@soap.corp',
  phone: '9876543210',
  role: 'salesman' as const,
  status: 'active' as const,
  tenantId: 'tenant-1',
  tenantName: 'Soap Corp',
  createdAt: new Date(),
};

// Mock Auth Store to bypass persist middleware in tests
const mockAuthStoreInstance = {
  user: mockUser,
  token: 'fake-jwt-token',
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
};

vi.mock('../stores/authStore.js', () => ({
  useAuthStore: Object.assign(
    () => mockAuthStoreInstance,
    {
      getState: () => mockAuthStoreInstance,
      setState: (update: any) => Object.assign(mockAuthStoreInstance, update),
      subscribe: vi.fn(),
    }
  ),
}));

vi.mock('../../stores/authStore.js', () => ({
  useAuthStore: Object.assign(
    () => mockAuthStoreInstance,
    {
      getState: () => mockAuthStoreInstance,
      setState: (update: any) => Object.assign(mockAuthStoreInstance, update),
      subscribe: vi.fn(),
    }
  ),
}));
// Permanently mock apiClient methods to prevent any accidental real network requests
apiClient.post = vi.fn();
apiClient.get = vi.fn().mockResolvedValue({ data: [] });

describe('Offline Synchronization & UI Blocking Tests (TDD)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(apiClient.post).mockReset();
    vi.mocked(apiClient.get).mockReset();
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] });
    vi.mocked(toast.error).mockReset();
    vi.mocked(toast.success).mockReset();
    vi.mocked(toast.warning).mockReset();
    vi.mocked(toast.loading).mockReset();
    vi.mocked(toast.dismiss).mockReset();
    localStorage.clear();
    
    // Reset stores to default state
    useOfflineStore.setState({
      isOnline: true,
      queue: [],
    });
    useAppStore.setState({
      shops: [
        {
          id: 'shop-approved',
          tenantId: 'tenant-1',
          name: 'Approved Shop',
          ownerName: 'Owner Approved',
          phone: '9876543210',
          address: 'Pune',
          latitude: '18.9750',
          longitude: '72.8258',
          status: 'approved',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'shop-pending',
          tenantId: 'tenant-1',
          name: 'Pending Shop',
          ownerName: 'Owner Pending',
          phone: '9876543211',
          address: 'Pune',
          latitude: '18.9750',
          longitude: '72.8258',
          status: 'pending_approval',
          createdAt: new Date().toISOString(),
        },
      ],
      orders: [],
      visits: [],
      products: [
        {
          id: 'prod-soap',
          tenantId: 'tenant-1',
          name: 'Sandalwood Soap',
          sku: 'SOAP-SANDAL',
          price: '25.00',
          stockQuantity: 100,
          createdAt: new Date().toISOString(),
        },
      ],
      isLoadingShops: false,
      isLoadingOrders: false,
      isLoadingProducts: false,
    });
    useAuthStore.setState({
      user: mockUser,
      token: 'fake-jwt-token',
      isAuthenticated: true,
    });
  });

  describe('1. Optimistic Offline Writes', () => {
    it('queues ADD_SHOP operation when offline and adds optimistic pending shop to app store', async () => {
      useOfflineStore.setState({ isOnline: false });

      const newShopData = {
        name: 'Offline Shop',
        ownerName: 'Owner Offline',
        phone: '9998887776',
        address: 'Pune',
        latitude: 18.9750,
        longitude: 72.8258,
      };

      const result = await useAppStore.getState().addShop(newShopData);

      // Verify result has temp ID
      expect(result.id).toContain('temp_shop_');
      expect(result.status).toBe('pending_approval');
      
      // Verify shop is stored optimisticly in Zustand
      const shops = useAppStore.getState().shops;
      const optShop = shops.find(s => s.id === result.id);
      expect(optShop).toBeDefined();
      expect((optShop as any).offline).toBe(true);

      // Verify action is queued
      const queue = useOfflineStore.getState().queue;
      expect(queue.length).toBe(1);
      expect(queue[0].type).toBe('ADD_SHOP');
      expect(queue[0].payload.name).toBe('Offline Shop');
      expect(queue[0].tempId).toBe(result.id);
    });

    it('queues ADD_ORDER operation when offline and adds optimistic pending order to app store', async () => {
      useOfflineStore.setState({ isOnline: false });

      const newOrderData = {
        shopId: 'shop-approved',
        items: [{ productId: 'prod-soap', quantity: 2, unitPrice: 25.00 }],
      };

      const result = await useAppStore.getState().addOrder(newOrderData);

      // Verify result has temp ID
      expect(result.id).toContain('temp_order_');
      expect(result.status).toBe('pending_approval');
      expect(result.paymentStatus).toBe('unpaid');
      expect(result.totalAmount).toBe('50.00');

      // Verify order is stored optimisticly in Zustand
      const orders = useAppStore.getState().orders;
      const optOrder = orders.find(o => o.id === result.id);
      expect(optOrder).toBeDefined();
      expect((optOrder as any).offline).toBe(true);

      // Verify action is queued
      const queue = useOfflineStore.getState().queue;
      expect(queue.length).toBe(1);
      expect(queue[0].type).toBe('ADD_ORDER');
      expect(queue[0].tempId).toBe(result.id);
    });

    it('queues ADD_VISIT operation when offline and adds optimistic visit to app store', async () => {
      useOfflineStore.setState({ isOnline: false });

      const newVisitData = {
        shopId: 'shop-approved',
        latitude: 18.9750,
        longitude: 72.8258,
        notes: 'Mobile check-in',
      };

      const result = await useAppStore.getState().addVisit(newVisitData);

      expect(result.id).toContain('temp_visit_');

      // Verify visit is stored optimisticly in Zustand
      const visits = useAppStore.getState().visits;
      const optVisit = visits.find(v => v.id === result.id);
      expect(optVisit).toBeDefined();
      expect((optVisit as any).offline).toBe(true);

      // Verify action is queued
      const queue = useOfflineStore.getState().queue;
      expect(queue.length).toBe(1);
      expect(queue[0].type).toBe('ADD_VISIT');
      expect(queue[0].tempId).toBe(result.id);
    });
  });

  describe('2. Sequential Syncing & Temporary ID Resolution', () => {
    it('syncs queue sequentially and resolves temp shop ID in dependent actions', async () => {
      // Setup mock API success responses
      const mockServerShop = { id: 'real-shop-999', name: 'Offline Shop', status: 'pending_approval' };
      const mockServerOrder = { id: 'real-order-888', shopId: 'real-shop-999', totalAmount: '50.00' };

      vi.mocked(apiClient.post).mockImplementation(async (url, data) => {
        if (url === '/shops') return { data: mockServerShop };
        if (url === '/orders') return { data: mockServerOrder };
        return { data: {} };
      });

      // Build queue with dependency: Order is placed for a temporary shop
      const tempShopId = 'temp_shop_12345';
      const shopPayload = { name: 'Offline Shop', phone: '9876543210' };
      const orderPayload = { shopId: tempShopId, items: [{ productId: 'prod-soap', quantity: 2, unitPrice: 25.00 }] };

      // Queue actions
      useOfflineStore.setState({
        queue: [
          { id: '1', type: 'ADD_SHOP', payload: shopPayload, tempId: tempShopId, createdAt: new Date().toISOString() },
          { id: '2', type: 'ADD_ORDER', payload: orderPayload, tempId: 'temp_order_abc', createdAt: new Date().toISOString() },
        ],
      });

      // Put optimistic values into store
      useAppStore.setState({
        shops: [{ id: tempShopId, name: 'Offline Shop', phone: '9876543210', status: 'pending_approval' } as any],
        orders: [{ id: 'temp_order_abc', shopId: tempShopId, totalAmount: '50.00', status: 'pending_approval' } as any],
      });

      // Trigger sync
      await useOfflineStore.getState().syncQueue();

      // Verify queue is empty after successful sync
      expect(useOfflineStore.getState().queue.length).toBe(0);

      // Verify API was called with the resolved shopId in orders post!
      expect(apiClient.post).toHaveBeenNthCalledWith(1, '/shops', shopPayload);
      expect(apiClient.post).toHaveBeenNthCalledWith(2, '/orders', {
        shopId: 'real-shop-999',
        items: [{ productId: 'prod-soap', quantity: 2, unitPrice: 25.00 }],
      });

      // Verify Zustand stores are updated
      const shops = useAppStore.getState().shops;
      const orders = useAppStore.getState().orders;
      expect(shops.find(s => s.id === tempShopId)).toBeUndefined();
      expect(shops.find(s => s.id === 'real-shop-999')).toBeDefined();
      expect(orders.find(o => o.id === 'temp_order_abc')).toBeUndefined();
      expect(orders.find(o => o.id === 'real-order-888')).toBeDefined();
    });
  });

  describe('3. Conflict Resolution & Validation Failures', () => {
    it('skips and removes failing item from queue when receiving a 400 Bad Request error', async () => {
      // Mock validation error for shop, success for order
      const mockZodError = {
        response: {
          status: 400,
          data: { error: 'Validation failed', details: { phone: { _errors: ['Phone number must be 10 digits'] } } },
        },
      };

      vi.mocked(apiClient.post).mockImplementation(async (url) => {
        if (url === '/shops') throw mockZodError;
        return { data: { id: 'real-order-success' } };
      });

      useOfflineStore.setState({
        queue: [
          { id: '1', type: 'ADD_SHOP', payload: { name: 'Invalid Shop' }, tempId: 'temp_shop_123', createdAt: new Date().toISOString() },
          { id: '2', type: 'ADD_ORDER', payload: { shopId: 'shop-approved', items: [] }, tempId: 'temp_order_123', createdAt: new Date().toISOString() },
        ],
      });

      await useOfflineStore.getState().syncQueue();

      // Queue should be empty since shop failed permanently and was skipped, and order succeeded!
      expect(useOfflineStore.getState().queue.length).toBe(0);

      // Verify error toast was raised
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Validation failed'));
    });

    it('cascades deletion of downstream items depending on a permanently failed shop', async () => {
      const mockZodError = { response: { status: 400, data: { error: 'Validation failed' } } };
      vi.mocked(apiClient.post).mockRejectedValueOnce(mockZodError);

      const tempShopId = 'temp_shop_fail';
      useOfflineStore.setState({
        queue: [
          { id: '1', type: 'ADD_SHOP', payload: { name: 'Failing Shop' }, tempId: tempShopId, createdAt: new Date().toISOString() },
          { id: '2', type: 'ADD_VISIT', payload: { shopId: tempShopId }, tempId: 'temp_visit_1', createdAt: new Date().toISOString() },
          { id: '3', type: 'ADD_ORDER', payload: { shopId: tempShopId }, tempId: 'temp_order_1', createdAt: new Date().toISOString() },
        ],
      });

      await useOfflineStore.getState().syncQueue();

      // Verify all dependent items are removed from queue because the parent shop failed permanently!
      expect(useOfflineStore.getState().queue.length).toBe(0);
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Sync failed permanently'));
    });
  });

  describe('4. UI Checking, State Consistency & Button Blocking', () => {
    it('disables check-in buttons if the selected shop status is not approved', () => {
      render(
        <MemoryRouter initialEntries={['/salesman?tab=shops']}>
          <SalesmanDashboard />
        </MemoryRouter>
      );

      // Verify check-in button for pending shop (second in list) is disabled
      const checkinButtons = screen.getAllByRole('button', { name: 'Check-in' });
      const approvedCheckinBtn = checkinButtons[0];
      const pendingCheckinBtn = checkinButtons[1];

      expect(approvedCheckinBtn).not.toBeDisabled();
      expect(pendingCheckinBtn).toBeDisabled();
    });

    it('blocks submitting order if active shop is not approved or order is empty', () => {
      render(
        <MemoryRouter initialEntries={['/salesman?tab=shops']}>
          <SalesmanDashboard />
        </MemoryRouter>
      );

      // Open the order drawer for the pending shop (second in list)
      const orderButtons = screen.getAllByRole('button', { name: 'Order' });
      fireEvent.click(orderButtons[1]);

      // Verify that Submit Order button in the drawer is disabled when the order is empty
      const submitOrderBtn = screen.getByRole('button', { name: /Submit Order/i });
      expect(submitOrderBtn).toBeDisabled();
    });
  });
});
