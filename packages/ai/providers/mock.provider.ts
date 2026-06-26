import type { ZodSchema } from 'zod';
import type { DayBlocks, TripInput, TripPlan } from '../types';
import { DayBlocksSchema, TripPlanSchema } from '../schemas';
import type { LLMGenerateParams, LLMGenerateResult, LLMProvider } from './types';

function addDaysIso(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function countTripDays(input: TripInput): number {
  const start = new Date(`${input.startDate}T12:00:00`);
  const end = new Date(`${input.endDate}T12:00:00`);
  const diff = Math.round((end.getTime() - start.getTime()) / 86400000);
  return Math.max(1, diff + 1);
}

function primaryDestination(input: TripInput, dayIndex: number): string {
  if (input.destinationsDetail?.length) {
    const dayDate = addDaysIso(input.startDate, dayIndex - 1);
    const match = input.destinationsDetail.find(
      (d) => dayDate >= d.startDate && dayDate <= d.endDate
    );
    if (match) return match.city.split(' (')[0];
  }
  const idx = Math.min(dayIndex - 1, input.destinations.length - 1);
  return input.destinations[idx]?.split(' (')[0] || input.destinations[0];
}

function buildMockPlan(input: TripInput): TripPlan {
  const totalDays = countTripDays(input);
  const destLabel = input.destinations.map((d) => d.split(' (')[0]).join(', ');

  const days = Array.from({ length: totalDays }, (_, i) => {
    const day = i + 1;
    const destination = primaryDestination(input, day);
    const isFirst = day === 1;
    const isLast = day === totalDays;

    return {
      day,
      date: addDaysIso(input.startDate, i),
      destination,
      theme: isFirst
        ? 'Chegada e primeiro contato com a cidade'
        : isLast
          ? 'Despedida e últimas experiências'
          : `Explorando ${destination}`,
      focus: input.preferences
        ? input.preferences.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 3)
        : ['passeios', 'gastronomia local'],
    };
  });

  return {
    tripDescription: {
      title: `${input.title} — ${destLabel}`,
      summary: `Roteiro de ${totalDays} dias para ${input.clientName}, saindo de ${input.origin} com foco em ${input.profile.replace('_', ' ')}. ${input.preferences ? `Preferências: ${input.preferences}.` : ''}`.trim(),
      highlights: [
        `Destinos: ${destLabel}`,
        `${input.travelersCount} viajante(s)`,
        input.budget > 0 ? `Orçamento referência: R$ ${input.budget.toLocaleString('pt-BR')}` : 'Orçamento a definir',
      ],
    },
    days,
  };
}

