import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  sku: z.string().max(100).optional(),
  price: z.number().positive(),
  stockQuantity: z.number().int().nonnegative().default(0),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
