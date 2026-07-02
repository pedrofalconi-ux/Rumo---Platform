import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/server-auth';
import { db } from '@rumo/db';

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

    const trip = db.travelerTrips.importByInviteToken(user.id, body.linkOrToken);
    return NextResponse.json({ trip });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao importar viagem';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
