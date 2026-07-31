'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getVerifiedSession } from '@/lib/auth';
import { logAudit } from '@/lib/security/audit';
import { projectCreateSchema, projectMoveSchema } from '@/lib/validation';

async function clientIp() {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null;
}

export async function createProject(formData: FormData) {
  const session = await getVerifiedSession();
  if (!session) throw new Error('unauthorized');

  const parsed = projectCreateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  const created = await prisma.project.create({ data: parsed.data });

  await logAudit({
    action: 'create_project',
    actor: session.email,
    ip: await clientIp(),
    meta: { id: created.id, name: created.name }
  });

  revalidatePath('/dashboard/projetos');
  revalidatePath('/dashboard');
}

export async function moveProject(id: string, status: string) {
  const session = await getVerifiedSession();
  if (!session) throw new Error('unauthorized');

  const parsed = projectMoveSchema.safeParse({ id, status });
  if (!parsed.success) return;

  await prisma.project.update({
    where: { id: parsed.data.id },
    data: { status: parsed.data.status }
  });
  await logAudit({ action: 'move_project', actor: session.email, meta: parsed.data });
  revalidatePath('/dashboard');
}
