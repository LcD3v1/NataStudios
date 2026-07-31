'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/security/audit';

const STATUSES = ['backlog', 'in_progress', 'review', 'done'];

async function clientIp() {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null;
}

export async function createProject(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error('unauthorized');

  const name = String(formData.get('name') ?? '').trim();
  if (!name) return;

  const clientId = String(formData.get('clientId') ?? '').trim() || null;
  const status = String(formData.get('status') ?? 'backlog');
  const deadlineRaw = String(formData.get('deadline') ?? '').trim();

  const created = await prisma.project.create({
    data: {
      name,
      status: STATUSES.includes(status) ? status : 'backlog',
      clientId,
      deadline: deadlineRaw ? new Date(deadlineRaw) : null
    }
  });

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
  const session = await getSession();
  if (!session) throw new Error('unauthorized');
  if (!STATUSES.includes(status)) return;

  await prisma.project.update({ where: { id }, data: { status } });
  await logAudit({ action: 'move_project', actor: session.email, meta: { id, status } });
  revalidatePath('/dashboard');
}
