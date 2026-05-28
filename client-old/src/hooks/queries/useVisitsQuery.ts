import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { onlineManager } from '@tanstack/react-query';
import { apiClient } from '../../api/client.js';
import { useOfflineStore } from '../../stores/offlineStore.js';
import { useAuthStore } from '../../stores/authStore.js';
import { visitKeys } from '../../lib/queryKeys.js';
import type { Visit } from '../../types/domain.js';

// ── Queries ──────────────────────────────────────────────

export function useVisits() {
  return useQuery({
    queryKey: visitKeys.lists(),
    queryFn: () => apiClient.get('/visits').then((res) => res.data as Visit[]),
    staleTime: 5 * 60 * 1000,
  });
}

export function useVisitsByShop(shopId: string | undefined) {
  return useQuery({
    queryKey: visitKeys.byShop(shopId!),
    queryFn: () => apiClient.get(`/visits?shopId=${shopId}`).then((res) => res.data as Visit[]),
    enabled: !!shopId,
  });
}

// ── Mutations ────────────────────────────────────────────

export function useCreateVisit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      shopId: string;
      latitude: number;
      longitude: number;
      notes?: string;
    }) => apiClient.post('/visits', data).then((res) => res.data as Visit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitKeys.all });
    },
  });
}

export function useCreateVisitOffline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      shopId: string;
      latitude: number;
      longitude: number;
      notes?: string;
      shopName?: string;
    }) => {
      const isOnline = onlineManager.isOnline();
      if (!isOnline) {
        const { queueAction } = useOfflineStore.getState();
        const tempId = `temp_visit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const authUser = useAuthStore.getState().user;
        const offlineVisit: Visit = {
          id: tempId,
          tenantId: authUser?.tenantId || '',
          salesmanId: authUser?.id || '',
          salesmanName: authUser?.username || undefined,
          shopId: data.shopId,
          shopName: data.shopName || 'Unknown Shop',
          latitude: String(data.latitude),
          longitude: String(data.longitude),
          gpsVerified: true,
          photoUrl: null,
          notes: data.notes || 'Mobile check-in',
          visitedAt: new Date().toISOString(),
        };
        queueAction('ADD_VISIT', data, tempId);
        return offlineVisit;
      }
      const res = await apiClient.post('/visits', data);
      return res.data as Visit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitKeys.all });
    },
  });
}
