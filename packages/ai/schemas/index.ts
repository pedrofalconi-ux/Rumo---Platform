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

export const TripInputSchema = z.object({
  tripId: z.string().min(1),
  agencyId: z.string().min(1),
  title: z.string().min(1),
  origin: z.string().min(1),
  destinations: z.array(z.string()).min(1),
  destinationsDetail: z
    .array(
      z.object({
        city: z.string(),
        startDate: z.string(),
        endDate: z.string(),
        allTravelers: z.boolean(),
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
        operator: z.string(),
        number: z.string(),
        date: z.string(),
        details: z.string(),
      })
    )
    .optional(),
  accommodations: z
    .array(
      z.object({
        id: z.string().min(1),
        destinationCity: z.string(),
        name: z.string(),
        address: z.string().optional(),
        checkIn: z.string(),
        checkOut: z.string(),
        placeId: z.string().optional(),
        photos: z.array(z.string()).optional(),
      })
    )
    .optional(),
  locale: z.literal('pt-BR'),
});

export const TripPlanSchema = z.object({
  tripDescription: z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
    highlights: z.array(z.string()),
  }),
  days: z
    .array(
      z.object({
        day: z.number().int().min(1),
        date: z.string(),
        destination: z.string(),
        theme: z.string(),
        focus: z.array(z.string()),
      })
    )
    .min(1),
});

export const DayBlocksSchema = z.object({
  day: z.number().int().min(1),
  daySummary: z.object({
    title: z.string().min(1),
    subTitle: z.string().optional(),
    details: z.string().min(1),
    imageSearchQuery: z.string().optional(),
  }),
  blocks: z.array(
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
  ),
});

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
