import { NextResponse } from 'next/server';
import { db } from '@rumo/db';
import { registerAgencyAccount } from '../../../../lib/server-account-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.fullName || !body.email || !body.password || !body.accessKey) {
      return NextResponse.json({ error: 'Dados obrigatorios ausentes' }, { status: 400 });
    }

    if (body.accessKey !== 'rumo123') {
      return NextResponse.json({ error: 'Chave de acesso invalida' }, { status: 403 });
    }

    const user = await registerAgencyAccount({
      fullName: body.fullName,
      agencyName: body.agencyName || 'Nova Agencia',
      email: body.email,
      phone: body.phone || '',
      password: body.password,
    });
    const session = db.sessions.create(user.id);

    const response = NextResponse.json({ user });
    response.cookies.set('rumo_session', session.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      expires: new Date(session.expiresAt),
    });

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao criar conta';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
