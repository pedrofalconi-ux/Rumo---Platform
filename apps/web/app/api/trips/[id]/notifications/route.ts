import { NextResponse } from 'next/server';
import { db } from '@rumo/db';
import { getCurrentUser } from '../../../../../lib/server-auth';
import { findTripById } from '../../../../../lib/server-trip-store';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });

    const resolvedParams = await params;
    const trip = await findTripById(resolvedParams.id, user.agencyId);
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
    const trip = await findTripById(resolvedParams.id, user.agencyId);
    if (!trip || trip.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'Viagem nao encontrada' }, { status: 404 });
    }

    const body = await request.json();
    if (!body.title || !body.message) {
      return NextResponse.json({ error: 'Titulo e mensagem sao obrigatorios' }, { status: 400 });
    }

    const travelers = Array.isArray(trip.travelers) ? trip.travelers : [];
    const targetMode = body.targetMode === 'specific' ? 'specific' : 'all';
    const recipients =
      targetMode === 'specific'
        ? Array.isArray(body.recipients)
          ? body.recipients.filter((recipient: unknown) => typeof recipient === 'string' && travelers.includes(recipient))
          : []
        : travelers;

    if (targetMode === 'specific' && recipients.length === 0) {
      return NextResponse.json({ error: 'Selecione ao menos um destinatario valido' }, { status: 400 });
    }

    const notification = db.notifications.create({
      agencyId: user.agencyId,
      tripId: resolvedParams.id,
      title: body.title,
      message: body.message,
      target: targetMode === 'specific' ? 'selected_travelers' : 'trip_travelers',
      recipients,
      priority: body.priority === 'high' ? 'high' : 'normal',
      category: typeof body.category === 'string' ? body.category : 'general',
      createdBy: user.id,
    });

    return NextResponse.json(notification);
  } catch {
    return NextResponse.json({ error: 'Erro ao emitir notificacao' }, { status: 500 });
  }
}
