import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../../lib/server-auth';
import { convertUrlToBase64 } from '../../../../../lib/media/base64-converter';

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
}

async function fetchPlacePhotoAsBase64(photoName: string, apiKey: string) {
  const metadataResponse = await fetch(
    `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1200&skipHttpRedirect=true&key=${apiKey}`
  );

  if (!metadataResponse.ok) {
    return null;
  }

  const metadata = (await metadataResponse.json()) as { photoUri?: string };
  if (!metadata.photoUri) {
    return null;
  }

  return convertUrlToBase64(metadata.photoUri);
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GOOGLE_PLACES_API_KEY nao configurada.' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';
    const city = searchParams.get('city')?.trim() || '';
    if (!query) {
      return NextResponse.json({ results: [] });
    }

    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.photos',
      },
      body: JSON.stringify({
        textQuery: city ? `${query} ${city}` : query,
        includedType: 'lodging',
        strictTypeFiltering: true,
        languageCode: 'pt-BR',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Nao foi possivel buscar acomodacoes agora. ${errorText}`.trim() },
        { status: 502 }
      );
    }

    const data = (await response.json()) as { places?: GooglePlaceItem[] };
    const limitedPlaces = (data.places || []).slice(0, 5);

    const results = await Promise.all(
      limitedPlaces.map(async (place) => {
        const photos = await Promise.all(
          (place.photos || [])
            .slice(0, 3)
            .map(async (photo) => (photo.name ? fetchPlacePhotoAsBase64(photo.name, apiKey) : null))
        );

        return {
          id: String(place.id || ''),
          name: place.displayName?.text || 'Hotel',
          address: place.formattedAddress || '',
          placeId: place.id || '',
          photos: photos.filter((photo): photo is string => Boolean(photo)),
        };
      })
    );

    return NextResponse.json({
      results: results.filter((result) => result.placeId && result.name),
    });
  } catch (error) {
    console.error('Erro ao buscar hoteis no Google Places:', error);
    return NextResponse.json({ error: 'Erro ao buscar acomodacoes' }, { status: 500 });
  }
}
