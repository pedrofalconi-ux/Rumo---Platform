import { NextResponse } from 'next/server';
import { db } from '@rumo/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = db.auth.registerTraveler(body);
    const login = db.auth.login(body.email, body.password);

    if (!login) {
      return NextResponse.json({ user });
    }

    const response = NextResponse.json({
      user: login.user,
      session: {
        id: login.session.id,
        expiresAt: login.session.expiresAt,
      },
    });
    response.cookies.set('rumo_session', login.session.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      expires: new Date(login.session.expiresAt),
    });

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao criar conta do viajante';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
