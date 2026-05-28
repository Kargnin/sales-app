// Centralized shared constants for order/visit status colors, date formatting, etc.
// Import from here instead of redefining in each page/component.

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending_approval: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  confirmed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  dispatched: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  delivered: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  unpaid: 'bg-red-500/10 text-red-400 border border-red-500/20',
  partially_paid: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  paid: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

export const ONGOING_ORDER_STATUSES = ['pending_approval', 'confirmed', 'dispatched'] as const;
export const DELIVERED_ORDER_STATUSES = ['delivered'] as const;

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateTime(isoString: string): string {
  const d = new Date(isoString);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()} ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
}

export function formatShortDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

export function formatStatusLabel(status: string): string {
  return status.replace(/_/g, ' ');
}
