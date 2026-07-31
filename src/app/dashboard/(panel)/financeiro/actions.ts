'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getVerifiedSession } from '@/lib/auth';
import { logAudit } from '@/lib/security/audit';
import { invoiceCreateSchema } from '@/lib/validation';

export async function createInvoice(formData: FormData) {
  const session = await getVerifiedSession();
  if (!session) throw new Error('unauthorized');

  const parsed = invoiceCreateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  const created = await prisma.invoice.create({ data: parsed.data });

  const h = await headers();
  await logAudit({
    action: 'create_invoice',
    actor: session.email,
    ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    meta: { id: created.id, amount: created.amount }
  });

  revalidatePath('/dashboard/financeiro');
}
