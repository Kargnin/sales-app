import { z } from 'zod';

export const orderItemInputSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
});

export const createOrderSchema = z.object({
  shopId: z.string().uuid(),
  items: z.array(orderItemInputSchema).min(1),
  source: z.enum(['salesman', 'whatsapp', 'meesho', 'admin_self']).optional(),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const cancelOrderSchema = z.object({
  token: z.string().min(1),
});
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
