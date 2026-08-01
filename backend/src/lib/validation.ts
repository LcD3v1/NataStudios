import { z } from 'zod';

/** Ids are cuids — reject anything that isn't a plain identifier. */
export const idSchema = z.string().trim().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/);

const optionalDate = z
  .string()
  .trim()
  .max(40)
  .optional()
  .transform((v) => (v ? new Date(v) : null))
  .refine((d) => d === null || !Number.isNaN(d.getTime()), { message: 'data' });

const optionalId = z
  .string()
  .trim()
  .max(64)
  .regex(/^[a-zA-Z0-9_-]*$/, 'id')
  .optional()
  .transform((v) => (v ? v : null));

/* ---------------- public site ---------------- */

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'name').max(100),
  email: z.string().trim().email('email').max(160),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  message: z.string().trim().min(10, 'message').max(4000),
  // Honeypot — bots fill every field.
  company: z.string().max(0).optional().or(z.literal(''))
});

/* ---------------- auth ---------------- */

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('email').max(160),
  password: z.string().min(1, 'password').max(200),
  totp: z.string().trim().max(10).optional()
});

export const changePasswordSchema = z.object({
  current: z.string().min(1).max(200),
  next: z.string().min(12, 'senha_curta').max(200)
});

/* ---------------- dashboard ---------------- */

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
  id: idSchema,
  status: z.enum(['backlog', 'in_progress', 'review', 'done'])
});

export const postCreateSchema = z.object({
  title: z.string().trim().min(1, 'title').max(200),
  platform: z.enum(['instagram', 'facebook', 'linkedin', 'tiktok']).catch('instagram'),
  status: z.enum(['idea', 'scheduled', 'published']).catch('idea'),
  clientId: optionalId,
  scheduledFor: optionalDate
});

/**
 * Parses money written in either convention:
 *   US  "1,234.56" · "1234.56"
 *   BR  "1.234,56" · "1234,56"
 * The LAST separator followed by 1-2 digits is the decimal mark.
 */
export function parseMoney(input: string): number {
  const cleaned = input.trim().replace(/[^\d.,-]/g, '');
  if (!cleaned) return Number.NaN;

  const lastSep = Math.max(cleaned.lastIndexOf('.'), cleaned.lastIndexOf(','));
  if (lastSep === -1 || cleaned.length - lastSep - 1 === 3) {
    return Number.parseFloat(cleaned.replace(/[.,]/g, ''));
  }
  const integer = cleaned.slice(0, lastSep).replace(/[.,]/g, '');
  return Number.parseFloat(`${integer}.${cleaned.slice(lastSep + 1)}`);
}

export const invoiceCreateSchema = z.object({
  description: z.string().trim().min(1, 'description').max(300),
  amount: z
    .string()
    .trim()
    .max(20)
    .transform(parseMoney)
    .refine((n) => Number.isFinite(n) && n >= 0 && n < 1e12, { message: 'amount' }),
  status: z.enum(['draft', 'sent', 'paid', 'overdue']).catch('draft'),
  clientId: optionalId,
  dueDate: optionalDate
});
