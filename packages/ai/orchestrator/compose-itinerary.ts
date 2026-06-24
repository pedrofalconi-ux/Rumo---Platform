import { randomUUID } from 'crypto';
import type { DayBlocks, ItineraryItem, TripPlan } from '../types';
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
      meta: { aiGenerated: true },
    });

    for (const block of dayBlocks.blocks) {
      items.push({
        id: newItemId(),
        day: dayBlocks.day,
        type: block.type,
        title: block.title,
        subTitle: block.subTitle,
        details: block.details,
        customSymbol: block.customSymbol || BLOCK_DEFAULT_SYMBOLS[block.type],
        meta: { ...(block.meta || {}), aiGenerated: true },
      });
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
      meta: { aiGenerated: true },
    },
    ...dayBlocks.blocks.map((block) => ({
      id: newItemId(),
      day: dayBlocks.day,
      type: block.type,
      title: block.title,
      subTitle: block.subTitle,
      details: block.details,
      customSymbol: block.customSymbol || BLOCK_DEFAULT_SYMBOLS[block.type],
      meta: { ...(block.meta || {}), aiGenerated: true },
    })),
  ];

  const otherDays = kept.filter((item) => item.day !== day);
  return tripDescItem ? [tripDescItem, ...otherDays, ...newDayItems] : [...otherDays, ...newDayItems];
}
