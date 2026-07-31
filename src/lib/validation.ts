import { z } from 'zod';

/**
 * Shared validation schemas for the public API endpoints and the dashboard login.
 * Used on both the client (before submit) and the server (source of truth).
 */

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'name').max(100),
  email: z.string().trim().email('email').max(160),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  message: z.string().trim().min(10, 'message').max(4000),
  // Honeypot — must stay empty. Bots tend to fill every field.
  company: z.string().max(0).optional().or(z.literal(''))
});

export type ContactInput = z.infer<typeof contactSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('email').max(160),
  password: z.string().min(1, 'password').max(200)
});

export type LoginInput = z.infer<typeof loginSchema>;
