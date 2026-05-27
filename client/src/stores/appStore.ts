import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '../api/client.js';
import { toast } from 'sonner';
import { useOfflineStore } from './offlineStore.js';
import { useAuthStore } from './authStore.js';
import { queryClient } from '../lib/queryClient.js';

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

interface AppState {
  shops: Shop[];
  employees: Employee[];
  visits: Visit[];
  products: Product[];
  orders: Order[];
  isLoadingShops: boolean;
  isLoadingEmployees: boolean;
  isLoadingVisits: boolean;
  isLoadingProducts: boolean;
  isLoadingOrders: boolean;

  fetchShops: () => Promise<void>;
  fetchEmployees: () => Promise<void>;
  fetchVisits: () => Promise<void>;
  fetchProducts: () => Promise<void>;
  fetchOrders: () => Promise<void>;
  fetchShopOrders: (shopId: string) => Promise<Order[]>;

  addShop: (shopData: {
    name: string;
    ownerName?: string;
    phone: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  }) => Promise<Shop>;

  editShop: (shopId: string, shopData: {
    name?: string;
    ownerName?: string;
    phone?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    status?: 'approved' | 'pending_approval' | 'rejected';
  }) => Promise<Shop>;

  addEmployee: (employeeData: {
    username: string;
    email?: string;
    phone?: string;
    password?: string;
    role: 'salesman' | 'admin';
  }) => Promise<Employee>;

  addOrder: (orderData: {
    shopId: string;
    items: Array<{ productId: string; quantity: number; unitPrice: number }>;
  }) => Promise<Order>;

  addVisit: (visitData: {
    shopId: string;
    latitude: number;
    longitude: number;
    notes?: string;
  }) => Promise<Visit>;

  approveShop: (shopId: string) => Promise<void>;
  rejectShop: (shopId: string) => Promise<any>;
  toggleEmployeeStatus: (empId: string, currentStatus: 'active' | 'inactive') => Promise<void>;
  recordPayment: (
    orderId: string,
    paymentData: { amountPaid: number; paymentMethod: 'cash' | 'upi' | 'bank_transfer'; notes?: string }
  ) => Promise<Order>;
  markOrderPaid: (
    orderId: string,
    paymentMethod: 'cash' | 'upi' | 'bank_transfer'
  ) => Promise<Order>;

  addProduct: (productData: {
    name: string;
    sku?: string;
    price: number;
    stockQuantity?: number;
  }) => Promise<Product>;

  editProduct: (productId: string, productData: {
    name?: string;
    sku?: string;
    price?: number;
    stockQuantity?: number;
  }) => Promise<Product>;

  deleteProduct: (productId: string) => Promise<void>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
  shops: [],
  employees: [],
  visits: [],
  products: [],
  orders: [],
  isLoadingShops: false,
  isLoadingEmployees: false,
  isLoadingVisits: false,
  isLoadingProducts: false,
  isLoadingOrders: false,

  fetchShops: async () => {
    set({ isLoadingShops: true });
    try {
      const data = await queryClient.fetchQuery({
        queryKey: ['shops'],
        queryFn: async () => {
          const response = await apiClient.get('/shops');
          return response.data;
        },
      });
      set({ shops: data });
    } catch (err: any) {
      console.error(err);
      if (err.response?.status !== 401) {
        toast.error('Failed to load outlets.');
      }
    } finally {
      set({ isLoadingShops: false });
    }
  },

  fetchEmployees: async () => {
    set({ isLoadingEmployees: true });
    try {
      const data = await queryClient.fetchQuery({
        queryKey: ['employees'],
        queryFn: async () => {
          const response = await apiClient.get('/users');
          return response.data;
        },
      });
      set({ employees: data });
    } catch (err: any) {
      console.error(err);
      if (err.response?.status !== 401) {
        toast.error('Failed to load employees.');
      }
    } finally {
      set({ isLoadingEmployees: false });
    }
  },

  fetchVisits: async () => {
    set({ isLoadingVisits: true });
    try {
      const data = await queryClient.fetchQuery({
        queryKey: ['visits'],
        queryFn: async () => {
          const response = await apiClient.get('/visits');
          return response.data;
        },
      });
      set({ visits: data });
    } catch (err: any) {
      console.error(err);
      if (err.response?.status !== 401) {
        toast.error('Failed to load visit logs.');
      }
    } finally {
      set({ isLoadingVisits: false });
    }
  },

