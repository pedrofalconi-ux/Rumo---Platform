import { cookies } from 'next/headers';
import { db } from '@rumo/db';
import { getUserById } from './server-account-store';

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
    const session = db.sessions.findOne(requestSessionId);
    return session ? getUserById(session.userId) : null;
  }

  const cookieStore = await cookies();
  const sessionId = cookieStore.get('rumo_session')?.value;
  const session = sessionId ? db.sessions.findOne(sessionId) : null;
  return session ? getUserById(session.userId) : null;
}
