'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getVerifiedSession } from '@/lib/auth';
import { logAudit } from '@/lib/security/audit';
import { postCreateSchema } from '@/lib/validation';
import { authorizeMutation, auditDelete } from '@/lib/dashboard-actions';

export async function createPost(formData: FormData) {
  const session = await getVerifiedSession();
  if (!session) throw new Error('unauthorized');

  const parsed = postCreateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  const created = await prisma.socialPost.create({ data: parsed.data });

  const h = await headers();
  await logAudit({
    action: 'create_post',
    actor: session.email,
    ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    meta: { id: created.id, title: created.title }
  });

  revalidatePath('/dashboard/marketing');
}

export async function deletePost(formData: FormData) {
  const auth = await authorizeMutation(formData.get('id'));
  if (!auth) return;

  const removed = await prisma.socialPost
    .delete({ where: { id: auth.id }, select: { id: true, title: true } })
    .catch(() => null);
  if (!removed) return;

  await auditDelete('delete_post', auth.session, removed);
  revalidatePath('/dashboard/marketing');
}
