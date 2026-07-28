import { NextResponse, type NextRequest } from 'next/server';

// Cookie-presence check only. This just decides whether to bounce to /login;
// it never reads or verifies the session payload. The real authorization
// (member lookup, is_admin checks) happens downstream in requireMember /
// requireAdmin (src/lib/session.ts), which run wherever a page or action
// actually needs the member record.
export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has('within_cohort');
  const { pathname } = req.nextUrl;
  const isPublic =
    pathname === '/login' ||
    pathname.startsWith('/api/cron/') ||
    pathname.startsWith('/api/push/');

  if (!hasSession && !isPublic) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  return NextResponse.next();
}

// Runs on every route except static assets and the PWA files, which must
// stay reachable unauthenticated (manifest/service worker/icons are fetched
// before login, and favicon is fetched by the browser chrome itself). `brand`
// covers the logo PNGs in public/brand/: next/image's optimizer fetches them
// server-side without the session cookie, so guarding that path 307s the fetch
// to /login and the logo renders broken (a 400 from the image optimizer).
export const config = {
  matcher: ['/((?!_next|brand|icons|manifest.webmanifest|sw.js|favicon.ico).*)'],
};
