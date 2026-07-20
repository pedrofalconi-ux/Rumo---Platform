import { NextResponse } from 'next/server';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=82';
const PLACE_PHOTO_PATTERN = /^places\/[^/]+\/photos\/[^/]+$/;

function fallbackRedirect(request: Request) {
  return NextResponse.redirect(new URL(FALLBACK_IMAGE, request.url), 307);
}

export async function GET(request: Request) {
  const photoName = new URL(request.url).searchParams.get('name')?.trim() || '';
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || '';
  if (!apiKey || !PLACE_PHOTO_PATTERN.test(photoName)) return fallbackRedirect(request);

  try {
    const encodedName = photoName.split('/').map(encodeURIComponent).join('/');
    const response = await fetch(
      `https://places.googleapis.com/v1/${encodedName}/media?maxWidthPx=1000&maxHeightPx=750&skipHttpRedirect=true`,
      { headers: { 'X-Goog-Api-Key': apiKey }, next: { revalidate: 86400 } }
    );
    if (!response.ok) return fallbackRedirect(request);
    const payload = (await response.json()) as { photoUri?: string };
    if (!payload.photoUri) return fallbackRedirect(request);

    const redirect = NextResponse.redirect(payload.photoUri, 307);
    redirect.headers.set('Cache-Control', 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=2592000');
    return redirect;
  } catch (error) {
    console.warn('[places/photo] Não foi possível renovar a foto.', error);
    return fallbackRedirect(request);
  }
}
