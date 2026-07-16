import { z } from 'zod';
import { AI_BLOCK_TYPES } from '../types';

export const BlockTypeSchema = z.enum(AI_BLOCK_TYPES);

export const TripProfileSchema = z.enum([
  'lazer',
  'lua_de_mel',
  'aventura',
  'cultural',
  'negocios',
]);

export const TransportationTypeSchema = z.enum([
  'voo',
  'barco',
  'onibus',
  'aluguel_carro',
  'balsa',
  'carro_privativo',
  'shuttle',
  'taxi',
  'trem',
  'bonde',
]);

const DEFAULT_DAY_BLOCK_TYPE = 'text';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value.trim();
  if (value == null) return fallback;
  return String(value).trim();
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim();
    if (!normalized) return undefined;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function asBoolean(value: unknown, fallback = true): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'false') return false;
    if (normalized === 'true') return true;
  }
  return fallback;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => asString(entry)).filter(Boolean);
  }
  const single = asString(value);
  return single ? [single] : [];
}

function asIsoDate(value: unknown, fallback = ''): string {
  const text = asString(value, fallback);
  if (!text) return fallback;
  const directMatch = text.match(/^\d{4}-\d{2}-\d{2}$/);
  if (directMatch) return directMatch[0];
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toISOString().slice(0, 10);
}

