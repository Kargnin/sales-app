import { z } from 'zod';

export const step1ShopIdentitySchema = z.object({
  name: z.string().min(1, 'Shop name is required').max(255),
  ownerName: z.string().min(1, 'Primary owner name is required').max(150),
  phone: z
    .string()
    .regex(/^\d{10}$/, { message: 'Phone number must be exactly 10 digits' }),
  imageUrl: z.string().nullable().optional(),
  additionalOwners: z
    .array(
      z.object({
        name: z.string().optional(),
        phone: z.string().optional(),
      }),
    )
    .optional(),
});
export type Step1ShopIdentityInput = z.infer<typeof step1ShopIdentitySchema>;

export const step2ShopLocationSchema = z.object({
  address: z.string().min(1, 'Street address is required'),
  pinCode: z
    .string()
    .min(1, 'PIN Code is required')
    .regex(/^\d{6}$/, { message: 'PIN Code must be a 6-digit number' }),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});
export type Step2ShopLocationInput = z.infer<typeof step2ShopLocationSchema>;

export const createShopSchema = z.object({
  name: z.string().min(1).max(255),
  ownerName: z.string().max(150).optional(),
  phone: z
    .string()
    .regex(/^\d{10}$/, { message: 'Phone number must be exactly 10 digits' }),
  address: z.string().optional(),
  imageUrl: z.string().nullable().optional(),
  additionalOwners: z
    .array(
      z.object({
        name: z.string().optional(),
        phone: z.string().optional(),
      }),
    )
    .optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});
export type CreateShopInput = z.infer<typeof createShopSchema>;

export const updateShopSchema = createShopSchema.partial().extend({
  status: z.enum(['approved', 'pending_approval', 'rejected']).optional(),
});
export type UpdateShopInput = z.infer<typeof updateShopSchema>;
