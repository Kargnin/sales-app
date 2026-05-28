import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { onlineManager } from '@tanstack/react-query';
import { apiClient } from '../../api/client.js';
import { useOfflineStore } from '../../stores/offlineStore.js';
import { useAuthStore } from '../../stores/authStore.js';
import { shopKeys } from '../../lib/queryKeys.js';
import type { Shop } from '../../types/domain.js';

// ── Queries ──────────────────────────────────────────────

export function useShops() {
  return useQuery({
    queryKey: shopKeys.lists(),
    queryFn: () => apiClient.get('/shops').then((res) => res.data as Shop[]),
    staleTime: 5 * 60 * 1000,
  });
}

export function useShop(id: string | undefined) {
  return useQuery({
    queryKey: shopKeys.detail(id!),
    queryFn: () => apiClient.get(`/shops/${id}`).then((res) => res.data as Shop),
    enabled: !!id,
  });
}

// ── Mutations ────────────────────────────────────────────

export function useCreateShop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      ownerName?: string;
      phone: string;
      address?: string;
      latitude?: number;
      longitude?: number;
    }) => apiClient.post('/shops', data).then((res) => res.data as Shop),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shopKeys.all });
    },
  });
}

export function useCreateShopOffline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      ownerName?: string;
      phone: string;
      address?: string;
      latitude?: number;
      longitude?: number;
    }) => {
      const isOnline = onlineManager.isOnline();
      if (!isOnline) {
        const { queueAction } = useOfflineStore.getState();
        const tempId = `temp_shop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const offlineShop: Shop = {
          id: tempId,
          tenantId: useAuthStore.getState().user?.tenantId || '',
          name: data.name,
          ownerName: data.ownerName || null,
          phone: data.phone,
          address: data.address || null,
          latitude: data.latitude ? String(data.latitude) : null,
          longitude: data.longitude ? String(data.longitude) : null,
          status: 'pending_approval',
          createdAt: new Date().toISOString(),
        };
        queueAction('ADD_SHOP', data, tempId);
        return offlineShop;
      }
      const res = await apiClient.post('/shops', data);
      return res.data as Shop;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shopKeys.all });
    },
  });
}

export function useUpdateShop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shopId, data }: {
      shopId: string;
      data: {
        name?: string;
        ownerName?: string;
        phone?: string;
        address?: string;
        latitude?: number;
        longitude?: number;
        status?: 'approved' | 'pending_approval' | 'rejected';
      };
    }) => apiClient.patch(`/shops/${shopId}`, data).then((res) => res.data.shop as Shop),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shopKeys.all });
    },
  });
}

export function useApproveShop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shopId: string) => apiClient.patch(`/shops/${shopId}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shopKeys.all });
    },
  });
}

export function useRejectShop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shopId: string) => apiClient.patch(`/shops/${shopId}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shopKeys.all });
    },
  });
}
