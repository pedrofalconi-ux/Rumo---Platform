import { cookies } from 'next/headers';
import { db } from '@rumo/db';

export function getSessionIdFromRequest(request?: Request) {
  return (
    request?.headers.get('x-rumo-session') ||
    request?.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    ''
  ).trim();
}

export async function getCurrentUser(request?: Request) {
  const requestSessionId = getSessionIdFromRequest(request);
  if (requestSessionId) {
    return db.auth.me(requestSessionId);
  }

  const cookieStore = await cookies();
  const sessionId = cookieStore.get('rumo_session')?.value;
  return db.auth.me(sessionId);
}
