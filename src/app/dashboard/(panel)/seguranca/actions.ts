'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getVerifiedSession, destroySession } from '@/lib/auth';
import { logAudit } from '@/lib/security/audit';
import { generateTotpSecret, verifyTotp } from '@/lib/security/totp';

const PAGE = '/dashboard/seguranca';

async function clientIp() {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null;
}

/** Step 1: generate (but do not activate) a TOTP secret for the current user. */
export async function startMfaEnrollment() {
  const session = await getVerifiedSession();
  if (!session) redirect('/dashboard/login');

  await prisma.user.update({
    where: { id: session.id },
    data: { totpSecret: generateTotpSecret(), totpEnabled: false }
  });

  revalidatePath(PAGE);
}

/** Step 2: confirm the user's authenticator works, then activate MFA. */
export async function confirmMfa(formData: FormData) {
  const session = await getVerifiedSession();
  if (!session) redirect('/dashboard/login');

  const code = String(formData.get('code') ?? '').trim();
  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user?.totpSecret) redirect(`${PAGE}?erro=sem_segredo`);

  if (!verifyTotp(user.totpSecret, code)) {
    redirect(`${PAGE}?erro=codigo`);
  }

  await prisma.user.update({ where: { id: user.id }, data: { totpEnabled: true } });
  await logAudit({ action: 'mfa_enabled', actor: user.email, ip: await clientIp() });

  revalidatePath(PAGE);
  redirect(`${PAGE}?ok=mfa_ativado`);
}

/** Disable MFA — requires the account password (step-up authentication). */
export async function disableMfa(formData: FormData) {
  const session = await getVerifiedSession();
  if (!session) redirect('/dashboard/login');

  const password = String(formData.get('password') ?? '');
  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    redirect(`${PAGE}?erro=senha`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: false, totpSecret: null }
  });
  await logAudit({ action: 'mfa_disabled', actor: user.email, ip: await clientIp() });

  revalidatePath(PAGE);
  redirect(`${PAGE}?ok=mfa_desativado`);
}

/**
 * Revoke every active session for this user (including the current one) by
 * bumping sessionVersion. Use after a suspected compromise.
 */
export async function revokeAllSessions() {
  const session = await getVerifiedSession();
  if (!session) redirect('/dashboard/login');

  await prisma.user.update({
    where: { id: session.id },
    data: { sessionVersion: { increment: 1 } }
  });
  await logAudit({ action: 'sessions_revoked', actor: session.email, ip: await clientIp() });

  await destroySession();
  redirect('/dashboard/login');
}

/** Change the password and invalidate all existing sessions. */
export async function changePassword(formData: FormData) {
  const session = await getVerifiedSession();
  if (!session) redirect('/dashboard/login');

  const current = String(formData.get('current') ?? '');
  const next = String(formData.get('next') ?? '');

  if (next.length < 12) redirect(`${PAGE}?erro=senha_curta`);

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user || !(await bcrypt.compare(current, user.passwordHash))) {
    redirect(`${PAGE}?erro=senha_atual`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(next, 12),
      // Changing the password logs out every other device.
      sessionVersion: { increment: 1 }
    }
  });
  await logAudit({ action: 'password_changed', actor: user.email, ip: await clientIp() });

  await destroySession();
  redirect('/dashboard/login');
}
