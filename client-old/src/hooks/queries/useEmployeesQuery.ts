import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client.js';
import { employeeKeys } from '../../lib/queryKeys.js';
import type { Employee } from '../../types/domain.js';

// ── Queries ──────────────────────────────────────────────

export function useEmployees() {
  return useQuery({
    queryKey: employeeKeys.lists(),
    queryFn: () => apiClient.get('/users').then((res) => res.data as Employee[]),
    staleTime: 5 * 60 * 1000,
  });
}

export function useEmployee(id: string | undefined) {
  return useQuery({
    queryKey: employeeKeys.detail(id!),
    queryFn: () => apiClient.get(`/users/${id}`).then((res) => res.data as Employee),
    enabled: !!id,
  });
}

// ── Mutations ────────────────────────────────────────────

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      username: string;
      email?: string;
      phone?: string;
      password?: string;
      role: 'salesman' | 'admin';
    }) => apiClient.post('/users', data).then((res) => res.data as Employee),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
    },
  });
}

export function useToggleEmployeeStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ empId, currentStatus }: { empId: string; currentStatus: 'active' | 'inactive' }) => {
      const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
      return apiClient.patch(`/users/${empId}`, { status: nextStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
    },
  });
}

export function useGenerateInviteLink() {
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/users/generate-invite');
      const token = res.data.inviteToken;
      return `${window.location.origin}/#/register/salesman?token=${token}`;
    },
  });
}
