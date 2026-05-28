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
