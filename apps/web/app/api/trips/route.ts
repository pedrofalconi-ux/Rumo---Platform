import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../lib/server-auth';
import { persistTripMedia } from '../../../lib/media/persist-trip-media';
import { createTripForAgency, listTripSummariesForAgency } from '../../../lib/server-trip-store';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    const trips = await listTripSummariesForAgency(user.agencyId);
    return NextResponse.json(trips);
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar viagens' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    const body = await persistTripMedia(await request.json(), user.agencyId);
    const newTrip = await createTripForAgency(body, user.agencyId, user.id);
    return NextResponse.json(newTrip);
  } catch (error) {
    console.error('Erro ao criar viagem:', error);
    const message = error instanceof Error ? error.message : 'Erro ao criar viagem';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
