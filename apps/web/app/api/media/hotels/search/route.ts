import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../../lib/server-auth';

interface GooglePlacePhoto {
  name?: string;
}

interface GooglePlaceItem {
  id?: string;
  displayName?: {
    text?: string;
  };
  formattedAddress?: string;
  photos?: GooglePlacePhoto[];
  primaryType?: string;
}

type SearchType = 'lodging' | 'restaurant' | 'attraction' | 'all';

const SEARCH_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const SEARCH_CACHE_MAX_ENTRIES = 500;
const DEFAULT_DAILY_REQUEST_LIMIT = 300;
const MIN_QUERY_LENGTH = 3;
const searchCache = new Map<string, { expiresAt: number; places: GooglePlaceItem[] }>();
let placesUsage = { day: '', requests: 0 };

function normalizeCachePart(value: string) {
  return value.trim().toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ');
}

function getDailyRequestLimit() {
  const configured = Number(process.env.GOOGLE_PLACES_DAILY_LIMIT || DEFAULT_DAILY_REQUEST_LIMIT);
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : DEFAULT_DAILY_REQUEST_LIMIT;
}

function reserveGoogleRequest() {
  const day = new Date().toISOString().slice(0, 10);
  if (placesUsage.day !== day) placesUsage = { day, requests: 0 };
  if (placesUsage.requests >= getDailyRequestLimit()) return false;
  placesUsage.requests += 1;
  return true;
}

function readCachedPlaces(key: string) {
  const cached = searchCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    searchCache.delete(key);
    return null;
  }
  return cached.places;
}

function cachePlaces(key: string, places: GooglePlaceItem[]) {
  if (searchCache.size >= SEARCH_CACHE_MAX_ENTRIES) {
    const oldestKey = searchCache.keys().next().value;
    if (oldestKey) searchCache.delete(oldestKey);
  }
  searchCache.set(key, { expiresAt: Date.now() + SEARCH_CACHE_TTL_MS, places });
}

function photoProxyUrl(photoName: string) {
  return `/api/media/places/photo?name=${encodeURIComponent(photoName)}`;
}

function buildDevelopmentResults(query: string, city: string, type: SearchType) {
  const location = city || 'Destino';
  const attraction = type === 'attraction';
  const restaurant = type === 'restaurant';
  return [
    {
      id: `mock-${query.toLowerCase().replace(/\W+/g, '-')}`,
      name: query,
      address: `Região central, ${location}`,
      placeId: `mock-${Date.now()}`,
      photos: [restaurant ? 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=82' : attraction || type === 'all' ? 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=82' : 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=82'],
      categories: restaurant ? ['restaurant', 'food'] : attraction || type === 'all' ? ['tourist_attraction'] : ['lodging'],
      isMock: true,
    },
    {
      id: `mock-${query.toLowerCase().replace(/\W+/g, '-')}-boutique`,
      name: restaurant ? `${query} Restaurante` : attraction || type === 'all' ? `${query} Experience` : `${query} Boutique`,
      address: `Centro histórico, ${location}`,
      placeId: `mock-boutique-${Date.now()}`,
      photos: [attraction ? 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=1200&q=82' : 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=82'],
      categories: restaurant ? ['restaurant'] : attraction || type === 'all' ? ['museum', 'tourist_attraction'] : ['lodging'],
      isMock: true,
    },
  ];
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';
    const city = searchParams.get('city')?.trim() || '';
    const requestedType = searchParams.get('type');
    const searchType: SearchType = ['lodging', 'restaurant', 'attraction', 'all'].includes(String(requestedType))
      ? requestedType as SearchType
      : 'lodging';
    if (!query) {
      return NextResponse.json({ results: [] });
    }
    if (query.length < MIN_QUERY_LENGTH) {
      return NextResponse.json({ results: [], minimumQueryLength: MIN_QUERY_LENGTH });
    }
    if (query.length > 120 || city.length > 120) {
      return NextResponse.json({ error: 'Busca muito longa.' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      if (process.env.NODE_ENV !== 'production') {
        return NextResponse.json({ results: buildDevelopmentResults(query, city, searchType), provider: 'development-mock' });
      }
      return NextResponse.json(
        { error: 'GOOGLE_PLACES_API_KEY nao configurada.' },
        { status: 503 }
      );
    }

    const cacheKey = [normalizeCachePart(query), normalizeCachePart(city), searchType].join('|');
    let limitedPlaces = readCachedPlaces(cacheKey);
    let cacheStatus = 'HIT';

    if (!limitedPlaces) {
      if (!reserveGoogleRequest()) {
        return NextResponse.json(
          { error: 'Limite diário de buscas de lugares atingido. Tente novamente amanhã.' },
          { status: 429, headers: { 'Retry-After': '3600' } }
        );
      }

      const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          // Campos mínimos usados pela interface. Não solicitamos avaliações, horários,
          // telefone, website, preço, localização ou demais campos de SKUs superiores.
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.photos,places.primaryType',
        },
        body: JSON.stringify({
          textQuery: city ? `${query} ${city}` : query,
          ...(searchType === 'lodging' ? { includedType: 'lodging', strictTypeFiltering: true }
            : searchType === 'restaurant' ? { includedType: 'restaurant', strictTypeFiltering: true }
            : searchType === 'attraction' ? { includedType: 'tourist_attraction', strictTypeFiltering: false }
            : {}),
          languageCode: 'pt-BR',
          pageSize: 5,
        }),
      });

      if (!response.ok) {
        const googleError = await response.json().catch(() => ({})) as {
          error?: { status?: string; message?: string };
        };
        if (response.status === 403 || googleError.error?.status === 'PERMISSION_DENIED') {
          return NextResponse.json(
            {
              error: 'A busca do Google Places ainda não está autorizada. Habilite o faturamento e a Places API (New) no projeto da chave.',
              code: 'GOOGLE_PLACES_NOT_AUTHORIZED',
            },
            { status: 503 }
          );
        }
        return NextResponse.json(
          { error: 'Não foi possível consultar o Google Places agora.' },
          { status: 502 }
        );
      }

      const data = (await response.json()) as { places?: GooglePlaceItem[] };
      limitedPlaces = (data.places || []).slice(0, 5);
      cachePlaces(cacheKey, limitedPlaces);
      cacheStatus = 'MISS';
    }

    const results = limitedPlaces.map((place) => {
        const photos = (place.photos || []).slice(0, 1).flatMap((photo) => photo.name ? [photoProxyUrl(photo.name)] : []);
        return {
          id: String(place.id || ''),
          name: place.displayName?.text || 'Local',
          address: place.formattedAddress || '',
          placeId: place.id || '',
          photos,
          categories: place.primaryType ? [place.primaryType] : [],
        };
      });

    return NextResponse.json(
      { results: results.filter((result) => result.placeId && result.name) },
      { headers: { 'Cache-Control': 'private, max-age=60', 'X-Rumo-Places-Cache': cacheStatus } }
    );
  } catch (error) {
    console.error('Erro ao buscar lugares no Google Places:', error);
    return NextResponse.json({ error: 'Erro ao buscar lugares' }, { status: 500 });
  }
}
