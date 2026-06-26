import { randomUUID } from 'crypto';
import type { AiGeoPoint, DayBlocks, ItineraryItem, TripPlan } from '../types';
import { BLOCK_DEFAULT_SYMBOLS } from '../validators/block-registry';

function newItemId(): string {
  return `ai-${randomUUID()}`;
}

export function composeItinerary(plan: TripPlan, dayBlocksList: DayBlocks[]): ItineraryItem[] {
  const items: ItineraryItem[] = [];

  items.push({
    id: newItemId(),
    day: 1,
    type: 'trip_desc',
    title: plan.tripDescription.title,
    details: plan.tripDescription.summary,
    customSymbol: BLOCK_DEFAULT_SYMBOLS.trip_desc,
    meta: { highlights: plan.tripDescription.highlights, aiGenerated: true },
  });

  const sortedDays = [...dayBlocksList].sort((a, b) => a.day - b.day);

  for (const dayBlocks of sortedDays) {
    items.push({
      id: newItemId(),
      day: dayBlocks.day,
      type: 'day_summary',
      title: dayBlocks.daySummary.title,
      subTitle: dayBlocks.daySummary.subTitle,
      details: dayBlocks.daySummary.details,
      customSymbol: BLOCK_DEFAULT_SYMBOLS.day_summary,
      meta: {
        aiGenerated: true,
        imageSearchQuery:
          dayBlocks.daySummary.imageSearchQuery ||
          `${dayBlocks.daySummary.title} ${plan.days.find((d) => d.day === dayBlocks.day)?.destination || ''}`.trim(),
      },
    });

    let previousPoint: { title: string; location: AiGeoPoint } | null = null;
    let order = 1;

    for (const block of dayBlocks.blocks) {
      const routeFromPrevious =
        previousPoint && block.location
          ? buildRouteFromPrevious(previousPoint.title, previousPoint.location, block.title, block.location)
          : undefined;

      items.push(
        mapBlockToItineraryItem(block, dayBlocks.day, order, routeFromPrevious, {
          imageSearchQuery:
            block.imageSearchQuery ||
            `${block.title} ${plan.days.find((d) => d.day === dayBlocks.day)?.destination || ''}`.trim(),
        })
      );

      if (block.location) {
        previousPoint = { title: block.title, location: block.location };
      }
      order += 1;
    }
  }

  return items;
}

export function mergeDayIntoItinerary(
  existing: ItineraryItem[],
  day: number,
  dayBlocks: DayBlocks,
  tripDesc?: ItineraryItem
): ItineraryItem[] {
  const kept = existing.filter((item) => item.day !== day && item.type !== 'trip_desc');
  const tripDescItem =
    tripDesc || existing.find((item) => item.type === 'trip_desc');

  const newDayItems: ItineraryItem[] = [
    {
      id: newItemId(),
      day: dayBlocks.day,
      type: 'day_summary',
      title: dayBlocks.daySummary.title,
      subTitle: dayBlocks.daySummary.subTitle,
      details: dayBlocks.daySummary.details,
      customSymbol: BLOCK_DEFAULT_SYMBOLS.day_summary,
      meta: { aiGenerated: true, imageSearchQuery: dayBlocks.daySummary.imageSearchQuery },
    },
    ...composeDayBlocks(dayBlocks),
  ];

  const otherDays = kept.filter((item) => item.day !== day);
  return tripDescItem ? [tripDescItem, ...otherDays, ...newDayItems] : [...otherDays, ...newDayItems];
}

function composeDayBlocks(dayBlocks: DayBlocks): ItineraryItem[] {
  let previousPoint: { title: string; location: AiGeoPoint } | null = null;

  return dayBlocks.blocks.map((block, index) => {
    const routeFromPrevious =
      previousPoint && block.location
        ? buildRouteFromPrevious(previousPoint.title, previousPoint.location, block.title, block.location)
        : undefined;

    const item = mapBlockToItineraryItem(block, dayBlocks.day, index + 1, routeFromPrevious, {
      imageSearchQuery: block.imageSearchQuery,
    });

    if (block.location) {
      previousPoint = { title: block.title, location: block.location };
    }

    return item;
  });
}

