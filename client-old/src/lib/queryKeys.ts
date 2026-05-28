// Centralized query key factory for TanStack Query
// Ensures consistent cache invalidation patterns

export const shopKeys = {
  all: ['shops'] as const,
  lists: () => [...shopKeys.all, 'list'] as const,
  details: () => [...shopKeys.all, 'detail'] as const,
  detail: (id: string) => [...shopKeys.details(), id] as const,
};

export const employeeKeys = {
  all: ['employees'] as const,
  lists: () => [...employeeKeys.all, 'list'] as const,
  details: () => [...employeeKeys.all, 'detail'] as const,
  detail: (id: string) => [...employeeKeys.details(), id] as const,
};

export const visitKeys = {
  all: ['visits'] as const,
  lists: () => [...visitKeys.all, 'list'] as const,
  details: () => [...visitKeys.all, 'detail'] as const,
  detail: (id: string) => [...visitKeys.details(), id] as const,
  byShop: (shopId: string) => [...visitKeys.all, 'byShop', shopId] as const,
};

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
};

export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
  byShop: (shopId: string) => [...orderKeys.all, 'byShop', shopId] as const,
};

export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
};
