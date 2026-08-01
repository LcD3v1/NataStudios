import type { Request } from 'express';
import { prisma } from '../lib/prisma.js';

export type AuditAction =
  | 'login_success'
  | 'login_failed'
  | 'login_rate_limited'
  | 'login_locked_out'
  | 'login_mfa_failed'
  | 'mfa_enabled'
  | 'mfa_disabled'
  | 'sessions_revoked'
  | 'password_changed'
  | 'logout'
  | 'create_client'
  | 'create_project'
  | 'move_project'
  | 'create_post'
  | 'create_invoice'
  | 'delete_client'
  | 'delete_project'
  | 'delete_post'
  | 'delete_invoice'
  | 'delete_lead'
  | 'contact_submitted';

/** Append a security/audit event. Never throws — auditing must not break the request. */
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

/** Best-effort client IP from proxy headers. */
export function clientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd) return fwd.split(',')[0]!.trim();
  return (req.headers['x-real-ip'] as string) || req.ip || 'unknown';
}
