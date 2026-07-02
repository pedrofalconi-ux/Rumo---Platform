import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@rumo/db';
import { getSessionIdFromRequest } from '../../../../lib/server-auth';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const sessionId = getSessionIdFromRequest(request) || cookieStore.get('rumo_session')?.value;

  if (sessionId) {
    db.sessions.delete(sessionId);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('rumo_session', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });

  return response;
}