function mapBlockToItineraryItem(
  block: DayBlocks['blocks'][number],
  day: number,
  sequence: number,
  routeFromPrevious: ReturnType<typeof buildRouteFromPrevious> | undefined,
  defaults: { imageSearchQuery?: string }
): ItineraryItem {
  return {
    id: newItemId(),
    day,
    type: block.type,
    title: formatTitle(block),
    subTitle: formatSubtitle(block),
    details: formatDetails(block, routeFromPrevious),
    image: block.image,
    customSymbol: block.customSymbol || BLOCK_DEFAULT_SYMBOLS[block.type],
    meta: {
      ...(block.meta || {}),
      aiGenerated: true,
      sequence,
      originalTitle: block.title,
      imageSearchQuery: defaults.imageSearchQuery,
      location: block.location,
      estimatedDurationMinutes: block.estimatedDurationMinutes,
      recommendedStartTime: block.recommendedStartTime,
      routeFromPrevious,
    },
  };
}

function formatTitle(block: DayBlocks['blocks'][number]): string {
  const title = block.title.trim();
  if (!block.recommendedStartTime || /^\d{1,2}:\d{2}\s*-/.test(title)) {
    return title;
  }
  return `${block.recommendedStartTime} - ${title}`;
}

function formatSubtitle(block: DayBlocks['blocks'][number]): string | undefined {
  const parts = [
    block.subTitle,
    block.estimatedDurationMinutes ? formatDuration(block.estimatedDurationMinutes) : undefined,
  ].filter(Boolean);

  return parts.length ? parts.join(' | ') : undefined;
}

function formatDetails(
  block: DayBlocks['blocks'][number],
  routeFromPrevious: ReturnType<typeof buildRouteFromPrevious> | undefined
): string | undefined {
  const details = block.details?.trim();
  const sections: string[] = [];

  if (routeFromPrevious) {
    const distance =
      typeof routeFromPrevious.distanceKm === 'number'
        ? `${routeFromPrevious.distanceKm.toLocaleString('pt-BR')} km`
        : 'distancia a confirmar';
    const minutes = routeFromPrevious.estimatedMinutes
      ? `${routeFromPrevious.estimatedMinutes} min estimados`
      : 'tempo a confirmar';
    const mode = routeFromPrevious.mode === 'walk' ? 'a pe' : 'carro, taxi ou transporte publico';
    sections.push(
      `Deslocamento desde ${routeFromPrevious.fromTitle}: ${distance}, ${minutes}, recomendado ${mode}.`
    );
  }

  if (block.recommendedStartTime || block.estimatedDurationMinutes) {
    sections.push(
      `Horario sugerido: ${block.recommendedStartTime || 'a definir'}${
        block.estimatedDurationMinutes ? `, com permanencia de ${formatDuration(block.estimatedDurationMinutes)}` : ''
      }.`
    );
  }

  if (details) {
    sections.push(details);
  }

  return sections.length ? sections.join('\n\n') : undefined;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h${String(rest).padStart(2, '0')}` : `${hours}h`;
}

function buildRouteFromPrevious(
  fromTitle: string,
  from: AiGeoPoint,
  toTitle: string,
  to: AiGeoPoint
) {
  const distanceKm =
    typeof from.latitude === 'number' &&
    typeof from.longitude === 'number' &&
    typeof to.latitude === 'number' &&
    typeof to.longitude === 'number'
      ? roundDistance(haversineKm(from.latitude, from.longitude, to.latitude, to.longitude))
      : undefined;

  return {
    fromTitle,
    toTitle,
    from: from.name,
    to: to.name,
    distanceKm,
    estimatedMinutes:
      typeof distanceKm === 'number' ? Math.max(5, Math.round((distanceKm / 4.5) * 60)) : undefined,
    mode: typeof distanceKm === 'number' && distanceKm > 2.5 ? 'car_or_transit' : 'walk',
    requiresLookup: typeof distanceKm !== 'number',
  };
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function roundDistance(value: number): number {
  return Math.round(value * 10) / 10;
}
