'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getVerifiedSession } from '@/lib/auth';
import { logAudit } from '@/lib/security/audit';
import { invoiceCreateSchema } from '@/lib/validation';
import { authorizeMutation, auditDelete } from '@/lib/dashboard-actions';

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

export async function deleteInvoice(formData: FormData) {
  const auth = await authorizeMutation(formData.get('id'));
  if (!auth) return;

  const removed = await prisma.invoice
    .delete({ where: { id: auth.id }, select: { id: true, description: true, amount: true } })
    .catch(() => null);
  if (!removed) return;

  await auditDelete('delete_invoice', auth.session, removed);
  revalidatePath('/dashboard/financeiro');
}
