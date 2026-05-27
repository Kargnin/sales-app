export const UserRole = {
  ADMIN: 'admin',
  SALESMAN: 'salesman',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ShopStatus = {
  APPROVED: 'approved',
  PENDING_APPROVAL: 'pending_approval',
  REJECTED: 'rejected',
} as const;
export type ShopStatus = (typeof ShopStatus)[keyof typeof ShopStatus];

export const OrderSource = {
  SALESMAN: 'salesman',
  WHATSAPP: 'whatsapp',
  MEESHO: 'meesho',
  ADMIN_SELF: 'admin_self',
} as const;
export type OrderSource = (typeof OrderSource)[keyof typeof OrderSource];

export const OrderStatus = {
  PENDING_APPROVAL: 'pending_approval',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  DISPATCHED: 'dispatched',
  DELIVERED: 'delivered',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const PaymentStatus = {
  UNPAID: 'unpaid',
  PARTIALLY_PAID: 'partially_paid',
  PAID: 'paid',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const PaymentMethod = {
  CASH: 'cash',
  UPI: 'upi',
  BANK_TRANSFER: 'bank_transfer',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const TenantTier = {
  FREE: 'free',
  PREMIUM: 'premium',
} as const;
export type TenantTier = (typeof TenantTier)[keyof typeof TenantTier];

export const UserStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];
