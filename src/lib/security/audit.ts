import { prisma } from '@/lib/prisma';

export type AuditAction =
  | 'login_success'
  | 'login_failed'
  | 'login_rate_limited'
  | 'logout'
  | 'create_client'
  | 'create_project'
  | 'move_project'
  | 'create_post'
  | 'create_invoice'
  | 'contact_submitted'
  | 'newsletter_signup';

/**
 * Append a security/audit event. Never throws — auditing must not break the
 * request it is recording.
 */
export async function logAudit(params: {
  action: AuditAction;
  actor?: string | null;
  ip?: string | null;
  meta?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        actor: params.actor ?? null,
        ip: params.ip ?? null,
        meta: params.meta ? JSON.stringify(params.meta).slice(0, 2000) : null
      }
    });
  } catch (err) {
    console.error('[audit] failed to write', params.action, err);
  }
}
