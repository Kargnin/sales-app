import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client.js';
import { productKeys } from '../../lib/queryKeys.js';
import type { Product } from '../../types/domain.js';

// ── Queries ──────────────────────────────────────────────

export function useProducts() {
  return useQuery({
    queryKey: productKeys.lists(),
    queryFn: () => apiClient.get('/orders/products').then((res) => res.data as Product[]),
    staleTime: 5 * 60 * 1000,
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: productKeys.detail(id!),
    queryFn: () => apiClient.get(`/products/${id}`).then((res) => res.data as Product),
    enabled: !!id,
  });
}

// ── Mutations ────────────────────────────────────────────

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      sku?: string;
      price: number;
      stockQuantity?: number;
    }) => apiClient.post('/products', data).then((res) => res.data as Product),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, data }: {
      productId: string;
      data: {
        name?: string;
        sku?: string;
        price?: number;
        stockQuantity?: number;
      };
    }) => apiClient.patch(`/products/${productId}`, data).then((res) => res.data.product as Product),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => apiClient.delete(`/products/${productId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}
