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

    return NextResponse.json(db.travelerInvites.findMany(user.agencyId, resolvedParams.id));
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar convites' }, { status: 500 });
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
    const client = body.clientId
      ? db.clients.findMany(user.agencyId).find((entry: any) => entry.id === body.clientId)
      : null;
    const travelerName = String(client?.fullName || body.travelerName || '').trim();
    const email = String(client?.email || body.email || '').trim();
    const phone = String(client?.phone || body.phone || '').trim();
    if (body.clientId && !client) {
      return NextResponse.json({ error: 'Cliente nao encontrado nesta agencia' }, { status: 404 });
    }
    if (!travelerName || (!email && !phone)) {
      return NextResponse.json({ error: 'Informe nome e e-mail ou telefone do viajante' }, { status: 400 });
    }

    const invite = db.travelerInvites.create({
      agencyId: user.agencyId,
      tripId: resolvedParams.id,
      clientId: client?.id || body.clientId || null,
      travelerName,
      email,
      phone,
      channel: body.channel || 'email',
      createdBy: user.id,
    });
    if (client) db.clients.update(client.id, { appAccessStatus: 'invited' }, user.agencyId);

    const url = `${new URL(request.url).origin}/mobile/invite/${invite.token}`;
    return NextResponse.json({ ...invite, url });
  } catch {
    return NextResponse.json({ error: 'Erro ao criar convite' }, { status: 500 });
  }
}
