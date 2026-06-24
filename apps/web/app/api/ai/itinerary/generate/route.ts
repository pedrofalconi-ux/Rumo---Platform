import { NextResponse } from 'next/server';
import { db } from '@rumo/db';
import { tripRecordToInput } from '@rumo/ai';
import { getCurrentUser } from '../../../../../lib/server-auth';
import { createTripAiOrchestrator } from '../../../../../lib/ai/create-orchestrator';

export async function POST(request: Request) {
  let tripIdForError: string | undefined;

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const tripId = body.tripId as string;
    tripIdForError = tripId;
    if (!tripId) {
      return NextResponse.json({ error: 'tripId obrigatorio' }, { status: 400 });
    }

    const trip = db.trips.findOne(tripId);
    if (!trip || trip.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'Viagem nao encontrada' }, { status: 404 });
    }

    const replaceExisting = body.options?.replaceExisting !== false;
    const orchestrator = createTripAiOrchestrator(user.agencyId, user.id);

    db.trips.update(tripId, {
      aiStatus: 'AI_GENERATING',
    });

    const tripInput = tripRecordToInput(trip, user.agencyId);
    const result = await orchestrator.generateFullItinerary(tripInput, { userId: user.id });

    const preservedItems = replaceExisting
      ? []
      : (trip.itinerary || []).filter(
          (item: { meta?: { aiGenerated?: boolean } }) => !item.meta?.aiGenerated
        );

    const mergedItinerary = replaceExisting
      ? result.itinerary
      : [...preservedItems, ...result.itinerary];

    const updated = db.trips.update(tripId, {
      itinerary: mergedItinerary,
      aiStatus: 'AI_DRAFT',
      aiGenerationId: result.meta.generationId,
      aiPrompt: tripInput,
      aiResponse: result.meta,
      aiGeneratedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      tripId,
      status: 'AI_DRAFT',
      generationId: result.meta.generationId,
      itinerary: mergedItinerary,
      meta: result.meta,
      trip: updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';

    if (tripIdForError) {
      db.trips.update(tripIdForError, { aiStatus: 'AI_FAILED' });
    }

    const isValidation = message.includes('JSON') || message.includes('Block type');
    return NextResponse.json(
      { error: message, code: isValidation ? 'LLM_VALIDATION_FAILED' : 'LLM_UNAVAILABLE' },
      { status: isValidation ? 422 : 503 }
    );
  }
}
