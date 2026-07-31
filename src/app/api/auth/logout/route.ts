import { NextResponse } from 'next/server';
import { destroySession, getSession } from '@/lib/auth';
import { isSameOrigin, getClientIp } from '@/lib/security/http';
import { logAudit } from '@/lib/security/audit';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  // CSRF: only accept same-origin logout requests.
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const session = await getSession();
  await destroySession();
  if (session) {
    await logAudit({ action: 'logout', actor: session.email, ip: getClientIp(request) });
  }

  return NextResponse.redirect(new URL('/dashboard/login', request.url));
}
