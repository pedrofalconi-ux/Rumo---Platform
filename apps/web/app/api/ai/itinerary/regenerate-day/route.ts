import { NextResponse } from 'next/server';
import { db } from '@rumo/db';
import { mergeDayIntoItinerary, tripRecordToInput } from '@rumo/ai';
import { getCurrentUser } from '../../../../../lib/server-auth';
import { createTripAiOrchestrator } from '../../../../../lib/ai/create-orchestrator';
import { selectImagesForItinerary } from '../../../../../lib/media/select-itinerary-images';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
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

    const trip = db.trips.findOne(tripId);
    if (!trip || trip.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'Viagem nao encontrada' }, { status: 404 });
    }

    const orchestrator = createTripAiOrchestrator(user.agencyId, user.id);
    const tripInput = tripRecordToInput(trip, user.agencyId);
    const { dayBlocks } = await orchestrator.regenerateDay(tripInput, day, instruction, {
      userId: user.id,
    });

    const existingItinerary = trip.itinerary || [];
    const mergedItinerary = await selectImagesForItinerary(
      mergeDayIntoItinerary(existingItinerary, day, dayBlocks),
      user.agencyId
    );

    const updated = db.trips.update(tripId, {
      itinerary: mergedItinerary,
      aiStatus: trip.aiStatus === 'AI_REVIEWED' ? 'AI_REVIEWED' : 'AI_DRAFT',
      aiGeneratedAt: new Date().toISOString(),
    });

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
