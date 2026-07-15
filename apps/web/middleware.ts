import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = ['/login', '/register', '/traveler/register'];

export function middleware(request: NextRequest) {
  const session = request.cookies.get('rumo_session')?.value;
  const pathname = request.nextUrl.pathname;
  const isPublicPath = publicPaths.includes(pathname);

  if (!session && !isPublicPath && !pathname.startsWith('/api') && pathname !== '/favicon.ico') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\..*).*)'],
};
