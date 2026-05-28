import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, useBlocker } from 'react-router';
import { useAuthStore } from '../../stores/authStore.js';
import { useAppStore, Shop, Order } from '../../stores/appStore.js';
import { useOfflineStore } from '../../stores/offlineStore.js';
import { apiClient } from '../../api/client.js';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createEmployeeSchema, updateShopSchema, createShopSchema, createProductSchema } from '@sales-app/shared';
import { z } from 'zod';
import { PageActionWrapper } from '../../components/ui/PageActionWrapper.js';
import { ProductTile } from '../../components/salesman/ProductTile.js';
import { SwipeableContainer } from '../../components/ui/SwipeableContainer.js';
import { Plus, Store } from 'lucide-react';

const paymentInputSchema = z.object({
  amountPaid: z.number({ invalid_type_error: "Amount is required" }).positive("Amount must be positive"),
  paymentMethod: z.enum(['cash', 'upi', 'bank_transfer']),
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional(),
});
import { Field, FieldLabel, FieldError, FieldGroup } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { OrderTable } from '../../components/orders/OrderTable.js';
import { ShopTile } from '../../components/salesman/ShopTile.js';
import { MapPin, ShoppingCart, Package, ChevronRight, Users } from 'lucide-react';
import { PaginatedList } from '../../components/ui/PaginatedList.js';
import { Visit } from '../../stores/appStore.js';
import { cn } from '../../lib/utils.js';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const {
    employees,
    shops,
    visits,
    orders,
    products,
    isLoadingEmployees,
    isLoadingShops,
    isLoadingVisits,
    isLoadingOrders,
    isLoadingProducts,
    fetchEmployees,
    fetchShops,
    fetchVisits,
    fetchOrders,
    fetchProducts,
    addEmployee,
    approveShop,
    rejectShop,
    editShop,
    fetchShopOrders,
    toggleEmployeeStatus,
    recordPayment,
    markOrderPaid,
    addProduct,
    addShop,
    addOrder,
  } = useAppStore();

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Tab control state driven by responsive sidebar
  const activeTab = (searchParams.get('tab') as 'roster' | 'shops' | 'analytics' | 'orders' | 'products') || 'roster';

  const adminTabs: Array<'roster' | 'shops' | 'products' | 'orders' | 'analytics'> = [
    'roster',
    'shops',
    'products',
    'orders',
    'analytics',
  ];

  const prevTabRef = React.useRef<string>(activeTab);
  const [swipeDirection, setSwipeDirection] = React.useState<'right' | 'left' | null>(null);

  React.useEffect(() => {
    if (activeTab !== prevTabRef.current) {
      const prevIndex = adminTabs.indexOf(prevTabRef.current as any);
      const newIndex = adminTabs.indexOf(activeTab);
      if (prevIndex !== -1 && newIndex !== -1) {
        setSwipeDirection(newIndex > prevIndex ? 'right' : 'left');
      }
      prevTabRef.current = activeTab;
    }
  }, [activeTab]);

  const swipeClass = swipeDirection === 'right' 
    ? 'animate-tab-right' 
    : swipeDirection === 'left' 
    ? 'animate-tab-left' 
    : '';

  const handleSwipeLeft = () => {
    const currentIndex = adminTabs.indexOf(activeTab);
    if (currentIndex !== -1 && currentIndex < adminTabs.length - 1) {
      setSearchParams({ tab: adminTabs[currentIndex + 1] });
    }
  };

  const handleSwipeRight = () => {
    const currentIndex = adminTabs.indexOf(activeTab);
    if (currentIndex !== -1 && currentIndex > 0) {
      setSearchParams({ tab: adminTabs[currentIndex - 1] });
    }
  };

  // URL-driven reactive filters
  const filterShopParam = searchParams.get('filter_shop') || '';
  const shopIdParam = searchParams.get('shopId') || '';

  const activeShop = shops.find(s => 
    (shopIdParam && s.id === shopIdParam) || 
    (filterShopParam && s.name.toLowerCase() === filterShopParam.toLowerCase())
  );

  const filteredOrders = activeShop 
    ? orders.filter(o => o.shopId === activeShop.id) 
    : orders;

  const filteredVisits = activeShop 
    ? visits.filter(v => v.shopId === activeShop.id) 
    : visits;

  const visitsFilters = React.useMemo(() => {
    const filters: Record<string, string> = {};
    if (shopIdParam) filters.shopId = shopIdParam;
    if (filterShopParam) filters.filter_shop = filterShopParam;
    return filters;
  }, [shopIdParam, filterShopParam]);

  const ordersFilters = React.useMemo(() => {
    const filters: Record<string, string> = {};
    if (shopIdParam) filters.shopId = shopIdParam;
    if (filterShopParam) filters.filter_shop = filterShopParam;
    return filters;
  }, [shopIdParam, filterShopParam]);

  const { isOnline } = useOfflineStore();

  if (!isOnline) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-slate-400">
        <div className="text-center p-6 bg-slate-900 border border-slate-800 rounded-xl max-w-sm">
          <span className="text-4xl">📡</span>
          <h3 className="mt-4 text-md font-semibold text-slate-200">Connection Offline</h3>
          <p className="mt-2 text-xs text-slate-500 leading-normal">
            Admin console features are not available offline. Please check your internet connection or restore server connectivity.
          </p>
        </div>
      </div>
    );
  }

  // Drawer and Warning dialog state
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [selectedShopOrders, setSelectedShopOrders] = useState<Order[]>([]);
  const [isLoadingShopOrders, setIsLoadingShopOrders] = useState(false);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [blockingOrders, setBlockingOrders] = useState<any[]>([]);

  const [isAddShopOpen, setIsAddShopOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isAddOrderOpen, setIsAddOrderOpen] = useState(false);
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);

  const openActionParam = searchParams.get('open_action');

  useEffect(() => {
    if (openActionParam === 'add_shop') {
      setIsAddShopOpen(true);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('open_action');
        return next;
      }, { replace: true });
    } else if (openActionParam === 'add_product') {
      setIsAddProductOpen(true);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('open_action');
        return next;
      }, { replace: true });
    } else if (openActionParam === 'add_order') {
      setIsAddOrderOpen(true);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('open_action');
        return next;
      }, { replace: true });
    } else if (openActionParam === 'add_employee') {
      setIsAddEmployeeOpen(true);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('open_action');
        return next;
      }, { replace: true });
    }
  }, [openActionParam, setSearchParams]);

  const drawersOpen = isAddShopOpen || isAddProductOpen || isAddOrderOpen || isAddEmployeeOpen;

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      drawersOpen && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setIsAddShopOpen(false);
      setIsAddProductOpen(false);
      setIsAddOrderOpen(false);
      setIsAddEmployeeOpen(false);
      blocker.reset();
    }
  }, [blocker.state]);

  // Direct Admin placement orders state
  const [orderShopId, setOrderShopId] = useState('');
  const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>({});
  const [productSearch, setProductSearch] = useState('');

  const productFilter = React.useMemo(() => {
    return { search: productSearch };
  }, [productSearch]);

  // Payment Recording States & Handlers
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any | null>(null);
  const [isLoadingOrderDetail, setIsLoadingOrderDetail] = useState(false);
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);

  const {
    register: registerPayment,
    handleSubmit: handleSubmitPayment,
    formState: { errors: paymentErrors, isSubmitting: isPaymentSubmitting },
    reset: resetPayment,
  } = useForm({
    resolver: zodResolver(paymentInputSchema),
    defaultValues: {
      amountPaid: 0,
      paymentMethod: 'cash' as const,
      notes: '',
    },
  });

  const handleOpenCollectModal = async (order: Order) => {
    setIsLoadingOrderDetail(true);
    try {
      const res = await apiClient.get(`/orders/${order.id}`);
      setSelectedOrderDetails(res.data);
      
      const total = parseFloat(res.data.totalAmount);
      const paid = res.data.payments?.reduce((sum: number, p: any) => sum + parseFloat(p.amountPaid), 0) || 0;
      const remaining = total - paid;
      
      resetPayment({
        amountPaid: remaining,
        paymentMethod: 'cash',
        notes: '',
      });
      
      setIsCollectModalOpen(true);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to retrieve current payment history.');
    } finally {
      setIsLoadingOrderDetail(false);
    }
  };

  const handleQuickMarkPaid = async (orderId: string, method: 'cash' | 'upi' | 'bank_transfer') => {
    try {
      await markOrderPaid(orderId, method);
      toast.success(`Successfully marked order paid via ${method.toUpperCase()}!`);
      
      if (selectedShop) {
        const updatedOrders = await fetchShopOrders(selectedShop.id);
        setSelectedShopOrders(updatedOrders);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to complete quick mark paid.');
    }
  };

  const handleRecordCollection = async (data: any) => {
    if (!selectedOrderDetails) return;
    
    const total = parseFloat(selectedOrderDetails.totalAmount);
    const paid = selectedOrderDetails.payments?.reduce((sum: number, p: any) => sum + parseFloat(p.amountPaid), 0) || 0;
    const remaining = total - paid;

    if (data.amountPaid <= 0) {
      toast.error('Payment amount must be a positive number');
      return;
    }

    if (data.amountPaid > remaining + 0.01) {
      toast.error(`Payment amount exceeds remaining balance of ₹${remaining.toFixed(2)}`);
      return;
    }

    try {
      await recordPayment(selectedOrderDetails.id, {
        amountPaid: data.amountPaid,
        paymentMethod: data.paymentMethod,
        notes: data.notes?.trim() || undefined,
      });
      toast.success('Collection successfully recorded!');
      setIsCollectModalOpen(false);
      
      if (selectedShop) {
        const updatedOrders = await fetchShopOrders(selectedShop.id);
        setSelectedShopOrders(updatedOrders);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to record collection.');
    }
  };

  // React Hook Form for Editing Shop
  const {
    register: registerShop,
    handleSubmit: handleSubmitShop,
    setValue: setShopValue,
    formState: { errors: shopErrors, isSubmitting: isShopSubmitting },
    reset: resetShop,
  } = useForm({
    resolver: zodResolver(updateShopSchema),
    defaultValues: {
      name: '',
      ownerName: '',
      phone: '',
      address: '',
      latitude: 0,
      longitude: 0,
    },
  });

  // React Hook Form for Adding Product
  const {
    register: registerAddProduct,
    handleSubmit: handleSubmitAddProduct,
    formState: { errors: addProductErrors, isSubmitting: isAddProductSubmitting },
    reset: resetAddProduct,
  } = useForm({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      name: '',
      sku: '',
      price: 0,
    },
  });

  // React Hook Form for Adding Shop
  const {
    register: registerAddShop,
    handleSubmit: handleSubmitAddShop,
    formState: { errors: addShopErrors, isSubmitting: isAddShopSubmitting },
    reset: resetAddShop,
  } = useForm({
    resolver: zodResolver(createShopSchema),
    defaultValues: {
      name: '',
      ownerName: '',
      phone: '',
      address: '',
      latitude: 0,
      longitude: 0,
    },
  });

  const handleSelectShop = (shop: Shop) => {
    navigate(`/shop/${shop.id}`);
  };

  const handleEditShop = async (data: any) => {
    if (!selectedShop) return;
    try {
      await editShop(selectedShop.id, {
        name: data.name.trim(),
        ownerName: data.ownerName?.trim() || undefined,
        phone: data.phone.trim(),
        address: data.address?.trim() || undefined,
        latitude: data.latitude,
        longitude: data.longitude,
      });
      toast.success('Outlet details updated successfully.');
      fetchShops();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to update shop.');
    }
  };

  const handleRejectShop = async (shopId: string) => {
    try {
      await rejectShop(shopId);
      if (selectedShop?.id === shopId) {
        setSelectedShop(null);
      }
      fetchShops();
    } catch (err: any) {
      console.error(err);
      if (err.response?.data?.error === 'non_cancellable_orders') {
        setBlockingOrders(err.response.data.orders || []);
        setIsWarningModalOpen(true);
      } else {
        toast.error(err.response?.data?.message || 'Failed to reject shop.');
      }
    }
  };

  // Invite Link State & Handler
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);

  // React Hook Form for Adding Employee
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      username: '',
      password: '',
      email: '',
      phone: '',
      role: 'salesman' as const,
    },
  });

  const handleGenerateInvite = async () => {
    setIsGeneratingInvite(true);
    try {
      const res = await apiClient.post('/users/generate-invite');
      const token = res.data.inviteToken;
      const link = `${window.location.origin}/#/register/salesman?token=${token}`;
      setInviteLink(link);
      toast.success('Generated a secure salesman self-registration link!');
    } catch (err: any) {
      console.error('Error generating invite:', err);
      toast.error('Failed to generate invite link.');
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchShops();
    fetchVisits();
    fetchOrders();
    fetchProducts();
  }, []);

  // Handle registering a new salesman/admin employee
  const onSubmitEmployee = async (data: any) => {
    try {
      await addEmployee({
        username: data.username.trim(),
        password: data.password,
        email: data.email?.trim() || undefined,
        phone: data.phone?.trim() || undefined,
        role: data.role,
      });

      toast.success(`Successfully registered ${data.username}!`);
      reset();
      setIsAddEmployeeOpen(false);
      fetchEmployees();
    } catch (err: any) {
      console.error('Error creating employee:', err);
      const msg = err.response?.data?.error || 'Failed to create employee.';
      toast.error(msg);
    }
  };

  const onSubmitAddProduct = async (data: any) => {
    try {
      await addProduct({
        name: data.name.trim(),
        sku: data.sku?.trim() || undefined,
        price: data.price,
      });
      toast.success(`Successfully added product: ${data.name}!`);
      resetAddProduct();
      setIsAddProductOpen(false);
      fetchProducts();
    } catch (err: any) {
      console.error('Error creating product:', err);
      toast.error(err.response?.data?.error || 'Failed to create product.');
    }
  };

  const onSubmitAddShop = async (data: any) => {
    try {
      await addShop({
        name: data.name.trim(),
        ownerName: data.ownerName?.trim() || undefined,
        phone: data.phone.trim(),
        address: data.address?.trim() || undefined,
        latitude: data.latitude,
        longitude: data.longitude,
      });
      toast.success(`Successfully registered outlet: ${data.name}!`);
      resetAddShop();
      setIsAddShopOpen(false);
      fetchShops();
    } catch (err: any) {
      console.error('Error creating shop:', err);
      toast.error(err.response?.data?.error || 'Failed to register shop.');
    }
  };

  const handleAdminPlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderShopId) {
      toast.error('Please select an outlet.');
      return;
    }
    const items = Object.entries(orderQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, qty]) => {
        const p = products.find((prod) => prod.id === productId);
        return { productId, quantity: qty, unitPrice: p ? parseFloat(p.price) : 0 };
      });

    if (items.length === 0) {
      toast.error('Please select at least 1 product.');
      return;
    }

    try {
      await addOrder({ shopId: orderShopId, items });
      toast.success('B2B order successfully placed by admin!');
      setOrderQuantities({});
      setOrderShopId('');
      setIsAddOrderOpen(false);
      fetchOrders();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to place order.');
    }
  };

  return (
    <SwipeableContainer
      key={activeTab}
      onSwipeLeft={handleSwipeLeft}
      onSwipeRight={handleSwipeRight}
      contentClassName={swipeClass}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      
      {/* 4. Tab Panels */}
      
      {/* 4.1. EMPLOYEE ROSTER TAB */}
      {activeTab === 'roster' && (
        <>
          {/* 1. Header Banner */}
          <div className="panel" style={{ marginBottom: 0 }}>
            <div className="panel-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-100">
                  Console Dashboard
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Overview of <strong className="text-emerald-400">{user?.tenantName}</strong> roster, approvals, and logs.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                <span className="badge badge-admin">Hotfix Active</span>
                <span className="badge badge-active animate-pulse" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--accent-main)' }}>MySQL Connected</span>
              </div>
            </div>
          </div>

          {/* 2. Key Metrics Stats Grid */}
          <div className="grid-3">
            <div className="stats-card">
              <span className="stats-label">Total Employees</span>
              <span className="stats-number">{isLoadingEmployees ? '...' : employees.length}</span>
            </div>
            <div className="stats-card">
              <span className="stats-label">Pending Shop Approvals</span>
              <span className="stats-number">
                {isLoadingShops ? '...' : shops.filter((s) => s.status === 'pending_approval').length}
              </span>
            </div>
            <div className="stats-card">
              <span className="stats-label">Registered Outlets</span>
              <span className="stats-number">{isLoadingShops ? '...' : shops.length}</span>
            </div>
          </div>

          <PageActionWrapper
            action={{
              label: 'Add Employee',
              icon: Plus,
              onClick: () => setIsAddEmployeeOpen(true)
            }}
          >
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">Active Outriders & Salesmen</span>
                <Button onClick={fetchEmployees} variant="outline" size="sm" disabled={isLoadingEmployees}>
                  🔄 Refresh
                </Button>
              </div>
              
              <div className="panel-body" style={{ padding: 'var(--space-md)' }}>
                {isLoadingEmployees ? (
                  <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading salesmen roster...
                  </div>
                ) : employees.length === 0 ? (
                  <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No employees registered.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {employees.map((emp) => (
                      <Card 
                        key={emp.id} 
                        className="bg-[#0c100e] border-[#1a231f] cursor-pointer hover:border-slate-600 transition-all duration-200 hover:scale-[1.02]"
                        onClick={() => navigate(`/admin/employee/${emp.id}`)}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center justify-between">
                            <span className="font-bold">{emp.username}</span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${emp.role === 'admin' ? 'text-emerald-400 bg-emerald-400/10' : 'text-slate-400 bg-slate-800'}`}>
                              {emp.role}
                            </span>
                          </CardTitle>
                          <CardDescription className="text-xs text-slate-400 flex flex-col gap-1 mt-2">
                            {emp.email && <div>✉️ {emp.email}</div>}
                            {emp.phone && <div>📞 {emp.phone}</div>}
                            {!emp.email && !emp.phone && <span>No contact info</span>}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pb-3 flex items-center justify-between">
                           <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${emp.status === 'active' ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
                              {emp.status}
                            </span>
                            <span className="text-xs text-slate-500 flex items-center gap-1 font-semibold">
                              View Profile <span className="text-emerald-400">&rarr;</span>
                            </span>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </PageActionWrapper>
      </>
    )}

      {/* 4.2. OUTLET APPROVALS TAB */}
      {activeTab === 'shops' && (
        <PageActionWrapper
          action={{
            label: 'Register Shop',
            icon: Plus,
            onClick: () => setIsAddShopOpen(true)
          }}
        >
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Pending & Registered Retail Shops</span>
              <Button onClick={fetchShops} variant="outline" size="sm" disabled={isLoadingShops}>
                🔄 Refresh
              </Button>
            </div>
            <div className="panel-body" style={{ padding: 'var(--space-md)' }}>
              <PaginatedList<Shop>
                queryKeyPrefix="admin-shops"
                endpoint="/shops"
                perPage={12}
                dataKey="shops"
                itemKeyExtractor={(s) => s.id}
                listClassName="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                renderItem={(shop) => {
                  const shopOrders = orders.filter(o => o.shopId === shop.id);
                  const shopVisits = visits.filter(v => v.shopId === shop.id);
                  
                  let lastVisitedText = 'Never';
                  if (shopVisits.length > 0) {
                    const sorted = [...shopVisits].sort((a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime());
                    const lastVisitDate = new Date(sorted[0].visitedAt);
                    const day = lastVisitDate.getDate();
                    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    const month = monthNames[lastVisitDate.getMonth()];
                    const year = lastVisitDate.getFullYear();
                    lastVisitedText = `${day} ${month} ${year}`;
                  }

                  return (
                    <ShopTile
                      key={shop.id}
                      shop={shop}
                      ordersCount={shopOrders.length}
                      visitsCount={shopVisits.length}
                      lastVisitedText={lastVisitedText}
                    />
                  );
                }}
              />
            </div>
          </div>
        </PageActionWrapper>
      )}

      {/* 4.3. PRODUCTS CATALOG TAB */}
      {activeTab === 'products' && (
        <PageActionWrapper
          action={{
            label: 'Add Product',
            icon: Plus,
            onClick: () => setIsAddProductOpen(true)
          }}
        >
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Product Catalog & Warehouse Stock</span>
              <div className="flex items-center gap-4 flex-wrap">
                {/* Product search input */}
                <div className="flex items-center gap-1.5 bg-[#101512] border border-[#1a231f] rounded-xl px-2.5 py-1 shadow-lg shrink-0">
                  <span className="text-xs text-slate-400 font-medium">Search:</span>
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Filter products..."
                    className="bg-transparent text-slate-300 text-xs focus:outline-none border-none font-bold placeholder-slate-600 w-36"
                  />
                </div>
                <Button onClick={fetchProducts} variant="outline" size="sm" disabled={isLoadingProducts}>
                  🔄 Refresh
                </Button>
              </div>
            </div>
            <div className="panel-body" style={{ padding: 'var(--space-md)' }}>
              <PaginatedList<any>
                queryKeyPrefix="admin-products"
                endpoint="/products"
                perPage={12}
                searchParamsFilter={productFilter}
                dataKey="products"
                itemKeyExtractor={(p) => p.id}
                listClassName="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                renderItem={(prod) => (
                  <ProductTile key={prod.id} product={prod} />
                )}
              />
            </div>
          </div>
        </PageActionWrapper>
      )}

      {/* 4.3. PLATFORM LOGS TAB */}
      {activeTab === 'analytics' && (
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Audit Log Timeline & Visit GPS Tracker</span>
            <div className="flex items-center gap-4 flex-wrap">
              {/* Shop selector filter */}
              <div className="flex items-center gap-1.5 bg-[#101512] border border-[#1a231f] rounded-xl px-2.5 py-1.5 shadow-lg shrink-0">
                <span className="text-xs text-slate-400 font-medium">Filter Shop:</span>
                <select
                  value={activeShop ? activeShop.id : 'all'}
                  onChange={(e) => {
                    const newParams = new URLSearchParams(searchParams);
                    if (e.target.value === 'all') {
                      newParams.delete('shopId');
                      newParams.delete('filter_shop');
                    } else {
                      const selected = shops.find(s => s.id === e.target.value);
                      if (selected) {
                        newParams.set('filter_shop', selected.name);
                        newParams.set('shopId', selected.id);
                      }
                    }
                    setSearchParams(newParams);
                  }}
                  className="bg-transparent text-slate-300 text-xs focus:outline-none cursor-pointer border-none font-bold uppercase tracking-wider pr-2"
                >
                  <option value="all">All Outlets</option>
                  {shops.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <Button onClick={fetchVisits} variant="outline" size="sm" disabled={isLoadingVisits}>
                🔄 Refresh
              </Button>
            </div>
          </div>
          <div className="panel-body">
            <PaginatedList<Visit>
              queryKeyPrefix="admin-visits"
              endpoint="/visits"
              perPage={10}
              searchParamsFilter={visitsFilters}
              dataKey="visits"
              itemKeyExtractor={(v) => v.id}
              listClassName="space-y-4 relative before:absolute before:top-2 before:bottom-2 before:left-[17px] before:w-[1.5px] before:bg-emerald-950/40"
              renderItem={(visit) => (
                <div className="flex gap-4 items-start pl-1 relative z-10">
                  {/* Timeline Node */}
                  <div className="size-8 rounded-full bg-[#101512] border border-[#1a231f] flex items-center justify-center text-emerald-400 shrink-0 shadow-sm mt-0.5">
                    <MapPin className="size-3.5" />
                  </div>
                  
                  {/* Content Card */}
                  <div className="flex-1 p-4 bg-[#0c100e] border border-[#1a231f] rounded-2xl hover:border-emerald-500/20 hover:bg-[#101512]/40 transition-all flex flex-col gap-1.5 min-w-0">
                    <div className="flex justify-between items-start gap-2 flex-wrap">
                      <div>
                        <span className="text-[10px] text-slate-500 font-mono tracking-wider block">
                          {new Date(visit.visitedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}{' '}
                          {new Date(visit.visitedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-xs font-bold text-slate-200 block truncate mt-0.5">
                          Visit to <strong className="text-emerald-400">{visit.shopName}</strong>
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Outrider: {visit.salesmanName || 'Field Salesman'}
                        </span>
                      </div>
                      
                      {/* GPS status badge */}
                      <span className={`inline-flex items-center text-[8px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full border shrink-0 ${
                        visit.gpsVerified 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {visit.gpsVerified ? 'GPS Verified' : 'GPS Mismatch'}
                      </span>
                    </div>
                    
                    <p className="text-[11px] text-slate-400 font-medium italic mt-1 break-words">
                      "{visit.notes || 'Routine field inspection check-in.'}"
                    </p>
                  </div>
                </div>
              )}
            />

            <div style={{ display: 'flex', gap: 'var(--space-md)', paddingBottom: 'var(--space-sm)', borderBottom: '1px solid var(--border-default)', marginTop: '20px' }}>
              <span style={{ fontSize: '1.25rem' }}>🔐</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Business Registration Created</div>
                <p style={{ fontSize: '0.815rem', color: 'var(--text-secondary)' }}>
                  Admin account initialized and linked atomically with Tenant DB profile.
                </p>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>System Audit</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4.4. GLOBAL B2B ORDERS TAB */}
      {activeTab === 'orders' && (
        <PageActionWrapper
          action={{
            label: 'Place Order',
            icon: Plus,
            onClick: () => setIsAddOrderOpen(true)
          }}
        >
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">All B2B Orders</span>
              <div className="flex items-center gap-4 flex-wrap">
              {/* Shop selector filter */}
              <div className="flex items-center gap-1.5 bg-[#101512] border border-[#1a231f] rounded-xl px-2.5 py-1.5 shadow-lg shrink-0">
                <span className="text-xs text-slate-400 font-medium">Filter Shop:</span>
                <select
                  value={activeShop ? activeShop.id : 'all'}
                  onChange={(e) => {
                    const newParams = new URLSearchParams(searchParams);
                    if (e.target.value === 'all') {
                      newParams.delete('shopId');
                      newParams.delete('filter_shop');
                    } else {
                      const selected = shops.find(s => s.id === e.target.value);
                      if (selected) {
                        newParams.set('filter_shop', selected.name);
                        newParams.set('shopId', selected.id);
                      }
                    }
                    setSearchParams(newParams);
                  }}
                  className="bg-transparent text-slate-300 text-xs focus:outline-none cursor-pointer border-none font-bold uppercase tracking-wider pr-2"
                >
                  <option value="all">All Outlets</option>
                  {shops.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <Button onClick={fetchOrders} variant="outline" size="sm" disabled={isLoadingOrders}>
                🔄 Refresh
              </Button>
            </div>
          </div>
          <div className="panel-body" style={{ padding: 'var(--space-md)' }}>
            <PaginatedList<Order>
              queryKeyPrefix="admin-orders"
              endpoint="/orders"
              perPage={10}
              searchParamsFilter={ordersFilters}
              dataKey="orders"
              itemKeyExtractor={(o) => o.id}
              renderItem={(order) => {
                const statusColors = {
                  pending_approval: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
                  confirmed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                  dispatched: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                  delivered: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
                };
                const paymentColors = {
                  unpaid: 'bg-red-500/10 text-red-400 border border-red-500/20',
                  partially_paid: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                  paid: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
                };
                return (
                  <div
                    onClick={() => navigate(`/order/${order.id}`)}
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-[#0c100e] border border-[#1a231f] rounded-2xl hover:border-emerald-500/20 hover:bg-[#101512]/40 transition-all cursor-pointer gap-4 group"
                  >
                    {/* Left: ID & Shop info */}
                    <div className="flex gap-3 items-center min-w-0">
                      <div className="size-10 rounded-xl bg-emerald-950/20 border border-emerald-900/40 flex items-center justify-center text-emerald-400 shrink-0">
                        <Package className="size-5 text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-slate-400 uppercase">
                            #{order.id.substring(0, 8)}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <span className="font-bold text-sm text-slate-200 block truncate group-hover:text-emerald-400 transition-colors mt-0.5">
                          {order.shopName || 'B2B Shop'}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          Outrider: {order.salesmanName || 'Field Salesman'}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Badges */}
                    <div className="flex gap-2 items-center flex-wrap">
                      <span className={cn(
                        "inline-flex items-center text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shrink-0",
                        statusColors[order.status as keyof typeof statusColors] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                      )}>
                        {order.status.replace('_', ' ')}
                      </span>
                      <span className={cn(
                        "inline-flex items-center text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shrink-0",
                        paymentColors[order.paymentStatus as keyof typeof paymentColors] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                      )}>
                        {order.paymentStatus.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded capitalize shrink-0">
                        {order.orderSource}
                      </span>
                    </div>

                    {/* Right: Bill & Actions */}
                    <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 border-[#1a231f] pt-3 md:pt-0">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block font-medium">Total Bill</span>
                        <span className="text-sm font-extrabold text-emerald-400 font-sans">
                          ₹{parseFloat(order.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {order.paymentStatus !== 'paid' && order.status !== 'cancelled' && (
                          <Button
                            size="sm"
                            className="h-8 text-xs font-semibold px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-[#050806]"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCollectModal(order);
                            }}
                          >
                            Collect
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Manage"
                          className="size-8 bg-[#101512] hover:bg-[#1a231f] text-slate-400 group-hover:text-emerald-400 rounded-xl transition-colors"
                        >
                          <ChevronRight className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
          </div>
        </div>
      </PageActionWrapper>
      )}

      {/* Global Modals */}
      {isWarningModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in-0 duration-200">
          <div className="bg-[#18221f] border border-[#2a3c36] rounded-lg max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 relative animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 border-b border-[#2a3c36] pb-3">
              <span className="text-xl">⚠️</span>
              <h3 className="text-lg font-bold text-red-400">Rejection Blocked: Fiscal Audit Safe</h3>
            </div>
            
            <p className="text-sm text-slate-300 leading-relaxed">
              This outlet cannot be rejected because it contains B2B orders that have already been <strong>dispatched</strong> or <strong>delivered</strong>. 
              Rejection is blocked to ensure strict compliance with fiscal audit trails and tax record requirements.
            </p>
            
            <div className="table-wrapper max-h-60 overflow-y-auto border border-[#2a3c36] rounded-md">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Fulfillment Status</th>
                  </tr>
                </thead>
                <tbody>
                  {blockingOrders.map((ord) => (
                    <tr key={ord.id} className="border-b border-[#2a3c36] hover:bg-emerald-950/20">
                      <td className="font-mono text-xs text-slate-300">{ord.id.slice(0, 8)}...</td>
                      <td className="text-xs text-slate-400">{new Date(ord.createdAt).toLocaleDateString()}</td>
                      <td className="font-semibold text-emerald-400 text-xs">₹{parseFloat(ord.totalAmount).toLocaleString()}</td>
                      <td>
                        <span className={`badge ${ord.status === 'delivered' ? 'badge-approved' : 'badge-admin'}`} style={{ fontSize: '0.65rem' }}>
                          {ord.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-end gap-3 pt-3 border-t border-[#2a3c36]">
              <Button 
                type="button" 
                onClick={() => setIsWarningModalOpen(false)}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2"
              >
                Acknowledge & Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reusable sliding drawers for CRUD operations */}

      {/* Add Shop Sheet */}
      <Sheet open={isAddShopOpen} onOpenChange={setIsAddShopOpen}>
        <SheetContent side="bottom" className="sm:max-w-xl mx-auto rounded-t-xl bg-[#0a0d0b] border-[#1a231f] text-neutral-50 p-6 flex flex-col gap-6">
          <SheetHeader className="p-0 border-b border-[#1a231f] pb-4 text-left">
            <SheetTitle className="text-xl font-bold text-neutral-50 flex items-center gap-2">
              <Store className="size-5 text-emerald-400" />
              Register New Outlet
            </SheetTitle>
            <SheetDescription className="text-xs text-neutral-400">
              Add a new retail store to your company roster.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmitAddShop(onSubmitAddShop)} className="flex flex-col gap-4">
            <FieldGroup>
              <Field data-invalid={!!addShopErrors.name}>
                <FieldLabel htmlFor="add-shop-name">Store Name *</FieldLabel>
                <Input id="add-shop-name" {...registerAddShop('name')} disabled={isAddShopSubmitting} className="bg-[#101512] border-[#1a231f]" />
                <FieldError>{addShopErrors.name?.message}</FieldError>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field data-invalid={!!addShopErrors.ownerName}>
                  <FieldLabel htmlFor="add-shop-owner">Owner Name</FieldLabel>
                  <Input id="add-shop-owner" {...registerAddShop('ownerName')} disabled={isAddShopSubmitting} className="bg-[#101512] border-[#1a231f]" />
                  <FieldError>{addShopErrors.ownerName?.message}</FieldError>
                </Field>
                <Field data-invalid={!!addShopErrors.phone}>
                  <FieldLabel htmlFor="add-shop-phone">Contact Phone *</FieldLabel>
                  <Input id="add-shop-phone" type="tel" {...registerAddShop('phone')} disabled={isAddShopSubmitting} className="bg-[#101512] border-[#1a231f]" />
                  <FieldError>{addShopErrors.phone?.message}</FieldError>
                </Field>
              </div>
              <Field data-invalid={!!addShopErrors.address}>
                <FieldLabel htmlFor="add-shop-address">Street Address</FieldLabel>
                <Input id="add-shop-address" {...registerAddShop('address')} disabled={isAddShopSubmitting} className="bg-[#101512] border-[#1a231f]" />
                <FieldError>{addShopErrors.address?.message}</FieldError>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field data-invalid={!!addShopErrors.latitude}>
                  <FieldLabel htmlFor="add-shop-lat">Latitude</FieldLabel>
                  <Input id="add-shop-lat" type="number" step="any" {...registerAddShop('latitude', { valueAsNumber: true })} disabled={isAddShopSubmitting} className="font-mono text-xs bg-[#101512] border-[#1a231f]" />
                  <FieldError>{addShopErrors.latitude?.message}</FieldError>
                </Field>
                <Field data-invalid={!!addShopErrors.longitude}>
                  <FieldLabel htmlFor="add-shop-lng">Longitude</FieldLabel>
                  <Input id="add-shop-lng" type="number" step="any" {...registerAddShop('longitude', { valueAsNumber: true })} disabled={isAddShopSubmitting} className="font-mono text-xs bg-[#101512] border-[#1a231f]" />
                  <FieldError>{addShopErrors.longitude?.message}</FieldError>
                </Field>
              </div>
            </FieldGroup>
            <Button type="submit" disabled={isAddShopSubmitting} className="mt-2 w-full py-6 text-sm">
              {isAddShopSubmitting ? 'Registering...' : 'Register Outlet'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      {/* Add Product Sheet */}
      <Sheet open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
        <SheetContent side="bottom" className="sm:max-w-xl mx-auto rounded-t-xl bg-[#0a0d0b] border-[#1a231f] text-neutral-50 p-6 flex flex-col gap-6">
          <SheetHeader className="p-0 border-b border-[#1a231f] pb-4 text-left">
            <SheetTitle className="text-xl font-bold text-neutral-50 flex items-center gap-2">
              <Package className="size-5 text-emerald-400" />
              Add Product to Catalog
            </SheetTitle>
            <SheetDescription className="text-xs text-neutral-400">
              Create a new product SKU in your warehouse inventory list.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmitAddProduct(onSubmitAddProduct)} className="flex flex-col gap-4">
            <FieldGroup>
              <Field data-invalid={!!addProductErrors.name}>
                <FieldLabel htmlFor="add-prod-name">Product Name *</FieldLabel>
                <Input id="add-prod-name" placeholder="e.g. Sparkle Mint 1L" {...registerAddProduct('name')} disabled={isAddProductSubmitting} className="bg-[#101512] border-[#1a231f]" />
                <FieldError>{addProductErrors.name?.message}</FieldError>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field data-invalid={!!addProductErrors.sku}>
                  <FieldLabel htmlFor="add-prod-sku">Unique SKU</FieldLabel>
                  <Input id="add-prod-sku" placeholder="e.g. SPK-MNT-1000" {...registerAddProduct('sku')} disabled={isAddProductSubmitting} className="bg-[#101512] border-[#1a231f]" />
                  <FieldError>{addProductErrors.sku?.message}</FieldError>
                </Field>
                <Field data-invalid={!!addProductErrors.price}>
                  <FieldLabel htmlFor="add-prod-price">Price Point (₹) *</FieldLabel>
                  <Input id="add-prod-price" type="number" step="0.01" {...registerAddProduct('price', { valueAsNumber: true })} disabled={isAddProductSubmitting} className="bg-[#101512] border-[#1a231f]" />
                  <FieldError>{addProductErrors.price?.message}</FieldError>
                </Field>
              </div>
            </FieldGroup>
            <Button type="submit" disabled={isAddProductSubmitting} className="mt-2 w-full py-6 text-sm">
              {isAddProductSubmitting ? 'Creating...' : 'Create Product SKU'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      {/* Add B2B Order Drawer */}
      <Sheet open={isAddOrderOpen} onOpenChange={setIsAddOrderOpen}>
        <SheetContent side="bottom" className="sm:max-w-xl mx-auto rounded-t-xl bg-[#0a0d0b] border-[#1a231f] text-neutral-50 p-6 flex flex-col gap-6 max-h-[85vh] overflow-y-auto">
          <SheetHeader className="p-0 border-b border-[#1a231f] pb-4 text-left">
            <SheetTitle className="text-xl font-bold text-neutral-50 flex items-center gap-2">
              <ShoppingCart className="size-5 text-emerald-400" />
              Place Direct B2B Order
            </SheetTitle>
            <SheetDescription className="text-xs text-neutral-400">
              Place a soap order directly under active operational shops.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleAdminPlaceOrder} className="flex flex-col gap-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="order-shop-select">Target Retail Shop *</FieldLabel>
                <Select onValueChange={(val: any) => setOrderShopId(val)}>
                  <SelectTrigger id="order-shop-select" className="bg-[#101512] border-[#1a231f]">
                    <SelectValue placeholder="Choose target shop" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#101512] border-[#1a231f] text-slate-200">
                    {shops.filter(s => s.status === 'approved').map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              
              <div className="flex flex-col gap-2 mt-2 max-h-[250px] overflow-y-auto pr-1">
                <span className="text-xs font-bold text-slate-300 block mb-1">Detergent Catalog</span>
                {products.map((prod) => (
                  <div key={prod.id} className="flex items-center justify-between bg-[#101512] p-3 rounded-xl border border-[#1a231f]">
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-xs text-slate-200 truncate">{prod.name}</span>
                      <span className="text-[11px] text-[#e1fd52] font-semibold mt-0.5">₹{parseFloat(prod.price).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-3 bg-[#0c100e] border border-[#1a231f] rounded-xl p-1 shrink-0">
                      <button 
                        type="button" 
                        onClick={() => setOrderQuantities(prev => ({ ...prev, [prod.id]: Math.max(0, (prev[prod.id] || 0) - 1) }))} 
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#142217] active:bg-[#1b2f20] text-emerald-400 font-extrabold text-sm select-none cursor-pointer border-none outline-none"
                      >
                        -
                      </button>
                      <span className="w-4 text-center text-xs font-bold text-slate-300">{orderQuantities[prod.id] || 0}</span>
                      <button 
                        type="button" 
                        onClick={() => setOrderQuantities(prev => ({ ...prev, [prod.id]: (prev[prod.id] || 0) + 1 }))} 
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#142217] active:bg-[#1b2f20] text-emerald-400 font-extrabold text-sm select-none cursor-pointer border-none outline-none"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </FieldGroup>
            
            <div className="flex items-center justify-between border-t border-[#1a231f] pt-4 mt-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Order Amount</span>
              <span className="text-lg font-extrabold text-[#e1fd52]">
                ₹{products.reduce((total, prod) => total + (orderQuantities[prod.id] || 0) * parseFloat(prod.price), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            
            <Button 
              type="submit" 
              disabled={!orderShopId || products.reduce((sum, p) => sum + (orderQuantities[p.id] || 0), 0) === 0} 
              className="mt-2 w-full py-6 text-sm"
            >
              Submit Order
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      {/* Add Employee Drawer */}
      <Sheet open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
        <SheetContent side="bottom" className="sm:max-w-xl mx-auto rounded-t-xl bg-[#0a0d0b] border-[#1a231f] text-neutral-50 p-6 flex flex-col gap-6 max-h-[85vh] overflow-y-auto">
          <SheetHeader className="p-0 border-b border-[#1a231f] pb-4 text-left">
            <SheetTitle className="text-xl font-bold text-neutral-50 flex items-center gap-2">
              <Users className="size-5 text-emerald-400" />
              Add New Employee
            </SheetTitle>
            <SheetDescription className="text-xs text-neutral-400">
              Register a new employee/salesman or share a secure self-registration link.
            </SheetDescription>
          </SheetHeader>
          
          <form onSubmit={handleSubmit(onSubmitEmployee)} className="flex flex-col gap-4">
            <FieldGroup>
              <Field data-invalid={!!errors.username}>
                <FieldLabel htmlFor="new-emp-name">Username *</FieldLabel>
                <Input
                  id="new-emp-name"
                  type="text"
                  placeholder="e.g. jason_field"
                  {...register('username')}
                  disabled={isSubmitting}
                  aria-invalid={!!errors.username}
                  className="bg-[#101512] border-[#1a231f]"
                />
                <FieldError>{errors.username?.message}</FieldError>
              </Field>

              <Field data-invalid={!!errors.password}>
                <FieldLabel htmlFor="new-emp-pass">Temporary Password *</FieldLabel>
                <Input
                  id="new-emp-pass"
                  type="password"
                  placeholder="Min 8 characters"
                  {...register('password')}
                  disabled={isSubmitting}
                  aria-invalid={!!errors.password}
                  className="bg-[#101512] border-[#1a231f]"
                />
                <FieldError>{errors.password?.message}</FieldError>
              </Field>

              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="new-emp-email">Email Address</FieldLabel>
                <Input
                  id="new-emp-email"
                  type="email"
                  placeholder="e.g. jason@soapco.com"
                  {...register('email')}
                  disabled={isSubmitting}
                  aria-invalid={!!errors.email}
                  className="bg-[#101512] border-[#1a231f]"
                />
                <FieldError>{errors.email?.message}</FieldError>
              </Field>

              <Field data-invalid={!!errors.phone}>
                <FieldLabel htmlFor="new-emp-phone">Phone Number</FieldLabel>
                <Input
                  id="new-emp-phone"
                  type="tel"
                  placeholder="e.g. 9821034455"
                  {...register('phone')}
                  disabled={isSubmitting}
                  aria-invalid={!!errors.phone}
                  className="bg-[#101512] border-[#1a231f]"
                />
                <FieldError>{errors.phone?.message}</FieldError>
              </Field>

              <Field data-invalid={!!errors.role}>
                <FieldLabel htmlFor="new-emp-role">System Access Role</FieldLabel>
                <Select
                  defaultValue="salesman"
                  onValueChange={(val: any) => setValue('role', val)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="new-emp-role" className="w-full bg-[#101512] border-[#1a231f]">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#101512] border-[#1a231f] text-slate-200">
                    <SelectItem value="salesman">Field Salesman</SelectItem>
                    <SelectItem value="admin">Business Administrator</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError>{errors.role?.message}</FieldError>
              </Field>
            </FieldGroup>

            <Button
              type="submit"
              className="w-full mt-2 py-6 text-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Registering...' : 'Register Employee'}
            </Button>
          </form>

          <div className="border-t border-[#1a231f] pt-4 flex flex-col gap-2">
            <h4 className="text-sm font-semibold text-slate-200">
              Or, Share Self-Registration Link
            </h4>
            <p className="text-xs text-slate-400 leading-normal">
              Let salesmen choose their own username & password by sharing a secure registration link.
            </p>
            {inviteLink ? (
              <div className="flex flex-col gap-2 mt-1">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={inviteLink}
                    readOnly
                    className="text-xs font-mono bg-[#101512] border-[#1a231f] flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="shrink-0 h-9.5 px-3 text-xs"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteLink);
                      toast.success('Invite link copied to clipboard!');
                    }}
                  >
                    Copy Link
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateInvite}
                  disabled={isGeneratingInvite}
                  className="w-full text-xs h-9"
                >
                  {isGeneratingInvite ? 'Generating...' : 'Regenerate Invite Link'}
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={handleGenerateInvite}
                disabled={isGeneratingInvite}
                className="w-full text-xs h-9.5 mt-1 border-[#1a231f] hover:bg-[#1a231f]"
              >
                {isGeneratingInvite ? 'Generating...' : '🔑 Generate Invite Link'}
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
      </div>
    </SwipeableContainer>
  );
};