function normalizeTime(value: unknown): string | undefined {
  const text = asString(value);
  if (!text) return undefined;
  const match = text.match(/(\d{1,2}):(\d{2})/);
  if (!match) return undefined;
  const hours = Math.min(23, Math.max(0, Number(match[1])));
  const minutes = Math.min(59, Math.max(0, Number(match[2])));
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function ensureEndDate(startDate: string, endDate: string): string {
  if (endDate) return endDate;
  return startDate;
}

function normalizeTripInputPayload(raw: unknown) {
  const value = asRecord(raw);
  const destinationsDetail = Array.isArray(value.destinationsDetail)
    ? value.destinationsDetail
        .map((entry) => {
          const item = asRecord(entry);
          const city = asString(item.city);
          const startDate = asIsoDate(item.startDate);
          const endDate = ensureEndDate(startDate, asIsoDate(item.endDate, startDate));

          if (!city && !startDate && !endDate) return null;

          return {
            city: city || 'Destino',
            startDate,
            endDate,
            allTravelers: asBoolean(item.allTravelers, true),
          };
        })
        .filter(Boolean)
    : [];

  const derivedDestinations =
    asStringArray(value.destinations).length > 0
      ? asStringArray(value.destinations)
      : destinationsDetail.map((entry) => entry?.city || '').filter(Boolean);

  const startDate = asIsoDate(value.startDate);
  const endDate = ensureEndDate(startDate, asIsoDate(value.endDate, startDate));

  return {
    tripId: asString(value.tripId) || asString(value.id) || 'trip-sem-id',
    agencyId: asString(value.agencyId) || 'agency-default',
    title: asString(value.title) || asString(value.name) || 'Viagem',
    origin: asString(value.origin) || 'Origem nao informada',
    destinations: derivedDestinations.length ? derivedDestinations : ['Destino'],
    destinationsDetail: destinationsDetail.length ? destinationsDetail : undefined,
    startDate,
    endDate,
    travelersCount: Math.max(1, Math.round(asNumber(value.travelersCount) || 1)),
    clientName: asString(value.clientName) || 'Cliente',
    budget: Math.max(0, asNumber(value.budget) || 0),
    currency: 'BRL',
    profile: TripProfileSchema.safeParse(asString(value.profile)).success
      ? asString(value.profile)
      : 'lazer',
    preferences: asString(value.preferences),
    transportation: Array.isArray(value.transportation)
      ? value.transportation.map((entry, index) => {
          const item = asRecord(entry);
          const typeCandidate = asString(item.type);
          const type = TransportationTypeSchema.safeParse(typeCandidate).success ? typeCandidate : 'taxi';
          return {
            id: asString(item.id) || `transport-${index + 1}`,
            type,
            operator: asString(item.operator),
            number: asString(item.number),
            date: asIsoDate(item.date),
            details: asString(item.details),
          };
        })
      : [],
    accommodations: Array.isArray(value.accommodations)
      ? value.accommodations.map((entry, index) => {
          const item = asRecord(entry);
          return {
            id: asString(item.id) || `accommodation-${index + 1}`,
            destinationCity: asString(item.destinationCity),
            name: asString(item.name),
            address: asString(item.address) || undefined,
            checkIn: asIsoDate(item.checkIn),
            checkOut: asIsoDate(item.checkOut),
            placeId: asString(item.placeId) || undefined,
            photos: asStringArray(item.photos),
          };
        })
      : [],
    locale: 'pt-BR',
  };
}

function normalizeTripPlanPayload(raw: unknown) {
  const value = asRecord(raw);
  const rawDays = Array.isArray(value.days) ? value.days : [];
  const normalizedDays = rawDays.map((entry, index) => {
    const item = asRecord(entry);
    const day = Math.max(1, Math.round(asNumber(item.day) || index + 1));
    const destination = asString(item.destination) || 'Destino do dia';
    const theme = asString(item.theme) || `Dia ${day} em ${destination}`;
    const focus = asStringArray(item.focus);

    return {
      day,
      date: asIsoDate(item.date),
      destination,
      theme,
      focus: focus.length ? focus : [destination, theme],
    };
  });

  const tripDescription = asRecord(value.tripDescription);
  const firstDestination = normalizedDays[0]?.destination || 'Destino';

  return {
    tripDescription: {
      title: asString(tripDescription.title) || asString(value.title) || 'Roteiro personalizado',
      summary:
        asString(tripDescription.summary) ||
        `Planejamento inicial de viagem com foco em ${firstDestination} e ritmo equilibrado.`,
      highlights: (() => {
        const highlights = asStringArray(tripDescription.highlights);
        return highlights.length ? highlights : normalizedDays.slice(0, 3).map((day) => day.theme);
      })(),
    },
    days: normalizedDays,
  };
}

function normalizeDayBlocksPayload(raw: unknown) {
  const value = asRecord(raw);
  const rawBlocks = Array.isArray(value.blocks)
    ? value.blocks
    : Array.isArray(value.items)
      ? value.items
      : [];
  const day = Math.max(1, Math.round(asNumber(value.day) || 1));

  const blocks = rawBlocks.map((entry, index) => {
    const item = asRecord(entry);
    const rawType = asString(item.type).toLowerCase();
    const type = AI_BLOCK_TYPES.includes(rawType as (typeof AI_BLOCK_TYPES)[number])
      ? rawType
      : DEFAULT_DAY_BLOCK_TYPE;
    const title = asString(item.title) || asString(item.name) || `Experiencia ${index + 1}`;
    const details = asString(item.details) || asString(item.description);
    const locationRaw = asRecord(item.location);
    const latitude = asNumber(locationRaw.latitude);
    const longitude = asNumber(locationRaw.longitude);
    const locationName = asString(locationRaw.name) || asString(locationRaw.title);
    const address = asString(locationRaw.address);

    return {
      type,
      title,
      subTitle: asString(item.subTitle) || asString(item.subtitle) || undefined,
      details: details || undefined,
      image: asString(item.image) || undefined,
      imageSearchQuery:
        asString(item.imageSearchQuery) ||
        asString(item.image_query) ||
        undefined,
      location:
        locationName || address || typeof latitude === 'number' || typeof longitude === 'number'
          ? {
              name: locationName || title,
              address: address || undefined,
              latitude,
              longitude,
            }
          : undefined,
      estimatedDurationMinutes: (() => {
        const duration = asNumber(item.estimatedDurationMinutes ?? item.durationMinutes);
        return typeof duration === 'number' ? Math.max(0, Math.min(1440, Math.round(duration))) : undefined;
      })(),
      recommendedStartTime: normalizeTime(item.recommendedStartTime ?? item.startTime),
      customSymbol: asString(item.customSymbol) || undefined,
      meta: item.meta && typeof item.meta === 'object' && !Array.isArray(item.meta) ? item.meta : undefined,
    };
  });

  const daySummaryRaw = asRecord(value.daySummary);
  const firstBlockTitle = blocks[0]?.title || `Dia ${day}`;
  const firstBlockQuery = blocks[0]?.imageSearchQuery;

  return {
    day,
    daySummary: {
      title: asString(daySummaryRaw.title) || `Dia ${day} - ${firstBlockTitle}`,
      subTitle: asString(daySummaryRaw.subTitle) || asString(daySummaryRaw.subtitle) || undefined,
      details:
        asString(daySummaryRaw.details) ||
        `Dia ${day} organizado como uma trilha progressiva, com atividades distribuidas de forma viavel ao longo do dia.`,
      imageSearchQuery:
        asString(daySummaryRaw.imageSearchQuery) ||
        asString(daySummaryRaw.image_query) ||
        firstBlockQuery ||
        undefined,
    },
    blocks,
  };
}

export const TripInputSchema = z.preprocess(
  normalizeTripInputPayload,
  z.object({
    tripId: z.string().min(1),
    agencyId: z.string().min(1),
    title: z.string().min(1),
    origin: z.string().min(1),
    destinations: z.array(z.string().min(1)).min(1),
    destinationsDetail: z
      .array(
        z.object({
          city: z.string().min(1),
          startDate: z.string(),
          endDate: z.string(),
          allTravelers: z.boolean().default(true),
        })
      )
      .optional(),
    startDate: z.string(),
    endDate: z.string(),
    travelersCount: z.number().int().min(1),
    clientName: z.string(),
    budget: z.number().min(0),
    currency: z.literal('BRL'),
    profile: TripProfileSchema,
    preferences: z.string(),
    transportation: z
      .array(
        z.object({
          id: z.string().min(1),
          type: TransportationTypeSchema,
          operator: z.string().optional(),
          number: z.string().optional(),
          date: z.string().optional(),
          details: z.string().optional(),
        })
      )
      .default([]),
    accommodations: z
      .array(
        z.object({
          id: z.string().min(1),
          destinationCity: z.string().optional(),
          name: z.string().optional(),
          address: z.string().optional(),
          checkIn: z.string().optional(),
          checkOut: z.string().optional(),
          placeId: z.string().optional(),
          photos: z.array(z.string()).optional(),
        })
      )
      .default([]),
    locale: z.literal('pt-BR'),
  })
);

export const TripPlanSchema = z.preprocess(
  normalizeTripPlanPayload,
  z.object({
    tripDescription: z.object({
      title: z.string().min(1),
      summary: z.string().min(1),
      highlights: z.array(z.string()).default([]),
    }),
    days: z
      .array(
        z.object({
          day: z.number().int().min(1),
          date: z.string(),
          destination: z.string().min(1),
          theme: z.string().min(1),
          focus: z.array(z.string()).default([]),
        })
      )
      .default([]),
  })
);

export const DayBlocksSchema = z.preprocess(
  normalizeDayBlocksPayload,
  z.object({
    day: z.number().int().min(1),
    daySummary: z.object({
      title: z.string().min(1),
      subTitle: z.string().optional(),
      details: z.string().min(1),
      imageSearchQuery: z.string().optional(),
    }),
    blocks: z
      .array(
        z.object({
          type: BlockTypeSchema,
          title: z.string().min(1),
          subTitle: z.string().optional(),
          details: z.string().optional(),
          image: z.string().url().optional(),
          imageSearchQuery: z.string().optional(),
          location: z
            .object({
              name: z.string().min(1),
              address: z.string().optional(),
              latitude: z.number().min(-90).max(90).optional(),
              longitude: z.number().min(-180).max(180).optional(),
            })
            .optional(),
          estimatedDurationMinutes: z.number().int().min(0).max(1440).optional(),
          recommendedStartTime: z.string().optional(),
          customSymbol: z.string().optional(),
          meta: z.record(z.unknown()).optional(),
        })
      )
      .default([]),
  })
);

export const ItineraryItemSchema = z.object({
  id: z.string(),
  day: z.number().int().min(1),
  type: z.string(),
  title: z.string(),
  subTitle: z.string().optional(),
  details: z.string().optional(),
  image: z.string().optional(),
  customSymbol: z.string().optional(),
  meta: z.record(z.unknown()).optional(),
});

export type TripInputParsed = z.infer<typeof TripInputSchema>;
export type TripPlanParsed = z.infer<typeof TripPlanSchema>;
export type DayBlocksParsed = z.infer<typeof DayBlocksSchema>;
