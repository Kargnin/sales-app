import { z } from 'zod';

export const createShopSchema = z.object({
  name: z.string().min(1).max(255),
  ownerName: z.string().max(150).optional(),
  phone: z.string().regex(/^\d{10}$/, { message: 'Phone number must be exactly 10 digits' }),
  address: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});
export type CreateShopInput = z.infer<typeof createShopSchema>;

export const updateShopSchema = createShopSchema.partial().extend({
  status: z.enum(['approved', 'pending_approval', 'rejected']).optional(),
});
export type UpdateShopInput = z.infer<typeof updateShopSchema>;
