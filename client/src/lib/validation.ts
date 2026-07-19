import { z } from "zod";

export const loginSchema = z.object({
  username: z
    .string()
    .min(1, "Username or email is required"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  businessName: z.string().min(2, "Business name must be at least 2 characters"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Enter a valid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type SignupFormValues = z.infer<typeof signupSchema>;

export const resetPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export const inviteAcceptSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  email: z.string().email("Enter a valid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
});

export type InviteAcceptFormValues = z.infer<typeof inviteAcceptSchema>;

/** Zod schema for editing a product (client-side). Numeric conversion handled by Controller renders. */
export const productEditSchema = z.object({
  name: z.string().min(1, "Product name is required").max(255),
  description: z.string().optional().default(""),
  price: z.number({ required_error: "Price is required" }).positive("Price must be a positive number"),
  stockQuantity: z.number().int("Stock must be a whole number").nonnegative("Stock cannot be negative"),
  category: z.string().optional().default(""),
  unit: z.string().optional().default(""),
  imageUri: z.string().nullable().optional(),
});
export type ProductEditFormValues = z.infer<typeof productEditSchema>;
