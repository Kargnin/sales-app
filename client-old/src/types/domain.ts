// Domain types shared across the app
// Extracted from appStore for reuse in TanStack Query hooks

export interface Employee {
  id: string;
  tenantId: string;
  username: string;
  email: string | null;
  phone: string | null;
  role: 'admin' | 'salesman';
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Shop {
  id: string;
  tenantId: string;
  name: string;
  ownerName: string | null;
  phone: string;
  address: string | null;
  latitude: string | null;
  longitude: string | null;
  status: 'approved' | 'pending_approval' | 'rejected';
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
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  tenantId: string;
  shopId: string;
  shopName?: string;
  salesmanId: string | null;
  salesmanName?: string;
  orderSource: 'salesman' | 'whatsapp' | 'meesho' | 'admin_self';
  status: 'pending_approval' | 'confirmed' | 'cancelled' | 'dispatched' | 'delivered';
  paymentStatus: 'unpaid' | 'partially_paid' | 'paid';
  cancellationToken?: string | null;
  totalAmount: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: string;
  paymentMethod: 'cash' | 'upi' | 'bank_transfer';
  notes: string | null;
  paidAt: string;
}

export interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}
