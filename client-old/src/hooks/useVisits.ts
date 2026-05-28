import { useMemo } from 'react';
import { useVisits as useVisitsQuery, useCreateVisit, useVisitsByShop } from './queries/useVisitsQuery.js';

export function useVisits() {
  const { data: visits = [], isLoading } = useVisitsQuery();
  const createVisit = useCreateVisit();

  function getFilteredVisits(filters: { shopId?: string; salesmanId?: string }) {
    let result = [...visits];

    if (filters.shopId) {
      result = result.filter((v) => v.shopId === filters.shopId);
    }
    if (filters.salesmanId) {
      result = result.filter((v) => v.salesmanId === filters.salesmanId);
    }

    return result.sort(
      (a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime()
    );
  }

  function getShopVisitStats(shopId: string) {
    const shopVisits = visits.filter((v) => v.shopId === shopId);
    const sorted = [...shopVisits].sort(
      (a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime()
    );
    return {
      count: shopVisits.length,
      lastVisit: sorted[0] || null,
    };
  }

  return {
    visits,
    isLoading,
    fetchVisits: () => {},
    addVisit: createVisit.mutateAsync,
    getFilteredVisits,
    getShopVisitStats,
  };
}

export { useVisitsQuery, useCreateVisit, useVisitsByShop };
