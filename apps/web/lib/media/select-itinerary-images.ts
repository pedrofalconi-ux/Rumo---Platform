import { db } from '@rumo/db';
import type { ItineraryItem } from '@rumo/ai';
import { convertUrlToBase64 } from './base64-converter';

const FALLBACK_PIXABAY_KEY = '56439289-7031ef2f0e888cf1c7ab9501e';
const STOP_WORDS = new Set([
  'a',
  'ao',
  'aos',
  'as',
  'at',
  'de',
  'del',
  'do',
  'dos',
  'da',
  'das',
  'e',
  'em',
  'for',
  'la',
  'na',
  'no',
  'nos',
  'of',
  'para',
  'por',
  'the',
  'tour',
  'visit',
  'visita',
  'walking',
]);

interface PhotoRecord {
  id: string;
  folder?: string;
  name?: string;
  url?: string;
}

interface PixabayHit {
  largeImageURL?: string;
  webformatURL?: string;
  previewURL?: string;
  user?: string;
}

interface UnsplashPhoto {
  urls?: {
    regular?: string;
    small?: string;
    full?: string;
  };
  user?: {
    name?: string;
  };
}

interface TripImageContext {
  startDate?: string;
  destinations?: string[];
  destinationsDetail?: Array<{
    city: string;
    startDate: string;
    endDate: string;
  }>;
}

interface OnlineImageSettings {
  pixabayKey?: string;
  unsplashKey?: string;
}

interface OnlinePhotoResult {
  url: string;
  credit: string;
  source: 'unsplash' | 'pixabay';
}

export async function selectImagesForItinerary(
  items: ItineraryItem[],
  agencyId: string,
  tripContext?: TripImageContext
): Promise<ItineraryItem[]> {
  const photos = db.photos.findMany() as PhotoRecord[];
  const settings = db.settings.get(agencyId) as OnlineImageSettings;
  const cache = new Map<string, OnlinePhotoResult | null>();
  const destinationByDay = buildDestinationByDay(items, tripContext);

  const enriched: ItineraryItem[] = [];

  for (const item of items) {
    if (item.image) {
      enriched.push(item);
      continue;
    }

    const destinationFallback = destinationByDay.get(item.day) || '';
    const candidates = buildImageQueryCandidates(item, destinationFallback);
    if (candidates.length === 0) {
      enriched.push(item);
      continue;
    }

    let selectedItem: ItineraryItem | null = null;

    for (const candidate of candidates) {
      const localPhoto = findLocalPhoto(candidate, photos);
      if (localPhoto?.url) {
        selectedItem = withImage(item, localPhoto.url, {
          source: 'library',
          query: candidate,
          credit: localPhoto.name || localPhoto.folder || 'Biblioteca Rumo',
        });
        break;
      }

      if (!cache.has(candidate)) {
        cache.set(candidate, await findOnlinePhoto(candidate, settings));
      }

      const onlinePhoto = cache.get(candidate);
      if (onlinePhoto?.url) {
        selectedItem = withImage(item, onlinePhoto.url, {
          source: onlinePhoto.source,
          query: candidate,
          credit: onlinePhoto.credit,
        });
        break;
      }
    }

    enriched.push(selectedItem || item);
  }

  return enriched;
}

export function buildImageQueryCandidates(
  item: ItineraryItem,
  destinationFallback = ''
): string[] {
  const metaQuery = typeof item.meta?.imageSearchQuery === 'string' ? item.meta.imageSearchQuery : '';
  const originalTitle =
    typeof item.meta?.originalTitle === 'string' ? item.meta.originalTitle : stripVisualTimePrefix(item.title);
  const location = item.meta?.location as { name?: string; address?: string } | undefined;

  return uniqueQueries([
    sanitizeImageQuery(metaQuery),
    simplifyImageQuery(metaQuery),
    sanitizeImageQuery(location?.name || ''),
    simplifyImageQuery(location?.name || ''),
    sanitizeImageQuery(originalTitle),
    simplifyImageQuery(originalTitle),
    sanitizeImageQuery(destinationFallback),
  ]);
}

function buildDestinationByDay(
  items: ItineraryItem[],
  tripContext?: TripImageContext
): Map<number, string> {
  const map = new Map<number, string>();

  for (const item of items) {
    if (item.type === 'day_summary' && item.subTitle) {
      map.set(item.day, sanitizeDestinationLabel(item.subTitle));
    }
  }

  if (!tripContext?.startDate) {
    const defaultDestination = sanitizeDestinationLabel(tripContext?.destinations?.[0] || '');
    if (defaultDestination) {
      for (const item of items) {
        if (!map.has(item.day)) {
          map.set(item.day, defaultDestination);
        }
      }
    }
    return map;
  }

  for (const item of items) {
    if (map.has(item.day)) continue;

    const date = addDaysIso(tripContext.startDate, Math.max(0, item.day - 1));
    const match = tripContext.destinationsDetail?.find(
      (destination) => date >= destination.startDate && date <= destination.endDate
    );

    if (match?.city) {
      map.set(item.day, sanitizeDestinationLabel(match.city));
      continue;
    }

    const defaultDestination = sanitizeDestinationLabel(tripContext.destinations?.[0] || '');
    if (defaultDestination) {
      map.set(item.day, defaultDestination);
    }
  }

  return map;
}

