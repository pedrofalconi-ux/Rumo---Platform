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
    const trip = db.trips.findOne(resolvedParams.id);
    if (!trip || trip.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'Viagem nao encontrada' }, { status: 404 });
    }

    const body = await request.json();
    if (!body.travelerName || (!body.email && !body.phone)) {
      return NextResponse.json({ error: 'Informe nome e e-mail ou telefone do viajante' }, { status: 400 });
    }

    const invite = db.travelerInvites.create({
      agencyId: user.agencyId,
      tripId: resolvedParams.id,
      travelerName: body.travelerName,
      email: body.email || '',
      phone: body.phone || '',
      channel: body.channel || 'email',
      createdBy: user.id,
    });

    const url = `${new URL(request.url).origin}/mobile/invite/${invite.token}`;
    return NextResponse.json({ ...invite, url });
  } catch {
    return NextResponse.json({ error: 'Erro ao criar convite' }, { status: 500 });
  }
}
