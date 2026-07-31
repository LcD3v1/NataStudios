'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/security/audit';

async function clientIp() {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null;
}

export async function createClient(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error('unauthorized');

  const name = String(formData.get('name') ?? '').trim();
  if (!name) return;

  const created = await prisma.client.create({
    data: {
      name,
      email: String(formData.get('email') ?? '').trim() || null,
      phone: String(formData.get('phone') ?? '').trim() || null,
      company: String(formData.get('company') ?? '').trim() || null,
      status: String(formData.get('status') ?? 'prospect')
    }
  });

  await logAudit({
    action: 'create_client',
    actor: session.email,
    ip: await clientIp(),
    meta: { id: created.id, name: created.name }
  });

  revalidatePath('/dashboard/clientes');
  revalidatePath('/dashboard');
}