function buildMockDayBlocks(input: TripInput, dayPlan: TripPlan['days'][0]): DayBlocks {
  const city = dayPlan.destination;
  const baseLat = 41.8902;
  const baseLon = 12.4922;

  return {
    day: dayPlan.day,
    daySummary: {
      title: dayPlan.day === 1 ? `Chegada em ${city}` : `Dia ${dayPlan.day} — ${dayPlan.theme}`,
      subTitle: city,
      details: `Programação sugerida em ${city} com foco em ${dayPlan.focus.join(', ') || 'experiências locais'}.`,
      imageSearchQuery: `${city} travel skyline`,
    },
    blocks: [
      {
        type: 'places',
        title: dayPlan.day === 1 ? `Centro histórico de ${city}` : `Ponto emblemático de ${city}`,
        subTitle: 'Passeio a pé',
        details: `Explore os principais cartões-postais de ${city} no seu ritmo.`,
        imageSearchQuery: `${city} historic center`,
        location: {
          name: dayPlan.day === 1 ? `Centro historico de ${city}` : `Ponto emblematico de ${city}`,
          address: city,
          latitude: baseLat + dayPlan.day * 0.002,
          longitude: baseLon + dayPlan.day * 0.002,
        },
        estimatedDurationMinutes: 90,
        recommendedStartTime: '09:30',
        customSymbol: 'museum',
      },
      {
        type: 'activity',
        title: dayPlan.day === 1 ? 'Tour introdutório guiado' : 'Experiência cultural recomendada',
        subTitle: 'Meio período',
        details: 'Visita guiada com contexto histórico e dicas do consultor Rumo.',
        imageSearchQuery: `${city} guided walking tour`,
        location: {
          name: 'Ponto de encontro do tour',
          address: city,
          latitude: baseLat + dayPlan.day * 0.002 + 0.006,
          longitude: baseLon + dayPlan.day * 0.002 + 0.004,
        },
        estimatedDurationMinutes: 150,
        recommendedStartTime: '11:00',
        customSymbol: 'explore',
      },
      {
        type: 'transport',
        title: dayPlan.day === 1 ? 'Transfer aeroporto → região central' : 'Deslocamento entre bairros',
        details: 'Sugestão: metrô, táxi oficial ou transfer privado conforme conforto do cliente.',
        imageSearchQuery: `${city} taxi street`,
        estimatedDurationMinutes: 35,
        recommendedStartTime: dayPlan.day === 1 ? '08:30' : '14:30',
        customSymbol: 'directions_car',
      },
      {
        type: 'text',
        title: 'Dica Rumo',
        details: `Reserve tempo para ${dayPlan.focus[0] || 'pausas'} e confirme horários de funcionamento com antecedência.`,
        imageSearchQuery: `${city} cafe street`,
        customSymbol: 'description',
      },
      {
        type: 'suggested_places',
        title: `Sugestões extras em ${city}`,
        subTitle: 'Opcional',
        details: 'Restaurantes locais, mirantes e bairros adjacentes para tempo livre.',
        imageSearchQuery: `${city} viewpoint restaurant`,
        location: {
          name: `Area complementar em ${city}`,
          address: city,
          latitude: baseLat + dayPlan.day * 0.002 + 0.012,
          longitude: baseLon + dayPlan.day * 0.002 + 0.01,
        },
        estimatedDurationMinutes: 90,
        recommendedStartTime: '16:00',
        customSymbol: 'star',
      },
    ],
  };
}

export class MockProvider implements LLMProvider {
  readonly name = 'mock';

  constructor(readonly model = 'mock-itinerary-v1') {}

  async generate<T>(params: LLMGenerateParams<T>): Promise<LLMGenerateResult<T>> {
    const started = Date.now();
    await new Promise((r) => setTimeout(r, 120));

    const userPayload = params.user;
    const tripMatch = userPayload.match(/T[ií]tulo: (.+)/);
    const periodMatch = userPayload.match(/Per[ií]odo: (\d{4}-\d{2}-\d{2}) a (\d{4}-\d{2}-\d{2})/);
    const travelersMatch = userPayload.match(/Viajantes: (\d+)/);

    const mockInput: TripInput = {
      tripId: 'mock',
      agencyId: 'mock',
      title: tripMatch?.[1] || 'Viagem Rumo',
      origin: 'São Paulo (BR)',
      destinations: ['Destino'],
      startDate: periodMatch?.[1] || '2024-07-01',
      endDate: periodMatch?.[2] || '2024-07-07',
      travelersCount: Number(travelersMatch?.[1] || 2),
      clientName: 'Cliente',
      budget: 10000,
      currency: 'BRL',
      profile: 'lazer',
      preferences: '',
      locale: 'pt-BR',
    };

    let raw: unknown;

    if (userPayload.includes('planejamento macro')) {
      raw = buildMockPlan(mockInput);
      TripPlanSchema.parse(raw);
    } else if (userPayload.includes('blocos de conteúdo') || userPayload.includes('blocos de conteudo')) {
      const dayMatch = userPayload.match(/Dia (\d+)/);
      const dayNum = Number(dayMatch?.[1] || 1);
      const plan = buildMockPlan(mockInput);
      const dayPlan = plan.days.find((d) => d.day === dayNum) || plan.days[0];
      raw = buildMockDayBlocks(mockInput, dayPlan);
      DayBlocksSchema.parse(raw);
    } else {
      throw new Error('MockProvider: prompt não reconhecido');
    }

    const data = params.schema.parse(raw);

    return {
      data,
      usage: { tokensIn: 0, tokensOut: 0 },
      latencyMs: Date.now() - started,
    };
  }
}
