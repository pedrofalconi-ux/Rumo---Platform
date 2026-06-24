import { NextResponse } from 'next/server';
import { db } from '@rumo/db';
import { getCurrentUser } from '../../../lib/server-auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    const clients = db.clients.findMany(user.agencyId);
    return NextResponse.json(clients);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar clientes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    const body = await request.json();
    const newClient = db.clients.create({ ...body, agencyId: user.agencyId });
    return NextResponse.json(newClient);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar cliente' }, { status: 500 });
  }
}
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID do cliente ausente' }, { status: 400 });
    db.clients.delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao deletar cliente' }, { status: 500 });
  }
}
