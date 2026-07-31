// Server-only helpers: `next/headers` already fails the build if this module is
// ever pulled into a client bundle.
import { headers } from 'next/headers';
import { z } from 'zod';
import { getVerifiedSession, type SessionUser } from '@/lib/auth';
import { logAudit, type AuditAction } from '@/lib/security/audit';

/** Ids are cuids — reject anything that isn't a plain identifier. */
export const idSchema = z.string().trim().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/);

export async function clientIp() {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null;
}

/**
 * Guard for every dashboard mutation: confirms the session against the database
 * (Zero Trust) and validates the target id.
 * Returns null when the caller isn't allowed or the id is malformed.
 */
export async function authorizeMutation(
  rawId: unknown
): Promise<{ session: SessionUser; id: string } | null> {
  const session = await getVerifiedSession();
  if (!session) return null;

  const parsed = idSchema.safeParse(rawId);
  if (!parsed.success) return null;

  return { session, id: parsed.data };
}

/** Record a destructive action in the audit trail. */
export async function auditDelete(
  action: AuditAction,
  session: SessionUser,
  meta: Record<string, unknown>
) {
  await logAudit({ action, actor: session.email, ip: await clientIp(), meta });
}
