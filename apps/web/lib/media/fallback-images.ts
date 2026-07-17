import type { ItineraryItem } from '@rumo/ai';

export type FallbackImageCategory =
  | 'museum'
  | 'italian_food'
  | 'japanese_food'
  | 'restaurant'
  | 'cafe'
  | 'bar_night'
  | 'beach'
  | 'park_nature'
  | 'flight_airport'
  | 'hotel_accommodation'
  | 'train_transit'
  | 'city_street'
  | 'generic_travel';

type FallbackImage = { url: string; credit: string };

const image = (photoId: string): FallbackImage => ({
  url: `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=1400&q=82`,
  credit: 'Unsplash · fallback editorial Rumo',
});

const FALLBACK_IMAGES: Record<FallbackImageCategory, FallbackImage[]> = {
  museum: [image('photo-1564399579883-451a5d44ec08'), image('photo-1561214115-f2f134cc4912')],
  italian_food: [image('photo-1473093295043-cdd812d0e601'), image('photo-1572449043416-55f4685c9bb7')],
  japanese_food: [image('photo-1579871494447-9811cf80d66c'), image('photo-1569718212165-3a8278d5f624')],
  restaurant: [image('photo-1517248135467-4c7edcad34c4'), image('photo-1414235077428-338989a2e8c0')],
  cafe: [image('photo-1501339847302-ac426a4a7cbb'), image('photo-1495474472287-4d71bcdd2085')],
  bar_night: [image('photo-1514933651103-005eec06c04b'), image('photo-1470337458703-46ad1756a187')],
  beach: [image('photo-1507525428034-b723cf961d3e'), image('photo-1510414842594-a61c69b5ae57')],
  park_nature: [image('photo-1441974231531-c6227db76b6e'), image('photo-1501854140801-50d01698950b')],
  flight_airport: [image('photo-1436491865332-7a61a109cc05'), image('photo-1529074963764-98f45c47344b')],
  hotel_accommodation: [image('photo-1566073771259-6a8506099945'), image('photo-1542314831-068cd1dbfeeb')],
  train_transit: [image('photo-1474487548417-781cb71495f3'), image('photo-1516939884455-1445c8652f83')],
  city_street: [image('photo-1477959858617-67f85cf4f1df'), image('photo-1480714378408-67cf0d13bc1b')],
  generic_travel: [image('photo-1488646953014-85cb44e25828'), image('photo-1503220317375-aaad61436b1b')],
};

const CATEGORY_RULES: Array<[FallbackImageCategory, RegExp]> = [
  ['flight_airport', /\b(voo|flight|aviao|airplane|aeroporto|airport|embarque|boarding)\b/i],
  ['hotel_accommodation', /\b(hotel|resort|pousada|hostel|hospedagem|accommodation|check[ -]?in)\b/i],
  ['train_transit', /\b(trem|train|metro|subway|estacao|station|rail|bonde|tram)\b/i],
  ['japanese_food', /\b(sushi|sashimi|ramen|lamen|japones|japanese|izakaya|tempura)\b/i],
  ['italian_food', /\b(pasta|pizza|gelato|trattoria|cantina|italian[oa]?|risotto|lasanha)\b/i],
  ['cafe', /\b(cafe|coffee|padaria|bakery|brunch|breakfast|confeitaria)\b/i],
  ['bar_night', /\b(bar|pub|vinho|wine|cerveja|beer|drink|cocktail|balada|nightlife)\b/i],
  ['restaurant', /\b(restaurante|restaurant|almoco|lunch|jantar|dinner|gastronom|refeicao|meal)\b/i],
  ['beach', /\b(praia|beach|mar|sea|orla|waterfront|ilha|island|costa)\b/i],
  ['park_nature', /\b(parque|park|jardim|garden|floresta|forest|nature|cachoeira|waterfall|trilha|trail)\b/i],
  ['museum', /\b(museu|museum|galeria|gallery|monumento|monument|castelo|castle|palacio|palace|basilica|igreja|church)\b/i],
  ['city_street', /\b(cidade|city|rua|street|praca|square|centro|downtown|skyline|bairro|district)\b/i],
];

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function classifyFallbackImage(item: ItineraryItem): FallbackImageCategory {
  const metaQuery = typeof item.meta?.imageSearchQuery === 'string' ? item.meta.imageSearchQuery : '';
  const location = item.meta?.location as { name?: string; address?: string } | undefined;
  const haystack = normalize([
    item.title,
    item.subTitle,
    item.details,
    item.type,
    metaQuery,
    location?.name,
    location?.address,
  ].filter(Boolean).join(' '));

  return CATEGORY_RULES.find(([, pattern]) => pattern.test(haystack))?.[0] || 'generic_travel';
}

function stableIndex(value: string, length: number) {
  let hash = 0;
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % length;
}

export function getCategoryFallbackImage(item: ItineraryItem): FallbackImage & { category: FallbackImageCategory } {
  const category = classifyFallbackImage(item);
  const images = FALLBACK_IMAGES[category];
  return { ...images[stableIndex(`${item.id}:${item.title}`, images.length)], category };
}