  fetchProducts: async () => {
    set({ isLoadingProducts: true });
    try {
      const data = await queryClient.fetchQuery({
        queryKey: ['products'],
        queryFn: async () => {
          const response = await apiClient.get('/orders/products');
          return response.data;
        },
      });
      set({ products: data });
    } catch (err: any) {
      console.error(err);
      if (err.response?.status !== 401) {
        toast.error('Failed to load product catalog.');
      }
    } finally {
      set({ isLoadingProducts: false });
    }
  },

  fetchOrders: async () => {
    set({ isLoadingOrders: true });
    try {
      const data = await queryClient.fetchQuery({
        queryKey: ['orders'],
        queryFn: async () => {
          const response = await apiClient.get('/orders');
          return response.data;
        },
      });
      set({ orders: data });
    } catch (err: any) {
      console.error(err);
      if (err.response?.status !== 401) {
        toast.error('Failed to load order history.');
      }
    } finally {
      set({ isLoadingOrders: false });
    }
  },

  fetchShopOrders: async (shopId) => {
    return queryClient.fetchQuery({
      queryKey: ['orders', 'shop', shopId],
      queryFn: async () => {
        const response = await apiClient.get(`/orders/shop/${shopId}`);
        return response.data;
      },
    });
  },

  addShop: async (shopData) => {
    const { isOnline, queueAction } = useOfflineStore.getState();
    if (!isOnline) {
      const tempId = `temp_shop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const offlineShop: Shop = {
        id: tempId,
        tenantId: useAuthStore.getState().user?.tenantId || '',
        name: shopData.name,
        ownerName: shopData.ownerName || null,
        phone: shopData.phone,
        address: shopData.address || null,
        latitude: shopData.latitude ? String(shopData.latitude) : null,
        longitude: shopData.longitude ? String(shopData.longitude) : null,
        status: 'pending_approval',
        createdAt: new Date().toISOString(),
      };
      (offlineShop as any).offline = true;

      set((state) => ({ shops: [...state.shops, offlineShop] }));
      queueAction('ADD_SHOP', shopData, tempId);
      toast.success('Outlet registered offline! It will sync when online.');
      return offlineShop;
    }

    const response = await apiClient.post('/shops', shopData);
    const newShop = response.data;
    set((state) => ({ shops: [...state.shops, newShop] }));
    return newShop;
  },

  editShop: async (shopId, shopData) => {
    const response = await apiClient.patch(`/shops/${shopId}`, shopData);
    const updated = response.data.shop;
    set((state) => ({
      shops: state.shops.map((s) => (s.id === shopId ? updated : s)),
    }));
    return updated;
  },

  addEmployee: async (employeeData) => {
    const response = await apiClient.post('/users', employeeData);
    const newEmployee = response.data;
    set((state) => ({ employees: [...state.employees, newEmployee] }));
    return newEmployee;
  },

  addOrder: async (orderData) => {
    const { isOnline, queueAction } = useOfflineStore.getState();
    if (!isOnline) {
      const tempId = `temp_order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const totalAmount = orderData.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0).toFixed(2);
      const offlineOrder: Order = {
        id: tempId,
        tenantId: useAuthStore.getState().user?.tenantId || '',
        shopId: orderData.shopId,
        salesmanId: useAuthStore.getState().user?.id || null,
        orderSource: 'salesman',
        status: 'pending_approval',
        paymentStatus: 'unpaid',
        totalAmount,
        createdAt: new Date().toISOString(),
      };
      (offlineOrder as any).offline = true;

      set((state) => ({ orders: [offlineOrder, ...state.orders] }));
      queueAction('ADD_ORDER', orderData, tempId);
      toast.success('Soap order placed offline! It will sync when online.');
      return offlineOrder;
    }

