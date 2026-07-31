'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getVerifiedSession } from '@/lib/auth';
import { logAudit } from '@/lib/security/audit';
import { clientCreateSchema } from '@/lib/validation';
import { authorizeMutation, auditDelete, clientIp } from '@/lib/dashboard-actions';

export async function createClient(formData: FormData) {
  const session = await getVerifiedSession();
  if (!session) throw new Error('unauthorized');

  const parsed = clientCreateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  const created = await prisma.client.create({ data: parsed.data });

  await logAudit({
    action: 'create_client',
    actor: session.email,
    ip: await clientIp(),
    meta: { id: created.id, name: created.name }
  });

  revalidatePath('/dashboard/clientes');
  revalidatePath('/dashboard');
}

/**
 * Remove a client. Projects, posts and invoices linked to it are kept (their
 * clientId becomes null, per `onDelete: SetNull`) so financial history isn't lost.
 */
export async function deleteClient(formData: FormData) {
  const auth = await authorizeMutation(formData.get('id'));
  if (!auth) return;

  const removed = await prisma.client
    .delete({ where: { id: auth.id }, select: { id: true, name: true } })
    .catch(() => null);
  if (!removed) return;

  await auditDelete('delete_client', auth.session, removed);

  revalidatePath('/dashboard/clientes');
  revalidatePath('/dashboard');
}
