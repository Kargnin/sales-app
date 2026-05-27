import React from 'react';
import { useParams } from 'react-router';
import { toast } from 'sonner';

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
}

interface OrderDetails {
  id: string;
  tenantId: string;
  shopId: string;
  shopName: string;
  salesmanId: string | null;
  orderSource: string;
  status: 'pending_approval' | 'confirmed' | 'cancelled' | 'dispatched' | 'delivered';
  paymentStatus: 'unpaid' | 'partially_paid' | 'paid';
  totalAmount: string;
  cancellationToken: string;
  cancellationWindowExpiresAt: string;
  createdAt: string;
  items: OrderItem[];
}

export function PublicInvoice() {
  const { token } = useParams<{ token: string }>();
  const [order, setOrder] = React.useState<OrderDetails | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [cancelling, setCancelling] = React.useState(false);
  const [timeLeft, setTimeLeft] = React.useState<string>('24:00:00');
  const [isExpired, setIsExpired] = React.useState(false);

  const fetchInvoice = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/public/${token}`);
      if (!res.ok) {
        throw new Error('Failed to load invoice. It may have expired or is invalid.');
      }
      const data = await res.json();
      setOrder(data);
    } catch (err: any) {
      toast.error(err.message || 'Invoice not found');
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  React.useEffect(() => {
    if (!order || order.status !== 'confirmed' && order.status !== 'pending_approval') return;

    const timer = setInterval(() => {
      const expiry = new Date(order.cancellationWindowExpiresAt).getTime();
      const now = new Date().getTime();
      const difference = expiry - now;

      if (difference <= 0) {
        setTimeLeft('00:00:00');
        setIsExpired(true);
        clearInterval(timer);
      } else {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        const formattedHours = String(hours).padStart(2, '0');
        const formattedMinutes = String(minutes).padStart(2, '0');
        const formattedSeconds = String(seconds).padStart(2, '0');
        setTimeLeft(`${formattedHours}:${formattedMinutes}:${formattedSeconds}`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [order]);

  const handleCancelOrder = async () => {
    if (!order) return;
    setCancelling(true);
    try {
      const res = await fetch('/api/orders/public/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: order.cancellationToken }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel order');
      }

      toast.success('Order cancelled successfully!');
      fetchInvoice(); // Reload updated order status
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#070c09] text-emerald-400 font-semibold">
        <div className="flex flex-col items-center gap-3">
          <span className="animate-spin text-3xl">⏳</span>
          <span className="text-sm tracking-wide text-slate-400">Retrieving digital invoice...</span>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#070c09] text-slate-300">
        <div className="max-w-md p-8 text-center bg-[#0d1612] border border-emerald-950/40 rounded-2xl shadow-xl">
          <span className="text-4xl">⚠️</span>
          <h2 className="mt-4 text-xl font-bold text-emerald-400">Invoice Not Found</h2>
          <p className="mt-2 text-sm text-slate-400">
            The link you followed is invalid, or the order may have been purged or archived. Please contact support.
          </p>
        </div>
      </div>
    );
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'pending_approval':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'dispatched':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'delivered':
        return 'bg-teal-500/10 text-teal-300 border border-teal-500/20';
      case 'cancelled':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  const isCancelable = 
    (order.status === 'confirmed' || order.status === 'pending_approval') && 
    !isExpired && 
    (new Date(order.cancellationWindowExpiresAt).getTime() > new Date().getTime());

  return (
    <div className="min-h-screen bg-[#050806] text-slate-100 flex flex-col items-center justify-center p-4 md:p-8 selection:bg-emerald-500/30">
      <div className="w-full max-w-4xl bg-gradient-to-b from-[#0a110d] to-[#060a08] border border-emerald-950/30 rounded-3xl overflow-hidden shadow-[0_0_50px_-12px_rgba(16,185,129,0.12)]">
        
        {/* Upper Accent Header */}
        <div className="bg-emerald-950/20 border-b border-emerald-900/10 p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">🧼</span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-200">SalesApp Invoice</h1>
              <p className="text-xs text-emerald-500/80 font-mono tracking-widest uppercase mt-0.5">Digital Confirmation</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider ${getStatusBadgeClass(order.status)}`}>
              {order.status.replace('_', ' ')}
            </span>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider ${
              order.paymentStatus === 'paid' 
                ? 'bg-teal-500/10 text-teal-300 border border-teal-500/20' 
                : order.paymentStatus === 'partially_paid'
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {order.paymentStatus.replace('_', ' ')}
            </span>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-8">
          {/* Proximity/Grace-period Alert */}
          {isCancelable ? (
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-5 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
              <div className="flex items-center gap-3.5 text-center md:text-left">
                <span className="text-2xl animate-pulse">⏳</span>
                <div>
                  <h4 className="text-sm font-semibold text-amber-300">Cancellation Grace Window</h4>
                  <p className="text-xs text-slate-400 mt-0.5 font-sans leading-normal">You can cancel this order within 24 hours of creation.</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-2xl font-mono font-bold tracking-wider text-amber-400 bg-amber-500/10 px-4 py-1.5 rounded-xl border border-amber-500/25 min-w-[90px] text-center">
                  {timeLeft}
                </span>
                <button
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                  className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-500/40 text-white text-xs font-bold rounded-xl shadow-lg transition-all duration-300 transform active:scale-95 disabled:pointer-events-none hover:shadow-rose-900/20"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Order'}
                </button>
              </div>
            </div>
          ) : (
            (order.status === 'confirmed' || order.status === 'pending_approval') && (
              <div className="p-4 bg-emerald-950/10 border border-emerald-900/20 rounded-2xl flex items-center gap-3 text-emerald-400/90 text-xs">
                <span>ℹ️</span> The cancellation window has closed. This order is now locked for fulfillment processing.
              </div>
            )
          )}

          {/* Details Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-emerald-950/20 pb-8">
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-500/80 font-mono">Customer Info</h3>
              <div>
                <h4 className="text-lg font-bold text-slate-200">{order.shopName}</h4>
                <p className="text-xs text-slate-400 mt-1 font-mono">Order ID: {order.id}</p>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Date: {new Date(order.createdAt).toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-4 md:text-right flex flex-col md:items-end">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-500/80 font-mono">Invoice Summary</h3>
              <div>
                <p className="text-slate-400 text-xs">Grand Total</p>
                <h2 className="text-3xl font-extrabold text-emerald-400 mt-1">₹{parseFloat(order.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h2>
                <p className="text-[10px] text-slate-500 mt-1 uppercase font-mono">All prices inclusive of local taxes</p>
              </div>
            </div>
          </div>

          {/* Order Items Table */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-500/80 font-mono">Purchased Products</h3>
            <div className="border border-emerald-950/20 rounded-2xl overflow-hidden bg-[#070b09]">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-emerald-950/30 bg-emerald-950/10 text-xs font-bold tracking-wider text-slate-300/80">
                      <th className="p-4 pl-6">Product</th>
                      <th className="p-4 text-center">Quantity</th>
                      <th className="p-4 text-right">Price</th>
                      <th className="p-4 text-right pr-6">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-950/20 text-xs text-slate-300">
                    {order.items.map((item) => (
                      <tr key={item.id} className="hover:bg-emerald-950/5 transition-colors">
                        <td className="p-4 pl-6 font-semibold text-slate-200">
                          {item.productName}
                        </td>
                        <td className="p-4 text-center font-mono">
                          {item.quantity}
                        </td>
                        <td className="p-4 text-right font-mono text-slate-400">
                          ₹{parseFloat(item.unitPrice).toFixed(2)}
                        </td>
                        <td className="p-4 text-right pr-6 font-semibold text-emerald-400 font-mono">
                          ₹{parseFloat(item.subtotal).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Branding */}
        <div className="bg-[#040605] p-6 text-center text-[10px] text-slate-500 font-mono border-t border-emerald-950/10 flex flex-col sm:flex-row sm:justify-between gap-2">
          <span>SECURE DIGITAL INVOICE PORTAL</span>
          <span>© {new Date().getFullYear()} APEXSOAP SOLUTIONS INC.</span>
        </div>

      </div>
    </div>
  );
}
