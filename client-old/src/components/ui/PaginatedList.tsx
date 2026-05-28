import React, { useState, useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '../../api/client.js';
import { Button } from './button.js';
import { ChevronLeft, ChevronRight, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils.js';

interface PaginatedListProps<T> {
  queryKeyPrefix: string;
  endpoint: string;
  searchParamsFilter?: Record<string, string>;
  perPage?: number;
  renderItem: (item: T) => React.ReactNode;
  itemKeyExtractor: (item: T) => string;
  emptyState?: React.ReactNode;
  listClassName?: string;
  dataKey: string; // e.g. "notifications", "orders", "visits"
}

export function PaginatedList<T>({
  queryKeyPrefix,
  endpoint,
  searchParamsFilter = {},
  perPage = 10,
  renderItem,
  itemKeyExtractor,
  emptyState,
  listClassName = "flex flex-col gap-2.5",
  dataKey
}: PaginatedListProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  // Sync to page 1 whenever filters change to avoid out of bounds query states
  const serializedFilters = JSON.stringify(searchParamsFilter);
  useEffect(() => {
    setCurrentPage(1);
  }, [serializedFilters]);

  // Merge page & limit parameters into endpoint query parameters
  const fetchQueryData = async () => {
    const params = new URLSearchParams();
    params.set('page', String(currentPage));
    params.set('limit', String(perPage));

    Object.entries(searchParamsFilter).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });

    const response = await apiClient.get(`${endpoint}?${params.toString()}`);
    return response.data;
  };

  const { data, isLoading, error, isPlaceholderData } = useQuery({
    queryKey: [queryKeyPrefix, currentPage, perPage, searchParamsFilter],
    queryFn: fetchQueryData,
    placeholderData: keepPreviousData,
    staleTime: 5000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[250px] gap-2.5 text-slate-400 select-none">
        <RefreshCw className="size-7 animate-spin text-emerald-500" />
        <p className="text-xs">Loading items...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[250px] gap-2.5 text-red-400 select-none p-6 text-center">
        <AlertCircle className="size-8 text-red-500" />
        <h4 className="font-bold text-sm">Failed to sync records</h4>
        <p className="text-xs text-slate-500 max-w-xs leading-normal">
          An error occurred while connecting with the tenant network channel. Please retry in a few moments.
        </p>
      </div>
    );
  }

  const itemsList = (data?.[dataKey] || []) as T[];
  const pagination = data?.pagination || { totalCount: 0, totalPages: 1 };
  const totalPages = pagination.totalPages;
  const totalCount = pagination.totalCount;

  if (itemsList.length === 0) {
    return emptyState || (
      <div className="py-12 text-center text-xs text-slate-500">
        No records found.
      </div>
    );
  }

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => setCurrentPage(i)}
          className={cn(
            "h-8 min-w-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all border",
            currentPage === i
              ? "bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold shadow-lg shadow-emerald-500/10"
              : "bg-[#101512] text-slate-400 border-[#1a231f] hover:text-slate-200 hover:bg-[#1a231f]"
          )}
        >
          {i}
        </button>
      );
    }
    return pages;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Dynamic Count and Page indicator wrapper */}
      <div className="flex justify-between items-center text-[11px] text-slate-500 px-1 select-none font-medium">
        <span>Total Records: <strong className="text-slate-300 font-bold">{totalCount}</strong></span>
        {totalPages > 1 && (
          <span>Page <strong className="text-slate-300 font-bold">{currentPage}</strong> of <strong className="text-slate-300 font-bold">{totalPages}</strong></span>
        )}
      </div>

      {/* Main List Rendering Area */}
      <div className={cn(listClassName, isPlaceholderData ? "opacity-60 transition-opacity" : "")}>
        {itemsList.map((item) => (
          <div key={itemKeyExtractor(item)}>
            {renderItem(item)}
          </div>
        ))}
      </div>

      {/* Pagination Controls Footer */}
      {!isPlaceholderData && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[#1a231f] pt-4 mt-2 select-none">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="h-8 text-xs bg-[#101512] border-[#1a231f] text-slate-300 disabled:opacity-40 hover:bg-[#1a231f] flex items-center gap-1"
          >
            <ChevronLeft className="size-4" />
            <span>Prev</span>
          </Button>

          <div className="flex gap-1.5">
            {renderPageNumbers()}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="h-8 text-xs bg-[#101512] border-[#1a231f] text-slate-300 disabled:opacity-40 hover:bg-[#1a231f] flex items-center gap-1"
          >
            <span>Next</span>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
