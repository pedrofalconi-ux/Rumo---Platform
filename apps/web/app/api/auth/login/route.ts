import { NextResponse } from 'next/server';
import { db } from '@rumo/db';
import { authenticateAccount } from '../../../../lib/server-account-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await authenticateAccount(body.email || '', body.password || '');

    if (!user) {
      return NextResponse.json({ error: 'E-mail ou senha invalidos' }, { status: 401 });
    }

    const session = db.sessions.create(user.id);

    const response = NextResponse.json({
      user,
      session: {
        id: session.id,
        expiresAt: session.expiresAt,
      },
    });
    response.cookies.set('rumo_session', session.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      expires: new Date(session.expiresAt),
    });

    return response;
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : JSON.stringify(error);
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
