import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Liveness/readiness probe for the container healthcheck and uptime monitors.
 * Deliberately returns no version or environment details.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ok' });
  } catch {
    return NextResponse.json({ status: 'degraded' }, { status: 503 });
  }
}
