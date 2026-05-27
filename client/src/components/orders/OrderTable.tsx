import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Order } from '../../stores/appStore.js';
import { Card, CardContent } from '../ui/card.js';
import { Button } from '../ui/button.js';
import { 
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell 
} from '../ui/table.js';
import { IndianRupee, CheckCircle2, Clock, Package, Eye, FileText, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils.js';

interface OrderTableProps {
  orders: Order[];
  isLoading: boolean;
  onCollectPayment?: (order: Order) => void;
  showShopName?: boolean;
}

export const OrderTable: React.FC<OrderTableProps> = ({
  orders,
  isLoading,
  onCollectPayment,
  showShopName = true,
}) => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  const filteredOrders = orders.filter(order => {
    const matchStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchPayment = paymentFilter === 'all' || order.paymentStatus === paymentFilter;
    return matchStatus && matchPayment;
  });

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

  const renderFilters = () => (
    <div className="flex flex-wrap gap-2">
      {/* Status Filter Selector */}
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="bg-[#101512] border border-[#1a231f] text-slate-300 rounded-md text-xs px-2.5 py-1.5 focus:outline-hidden text-sm cursor-pointer"
      >
        <option value="all">All Statuses</option>
        <option value="pending_approval">Pending Approval</option>
        <option value="confirmed">Confirmed</option>
        <option value="dispatched">Dispatched</option>
        <option value="delivered">Delivered</option>
        <option value="cancelled">Cancelled</option>
      </select>

      {/* Payment Filter Selector */}
      <select
        value={paymentFilter}
        onChange={(e) => setPaymentFilter(e.target.value)}
        className="bg-[#101512] border border-[#1a231f] text-slate-300 rounded-md text-xs px-2.5 py-1.5 focus:outline-hidden text-sm cursor-pointer"
      >
        <option value="all">All Payments</option>
        <option value="unpaid">Unpaid</option>
        <option value="partially_paid">Partially Paid</option>
        <option value="paid">Fully Paid</option>
      </select>
    </div>
  );

  if (isLoading) {
    return <div className="text-center p-8 text-xs text-slate-500">Loading B2B Orders...</div>;
  }

  if (orders.length === 0) {
    return (
      <Card className="bg-[#0c100e] border-[#1a231f] border-dashed">
        <CardContent className="flex flex-col items-center justify-center p-8 gap-2">
          <span className="text-3xl grayscale opacity-50">🧾</span>
          <p className="text-sm text-slate-400">No orders recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header and Filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-sm font-bold tracking-wide uppercase text-slate-400 flex items-center gap-2">
          Order Log
          <span className="text-xs bg-[#1a231f] text-slate-300 py-0.5 px-2 rounded-full">
            {filteredOrders.length}
          </span>
        </h2>
        {renderFilters()}
      </div>

      {filteredOrders.length === 0 ? (
        <Card className="bg-[#0c100e] border-[#1a231f] border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-sm text-slate-400">No orders match the selected filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="max-h-[550px] overflow-y-auto pr-1 border border-[#1a231f] rounded-xl bg-[#0c100e] shadow-sm">
          
          {/* DESKTOP RESPONSIVE TABLE VIEW */}
          <div className="hidden md:block">
            <Table>
              <TableHeader className="bg-[#101512]/60 border-b border-[#1a231f]">
                <TableRow className="border-b border-[#1a231f]/60 hover:bg-transparent">
                  <TableHead className="p-4 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Date</TableHead>
                  <TableHead className="p-4 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Order ID</TableHead>
                  {showShopName && (
                    <TableHead className="p-4 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Outlet</TableHead>
                  )}
                  <TableHead className="p-4 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Channel</TableHead>
                  <TableHead className="p-4 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Status</TableHead>
                  <TableHead className="p-4 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Payment</TableHead>
                  <TableHead className="p-4 text-right text-slate-400 font-bold uppercase tracking-wider text-[10px]">Total Bill</TableHead>
                  <TableHead className="p-4 text-center text-slate-400 font-bold uppercase tracking-wider text-[10px] w-48">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[#1a231f]/30">
                {filteredOrders.map((order) => (
                  <TableRow 
                    key={order.id}
                    onClick={() => navigate(`/order/${order.id}`)}
                    className="hover:bg-slate-900/10 cursor-pointer border-b border-[#1a231f]/30 group font-sans text-xs transition-colors"
                  >
                    {/* Date */}
                    <TableCell className="p-4 text-slate-400">
                      {new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </TableCell>
                    
                    {/* Order ID */}
                    <TableCell className="p-4 font-mono font-medium text-slate-200 uppercase">
                      #{order.id.substring(0, 8)}
                    </TableCell>
                    
                    {/* Outlet Name (if applicable) */}
                    {showShopName && (
                      <TableCell className="p-4 font-medium text-slate-200 group-hover:text-emerald-400 transition-colors">
                        {order.shopName || 'B2B Shop'}
                      </TableCell>
                    )}
                    
                    {/* Placing Channel */}
                    <TableCell className="p-4 capitalize text-slate-300">
                      {order.orderSource}
                    </TableCell>
                    
                    {/* Status badge */}
                    <TableCell className="p-4">
                      <span className={cn(
                        "inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                        statusColors[order.status as keyof typeof statusColors]
                      )}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </TableCell>
                    
                    {/* Payment badge */}
                    <TableCell className="p-4">
                      <span className={cn(
                        "inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                        paymentColors[order.paymentStatus as keyof typeof paymentColors]
                      )}>
                        {order.paymentStatus.replace('_', ' ')}
                      </span>
                    </TableCell>
                    
                    {/* Total Amount */}
                    <TableCell className="p-4 text-right font-bold text-emerald-400 font-sans">
                      ₹{parseFloat(order.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </TableCell>
                    
                    {/* Actions */}
                    <TableCell className="p-4 text-center">
                      <div className="flex justify-center items-center gap-1.5">
                        {order.cancellationToken && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Digital Invoice"
                            className="size-7 bg-[#1a231f] hover:bg-[#25312b] text-slate-300 rounded"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`/#/orders/confirm/${order.cancellationToken}`, '_blank');
                            }}
                          >
                            <FileText className="size-3.5" />
                          </Button>
                        )}
                        {onCollectPayment && order.paymentStatus !== 'paid' && order.status !== 'cancelled' && (
                          <Button
                            size="sm"
                            className="h-7 text-[10px] font-semibold py-0 px-2.5 rounded bg-emerald-600 hover:bg-emerald-500 text-[#050806]"
                            onClick={(e) => {
                              e.stopPropagation();
                              onCollectPayment(order);
                            }}
                          >
                            Collect
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Manage"
                          className="size-7 bg-[#101512] hover:bg-[#1a231f] text-slate-400 group-hover:text-emerald-400 rounded transition-colors"
                        >
                          <ArrowRight className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* MOBILE RESPONSIVE TILE CARDS LIST */}
          <div className="md:hidden flex flex-col divide-y divide-[#1a231f]/40">
            {filteredOrders.map((order) => (
              <div 
                key={order.id} 
                onClick={() => navigate(`/order/${order.id}`)}
                className="p-4 flex flex-col gap-3.5 active:bg-slate-900/20 hover:bg-slate-900/10 cursor-pointer group"
              >
                {/* Header info */}
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase block mb-1">
                      {new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="font-extrabold text-sm text-slate-200">
                      Order #{order.id.substring(0, 8).toUpperCase()}
                    </span>
                    {showShopName && (
                      <span className="text-xs text-emerald-400 block mt-0.5">
                        {order.shopName || 'B2B Shop'}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={cn(
                      "inline-flex items-center gap-1 text-[8px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full border",
                      paymentColors[order.paymentStatus as keyof typeof paymentColors]
                    )}>
                      {order.paymentStatus === 'paid' ? <CheckCircle2 className="size-2.5" /> : <Clock className="size-2.5" />}
                      {order.paymentStatus}
                    </span>
                    <span className={cn(
                      "inline-flex items-center gap-1 text-[8px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full border",
                      statusColors[order.status as keyof typeof statusColors]
                    )}>
                      {order.status}
                    </span>
                  </div>
                </div>

                {/* Footer and Actions */}
                <div className="flex items-center justify-between pt-1 border-t border-[#1a231f]/10">
                  <div className="text-base font-extrabold text-emerald-400 flex items-center">
                    <IndianRupee className="size-3.5 mr-0.5 opacity-70" />
                    {parseFloat(order.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>

                  <div className="flex gap-2">
                    {order.cancellationToken && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="bg-[#1a231f] text-slate-300 hover:bg-[#25312b] h-8 text-[10px] px-3 font-semibold"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`/#/orders/confirm/${order.cancellationToken}`, '_blank');
                        }}
                      >
                        Invoice
                      </Button>
                    )}
                    {onCollectPayment && order.paymentStatus !== 'paid' && order.status !== 'cancelled' && (
                      <Button
                        size="sm"
                        className="h-8 text-[10px] px-3 font-semibold bg-emerald-600 hover:bg-emerald-500 text-[#050806]"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCollectPayment(order);
                        }}
                      >
                        Collect
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}
    </div>
  );
};
