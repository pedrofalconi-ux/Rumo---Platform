import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../../lib/server-auth';
import { findTripById, updateTripForAgency } from '../../../../../lib/server-trip-store';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const tripId = body.tripId as string;
    if (!tripId) {
      return NextResponse.json({ error: 'tripId obrigatorio' }, { status: 400 });
    }
    if (tripId.startsWith('LOCAL-')) {
      return NextResponse.json(
        {
          error:
            'Esta viagem existe apenas no fallback local do navegador. A aprovacao da IA exige persistencia no backend.',
        },
        { status: 409 }
      );
    }

    const trip = await findTripById(tripId, user.agencyId);
    if (!trip) {
      return NextResponse.json({ error: 'Viagem nao encontrada' }, { status: 404 });
    }

    const updated = await updateTripForAgency(tripId, {
      aiStatus: 'AI_REVIEWED',
    }, user.agencyId, user.id);
    if (!updated) {
      return NextResponse.json({ error: 'Viagem nao encontrada' }, { status: 404 });
    }

    return NextResponse.json({
      tripId,
      status: 'AI_REVIEWED',
      trip: updated,
    });
  } catch {
    return NextResponse.json({ error: 'Erro ao aprovar rascunho IA' }, { status: 500 });
  }
}
