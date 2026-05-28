import { z } from 'zod';

const emptyToUndefined = (val: unknown) => (val === '' ? undefined : val);

export const registerBusinessSchema = z.object({
  businessName: z.string().min(2, { message: 'Business name must be at least 2 characters' }).max(255),
  username: z.string().min(3, { message: 'Username must be at least 3 characters' }).max(100),
  email: z.preprocess(emptyToUndefined, z.string().email({ message: 'Invalid email address' }).optional()),
  phone: z.preprocess(emptyToUndefined, z.string().min(10, { message: 'Phone number must be at least 10 digits' }).max(20, { message: 'Phone number cannot exceed 20 digits' }).optional()),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }).max(128),
});
export type RegisterBusinessInput = z.infer<typeof registerBusinessSchema>;

export const loginSchema = z.object({
  username: z.string().min(1, { message: 'Username or email is required' }),
  password: z.string().min(1, { message: 'Password is required' }),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const createEmployeeSchema = z.object({
  username: z.string().min(3, { message: 'Username must be at least 3 characters' }).max(100),
  email: z.preprocess(emptyToUndefined, z.string().email({ message: 'Invalid email address' }).optional()),
  phone: z.preprocess(emptyToUndefined, z.string().min(10, { message: 'Phone number must be at least 10 digits' }).max(20, { message: 'Phone number cannot exceed 20 digits' }).optional()),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }).max(128),
  role: z.enum(['salesman', 'admin']).default('salesman'),
});
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

