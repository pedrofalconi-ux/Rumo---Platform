import { NextResponse } from 'next/server';
import { db } from '@rumo/db';
import { getCurrentUser } from '../../../../../lib/server-auth';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });

    const resolvedParams = await params;
    const trip = db.trips.findOne(resolvedParams.id);
    if (!trip || trip.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'Viagem nao encontrada' }, { status: 404 });
    }

    return NextResponse.json(db.notifications.findMany(user.agencyId, resolvedParams.id));
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar notificacoes' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });

    const resolvedParams = await params;
    const trip = db.trips.findOne(resolvedParams.id);
    if (!trip || trip.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'Viagem nao encontrada' }, { status: 404 });
    }

    const body = await request.json();
    if (!body.title || !body.message) {
      return NextResponse.json({ error: 'Titulo e mensagem sao obrigatorios' }, { status: 400 });
    }

    const notification = db.notifications.create({
      agencyId: user.agencyId,
      tripId: resolvedParams.id,
      title: body.title,
      message: body.message,
      target: 'trip_travelers',
      createdBy: user.id,
    });

    return NextResponse.json(notification);
  } catch {
    return NextResponse.json({ error: 'Erro ao emitir notificacao' }, { status: 500 });
  }
}
