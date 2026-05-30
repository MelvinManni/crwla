import { NextResponse, type NextRequest } from 'next/server';

// Canonical-host redirect: anything hitting dev.crwla.com is sent to
// crwla.com, preserving the path + query string. Uses a 308 (permanent,
// method-preserving) so search engines and clients update.
const FROM_HOST = 'dev.crwla.com';
const TO_HOST = 'crwla.com';

export function middleware(req: NextRequest) {
  // `host` can carry a port (e.g. dev.crwla.com:443) — compare the hostname.
  const host = req.headers.get('host')?.split(':')[0].toLowerCase();
  if (host !== FROM_HOST) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.protocol = 'https:';
  url.hostname = TO_HOST;
  url.port = '';
  return NextResponse.redirect(url, 308);
}

// Run on every request except Next's internal/static assets.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
