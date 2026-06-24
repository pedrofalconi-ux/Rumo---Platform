import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@rumo/db';

export async function GET() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('rumo_session')?.value;
  const user = db.auth.me(sessionId);

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({ user });
}
