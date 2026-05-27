import type {
  UserRole, ShopStatus, OrderSource, OrderStatus,
  PaymentStatus, PaymentMethod, TenantTier, UserStatus,
} from './enums.js';

// ─── Base ─────────────────────────────────────────
export interface Tenant {
  id: string;
  name: string;
  tier: TenantTier;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  tenantId: string;
  tenantName?: string;
  username: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
}

export interface Shop {
  id: string;
  tenantId: string;
  name: string;
  ownerName: string | null;
  phone: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  status: ShopStatus;
  createdByUserId: string | null;
  createdAt: Date;
}

export interface Visit {
  id: string;
  tenantId: string;
  salesmanId: string;
  shopId: string;
  latitude: number | null;
  longitude: number | null;
  gpsVerified: boolean;
  photoUrl: string | null;
  notes: string | null;
  visitedAt: Date;
}

export interface Product {
  id: string;
  tenantId: string;
  name: string;
  sku: string | null;
  price: number;
  stockQuantity: number;
  createdAt: Date;
}

export interface Order {
  id: string;
  tenantId: string;
  shopId: string;
  salesmanId: string | null;
  orderSource: OrderSource;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  creditDueDate: string | null;
  cancellationToken: string | null;
  cancellationWindowExpiresAt: Date | null;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Payment {
  id: string;
  tenantId: string;
  orderId: string;
  amountPaid: number;
  paymentMethod: PaymentMethod;
  paymentDate: Date;
  notes: string | null;
}

// ─── Auth DTOs ────────────────────────────────────
export interface AuthPayload {
  sub: string;       // userId
  tenantId: string;
  role: UserRole;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: Omit<User, 'passwordHash'>;
}
