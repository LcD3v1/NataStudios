'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/security/audit';

const STATUSES = ['draft', 'sent', 'paid', 'overdue'];

export async function createInvoice(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error('unauthorized');

  const description = String(formData.get('description') ?? '').trim();
  if (!description) return;

  const amountRaw = String(formData.get('amount') ?? '0').replace(/\./g, '').replace(',', '.');
  const amount = Number.parseFloat(amountRaw);
  const status = String(formData.get('status') ?? 'draft');
  const clientId = String(formData.get('clientId') ?? '').trim() || null;
  const dueRaw = String(formData.get('dueDate') ?? '').trim();

  const created = await prisma.invoice.create({
    data: {
      description,
      amount: Number.isFinite(amount) ? amount : 0,
      status: STATUSES.includes(status) ? status : 'draft',
      clientId,
      dueDate: dueRaw ? new Date(dueRaw) : null
    }
  });

  const h = await headers();
  await logAudit({
    action: 'create_invoice',
    actor: session.email,
    ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    meta: { id: created.id, amount: created.amount }
  });

  revalidatePath('/dashboard/financeiro');
}
