import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { jwtVerify } from 'jose';
import { routing } from './i18n/routing';
import { SESSION_COOKIE } from './lib/session-config';

const intlMiddleware = createMiddleware(routing);

async function isAuthenticated(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token || !process.env.AUTH_SECRET) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET));
    return true;
  } catch {
    return false;
  }
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Dashboard: guard with the session cookie, bypass i18n routing.
  if (pathname.startsWith('/dashboard')) {
    const authed = await isAuthenticated(req);
    const isLogin = pathname === '/dashboard/login';

    if (!authed && !isLogin) {
      const url = req.nextUrl.clone();
      url.pathname = '/dashboard/login';
      return NextResponse.redirect(url);
    }
    if (authed && isLogin) {
      const url = req.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Public marketing site: locale routing.
  return intlMiddleware(req);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
