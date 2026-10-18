import 'server-only';

import type {
  ItineraryReference,
  ItineraryRetriever,
  TripInput,
} from '@rumo/ai';
import {
  buildTripAiContext,
  findTripById,
  listTripsForAgency,
  type TripRecord,
} from './server-trip-store';

const EXCLUDED_STATUSES = new Set(['rascunho', 'cancelado']);
const CATALOG_CACHE_TTL_MS = 30_000;
const catalogCache = new Map<string, {
  expiresAt: number;
  references: Array<{ id: string; title: string; destinations: string[]; status: string; itemCount: number }>;
}>();

function normalize(value: unknown) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function terms(value: unknown) {
  return new Set(normalize(value).split(' ').filter((term) => term.length > 2));
}

function intersectionSize(left: Set<string>, right: Set<string>) {
  let matches = 0;
  for (const term of left) if (right.has(term)) matches += 1;
  return matches;
}

function contextForTrip(trip: TripRecord) {
  const stored = typeof trip.aiContext === 'string' ? trip.aiContext.trim() : '';
  if (stored) {
    return {
      text: stored,
      itemCount: Math.max(0, Number(trip.aiContextItemCount || 0)),
    };
  }
  return buildTripAiContext(trip.itinerary);
}

function scoreTrip(trip: TripRecord, input: TripInput) {
  const destinationTerms = terms(input.destinations.join(' '));
  const tripDestinationTerms = terms(trip.destinations.join(' '));
  const intentTerms = terms(`${input.profile} ${input.preferences}`);
  const tripIntentTerms = terms(`${trip.profile || ''} ${trip.preferences || ''} ${trip.name}`);
  const exactDestination = input.destinations.some((destination) =>
    trip.destinations.some((candidate) => normalize(candidate) === normalize(destination))
  );

  return (
    (exactDestination ? 40 : 0) +
    intersectionSize(destinationTerms, tripDestinationTerms) * 12 +
    (input.profile && trip.profile === input.profile ? 8 : 0) +
    intersectionSize(intentTerms, tripIntentTerms) * 2
  );
}

function selectRelevantContext(context: string, input: TripInput) {
  const queryTerms = terms(`${input.destinations.join(' ')} ${input.profile} ${input.preferences}`);
  const ranked = context
    .split('\n')
    .map((line, index) => ({
      line,
      index,
      score: intersectionSize(terms(line), queryTerms) + (/Dia \d+:/i.test(line) ? 0.15 : 0),
    }))
    .filter(({ line }) => line.trim())
    .sort((first, second) => second.score - first.score || first.index - second.index)
    .slice(0, 18)
    .sort((first, second) => first.index - second.index)
    .map(({ line }) => line);

  return ranked.join('\n').slice(0, 3_600);
}

async function candidatesForAgency(agencyId: string) {
  const trips = await listTripsForAgency(agencyId);
  const deduplicated = new Map<string, TripRecord>();
  for (const trip of trips.filter((candidate) => !EXCLUDED_STATUSES.has(normalize(candidate.status)))) {
    const signature = `${normalize(trip.name)}|${trip.destinations.map(normalize).sort().join('|')}`;
    const existing = deduplicated.get(signature);
    if (!existing || (!contextForTrip(existing).text && contextForTrip(trip).text)) {
      deduplicated.set(signature, trip);
    }
  }
  const eligibleTrips = Array.from(deduplicated.values()).slice(0, 16);

  const hydrated = await Promise.all(eligibleTrips.map(async (trip) => {
    const compact = contextForTrip(trip);
    if (compact.text && compact.itemCount >= 1) return { trip, context: compact };

    // Rows created before compact RAG metadata existed are hydrated lazily.
    // This path is bounded and disappears naturally after those trips are edited.
    const fullTrip = await findTripById(trip.id, agencyId);
    if (!fullTrip) return null;
    return { trip: fullTrip, context: contextForTrip(fullTrip) };
  }));

  return hydrated.filter(
    (candidate): candidate is { trip: TripRecord; context: { text: string; itemCount: number } } =>
      Boolean(candidate?.context.text && candidate.context.itemCount >= 1)
  );
}

export const agencyItineraryRetriever: ItineraryRetriever = {
  async retrieve({ input, limit = 4 }) {
    const candidates = await candidatesForAgency(input.agencyId);
    const references: ItineraryReference[] = candidates
      .filter(({ trip }) => trip.id !== input.tripId)
      .map(({ trip, context }) => ({
        tripId: trip.id,
        title: trip.name,
        destinations: trip.destinations,
        profile: trip.profile,
        status: trip.status,
        itemCount: context.itemCount,
        context: selectRelevantContext(context.text, input),
        score: scoreTrip(trip, input),
      }))
      .filter((reference) => reference.context)
      .sort((first, second) => second.score - first.score || second.itemCount - first.itemCount)
      .slice(0, Math.max(1, Math.min(limit, 6)));

    return { references, strategy: 'agency_itinerary_context' };
  },
};

export async function getAgencyItineraryReferenceCatalog(agencyId: string) {
  const cached = catalogCache.get(agencyId);
  if (cached && cached.expiresAt > Date.now()) return cached.references;

  const candidates = await candidatesForAgency(agencyId);
  const references = candidates.map(({ trip, context }) => ({
    id: trip.id,
    title: trip.name,
    destinations: trip.destinations,
    status: trip.status,
    itemCount: context.itemCount,
  }));
  catalogCache.set(agencyId, { expiresAt: Date.now() + CATALOG_CACHE_TTL_MS, references });
  return references;
}
