import { useMemo } from 'react';
import {
  useShops as useShopsQuery,
  useShop,
  useCreateShop,
  useUpdateShop,
  useApproveShop,
  useRejectShop,
} from './queries/useShopsQuery.js';

export function useShops() {
  const { data: shops = [], isLoading } = useShopsQuery();
  const createShop = useCreateShop();
  const updateShop = useUpdateShop();
  const approveShop = useApproveShop();
  const rejectShop = useRejectShop();

  const approvedShops = useMemo(() => shops.filter((s) => s.status === 'approved'), [shops]);
  const pendingShops = useMemo(() => shops.filter((s) => s.status === 'pending_approval'), [shops]);
  const activeShops = useMemo(() => shops.filter((s) => s.status !== 'rejected'), [shops]);

  return {
    shops,
    approvedShops,
    pendingShops,
    activeShops,
    isLoading,
    fetchShops: () => {},
    addShop: createShop.mutateAsync,
    editShop: (shopId: string, data: any) => updateShop.mutateAsync({ shopId, data }),
    approveShop: approveShop.mutateAsync,
    rejectShop: rejectShop.mutateAsync,
  };
}

export { useShop, useCreateShop, useUpdateShop, useApproveShop, useRejectShop };
