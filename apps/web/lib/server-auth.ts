import { cookies } from 'next/headers';
import { db } from '@rumo/db';
import { getUserById } from './server-account-store';

function getCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return '';

  const match = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.slice(name.length + 1)) : '';
}

export function getSessionIdFromRequest(request?: Request) {
  return (
    request?.headers.get('x-rumo-session') ||
    request?.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    getCookieValue(request?.headers.get('cookie') || null, 'rumo_session') ||
    ''
  ).trim();
}

export async function getCurrentSession(request?: Request) {
  const requestSessionId = getSessionIdFromRequest(request);
  if (requestSessionId) {
    return db.sessions.findOne(requestSessionId);
  }

  const cookieStore = await cookies();
  const sessionId = cookieStore.get('rumo_session')?.value;
  return sessionId ? db.sessions.findOne(sessionId) : null;
}

export async function getCurrentUser(request?: Request) {
  const session = await getCurrentSession(request);
  return session ? getUserById(session.userId) : null;
}
