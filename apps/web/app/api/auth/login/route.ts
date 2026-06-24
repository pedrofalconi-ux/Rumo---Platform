import { NextResponse } from 'next/server';
import { db } from '@rumo/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = db.auth.login(body.email || '', body.password || '');

    if (!result) {
      return NextResponse.json({ error: 'E-mail ou senha invalidos' }, { status: 401 });
    }

    const response = NextResponse.json({ user: result.user });
    response.cookies.set('rumo_session', result.session.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      expires: new Date(result.session.expiresAt),
    });

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao fazer login';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
