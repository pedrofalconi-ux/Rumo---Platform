import type { TripInput } from '../types';
import { TripInputSchema } from '../schemas';

export function countTripDays(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  const diff = Math.round((end.getTime() - start.getTime()) / 86400000);
  return Math.max(1, diff + 1);
}

export function normalizeTripInput(input: TripInput): TripInput {
  const parsed = TripInputSchema.parse(input);
  return {
    ...parsed,
    preferences: parsed.preferences.slice(0, 2000),
    destinations: parsed.destinations.map((d) => d.trim()).filter(Boolean),
    transportation: Array.isArray(parsed.transportation) ? parsed.transportation : [],
    accommodations: Array.isArray(parsed.accommodations) ? parsed.accommodations : [],
  };
}

export function tripRecordToInput(trip: Record<string, unknown>, agencyId: string): TripInput {
  const travelers = Array.isArray(trip.travelers) ? trip.travelers : ['DR'];
  const profile = typeof trip.profile === 'string' ? trip.profile : 'lazer';

  return normalizeTripInput({
    tripId: String(trip.id),
    agencyId,
    title: String(trip.name || trip.title || 'Viagem'),
    origin: String(trip.origin || 'São Paulo (BR)'),
    destinations: Array.isArray(trip.destinations) ? trip.destinations.map(String) : ['Destino'],
    destinationsDetail: Array.isArray(trip.destinationsDetail)
      ? (trip.destinationsDetail as TripInput['destinationsDetail'])
      : undefined,
    startDate: String(trip.startDate),
    endDate: String(trip.endDate),
    travelersCount: Math.max(1, travelers.length),
    clientName: String(trip.clientName || 'Cliente'),
    budget: Number(trip.budget) || 0,
    currency: 'BRL',
    profile: (['lazer', 'lua_de_mel', 'aventura', 'cultural', 'negocios'].includes(profile)
      ? profile
      : 'lazer') as TripInput['profile'],
    preferences: String(trip.preferences || ''),
    transportation: Array.isArray(trip.transportation)
      ? (trip.transportation as TripInput['transportation'])
      : [],
    accommodations: Array.isArray(trip.accommodations)
      ? (trip.accommodations as TripInput['accommodations'])
      : [],
    locale: 'pt-BR',
  });
}
