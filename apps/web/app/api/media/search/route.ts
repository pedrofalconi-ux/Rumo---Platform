import { NextResponse } from 'next/server';
import { db } from '@rumo/db';
import { getCurrentUser } from '../../../../lib/server-auth';

const FALLBACK_PIXABAY_KEY = '56439289-7031ef2f0e888cf1c7ab9501e';

interface PixabayHit {
  id: number;
  webformatURL?: string;
  largeImageURL?: string;
  previewURL?: string;
  tags?: string;
  user?: string;
}

interface UnsplashPhoto {
  id: string;
  alt_description?: string;
  description?: string;
  urls?: { regular?: string; small?: string; full?: string };
  user?: { name?: string; links?: { html?: string } };
  links?: { html?: string; download_location?: string };
}

interface MediaSettings {
  pixabayKey?: string;
  unsplashKey?: string;
}

async function searchUnsplash(query: string, accessKey: string) {
  if (!accessKey) return null;
  const url = new URL('https://api.unsplash.com/search/photos');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', '12');
  url.searchParams.set('orientation', 'landscape');
  url.searchParams.set('content_filter', 'high');

  const response = await fetch(url, {
    headers: { Authorization: `Client-ID ${accessKey}`, 'Accept-Version': 'v1' },
    next: { revalidate: 60 * 30 },
  });
  if (!response.ok) return null;

  const data = (await response.json()) as { results?: UnsplashPhoto[] };
  const results = (data.results || []).map((photo) => ({
    id: `unsplash-${photo.id}`,
    url: photo.urls?.regular || photo.urls?.full || photo.urls?.small || '',
    previewUrl: photo.urls?.small || photo.urls?.regular || photo.urls?.full || '',
    alt: photo.alt_description || photo.description || query,
    credit: photo.user?.name ? `${photo.user.name} · Unsplash` : 'Unsplash',
    creditUrl: photo.user?.links?.html || photo.links?.html || '',
    downloadLocation: photo.links?.download_location || '',
    source: 'unsplash',
  })).filter((photo) => photo.url && photo.previewUrl);
  return results.length ? results : null;
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();
    if (!query) {
      return NextResponse.json({ results: [] });
    }

    const settings = (db.settings.get(user.agencyId) || {}) as MediaSettings;
    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY || settings.unsplashKey || '';
    const pixabayKey = process.env.PIXABAY_API_KEY || settings.pixabayKey || FALLBACK_PIXABAY_KEY;

    try {
      const unsplashResults = await searchUnsplash(query, unsplashKey);
      if (unsplashResults) {
        return NextResponse.json({ results: unsplashResults, provider: 'unsplash' });
      }
    } catch (error) {
      console.warn('[media/search] Unsplash indisponivel; usando Pixabay.', error);
    }

    const pixabayUrl = new URL('https://pixabay.com/api/');
    pixabayUrl.searchParams.set('key', pixabayKey);
    pixabayUrl.searchParams.set('q', query);
    pixabayUrl.searchParams.set('image_type', 'photo');
    pixabayUrl.searchParams.set('orientation', 'horizontal');
    pixabayUrl.searchParams.set('safesearch', 'true');
    pixabayUrl.searchParams.set('per_page', '12');

    const response = await fetch(pixabayUrl, { next: { revalidate: 60 * 60 } });
    if (!response.ok) {
      return NextResponse.json({ error: 'Nao foi possivel buscar imagens agora.' }, { status: 502 });
    }

    const data = await response.json();
    const results = ((data.hits || []) as PixabayHit[])
      .map((hit) => ({
        id: String(hit.id),
        url: hit.largeImageURL || hit.webformatURL || hit.previewURL || '',
        previewUrl: hit.webformatURL || hit.previewURL || hit.largeImageURL || '',
        alt: hit.tags || query,
        credit: hit.user || 'Pixabay',
      }))
      .filter((image) => image.url && image.previewUrl);

    return NextResponse.json({ results, provider: 'pixabay' });
  } catch (error) {
    console.error('Erro ao buscar imagens:', error);
    return NextResponse.json({ error: 'Erro ao buscar imagens' }, { status: 500 });
  }
}