function addDaysIso(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function sanitizeDestinationLabel(value: string) {
  return value.split(' (')[0].trim();
}

function findLocalPhoto(query: string, photos: PhotoRecord[]): PhotoRecord | undefined {
  const terms = normalize(query).split(' ').filter((term) => term.length > 2);
  let best: { photo: PhotoRecord; score: number } | undefined;

  for (const photo of photos) {
    const haystack = normalize(`${photo.name || ''} ${photo.folder || ''}`);
    const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
    if (score > 0 && (!best || score > best.score)) {
      best = { photo, score };
    }
  }

  return best?.photo;
}

async function findOnlinePhoto(
  query: string,
  settings: OnlineImageSettings
): Promise<OnlinePhotoResult | null> {
  if (!query.trim()) {
    return null;
  }

  const unsplashKey =
    process.env.UNSPLASH_ACCESS_KEY ||
    process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY ||
    settings.unsplashKey ||
    '';
  const pixabayKey =
    process.env.PIXABAY_API_KEY ||
    process.env.NEXT_PUBLIC_PIXABAY_API_KEY ||
    settings.pixabayKey ||
    FALLBACK_PIXABAY_KEY;

  const unsplashPhoto = await findUnsplashPhoto(query, unsplashKey);
  if (unsplashPhoto) {
    return unsplashPhoto;
  }

  return findPixabayPhoto(query, pixabayKey);
}

async function findUnsplashPhoto(query: string, accessKey: string): Promise<OnlinePhotoResult | null> {
  if (!accessKey) {
    return null;
  }

  try {
    const url = new URL('https://api.unsplash.com/search/photos');
    url.searchParams.set('query', query);
    url.searchParams.set('per_page', '3');
    url.searchParams.set('orientation', 'landscape');
    url.searchParams.set('content_filter', 'high');

    const response = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        'Accept-Version': 'v1',
      },
      next: { revalidate: 60 * 60 },
    });
    if (!response.ok) return null;

    const data = (await response.json()) as { results?: UnsplashPhoto[] };
    const first = (data.results || []).find(
      (candidate) => candidate.urls?.regular || candidate.urls?.small || candidate.urls?.full
    );
    const imageUrl = first?.urls?.regular || first?.urls?.small || first?.urls?.full;
    if (!imageUrl) return null;

    const base64Url = await convertUrlToBase64(imageUrl);
    return {
      url: base64Url,
      credit: first?.user?.name || 'Unsplash',
      source: 'unsplash',
    };
  } catch {
    return null;
  }
}

async function findPixabayPhoto(query: string, key: string): Promise<OnlinePhotoResult | null> {
  try {
    const pixabayUrl = new URL('https://pixabay.com/api/');
    pixabayUrl.searchParams.set('key', key);
    pixabayUrl.searchParams.set('q', query);
    pixabayUrl.searchParams.set('image_type', 'photo');
    pixabayUrl.searchParams.set('orientation', 'horizontal');
    pixabayUrl.searchParams.set('safesearch', 'true');
    pixabayUrl.searchParams.set('per_page', '3');

    const response = await fetch(pixabayUrl, { next: { revalidate: 60 * 60 } });
    if (!response.ok) return null;

    const data = await response.json();
    const hit = ((data.hits || []) as PixabayHit[]).find(
      (candidate) => candidate.largeImageURL || candidate.webformatURL || candidate.previewURL
    );

    const url = hit?.largeImageURL || hit?.webformatURL || hit?.previewURL;
    if (!url) return null;

    const base64Url = await convertUrlToBase64(url);
    return { url: base64Url, credit: hit?.user || 'Pixabay', source: 'pixabay' };
  } catch {
    return null;
  }
}

function withImage(
  item: ItineraryItem,
  image: string,
  imageMeta: { source: string; query: string; credit: string }
): ItineraryItem {
  return {
    ...item,
    image,
    meta: {
      ...(item.meta || {}),
      image,
      imageSource: imageMeta.source,
      imageSearchQuery: imageMeta.query,
      imageCredit: imageMeta.credit,
    },
  };
}

function uniqueQueries(queries: string[]) {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const query of queries) {
    if (!query || seen.has(query)) continue;
    seen.add(query);
    ordered.push(query);
  }

  return ordered;
}

function stripVisualTimePrefix(value: string) {
  return value.replace(/^\d{1,2}:\d{2}\s*-\s*/, '').trim();
}

export function sanitizeImageQuery(value: string): string {
  const tokens = normalize(value)
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  return tokens.slice(0, 4).join(' ').trim();
}

export function simplifyImageQuery(value: string): string {
  const tokens = sanitizeImageQuery(value)
    .split(' ')
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));

  return tokens.slice(0, 3).join(' ').trim();
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
