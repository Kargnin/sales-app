import { useMemo } from 'react';
import {
  useOrders as useOrdersQuery,
  useOrdersByShop,
  useOrder,
  useCreateOrder,
  useRecordPayment,
  useMarkOrderPaid,
} from './queries/useOrdersQuery.js';
import { ONGOING_ORDER_STATUSES, DELIVERED_ORDER_STATUSES } from '../lib/constants.js';

export type OrderSort = 'date_desc' | 'date_asc' | 'shop_asc' | 'shop_desc' | 'value_asc' | 'value_desc';

export function useOrders() {
  const { data: orders = [], isLoading } = useOrdersQuery();
  const createOrder = useCreateOrder();
  const recordPayment = useRecordPayment();
  const markOrderPaid = useMarkOrderPaid();

  function getFilteredOrders(filters: {
    shopId?: string;
    salesmanId?: string;
    statusFilter?: 'all' | 'ongoing' | 'delivered' | string;
    sort?: OrderSort;
  }) {
    let result = [...orders];

    if (filters.shopId) {
      result = result.filter((o) => o.shopId === filters.shopId);
    }
    if (filters.salesmanId) {
      result = result.filter((o) => o.salesmanId === filters.salesmanId);
    }
    if (filters.statusFilter === 'ongoing') {
      result = result.filter((o) => ONGOING_ORDER_STATUSES.includes(o.status as any));
    } else if (filters.statusFilter === 'delivered') {
      result = result.filter((o) => DELIVERED_ORDER_STATUSES.includes(o.status as any));
    }

    result.sort((a, b) => {
      switch (filters.sort) {
        case 'date_asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'shop_asc':
          return (a.shopName || '').localeCompare(b.shopName || '');
        case 'shop_desc':
          return (b.shopName || '').localeCompare(a.shopName || '');
        case 'value_asc':
          return parseFloat(a.totalAmount) - parseFloat(b.totalAmount);
        case 'value_desc':
          return parseFloat(b.totalAmount) - parseFloat(a.totalAmount);
        case 'date_desc':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return result;
  }

  return {
    orders,
    isLoading,
    fetchOrders: () => {},
    addOrder: createOrder.mutateAsync,
    fetchShopOrders: (shopId: string) =>
      apiClient.get(`/orders/shop/${shopId}`).then((res: any) => res.data),
    recordPayment: (orderId: string, paymentData: any) =>
      recordPayment.mutateAsync({ orderId, paymentData }),
    markOrderPaid: (orderId: string, paymentMethod: any) =>
      markOrderPaid.mutateAsync({ orderId, paymentMethod }),
    getFilteredOrders,
  };
}

// Import for fetchShopOrders compatibility
import { apiClient } from '../api/client.js';

export { useOrdersQuery, useOrdersByShop, useOrder, useCreateOrder, useRecordPayment, useMarkOrderPaid };