    const response = await apiClient.post('/orders', orderData);
    const newOrder = response.data;
    set((state) => ({ orders: [newOrder, ...state.orders] }));
    return newOrder;
  },

  addVisit: async (visitData) => {
    const { isOnline, queueAction } = useOfflineStore.getState();
    if (!isOnline) {
      const tempId = `temp_visit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const shop = get().shops.find((s) => s.id === visitData.shopId);
      const offlineVisit: Visit = {
        id: tempId,
        tenantId: useAuthStore.getState().user?.tenantId || '',
        salesmanId: useAuthStore.getState().user?.id || '',
        salesmanName: useAuthStore.getState().user?.username || undefined,
        shopId: visitData.shopId,
        shopName: shop ? shop.name : 'Unknown Shop',
        latitude: String(visitData.latitude),
        longitude: String(visitData.longitude),
        gpsVerified: true,
        photoUrl: null,
        notes: visitData.notes || 'Mobile check-in',
        visitedAt: new Date().toISOString(),
      };
      (offlineVisit as any).offline = true;

      set((state) => ({ visits: [offlineVisit, ...state.visits] }));
      queueAction('ADD_VISIT', visitData, tempId);
      toast.success('Check-in recorded offline! It will sync when online.');
      return offlineVisit;
    }

    const response = await apiClient.post('/visits', visitData);
    const newVisit = response.data;
    set((state) => ({ visits: [newVisit, ...state.visits] }));
    return newVisit;
  },

  approveShop: async (shopId) => {
    await apiClient.patch(`/shops/${shopId}/approve`);
    set((state) => ({
      shops: state.shops.map((s) => (s.id === shopId ? { ...s, status: 'approved' } : s)),
    }));
    toast.success('Outlet approved successfully.');
  },

  rejectShop: async (shopId) => {
    try {
      const res = await apiClient.patch(`/shops/${shopId}/reject`);
      set((state) => ({
        shops: state.shops.map((s) => (s.id === shopId ? { ...s, status: 'rejected' } : s)),
      }));
      toast.success('Outlet rejected successfully.');
      return res.data;
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  },

  toggleEmployeeStatus: async (empId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await apiClient.patch(`/users/${empId}`, { status: nextStatus });
    set((state) => ({
      employees: state.employees.map((emp) =>
        emp.id === empId ? { ...emp, status: nextStatus } : emp
      ),
    }));
    toast.success(`Successfully ${nextStatus === 'active' ? 'activated' : 'deactivated'} user account!`);
  },

  recordPayment: async (orderId, paymentData) => {
    const response = await apiClient.post(`/orders/${orderId}/payments`, paymentData);
    const updatedOrder = response.data;
    set((state) => ({
      orders: state.orders.map((o) => (o.id === orderId ? updatedOrder : o)),
    }));
    return updatedOrder;
  },

  markOrderPaid: async (orderId, paymentMethod) => {
    const response = await apiClient.post(`/orders/${orderId}/mark-paid`, { paymentMethod });
    const updatedOrder = response.data;
    set((state) => ({
      orders: state.orders.map((o) => (o.id === orderId ? updatedOrder : o)),
    }));
    return updatedOrder;
  },

  addProduct: async (productData) => {
    const response = await apiClient.post('/products', productData);
    const newProduct = response.data;
    set((state) => ({ products: [...state.products, newProduct] }));
    await queryClient.invalidateQueries({ queryKey: ['products'] });
    return newProduct;
  },

  editProduct: async (productId, productData) => {
    const response = await apiClient.patch(`/products/${productId}`, productData);
    const updated = response.data.product;
    set((state) => ({
      products: state.products.map((p) => (p.id === productId ? updated : p)),
    }));
    await queryClient.invalidateQueries({ queryKey: ['products'] });
    return updated;
  },

  deleteProduct: async (productId) => {
    await apiClient.delete(`/products/${productId}`);
    set((state) => ({
      products: state.products.filter((p) => p.id !== productId),
    }));
    await queryClient.invalidateQueries({ queryKey: ['products'] });
  },
}),
    {
      name: 'sales-app-data',
      storage: {
        getItem: (name) => {
          try {
            const value = typeof localStorage !== 'undefined' ? localStorage.getItem(name) : null;
            return value ? JSON.parse(value) : null;
          } catch (e) {
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem(name, JSON.stringify(value));
            }
          } catch (e) {}
        },
        removeItem: (name) => {
          try {
            if (typeof localStorage !== 'undefined') {
              localStorage.removeItem(name);
            }
          } catch (e) {}
        },
      },
      partialize: (state) => ({
        shops: state.shops,
        products: state.products,
        visits: state.visits,
        orders: state.orders,
      } as any),
    }
  )
);
