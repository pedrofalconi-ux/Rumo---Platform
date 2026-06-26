import { db } from '@rumo/db';
import type { ItineraryItem } from '@rumo/ai';

const FALLBACK_PIXABAY_KEY = '56439289-7031ef2f0e888cf1c7ab9501e';

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
  tags?: string;
  user?: string;
}

export async function selectImagesForItinerary(
  items: ItineraryItem[],
  agencyId: string
): Promise<ItineraryItem[]> {
  const photos = db.photos.findMany() as PhotoRecord[];
  const settings = db.settings.get(agencyId);
  const cache = new Map<string, Awaited<ReturnType<typeof findOnlinePhoto>>>();

  const enriched: ItineraryItem[] = [];

  for (const item of items) {
    if (item.image) {
      enriched.push(item);
      continue;
    }

    const query = buildImageQuery(item);
    if (!query) {
      enriched.push(item);
      continue;
    }

    const localPhoto = findLocalPhoto(query, photos);
    if (localPhoto?.url) {
      enriched.push(withImage(item, localPhoto.url, {
        source: 'library',
        query,
        credit: localPhoto.name || localPhoto.folder || 'Biblioteca Rumo',
      }));
      continue;
    }

    if (!cache.has(query)) {
      cache.set(query, await findOnlinePhoto(query, settings.pixabayKey));
    }

    const onlinePhoto = cache.get(query);
    if (onlinePhoto?.url) {
      enriched.push(withImage(item, onlinePhoto.url, {
        source: 'pixabay',
        query,
        credit: onlinePhoto.credit,
      }));
      continue;
    }

    enriched.push(item);
  }

  return enriched;
}

function buildImageQuery(item: ItineraryItem): string {
  const metaQuery = typeof item.meta?.imageSearchQuery === 'string' ? item.meta.imageSearchQuery : '';
  const location = item.meta?.location as { name?: string; address?: string } | undefined;
  const parts = [
    metaQuery,
    location?.name,
    location?.address,
    item.type !== 'text' ? item.title : '',
  ];

  return parts
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
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

async function findOnlinePhoto(query: string, pixabayKey?: string): Promise<{
  url: string;
  credit: string;
} | null> {
  const key =
    process.env.PIXABAY_API_KEY ||
    process.env.NEXT_PUBLIC_PIXABAY_API_KEY ||
    pixabayKey ||
    FALLBACK_PIXABAY_KEY;

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
    return url ? { url, credit: hit?.user || 'Pixabay' } : null;
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

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
