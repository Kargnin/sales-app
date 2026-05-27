import { z } from 'zod';

export const createPaymentSchema = z.object({
  orderId: z.string().uuid(),
  amountPaid: z.number().positive(),
  paymentMethod: z.enum(['cash', 'upi', 'bank_transfer']),
  notes: z.string().max(500).optional(),
});
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

export const createPaymentBodySchema = z.object({
  amountPaid: z.number().positive(),
  paymentMethod: z.enum(['cash', 'upi', 'bank_transfer']),
  notes: z.string().max(500).optional(),
});
export type CreatePaymentBodyInput = z.infer<typeof createPaymentBodySchema>;

export const markAsPaidSchema = z.object({
  paymentMethod: z.enum(['cash', 'upi', 'bank_transfer']),
});
export type MarkAsPaidInput = z.infer<typeof markAsPaidSchema>;

