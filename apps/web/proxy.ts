import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = ['/login', '/register', '/traveler/register'];
const MOBILE_ALLOWED_HEADERS = 'Content-Type, Authorization, X-Rumo-Session';

function isAllowedMobileOrigin(origin: string) {
  if (!origin) return false;
  const configuredOrigins = (process.env.MOBILE_WEB_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (configuredOrigins.includes(origin)) return true;

  try {
    const url = new URL(origin);
    const isExpoPort = ['8081', '19006'].includes(url.port);
    const isLocalHost =
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      /^10\./.test(url.hostname) ||
      /^192\.168\./.test(url.hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(url.hostname);
    return url.protocol === 'http:' && isExpoPort && isLocalHost;
  } catch {
    return false;
  }
}

function addMobileCorsHeaders(response: NextResponse, origin: string) {
  if (!isAllowedMobileOrigin(origin)) return response;
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', MOBILE_ALLOWED_HEADERS);
  response.headers.set('Access-Control-Max-Age', '86400');
  response.headers.set('Vary', 'Origin');
  return response;
}

export function proxy(request: NextRequest) {
  const session = request.cookies.get('rumo_session')?.value;
  const pathname = request.nextUrl.pathname;
  const isPublicPath = publicPaths.includes(pathname);
  const origin = request.headers.get('origin') || '';

  if (pathname.startsWith('/api') && request.method === 'OPTIONS') {
    if (!isAllowedMobileOrigin(origin)) {
      return new NextResponse(null, { status: 403 });
    }
    return addMobileCorsHeaders(new NextResponse(null, { status: 204 }), origin);
  }

  if (!session && !isPublicPath && !pathname.startsWith('/api') && pathname !== '/favicon.ico') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return addMobileCorsHeaders(NextResponse.next(), origin);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\..*).*)'],
};
