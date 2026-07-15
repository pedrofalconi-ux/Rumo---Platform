import { NextResponse } from 'next/server';
import { mergeDayIntoItinerary, tripRecordToInput } from '@rumo/ai';
import { getCurrentUser } from '../../../../../lib/server-auth';
import { createTripAiOrchestrator } from '../../../../../lib/ai/create-orchestrator';
import { selectImagesForItinerary } from '../../../../../lib/media/select-itinerary-images';
import { findTripById, updateTripForAgency } from '../../../../../lib/server-trip-store';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const tripId = body.tripId as string;
    const day = Number(body.day);
    const instruction = typeof body.instruction === 'string' ? body.instruction : undefined;

    if (!tripId || !day || day < 1) {
      return NextResponse.json({ error: 'tripId e day sao obrigatorios' }, { status: 400 });
    }
    if (tripId.startsWith('LOCAL-')) {
      return NextResponse.json(
        {
          error:
            'Esta viagem existe apenas no fallback local do navegador. A regeneracao com IA exige persistencia no backend.',
        },
        { status: 409 }
      );
    }

    const trip = await findTripById(tripId, user.agencyId);
    if (!trip) {
      return NextResponse.json({ error: 'Viagem nao encontrada' }, { status: 404 });
    }

    const orchestrator = await createTripAiOrchestrator(user.agencyId, user.id);
    const tripInput = tripRecordToInput(trip, user.agencyId);
    const { dayBlocks } = await orchestrator.regenerateDay(tripInput, day, instruction, {
      userId: user.id,
    });

    const existingItinerary = trip.itinerary || [];
    const mergedItinerary = await selectImagesForItinerary(
      mergeDayIntoItinerary(existingItinerary, day, dayBlocks),
      user.agencyId
    );

    const updated = await updateTripForAgency(tripId, {
      itinerary: mergedItinerary,
      aiStatus: trip.aiStatus === 'AI_REVIEWED' ? 'AI_REVIEWED' : 'AI_DRAFT',
      aiGeneratedAt: new Date().toISOString(),
    }, user.agencyId, user.id);
    if (!updated) {
      return NextResponse.json({ error: 'Viagem nao encontrada' }, { status: 404 });
    }

    return NextResponse.json({
      tripId,
      day,
      itinerary: mergedItinerary,
      trip: updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao regenerar dia';
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
