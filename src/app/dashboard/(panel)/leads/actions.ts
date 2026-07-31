'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { authorizeMutation, auditDelete } from '@/lib/dashboard-actions';

export async function deleteLead(formData: FormData) {
  const auth = await authorizeMutation(formData.get('id'));
  if (!auth) return;

  const removed = await prisma.lead
    .delete({ where: { id: auth.id }, select: { id: true, name: true, email: true } })
    .catch(() => null);
  if (!removed) return;

  await auditDelete('delete_lead', auth.session, removed);

  revalidatePath('/dashboard/leads');
  revalidatePath('/dashboard');
}
