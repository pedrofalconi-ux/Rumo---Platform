import { NextResponse } from 'next/server';
import { db } from '@rumo/db';
import { getCurrentUser } from '../../../lib/server-auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    return NextResponse.json(db.settings.get(user.agencyId));
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar configuracoes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    const body = await request.json();
    return NextResponse.json(db.settings.update({ ...body, agencyId: user.agencyId }));
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao salvar configuracoes' }, { status: 500 });
  }
}
