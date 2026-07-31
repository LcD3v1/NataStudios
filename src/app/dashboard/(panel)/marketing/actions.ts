'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/security/audit';

const PLATFORMS = ['instagram', 'facebook', 'linkedin', 'tiktok'];
const STATUSES = ['idea', 'scheduled', 'published'];

export async function createPost(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error('unauthorized');

  const title = String(formData.get('title') ?? '').trim();
  if (!title) return;

  const platform = String(formData.get('platform') ?? 'instagram');
  const status = String(formData.get('status') ?? 'idea');
  const clientId = String(formData.get('clientId') ?? '').trim() || null;
  const scheduledRaw = String(formData.get('scheduledFor') ?? '').trim();

  const created = await prisma.socialPost.create({
    data: {
      title,
      platform: PLATFORMS.includes(platform) ? platform : 'instagram',
      status: STATUSES.includes(status) ? status : 'idea',
      clientId,
      scheduledFor: scheduledRaw ? new Date(scheduledRaw) : null
    }
  });

  const h = await headers();
  await logAudit({
    action: 'create_post',
    actor: session.email,
    ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    meta: { id: created.id, title: created.title }
  });

  revalidatePath('/dashboard/marketing');
}
