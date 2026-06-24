import { NextResponse } from 'next/server';
import { db } from '@rumo/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.fullName || !body.email || !body.password || !body.accessKey) {
      return NextResponse.json({ error: 'Dados obrigatorios ausentes' }, { status: 400 });
    }

    const user = db.auth.register(body);
    const login = db.auth.login(body.email, body.password);

    if (!login) {
      return NextResponse.json({ user });
    }

    const response = NextResponse.json({ user: login.user });
    response.cookies.set('rumo_session', login.session.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      expires: new Date(login.session.expiresAt),
    });

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao criar conta';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
