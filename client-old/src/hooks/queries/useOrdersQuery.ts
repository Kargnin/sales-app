import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { onlineManager } from '@tanstack/react-query';
import { apiClient } from '../../api/client.js';
import { useOfflineStore } from '../../stores/offlineStore.js';
import { useAuthStore } from '../../stores/authStore.js';
import { orderKeys } from '../../lib/queryKeys.js';
import type { Order } from '../../types/domain.js';

// ── Queries ──────────────────────────────────────────────

export function useOrders() {
  return useQuery({
    queryKey: orderKeys.lists(),
    queryFn: () => apiClient.get('/orders').then((res) => res.data as Order[]),
    staleTime: 5 * 60 * 1000,
  });
}

export function useOrdersByShop(shopId: string | undefined) {
  return useQuery({
    queryKey: orderKeys.byShop(shopId!),
    queryFn: () => apiClient.get(`/orders/shop/${shopId}`).then((res) => res.data as Order[]),
    enabled: !!shopId,
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: orderKeys.detail(id!),
    queryFn: () => apiClient.get(`/orders/${id}`).then((res) => res.data as Order),
    enabled: !!id,
  });
}

// ── Mutations ────────────────────────────────────────────

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      shopId: string;
      items: Array<{ productId: string; quantity: number; unitPrice: number }>;
    }) => apiClient.post('/orders', data).then((res) => res.data as Order),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

export function useCreateOrderOffline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      shopId: string;
      items: Array<{ productId: string; quantity: number; unitPrice: number }>;
    }) => {
      const isOnline = onlineManager.isOnline();
      if (!isOnline) {
        const { queueAction } = useOfflineStore.getState();
        const tempId = `temp_order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const totalAmount = data.items
          .reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
          .toFixed(2);
        const authUser = useAuthStore.getState().user;
        const offlineOrder: Order = {
          id: tempId,
          tenantId: authUser?.tenantId || '',
          shopId: data.shopId,
          salesmanId: authUser?.id || null,
          orderSource: 'salesman',
          status: 'pending_approval',
          paymentStatus: 'unpaid',
          totalAmount,
          createdAt: new Date().toISOString(),
        };
        queueAction('ADD_ORDER', data, tempId);
        return offlineOrder;
      }
      const res = await apiClient.post('/orders', data);
      return res.data as Order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, paymentData }: {
      orderId: string;
      paymentData: { amountPaid: number; paymentMethod: 'cash' | 'upi' | 'bank_transfer'; notes?: string };
    }) => apiClient.post(`/orders/${orderId}/payments`, paymentData).then((res) => res.data as Order),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

export function useMarkOrderPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, paymentMethod }: {
      orderId: string;
      paymentMethod: 'cash' | 'upi' | 'bank_transfer';
    }) => apiClient.post(`/orders/${orderId}/mark-paid`, { paymentMethod }).then((res) => res.data as Order),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}
