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

/* ------------------------------------------------------------------ */
/*  Dashboard server actions                                           */
/* ------------------------------------------------------------------ */

/** Optional YYYY-MM-DD date from an <input type="date">; rejects garbage. */
const optionalDate = z
  .string()
  .trim()
  .max(40)
  .optional()
  .transform((v) => (v ? new Date(v) : null))
  .refine((d) => d === null || !Number.isNaN(d.getTime()), { message: 'data' });

/** Optional cuid reference (client id) — empty string means "none". */
const optionalId = z
  .string()
  .trim()
  .max(64)
  .regex(/^[a-zA-Z0-9_-]*$/, 'id')
  .optional()
  .transform((v) => (v ? v : null));

export const clientCreateSchema = z.object({
  name: z.string().trim().min(1, 'name').max(160),
  company: z.string().trim().max(160).optional().transform((v) => v || null),
  email: z.string().trim().max(160).optional().transform((v) => v || null),
  phone: z.string().trim().max(40).optional().transform((v) => v || null),
  status: z.enum(['prospect', 'active', 'inactive']).catch('prospect')
});

export const projectCreateSchema = z.object({
  name: z.string().trim().min(1, 'name').max(200),
  clientId: optionalId,
  status: z.enum(['backlog', 'in_progress', 'review', 'done']).catch('backlog'),
  deadline: optionalDate
});

export const projectMoveSchema = z.object({
  id: z.string().trim().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/, 'id'),
  status: z.enum(['backlog', 'in_progress', 'review', 'done'])
});

export const postCreateSchema = z.object({
  title: z.string().trim().min(1, 'title').max(200),
  platform: z.enum(['instagram', 'facebook', 'linkedin', 'tiktok']).catch('instagram'),
  status: z.enum(['idea', 'scheduled', 'published']).catch('idea'),
  clientId: optionalId,
  scheduledFor: optionalDate
});

export const invoiceCreateSchema = z.object({
  description: z.string().trim().min(1, 'description').max(300),
  // Accepts "1.234,56" (pt-BR) or "1234.56".
  amount: z
    .string()
    .trim()
    .max(20)
    .transform((v) => Number.parseFloat(v.replace(/\./g, '').replace(',', '.')))
    .refine((n) => Number.isFinite(n) && n >= 0 && n < 1e12, { message: 'amount' }),
  status: z.enum(['draft', 'sent', 'paid', 'overdue']).catch('draft'),
  clientId: optionalId,
  dueDate: optionalDate
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('email').max(160),
  password: z.string().min(1, 'password').max(200),
  /** 6-digit TOTP code, required only when the account has MFA enabled. */
  totp: z.string().trim().max(10).optional()
});

export type LoginInput = z.infer<typeof loginSchema>;
