import { z } from 'zod';

// ─── Step schemas (product onboarding wizard) ─────

/** Step 1: Basic Info & Category */
export const step1BasicInfoSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255),
  description: z.string().optional(),
  category: z.string().optional(),
});
export type Step1BasicInfoInput = z.infer<typeof step1BasicInfoSchema>;

/** Step 2: Pricing & Media */
export const step2PricingSchema = z.object({
  price: z.number().positive('Price must be greater than 0'),
  unit: z.string().min(1, 'Unit is required').max(50),
  imageUri: z.string().optional(), // client-side URI, server maps to imageUrl
});
export type Step2PricingInput = z.infer<typeof step2PricingSchema>;

/** Combined schema matching createProductSchema (all fields from both steps) */
export const productWizardSchema =
  step1BasicInfoSchema.merge(step2PricingSchema);
export type ProductWizardInput = z.infer<typeof productWizardSchema>;

// ─── CRUD schemas (server-side) ────────────────────

export const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  sku: z.string().max(100).nullable().optional(),
  price: z.number().positive(),
  stockQuantity: z.number().int().nonnegative().default(0),
  imageUrl: z.string().max(500).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  description: z.string().nullable().optional(),
  unit: z.string().max(50).nullable().optional(),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
