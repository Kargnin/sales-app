// client/src/types/index.ts

export interface User {
  id: string;
  tenantId: string;
  username: string;
  email: string | null;
  phone: string | null;
  role: "admin" | "salesman";
  status: "active" | "inactive";
  createdAt: string;
}

export interface ShopOwner {
  name?: string;
  phone?: string;
}

export interface Shop {
  id: string;
  tenantId: string;
  name: string;
  ownerName: string | null;
  phone: string;
  address: string | null;
  imageUrl?: string | null;
  additionalOwners?: ShopOwner[] | null;
  latitude: string | null;
  longitude: string | null;
  status: "approved" | "pending_approval" | "rejected";
  createdAt: string;
}

export interface Visit {
  id: string;
  tenantId: string;
  salesmanId: string;
  salesmanName?: string;
  shopId: string;
  shopName: string;
  latitude: string;
  longitude: string;
  gpsVerified: boolean;
  photoUrl: string | null;
  notes: string | null;
  visitedAt: string;
}

export interface Product {
  id: string;
  tenantId: string;
  name: string;
  sku: string | null;
  price: string;
  stockQuantity: number;
  imageUrl: string | null;
  category: string | null;
  description: string | null;
  unit: string | null;
  stockStatus: "in_stock" | "low_stock" | "out_of_stock";
  createdAt: string;
}

export interface Order {
  id: string;
  tenantId: string;
  shopId: string;
  shopName?: string;
  salesmanId: string | null;
  salesmanName?: string;
  orderSource: "salesman" | "whatsapp" | "meesho" | "admin_self";
  status:
    "pending_approval" | "confirmed" | "cancelled" | "dispatched" | "delivered";
  paymentStatus: "unpaid" | "partially_paid" | "paid";
  cancellationToken?: string | null;
  totalAmount: string;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
}

export interface DashboardMetrics {
  totalRevenue: string;
  totalOrders: number;
  totalVisits: number;
  activeSalesmen: number;
  pendingApprovals: number;
  revenueChange: number;
  ordersChange: number;
  visitsChange: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "shop_approval" | "order_status" | "system" | "new_order" | "new_visit";
  isRead: boolean;
  createdAt: string;
}
