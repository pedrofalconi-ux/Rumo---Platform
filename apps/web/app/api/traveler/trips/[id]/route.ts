import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../../lib/server-auth';
import { db } from '@rumo/db';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    if (user.role !== 'traveler') {
      return NextResponse.json({ error: 'Area exclusiva para viajantes' }, { status: 403 });
    }

    const resolvedParams = await params;
    const trips = db.travelerTrips.findManyForUser(user.id);
    const trip = trips.find((item: any) => item.id === resolvedParams.id);
    if (!trip) {
      return NextResponse.json({ error: 'Viagem nao encontrada para este usuario' }, { status: 404 });
    }

    return NextResponse.json(trip);
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar viagem do viajante' }, { status: 500 });
  }
}
