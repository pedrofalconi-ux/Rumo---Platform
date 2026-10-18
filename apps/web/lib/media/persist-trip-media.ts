import { libraryMediaStoragePath, persistLibraryMedia } from '../server-library-media';

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Moves trip imagery to object storage and keeps only URLs in the trip JSON.
 * Identical sources are uploaded once per request and legacy meta.image copies
 * are removed whenever item.image is the canonical value.
 */
export async function persistTripMedia(input: JsonRecord, agencyId: string) {
  const result: JsonRecord = { ...input };
  const persistedBySource = new Map<string, Promise<string>>();

  const persistSource = (source: string) => {
    if (!source || (!source.startsWith('http') && !source.startsWith('data:image/'))) {
      return Promise.resolve(source);
    }
    if (libraryMediaStoragePath(source)) return Promise.resolve(source);

    const existing = persistedBySource.get(source);
    if (existing) return existing;

    const operation = persistLibraryMedia({ agencyId, sourceUrl: source })
      .then(({ publicUrl }) => publicUrl)
      .catch((error) => {
        console.warn('[trips] Não foi possível mover uma imagem para o Storage; mantendo a origem.', error);
        return source;
      });
    persistedBySource.set(source, operation);
    return operation;
  };

  if (typeof result.coverImage === 'string') {
    result.coverImage = await persistSource(result.coverImage);
  }

  if (Array.isArray(result.itinerary)) {
    result.itinerary = await Promise.all(
      result.itinerary.map(async (rawItem) => {
        if (!isRecord(rawItem)) return rawItem;
        const item: JsonRecord = { ...rawItem };

        if (typeof item.image === 'string') {
          item.image = await persistSource(item.image);
          if (isRecord(item.meta) && 'image' in item.meta) {
            const meta = { ...item.meta };
            delete meta.image;
            item.meta = meta;
          }
        }

        return item;
      })
    );
  }

  return result;
}
