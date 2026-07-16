/* eslint-disable no-console */

async function main() {
  const { TripInputSchema, TripPlanSchema, DayBlocksSchema } = await import('../packages/ai/schemas/index.ts');
  const { createAiOrchestrator } = await import('../packages/ai/orchestrator/ai-orchestrator.ts');

  const partialTripInput = {
    tripId: 'trip-1',
    agencyId: 'agency-1',
    title: 'Roma Essencial',
    origin: 'Sao Paulo',
    destinations: ['Roma'],
    startDate: '2026-09-10',
    endDate: '2026-09-12',
    travelersCount: 2,
    clientName: 'Pedro',
    budget: 15000,
    currency: 'BRL',
    profile: 'lazer',
    preferences: 'boa gastronomia, caminhada',
    transportation: [
      {
        id: 't1',
        type: 'voo',
        operator: '',
        number: null,
        date: '2026-09-10',
        details: '',
      },
    ],
    accommodations: [
      {
        id: 'a1',
        destinationCity: 'Roma',
        name: 'Hotel Centro',
        checkIn: '',
        checkOut: null,
      },
    ],
    locale: 'pt-BR',
  };

  const parsedInput = TripInputSchema.parse(partialTripInput);
  if (!Array.isArray(parsedInput.transportation) || !Array.isArray(parsedInput.accommodations)) {
    throw new Error('TripInputSchema nao normalizou listas opcionais');
  }

  const partialPlan = TripPlanSchema.parse({
    tripDescription: {
      title: 'Roma',
    },
    days: [
      {
        day: 1,
        destination: 'Roma',
      },
    ],
  });

  if (!partialPlan.tripDescription.summary || partialPlan.days[0].theme.length === 0) {
    throw new Error('TripPlanSchema nao preencheu campos ausentes');
  }

  const partialDay = DayBlocksSchema.parse({
    day: 1,
    blocks: [
      {
        type: 'hotel',
        title: 'Check-in',
      },
      {
        title: 'Pantheon',
        location: {
          name: 'Pantheon',
          latitude: '41.8986',
          longitude: '12.4768',
        },
      },
    ],
  });

  if (partialDay.blocks[0].type !== 'text') {
    throw new Error('DayBlocksSchema nao converteu tipo invalido para text');
  }

  const orchestrator = createAiOrchestrator({ provider: 'mock', model: 'mock-itinerary-v1' });
  const result = await orchestrator.generateFullItinerary(partialTripInput);

  const daySummaries = result.itinerary.filter((item) => item.type === 'day_summary');
  if (daySummaries.length !== 3) {
    throw new Error(`Esperava 3 day_summary, recebi ${daySummaries.length}`);
  }

  console.log('TripInputSchema tolera logistica incompleta.');
  console.log('TripPlanSchema e DayBlocksSchema completam JSON parcial.');
  console.log('AiOrchestrator gera roteiro completo sem depender de JSON perfeitamente preenchido.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
