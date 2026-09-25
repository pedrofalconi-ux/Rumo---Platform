import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/server-auth';
import { db, normalizeTravelerInviteToken } from '@rumo/db';
import { findTripById } from '../../../../lib/server-trip-store';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    if (user.role !== 'traveler') {
      return NextResponse.json({ error: 'Area exclusiva para viajantes' }, { status: 403 });
    }

    const body = await request.json();
    if (!body.linkOrToken) {
      return NextResponse.json({ error: 'Informe o link ou codigo de convite' }, { status: 400 });
    }

    const normalizedToken = normalizeTravelerInviteToken(body.linkOrToken);
    const invite = db.travelerInvites.findByToken(normalizedToken);
    if (!invite) return NextResponse.json({ error: 'Convite inválido ou expirado' }, { status: 400 });
    const trip = await findTripById(invite.tripId, invite.agencyId);
    if (!trip || trip.agencyId !== invite.agencyId) {
      return NextResponse.json({ error: 'Viagem não encontrada' }, { status: 404 });
    }
    db.travelerTrips.importByInviteToken(user.id, normalizedToken);
    return NextResponse.json({ trip });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao importar viagem';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
