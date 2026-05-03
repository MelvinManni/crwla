import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'crwla_token';
const PUBLIC_PATHS = ['/signin', '/request-access'];

/**
 * Coarse auth gate. The (app) server layout still re-validates by calling
 * /api/auth/me — middleware just keeps unauthenticated users from rendering
 * the protected shell at all.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!token && !isPublic && pathname !== '/') {
    const url = req.nextUrl.clone();
    url.pathname = '/signin';
    return NextResponse.redirect(url);
  }

  if (token && isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
