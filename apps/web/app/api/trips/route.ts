import { NextResponse } from 'next/server';
import { db } from '@rumo/db';
import { getCurrentUser } from '../../../lib/server-auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    const trips = db.trips.findMany(user.agencyId);
    return NextResponse.json(trips);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar viagens' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    const body = await request.json();
    const newTrip = db.trips.create({ ...body, agencyId: user.agencyId });
    return NextResponse.json(newTrip);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar viagem' }, { status: 500 });
  }
}
