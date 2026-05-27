import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAppStore, Shop, Order } from '../../stores/appStore.js';
import { useAuthStore } from '../../stores/authStore.js';
import { apiClient } from '../../api/client.js';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateShopSchema } from '@sales-app/shared';
import { z } from 'zod';
import { OrderTable } from '../../components/orders/OrderTable.js';

import { Field, FieldLabel, FieldError, FieldGroup } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { ChevronLeft, ArrowLeft, IndianRupee, CheckCircle2, Clock, MapPin, Phone, User, Settings, Lock, ShoppingCart } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

const paymentInputSchema = z.object({
  amountPaid: z.number({ invalid_type_error: "Amount is required" }).positive("Amount must be positive"),
  paymentMethod: z.enum(['cash', 'upi', 'bank_transfer']),
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional(),
});

export const AdminShopDetails: React.FC = () => {
  const { shopId } = useParams<{ shopId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { 
    shops, fetchShops, editShop, fetchShopOrders, recordPayment, markOrderPaid,
    visits, fetchVisits, isLoadingVisits 
  } = useAppStore();

  const [shop, setShop] = useState<Shop | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Payment Collection States
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any | null>(null);
  const [isLoadingOrderDetail, setIsLoadingOrderDetail] = useState(false);
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);

  const {
    register: registerShop,
    handleSubmit: handleSubmitShop,
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

  useEffect(() => {
    // Attempt to load shop
    const foundShop = shops.find(s => s.id === shopId);
    if (foundShop) {
      setShop(foundShop);
      resetShop({
        name: foundShop.name,
        ownerName: foundShop.ownerName || '',
        phone: foundShop.phone,
        address: foundShop.address || '',
        latitude: foundShop.latitude ? parseFloat(foundShop.latitude) : 0,
        longitude: foundShop.longitude ? parseFloat(foundShop.longitude) : 0,
      });
    } else {
      // Fetch shops if not loaded
      fetchShops().then(() => {
        const s = useAppStore.getState().shops.find(s => s.id === shopId);
        if (s) {
          setShop(s);
          resetShop({
            name: s.name,
            ownerName: s.ownerName || '',
            phone: s.phone,
            address: s.address || '',
            latitude: s.latitude ? parseFloat(s.latitude) : 0,
            longitude: s.longitude ? parseFloat(s.longitude) : 0,
          });
        }
      });
    }

    if (shopId) {
      setIsLoadingOrders(true);
      fetchShopOrders(shopId).then(fetchedOrders => {
        const filtered = user?.role === 'salesman'
          ? fetchedOrders.filter(o => o.salesmanId === user.id)
          : fetchedOrders;
        setOrders(filtered);
        setIsLoadingOrders(false);
      }).catch(err => {
        console.error(err);
        toast.error('Failed to load shop orders.');
        setIsLoadingOrders(false);
      });

      fetchVisits().catch(err => {
        console.error('Failed to load visits:', err);
      });
    }
  }, [shopId, shops.length]);

  const handleEditShop = async (data: any) => {
    if (!shop) return;
    try {
      await editShop(shop.id, {
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

  const handleRecordCollection = async (data: any) => {
    if (!selectedOrderDetails) return;
    
    const total = parseFloat(selectedOrderDetails.totalAmount);
    const paid = selectedOrderDetails.payments?.reduce((sum: number, p: any) => sum + parseFloat(p.amountPaid), 0) || 0;
    const remaining = total - paid;

    if (data.amountPaid <= 0) return toast.error('Payment amount must be a positive number');
    if (data.amountPaid > remaining + 0.01) return toast.error(`Payment amount exceeds remaining balance of ₹${remaining.toFixed(2)}`);

    try {
      await recordPayment(selectedOrderDetails.id, {
        amountPaid: data.amountPaid,
        paymentMethod: data.paymentMethod,
        notes: data.notes?.trim() || undefined,
      });
      toast.success('Collection successfully recorded!');
      setIsCollectModalOpen(false);
      
      if (shop) {
        const updatedOrders = await fetchShopOrders(shop.id);
        setOrders(updatedOrders);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to record collection.');
    }
  };

  const handleQuickMarkPaid = async (orderId: string, method: 'cash' | 'upi' | 'bank_transfer') => {
    try {
      await markOrderPaid(orderId, method);
      toast.success(`Successfully marked order paid via ${method.toUpperCase()}!`);
      if (shop) {
        const updatedOrders = await fetchShopOrders(shop.id);
        setOrders(updatedOrders);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to complete quick mark paid.');
    }
  };

  if (!shop) {
    return <div className="p-8 text-center text-slate-400">Loading shop profile...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#050806] text-slate-100 pb-12">
      {/* 1. Header with Back Button */}
      <div className="sticky top-0 z-20 bg-[#050806]/80 backdrop-blur-md border-b border-[#1a231f] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate(user?.role === 'admin' ? '/admin?tab=shops' : '/salesman?tab=shops');
              }
            }} 
            className="p-1.5 hover:bg-[#1a231f] rounded-full transition-colors flex items-center justify-center -ml-2"
          >
            <ArrowLeft className="size-5 text-emerald-400" />
          </button>
          <div>
            <h1 className="text-lg font-bold leading-tight">{shop.name}</h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">Outlet Details</p>
          </div>
        </div>

        {/* Role Perspective Badge */}
        <div className="shrink-0">
          {user?.role === 'admin' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-extrabold uppercase tracking-wide rounded-full shadow-md">
              <Settings className="size-3 text-emerald-400 shrink-0" />
              <span>Admin View</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-extrabold uppercase tracking-wide rounded-full shadow-md">
              <Lock className="size-3 text-blue-400 shrink-0" />
              <span>Read-Only</span>
            </span>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-6">
        
        {/* 2. Edit/Profile Details Card */}
        <Card className="bg-[#0c100e] border-[#1a231f]">
          <CardHeader className="pb-3 border-b border-[#1a231f]">
            <CardTitle className="text-sm flex items-center gap-2 text-slate-200">
              <User className="size-4 text-emerald-500" />
              Outlet Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {!isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Store Name & Owner Name */}
                  <div className="flex items-start gap-3 bg-[#101512] p-3 rounded-lg border border-[#1a231f]">
                    <User className="size-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Store Name</span>
                      <span className="text-sm font-semibold text-slate-200 block truncate">{shop.name}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-[#101512] p-3 rounded-lg border border-[#1a231f]">
                    <User className="size-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Owner Name</span>
                      <span className="text-sm font-semibold text-slate-200 block truncate">{shop.ownerName || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Contact Number & Address */}
                  <div className="flex items-start gap-3 bg-[#101512] p-3 rounded-lg border border-[#1a231f]">
                    <Phone className="size-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Contact Number</span>
                      <span className="text-sm font-semibold text-slate-200 block truncate">{shop.phone}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-[#101512] p-3 rounded-lg border border-[#1a231f]">
                    <MapPin className="size-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Street Address</span>
                      <span className="text-sm font-semibold text-slate-200 block truncate">{shop.address || 'No address registered'}</span>
                    </div>
                  </div>
                </div>

                {/* Collapsible Coordinates Disclosure (Progressive Disclosure) */}
                <details className="group bg-[#101512]/60 border border-[#1a231f] rounded-lg overflow-hidden">
                  <summary className="flex items-center justify-between p-3 cursor-pointer select-none hover:bg-[#101512] transition-colors text-xs font-bold text-slate-400">
                    <div className="flex items-center gap-2">
                      <MapPin className="size-4 text-emerald-500" />
                      <span>Geographical Coordinates & Audit</span>
                    </div>
                    <span className="text-[10px] text-slate-500 group-open:rotate-180 transition-transform">&darr;</span>
                  </summary>
                  <div className="p-3 pt-0 border-t border-[#1a231f]/20 text-[11px] font-mono text-slate-500 space-y-2 mt-2">
                    <div className="flex justify-between">
                      <span>Latitude:</span>
                      <span className="text-slate-300 font-semibold">{shop.latitude || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Longitude:</span>
                      <span className="text-slate-300 font-semibold">{shop.longitude || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Outlet ID:</span>
                      <span className="text-slate-400 font-semibold">{shop.id}</span>
                    </div>
                  </div>
                </details>

                {/* Action button for Admin contextual edit */}
                {user?.role === 'admin' && (
                  <Button 
                    type="button" 
                    onClick={() => setIsEditing(true)}
                    className="w-full bg-[#1a231f] hover:bg-[#22302a] border border-[#2a3c35] text-emerald-400 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5"
                  >
                    <Settings className="size-3.5" />
                    <span>Edit Profile Details</span>
                  </Button>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmitShop(async (data) => {
                await handleEditShop(data);
                setIsEditing(false);
              })} className="flex flex-col gap-4">
                <FieldGroup>
                  <Field data-invalid={!!shopErrors.name}>
                    <FieldLabel htmlFor="edit-shop-name">Store Name *</FieldLabel>
                    <Input id="edit-shop-name" type="text" {...registerShop('name')} disabled={isShopSubmitting} aria-invalid={!!shopErrors.name} className="bg-[#101512] border-[#1a231f]" />
                    <FieldError>{shopErrors.name?.message}</FieldError>
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field data-invalid={!!shopErrors.ownerName}>
                      <FieldLabel htmlFor="edit-shop-owner">Owner Name</FieldLabel>
                      <Input id="edit-shop-owner" type="text" {...registerShop('ownerName')} disabled={isShopSubmitting} aria-invalid={!!shopErrors.ownerName} className="bg-[#101512] border-[#1a231f]" />
                      <FieldError>{shopErrors.ownerName?.message}</FieldError>
                    </Field>
                    <Field data-invalid={!!shopErrors.phone}>
                      <FieldLabel htmlFor="edit-shop-phone">Contact No. *</FieldLabel>
                      <Input id="edit-shop-phone" type="tel" {...registerShop('phone')} disabled={isShopSubmitting} aria-invalid={!!shopErrors.phone} className="bg-[#101512] border-[#1a231f]" />
                      <FieldError>{shopErrors.phone?.message}</FieldError>
                    </Field>
                  </div>

                  <Field data-invalid={!!shopErrors.address}>
                    <FieldLabel htmlFor="edit-shop-address">Street Address</FieldLabel>
                    <Input id="edit-shop-address" type="text" {...registerShop('address')} disabled={isShopSubmitting} aria-invalid={!!shopErrors.address} className="bg-[#101512] border-[#1a231f]" />
                    <FieldError>{shopErrors.address?.message}</FieldError>
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field data-invalid={!!shopErrors.latitude}>
                      <FieldLabel htmlFor="edit-shop-latitude">Latitude</FieldLabel>
                      <Input id="edit-shop-latitude" type="number" step="any" {...registerShop('latitude', { valueAsNumber: true })} disabled={isShopSubmitting} className="font-mono text-xs bg-[#101512] border-[#1a231f]" />
                      <FieldError>{shopErrors.latitude?.message}</FieldError>
                    </Field>
                    <Field data-invalid={!!shopErrors.longitude}>
                      <FieldLabel htmlFor="edit-shop-longitude">Longitude</FieldLabel>
                      <Input id="edit-shop-longitude" type="number" step="any" {...registerShop('longitude', { valueAsNumber: true })} disabled={isShopSubmitting} className="font-mono text-xs bg-[#101512] border-[#1a231f]" />
                      <FieldError>{shopErrors.longitude?.message}</FieldError>
                    </Field>
                  </div>
                </FieldGroup>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      resetShop();
                      setIsEditing(false);
                    }}
                    disabled={isShopSubmitting} 
                    className="w-full border-[#1a231f] text-slate-400 hover:bg-slate-900/10"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isShopSubmitting} className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold">
                    {isShopSubmitting ? 'Updating...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* 3. Dashboard Split Grid (Orders & Visits side-by-side) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* LEFT PANEL: B2B Order Ledger */}
          <Card className="bg-[#0c100e] border-[#1a231f] flex flex-col h-full">
            <CardHeader className="pb-3 border-b border-[#1a231f] flex flex-row items-center justify-between gap-4">
              <div className="min-w-0">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-200 uppercase tracking-wider">
                  <ShoppingCart className="size-4 text-emerald-500 shrink-0" />
                  <span className="truncate">Recent Orders</span>
                  <span className="text-xs bg-[#1a231f] text-slate-300 py-0.5 px-2 rounded-full font-normal shrink-0">
                    {orders.length}
                  </span>
                </CardTitle>
                <CardDescription className="text-[11px] text-slate-400 mt-1 truncate">
                  Up to 5 most recent orders placed for this outlet.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const path = user?.role === 'admin' 
                    ? `/admin?tab=orders&filter_shop=${encodeURIComponent(shop.name)}` 
                    : `/salesman?tab=orders&filter_shop=${encodeURIComponent(shop.name)}`;
                  navigate(path);
                }}
                className="h-8 text-[11px] font-bold border-emerald-500/20 text-emerald-400 hover:bg-emerald-950/20 px-3 shrink-0"
              >
                View All
              </Button>
            </CardHeader>
            <CardContent className="pt-4 flex-1">
              {isLoadingOrders ? (
                <div className="py-12 text-center text-xs text-slate-500">Loading shop orders...</div>
              ) : orders.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center justify-center gap-2">
                  <span className="text-2xl grayscale opacity-55">🧾</span>
                  <p className="text-xs text-slate-400">No orders recorded yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 5)
                    .map((order) => {
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
                          key={order.id}
                          onClick={() => navigate(`/order/${order.id}`)}
                          className="p-3 bg-[#101512] border border-[#1a231f] rounded-xl hover:border-emerald-500/30 transition-all cursor-pointer flex flex-col gap-2 group"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-mono text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition-colors uppercase">
                                #{order.id.substring(0, 8)}
                              </span>
                              <span className="text-[10px] text-slate-500 block mt-0.5">
                                {new Date(order.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className={`inline-flex items-center text-[8px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusColors[order.status as keyof typeof statusColors]}`}>
                                {order.status.replace('_', ' ')}
                              </span>
                              <span className={`inline-flex items-center text-[8px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${paymentColors[order.paymentStatus as keyof typeof paymentColors]}`}>
                                {order.paymentStatus.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between border-t border-[#1a231f]/20 pt-2 mt-1">
                            <span className="text-[10px] text-slate-400">Total Invoice:</span>
                            <span className="font-extrabold text-xs text-emerald-400 font-sans">
                              ₹{parseFloat(order.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* RIGHT PANEL: Outrider Proximity Visits Log */}
          <Card className="bg-[#0c100e] border-[#1a231f] flex flex-col h-full">
            <CardHeader className="pb-3 border-b border-[#1a231f] flex flex-row items-center justify-between gap-4">
              <div className="min-w-0">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-200 uppercase tracking-wider">
                  <MapPin className="size-4 text-emerald-500 shrink-0" />
                  <span className="truncate">Recent Visits</span>
                  <span className="text-xs bg-[#1a231f] text-slate-300 py-0.5 px-2 rounded-full font-normal shrink-0">
                    {visits.filter(v => v.shopId === shopId && (user?.role === 'admin' || v.salesmanId === user?.id)).length}
                  </span>
                </CardTitle>
                <CardDescription className="text-[11px] text-slate-400 mt-1 truncate">
                  Up to 5 most recent check-ins logged.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const path = user?.role === 'admin' 
                    ? `/admin?tab=analytics&shopId=${shopId}` 
                    : `/salesman?tab=visits&shopId=${shopId}`;
                  navigate(path);
                }}
                className="h-8 text-[11px] font-bold border-emerald-500/20 text-emerald-400 hover:bg-emerald-950/20 px-3 shrink-0"
              >
                View All
              </Button>
            </CardHeader>
            <CardContent className="pt-4 flex-1">
              {isLoadingVisits ? (
                <div className="py-12 text-center text-xs text-slate-500">Loading visit logs...</div>
              ) : visits.filter(v => v.shopId === shopId && (user?.role === 'admin' || v.salesmanId === user?.id)).length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center justify-center gap-2">
                  <span className="text-2xl grayscale opacity-55">📍</span>
                  <p className="text-xs text-slate-400">No visits logged yet.</p>
                </div>
              ) : (
                <div className="space-y-4 relative before:absolute before:top-2 before:bottom-2 before:left-[17px] before:w-[1.5px] before:bg-emerald-950/40">
                  {visits
                    .filter(v => v.shopId === shopId && (user?.role === 'admin' || v.salesmanId === user?.id))
                    .sort((a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime())
                    .slice(0, 5)
                    .map((visit) => (
                      <div key={visit.id} className="flex gap-4 items-start pl-1 relative z-10">
                        {/* Timeline Node */}
                        <div className="size-8 rounded-full bg-[#101512] border border-[#1a231f] flex items-center justify-center text-emerald-400 shrink-0 shadow-sm mt-0.5">
                          <MapPin className="size-3.5" />
                        </div>
                        
                        {/* Content Card */}
                        <div className="flex-1 p-3 bg-[#101512] border border-[#1a231f] rounded-xl flex flex-col gap-1.5 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0">
                              <span className="text-[10px] text-slate-500 font-mono tracking-wider block">
                                {new Date(visit.visitedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}{' '}
                                {new Date(visit.visitedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {user?.role === 'admin' && (
                                <span className="text-xs font-semibold text-slate-200 block truncate mt-0.5">
                                  Outrider: {visit.salesmanName || 'Field Salesman'}
                                </span>
                              )}
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
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Payment Collection Drawer */}
      <Sheet open={isCollectModalOpen} onOpenChange={setIsCollectModalOpen}>
        <SheetContent side="bottom" className="sm:max-w-xl mx-auto rounded-t-xl bg-[#0a0d0b] border-[#1a231f] text-neutral-50 p-6 flex flex-col gap-6">
          <SheetHeader className="p-0 border-b border-[#1a231f] pb-4 text-left">
            <SheetTitle className="text-xl font-bold text-neutral-50 flex items-center gap-2">
              <IndianRupee className="size-5 text-emerald-400" />
              Collect Payment
            </SheetTitle>
            <SheetDescription className="text-xs text-neutral-400">
              Record a payment for this invoice.
            </SheetDescription>
          </SheetHeader>

          {selectedOrderDetails && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center bg-[#101512] p-3 rounded-lg border border-[#1a231f]">
                <span className="text-sm font-medium text-slate-300">Total Invoice</span>
                <span className="text-lg font-bold text-emerald-400">₹{parseFloat(selectedOrderDetails.totalAmount).toFixed(2)}</span>
              </div>

              <form onSubmit={handleSubmitPayment(handleRecordCollection)} className="flex flex-col gap-4">
                <FieldGroup>
                  <Field data-invalid={!!paymentErrors.amountPaid}>
                    <FieldLabel htmlFor="field-pay-amount">Amount Collecting (₹)</FieldLabel>
                    <Input id="field-pay-amount" type="number" step="0.01" {...registerPayment('amountPaid', { valueAsNumber: true })} className="text-lg font-bold text-emerald-400 bg-[#101512] border-[#1a231f]" />
                    <FieldError>{paymentErrors.amountPaid?.message}</FieldError>
                  </Field>

                  <Field data-invalid={!!paymentErrors.paymentMethod}>
                    <FieldLabel htmlFor="field-pay-method">Payment Method</FieldLabel>
                    <Select defaultValue="cash" onValueChange={(val: any) => resetPayment(prev => ({ ...prev, paymentMethod: val }))}>
                      <SelectTrigger className="bg-[#101512] border-[#1a231f]">
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#101512] border-[#1a231f] text-slate-200">
                        <SelectItem value="cash">💵 Cash</SelectItem>
                        <SelectItem value="upi">📱 UPI</SelectItem>
                        <SelectItem value="bank_transfer">🏦 Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FieldError>{paymentErrors.paymentMethod?.message}</FieldError>
                  </Field>

                  <Field data-invalid={!!paymentErrors.notes}>
                    <FieldLabel htmlFor="field-pay-notes">Transaction Notes</FieldLabel>
                    <Input id="field-pay-notes" placeholder="Transaction ID, remarks..." {...registerPayment('notes')} className="bg-[#101512] border-[#1a231f]" />
                    <FieldError>{paymentErrors.notes?.message}</FieldError>
                  </Field>
                </FieldGroup>

                <Button type="submit" disabled={isPaymentSubmitting} className="mt-2 w-full py-6 text-sm">
                  {isPaymentSubmitting ? 'Recording...' : 'Confirm Collection'}
                </Button>
              </form>
            </div>
          )}
        </SheetContent>
      </Sheet>

    </div>
  );
};
