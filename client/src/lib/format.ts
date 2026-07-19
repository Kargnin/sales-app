/**
 * Format a number or numeric string as Indian Rupees (₹).
 * Returns "₹0.00" if the input is not a valid number.
 */
export function formatCurrency(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "₹0.00";
  return `₹${num.toFixed(2)}`;
}
