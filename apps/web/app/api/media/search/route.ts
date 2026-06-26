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

    const pixabayKey = '56439289-7031ef2f0e888cf1c7ab9501e';

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

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Erro ao buscar imagens:', error);
    return NextResponse.json({ error: 'Erro ao buscar imagens' }, { status: 500 });
  }
}
