import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useAppStore, Order } from '../../stores/appStore.js';
import { useAuthStore } from '../../stores/authStore.js';
import { apiClient } from '../../api/client.js';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Field, FieldLabel, FieldError, FieldGroup } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { 
  ArrowLeft, IndianRupee, CheckCircle2, Clock, Phone, User, Package, 
  AlertTriangle, Calendar, Info, Truck, CheckCircle, CreditCard, RefreshCw, XCircle, Settings, Lock 
} from 'lucide-react';

const paymentInputSchema = z.object({
  amountPaid: z.number({ invalid_type_error: "Amount is required" }).positive("Amount must be positive"),
  paymentMethod: z.enum(['cash', 'upi', 'bank_transfer']),
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional(),
});

export const AdminOrderDetails: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { recordPayment, markOrderPaid } = useAppStore();

  const [order, setOrder] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
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

  const loadOrderDetails = async () => {
    if (!orderId) return;
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/orders/${orderId}`);
      setOrder(res.data);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load order details.');
      navigate('/admin');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrderDetails();
  }, [orderId]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!order) return;
    setIsActionLoading(true);
    try {
      await apiClient.patch(`/orders/${order.id}/status`, { status: newStatus });
      toast.success(`Order status successfully updated to ${newStatus}!`);
      await loadOrderDetails();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to update order status.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleOpenCollectModal = () => {
    if (!order) return;
    const total = parseFloat(order.totalAmount);
    const paid = order.payments?.reduce((sum: number, p: any) => sum + parseFloat(p.amountPaid), 0) || 0;
    const remaining = total - paid;

    resetPayment({
      amountPaid: remaining,
      paymentMethod: 'cash',
      notes: '',
    });
    setIsCollectModalOpen(true);
  };

  const handleRecordCollection = async (data: any) => {
    if (!order) return;
    
    const total = parseFloat(order.totalAmount);
    const paid = order.payments?.reduce((sum: number, p: any) => sum + parseFloat(p.amountPaid), 0) || 0;
    const remaining = total - paid;

    if (data.amountPaid <= 0) return toast.error('Payment amount must be a positive number');
    if (data.amountPaid > remaining + 0.01) return toast.error(`Payment amount exceeds remaining balance of ₹${remaining.toFixed(2)}`);

    try {
      await recordPayment(order.id, {
        amountPaid: data.amountPaid,
        paymentMethod: data.paymentMethod,
        notes: data.notes?.trim() || undefined,
      });
      toast.success('Collection successfully recorded!');
      setIsCollectModalOpen(false);
      await loadOrderDetails();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to record payment.');
    }
  };

  const handleQuickMarkPaid = async () => {
    if (!order) return;
    try {
      await markOrderPaid(order.id, 'cash');
      toast.success('Order marked as fully paid via Cash!');
      await loadOrderDetails();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to complete payment transaction.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-3 text-slate-400">
        <RefreshCw className="size-8 animate-spin text-emerald-500" />
        <p className="text-sm">Fetching order context...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-8 text-center text-slate-400">
        Order not found.
      </div>
    );
  }

  const totalAmount = parseFloat(order.totalAmount);
  const totalPaid = order.payments?.reduce((sum: number, p: any) => sum + parseFloat(p.amountPaid), 0) || 0;
  const remainingBalance = totalAmount - totalPaid;

  const statusColors = {
    pending_approval: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    confirmed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    dispatched: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    delivered: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  const paymentColors = {
    unpaid: 'bg-red-500/10 text-red-400 border-red-500/20',
    partially_paid: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      {/* Header and Back Button */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-[#1a231f] pb-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate(user?.role === 'admin' ? '/admin?tab=orders' : '/salesman?tab=orders');
              }
            }}
            className="text-slate-400 hover:text-slate-200 bg-[#101512] border border-[#1a231f]"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold text-slate-100 flex items-center gap-2">
                Order #{order.id.substring(0, 8).toUpperCase()}
              </h1>
              {user?.role === 'admin' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider rounded-md">
                  <Settings className="size-2.5 text-emerald-400 shrink-0" />
                  <span>Admin View</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-extrabold uppercase tracking-wider rounded-md">
                  <Lock className="size-2.5 text-blue-400 shrink-0" />
                  <span>Read-Only</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Placed for <Link to={`/shop/${order.shopId}`} className="text-emerald-400 underline hover:text-emerald-300 font-medium">{order.shopName}</Link>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${statusColors[order.status as keyof typeof statusColors]}`}>
            Status: {order.status.replace('_', ' ').toUpperCase()}
          </span>
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${paymentColors[order.paymentStatus as keyof typeof paymentColors]}`}>
            Payment: {order.paymentStatus.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </div>

      {/* Progress Timeline Tracker */}
      {order.status !== 'cancelled' && (
        <Card className="border-[#1a231f] bg-[#0a0f0d]/50 backdrop-blur-md">
          <CardContent className="py-6">
            <div className="relative flex justify-between items-center w-full max-w-3xl mx-auto">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-800 -translate-y-1/2 z-0" />
              
              {/* Progress active bar */}
              <div 
                className="absolute top-1/2 left-0 h-0.5 bg-emerald-500 -translate-y-1/2 z-0 transition-all duration-500" 
                style={{ 
                  width: order.status === 'pending_approval' ? '0%' :
                         order.status === 'confirmed' ? '33%' :
                         order.status === 'dispatched' ? '66%' : '100%' 
                }}
              />

              {[
                { label: 'Approval Pending', id: 'pending_approval', icon: Clock },
                { label: 'Confirmed', id: 'confirmed', icon: CheckCircle },
                { label: 'Dispatched', id: 'dispatched', icon: Truck },
                { label: 'Delivered', id: 'delivered', icon: CheckCircle2 }
              ].map((step, idx) => {
                const StepIcon = step.icon;
                const statusOrder = ['pending_approval', 'confirmed', 'dispatched', 'delivered'];
                const currentIdx = statusOrder.indexOf(order.status);
                const isActive = idx <= currentIdx;
                const isCurrent = idx === currentIdx;

                return (
                  <div key={step.id} className="relative z-10 flex flex-col items-center">
                    <div className={`size-8 rounded-full flex items-center justify-center border transition-all duration-300 ${
                      isCurrent ? 'bg-emerald-500 border-emerald-400 text-[#050806] scale-110 shadow-lg shadow-emerald-500/20' :
                      isActive ? 'bg-[#0a0f0d] border-emerald-500 text-emerald-400' :
                      'bg-[#101512] border-slate-800 text-slate-500'
                    }`}>
                      <StepIcon className="size-4" />
                    </div>
                    <span className={`text-[10px] md:text-xs mt-2 font-medium tracking-wide text-center absolute top-10 whitespace-nowrap ${
                      isCurrent ? 'text-emerald-400 font-semibold' :
                      isActive ? 'text-slate-300' : 'text-slate-600'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="h-6" /> {/* spacer for absolute span labels */}
          </CardContent>
        </Card>
      )}

      {/* Main Grid Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Order details & Products */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Order Summary Items Table */}
          <Card className="border-[#1a231f] bg-[#0a0f0d]/50">
            <CardHeader className="border-b border-[#1a231f]">
              <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Package className="size-4 text-emerald-400" />
                Products & Line Items
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#101512]/60 text-slate-400 border-b border-[#1a231f] uppercase tracking-wider font-bold">
                      <th className="p-4">Product Name</th>
                      <th className="p-4 text-center">Quantity</th>
                      <th className="p-4 text-right">Unit Price</th>
                      <th className="p-4 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a231f]/40">
                    {order.items?.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-900/10 text-slate-300 font-sans">
                        <td className="p-4 font-medium text-slate-200">{item.productName}</td>
                        <td className="p-4 text-center">{item.quantity}</td>
                        <td className="p-4 text-right">₹{parseFloat(item.unitPrice).toFixed(2)}</td>
                        <td className="p-4 text-right font-medium text-emerald-400">₹{parseFloat(item.subtotal).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#101512]/30 border-t border-[#1a231f] text-slate-300">
                      <td colSpan={3} className="p-4 text-right font-bold uppercase tracking-wider text-xs">Total Amount</td>
                      <td className="p-4 text-right text-sm font-extrabold text-emerald-400">₹{totalAmount.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Payment / Collection History */}
          <Card className="border-[#1a231f] bg-[#0a0f0d]/50">
            <CardHeader className="border-b border-[#1a231f] flex flex-row items-center justify-between py-4">
              <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <CreditCard className="size-4 text-emerald-400" />
                Collection & Payments History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!order.payments || order.payments.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No payment logs registered yet for this order.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#101512]/60 text-slate-400 border-b border-[#1a231f] uppercase tracking-wider font-bold">
                        <th className="p-4">Collected At</th>
                        <th className="p-4">Method</th>
                        <th className="p-4">Notes</th>
                        <th className="p-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1a231f]/40">
                      {order.payments.map((p: any) => (
                        <tr key={p.id} className="hover:bg-slate-900/10 text-slate-300 font-sans">
                          <td className="p-4 text-slate-400">
                            {new Date(p.paymentDate).toLocaleString('en-IN', {
                              day: '2-digit', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </td>
                          <td className="p-4 uppercase font-semibold text-slate-200">{p.paymentMethod}</td>
                          <td className="p-4 text-slate-400 truncate max-w-xs">{p.notes || '-'}</td>
                          <td className="p-4 text-right font-semibold text-emerald-400">₹{parseFloat(p.amountPaid).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Order details summary & Administration Deck */}
        <div className="space-y-6">

          {/* Quick Context Summary Card */}
          <Card className="border-[#1a231f] bg-[#0a0f0d]/50">
            <CardHeader className="border-b border-[#1a231f]">
              <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Info className="size-4 text-emerald-400" />
                Metadata & Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5 pt-4 text-xs">
              <div className="flex justify-between border-b border-[#1a231f]/20 pb-2">
                <span className="text-slate-400">Placing Salesman</span>
                <span className="font-semibold text-slate-200">
                  {order.salesmanName || (user?.role === 'admin' ? 'Admin (Self)' : 'Business Administrator')}
                </span>
              </div>
              <div className="flex justify-between border-b border-[#1a231f]/20 pb-2">
                <span className="text-slate-400">Ordered On</span>
                <span className="font-semibold text-slate-200">
                  {new Date(order.createdAt).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'long', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </div>
              <div className="flex justify-between border-b border-[#1a231f]/20 pb-2">
                <span className="text-slate-400">Total Bill</span>
                <span className="font-bold text-slate-200">₹{totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b border-[#1a231f]/20 pb-2">
                <span className="text-slate-400">Amount Collected</span>
                <span className="font-semibold text-emerald-400">₹{totalPaid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pb-1 border-b border-[#1a231f]/20 pb-2">
                <span className="text-slate-400">Uncollected Balance</span>
                <span className={`font-bold ${remainingBalance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  ₹{remainingBalance.toFixed(2)}
                </span>
              </div>

              {/* Progressive Disclosure: Technical System Identifiers */}
              <details className="group bg-[#101512]/60 border border-[#1a231f] rounded-lg overflow-hidden mt-3">
                <summary className="flex items-center justify-between p-2.5 cursor-pointer select-none hover:bg-[#101512] transition-colors text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  <div className="flex items-center gap-1.5">
                    <Info className="size-3.5 text-emerald-500" />
                    <span>Technical Identifiers</span>
                  </div>
                  <span className="text-[9px] text-slate-500 group-open:rotate-180 transition-transform">&darr;</span>
                </summary>
                <div className="p-2.5 pt-0 border-t border-[#1a231f]/20 text-[10px] font-mono text-slate-500 space-y-2 mt-2">
                  <div className="flex justify-between">
                    <span>Order Source:</span>
                    <span className="text-slate-300 font-semibold capitalize">{order.orderSource}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Database ID:</span>
                    <span className="text-slate-400 font-semibold truncate max-w-[120px]" title={order.id}>{order.id}</span>
                  </div>
                  {order.cancellationToken && (
                    <div className="flex justify-between">
                      <span>Token Hash:</span>
                      <span className="text-slate-400 font-semibold truncate max-w-[120px]" title={order.cancellationToken}>{order.cancellationToken}</span>
                    </div>
                  )}
                </div>
              </details>
            </CardContent>
          </Card>

          {/* Admin Control Actions Deck */}
          {user?.role === 'admin' && (
            <Card className="border-[#1a231f] bg-[#0a0f0d]/50">
              <CardHeader className="border-b border-[#1a231f]">
                <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <RefreshCw className="size-4 text-emerald-400" />
                  Administrative Deck
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {/* Digital Invoice Shortcut Button */}
                {order.cancellationToken && (
                  <div className="space-y-2 pb-2 border-b border-[#1a231f]/20">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Billing & Invoicing</span>
                    <Button
                      variant="outline"
                      className="w-full text-slate-300 hover:text-slate-100 bg-[#101512] border-[#1a231f] hover:bg-[#1a231f] transition-all text-xs"
                      onClick={() => window.open(`/#/orders/confirm/${order.cancellationToken}`, '_blank')}
                    >
                      <Package className="size-4 mr-2 text-emerald-400" />
                      View Digital Invoice
                    </Button>
                  </div>
                )}
                
                {/* Transition Status Controls */}
                {order.status !== 'cancelled' && order.status !== 'delivered' && (
                  <div className="space-y-2">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Transition Order State</span>
                    
                    {order.status === 'pending_approval' && (
                      <Button 
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-[#050806]" 
                        disabled={isActionLoading}
                        onClick={() => handleUpdateStatus('confirmed')}
                      >
                        <CheckCircle className="size-4 mr-2" />
                        Approve & Confirm Order
                      </Button>
                    )}

                    {order.status === 'confirmed' && (
                      <Button 
                        className="w-full bg-blue-600 hover:bg-blue-500 text-slate-100" 
                        disabled={isActionLoading}
                        onClick={() => handleUpdateStatus('dispatched')}
                      >
                        <Truck className="size-4 mr-2" />
                        Dispatch Packages
                      </Button>
                    )}

                    {order.status === 'dispatched' && (
                      <Button 
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-[#050806]" 
                        disabled={isActionLoading}
                        onClick={() => handleUpdateStatus('delivered')}
                      >
                        <CheckCircle2 className="size-4 mr-2" />
                        Mark as Delivered
                      </Button>
                    )}
                  </div>
                )}

                {/* Payments control Actions */}
                {order.status !== 'cancelled' && order.paymentStatus !== 'paid' && (
                  <div className="space-y-2 pt-2 border-t border-[#1a231f]/20">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Collection Actions</span>
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        variant="outline" 
                        onClick={handleOpenCollectModal}
                        className="text-emerald-400 hover:text-emerald-300 bg-[#101512] border-[#1a231f] hover:bg-[#1a231f]"
                      >
                        Collect Part
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={handleQuickMarkPaid}
                        className="text-slate-300 hover:text-slate-100 bg-[#101512] border-[#1a231f] hover:bg-[#1a231f]"
                      >
                        Mark Paid
                      </Button>
                    </div>
                  </div>
                )}

                {/* Cancel actions */}
                {order.status !== 'cancelled' && order.status !== 'dispatched' && order.status !== 'delivered' && (
                  <div className="pt-2 border-t border-[#1a231f]/20">
                    <Button 
                      variant="ghost" 
                      className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20"
                      disabled={isActionLoading}
                      onClick={() => handleUpdateStatus('cancelled')}
                    >
                      <XCircle className="size-4 mr-2" />
                      Cancel Order
                    </Button>
                  </div>
                )}

                {/* Terminated/Completed States notifications */}
                {order.status === 'cancelled' && (
                  <div className="flex items-center gap-2 p-3 bg-red-950/10 border border-red-900/30 rounded text-red-400 text-xs">
                    <AlertTriangle className="size-4 shrink-0" />
                    <span>This order has been cancelled and is locked from further updates.</span>
                  </div>
                )}

                {order.status === 'delivered' && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-950/10 border border-emerald-900/30 rounded text-emerald-400 text-xs">
                    <CheckCircle2 className="size-4 shrink-0" />
                    <span>Order has been successfully delivered and finished.</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Record Collection Sheet Drawer */}
      <Sheet open={isCollectModalOpen} onOpenChange={setIsCollectModalOpen}>
        <SheetContent side="right" className="bg-[#0a0f0d] border-[#1a231f] text-slate-200">
          <SheetHeader className="border-b border-[#1a231f] pb-4">
            <SheetTitle className="text-slate-100 flex items-center gap-2 text-base">
              <IndianRupee className="size-4 text-emerald-400" />
              Collect Payments
            </SheetTitle>
            <SheetDescription className="text-slate-400 text-xs">
              Record a cash, UPI or bank transfer payment entry for this order.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmitPayment(handleRecordCollection)} className="space-y-4 pt-4">
            <Field>
              <FieldLabel className="text-slate-400">Amount to Collect (₹)</FieldLabel>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                className="bg-[#101512] border-[#1a231f] text-slate-200 focus-visible:ring-emerald-500"
                {...registerPayment('amountPaid', { valueAsNumber: true })}
              />
              {paymentErrors.amountPaid && <FieldError className="text-red-400">{paymentErrors.amountPaid.message}</FieldError>}
            </Field>

            <Field>
              <FieldLabel className="text-slate-400">Payment Gateway/Mode</FieldLabel>
              <select
                className="w-full bg-[#101512] border border-[#1a231f] rounded-md h-9 px-3 text-slate-200 focus-visible:ring-emerald-500 text-sm focus:outline-hidden"
                {...registerPayment('paymentMethod')}
              >
                <option value="cash">Cash Collection</option>
                <option value="upi">UPI/QR Code</option>
                <option value="bank_transfer">Direct Bank Transfer</option>
              </select>
              {paymentErrors.paymentMethod && <FieldError className="text-red-400">{paymentErrors.paymentMethod.message}</FieldError>}
            </Field>

            <Field>
              <FieldLabel className="text-slate-400">Reference Notes</FieldLabel>
              <textarea
                rows={3}
                placeholder="Transaction numbers, notes..."
                className="w-full bg-[#101512] border border-[#1a231f] rounded-md p-3 text-slate-200 focus-visible:ring-emerald-500 text-sm focus:outline-hidden"
                {...registerPayment('notes')}
              />
              {paymentErrors.notes && <FieldError className="text-red-400">{paymentErrors.notes.message}</FieldError>}
            </Field>

            <div className="flex justify-end gap-2 pt-4 border-t border-[#1a231f]/20">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsCollectModalOpen(false)}
                className="bg-[#101512] border-[#1a231f] text-slate-300 hover:bg-[#1a231f] hover:text-slate-100"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isPaymentSubmitting}
                className="bg-emerald-600 hover:bg-emerald-500 text-[#050806] font-semibold"
              >
                {isPaymentSubmitting ? 'Recording...' : 'Record Payment'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
};
