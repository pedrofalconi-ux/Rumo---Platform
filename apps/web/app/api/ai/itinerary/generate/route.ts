import { NextResponse } from 'next/server';
import { composeItinerary, tripRecordToInput } from '@rumo/ai';
import { getCurrentUser } from '../../../../../lib/server-auth';
import { createTripAiOrchestrator } from '../../../../../lib/ai/create-orchestrator';
import { selectImagesForItinerary } from '../../../../../lib/media/select-itinerary-images';
import { findTripById, updateTripForAgency } from '../../../../../lib/server-trip-store';

export async function POST(request: Request) {
  let tripIdForError: string | undefined;

  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const tripId = body.tripId as string;
    tripIdForError = tripId;
    if (!tripId) {
      return NextResponse.json({ error: 'tripId obrigatorio' }, { status: 400 });
    }
    if (tripId.startsWith('LOCAL-')) {
      return NextResponse.json(
        {
          error:
            'Esta viagem foi criada apenas no fallback local do navegador. A IA precisa de persistencia compartilhada no backend para gerar o roteiro.',
        },
        { status: 409 }
      );
    }

    const trip = await findTripById(tripId, user.agencyId);
    if (!trip) {
      return NextResponse.json({ error: 'Viagem nao encontrada' }, { status: 404 });
    }

    const replaceExisting = body.options?.replaceExisting !== false;
    const orchestrator = await createTripAiOrchestrator(user.agencyId, user.id);

    const preservedItems = replaceExisting
      ? []
      : (trip.itinerary || []).filter(
          (item: { meta?: { aiGenerated?: boolean } }) => !item.meta?.aiGenerated
        );

    await updateTripForAgency(tripId, {
      itinerary: preservedItems,
      aiStatus: 'AI_GENERATING',
      aiResponse: {
        provider: orchestrator.providerName,
        model: orchestrator.modelName,
        progress: {
          status: 'AI_GENERATING',
          daysGenerated: 0,
          failedDays: [],
        },
      },
    }, user.agencyId, user.id);

    const tripInput = tripRecordToInput(trip, user.agencyId);
    const result = await orchestrator.generateFullItinerary(tripInput, {
      userId: user.id,
      onDayGenerated: async ({ plan, dayResults, failedDays, generationId, tokensIn, tokensOut, startedAt }) => {
        const partialItinerary = composeItinerary(plan, dayResults);
        const mergedPartialItinerary = [...preservedItems, ...partialItinerary];

        await updateTripForAgency(tripId, {
          itinerary: mergedPartialItinerary,
          aiStatus: 'AI_GENERATING',
          aiGenerationId: generationId,
          aiPrompt: tripInput,
          aiResponse: {
            generationId,
            model: orchestrator.modelName,
            provider: orchestrator.providerName,
            totalTokensIn: tokensIn,
            totalTokensOut: tokensOut,
            latencyMs: Date.now() - startedAt,
            daysGenerated: dayResults.length,
            failedDays,
            progress: {
              status: 'AI_GENERATING',
              daysGenerated: dayResults.length,
              failedDays,
            },
          },
          aiGeneratedAt: new Date().toISOString(),
        }, user.agencyId, user.id);
      },
    });

    const aiItineraryWithImages = await selectImagesForItinerary(result.itinerary, user.agencyId);

    const mergedItinerary = replaceExisting
      ? aiItineraryWithImages
      : [...preservedItems, ...aiItineraryWithImages];

    const updated = await updateTripForAgency(tripId, {
      itinerary: mergedItinerary,
      aiStatus: 'AI_DRAFT',
      aiGenerationId: result.meta.generationId,
      aiPrompt: tripInput,
      aiResponse: result.meta,
      aiGeneratedAt: new Date().toISOString(),
    }, user.agencyId, user.id);
    if (!updated) {
      return NextResponse.json({ error: 'Viagem nao encontrada ao finalizar geracao' }, { status: 404 });
    }

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
      const user = await getCurrentUser(request).catch(() => null);
      if (user) {
        await updateTripForAgency(tripIdForError, { aiStatus: 'AI_FAILED' }, user.agencyId, user.id);
      }
    }

    const isValidation = message.includes('JSON') || message.includes('Block type');
    return NextResponse.json(
      { error: message, code: isValidation ? 'LLM_VALIDATION_FAILED' : 'LLM_UNAVAILABLE' },
      { status: isValidation ? 422 : 503 }
    );
  }
}
