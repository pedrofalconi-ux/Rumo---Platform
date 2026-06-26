import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/server-auth';
import { db } from '@rumo/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    if (user.role !== 'traveler') {
      return NextResponse.json({ error: 'Area exclusiva para viajantes' }, { status: 403 });
    }

    return NextResponse.json(db.travelerTrips.findManyForUser(user.id));
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar viagens do viajante' }, { status: 500 });
  }
}
