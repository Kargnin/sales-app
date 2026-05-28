import type { DashboardMetrics, Order } from "../types";

export const MOCK_DASHBOARD_METRICS: DashboardMetrics = {
  totalRevenue: "1250000.00",
  totalOrders: 342,
  totalVisits: 1204,
  activeSalesmen: 8,
  revenueChange: 12.5,
  ordersChange: 8.1,
  visitsChange: -3.2,
};

export const MOCK_RECENT_ORDERS: Order[] = [
  {
    id: "ord-001",
    tenantId: "t1",
    shopId: "sh-001",
    shopName: "Sharma General Store",
    salesmanId: "s1",
    salesmanName: "Ramesh Kumar",
    orderSource: "salesman",
    status: "confirmed",
    paymentStatus: "unpaid",
    totalAmount: "4500.00",
    createdAt: new Date().toISOString(),
  },
  {
    id: "ord-002",
    tenantId: "t1",
    shopId: "sh-002",
    shopName: "Patel Mart",
    salesmanId: "s2",
    salesmanName: "Suresh Singh",
    orderSource: "whatsapp",
    status: "pending_approval",
    paymentStatus: "unpaid",
    totalAmount: "3200.00",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "ord-003",
    tenantId: "t1",
    shopId: "sh-003",
    shopName: "Gupta Kirana",
    salesmanId: "s1",
    salesmanName: "Ramesh Kumar",
    orderSource: "salesman",
    status: "dispatched",
    paymentStatus: "paid",
    totalAmount: "7800.00",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
];
