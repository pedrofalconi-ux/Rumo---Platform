import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../lib/server-auth';
import { convertUrlToBase64 } from '../../../lib/media/base64-converter';
import { createTripForAgency, listTripsForAgency } from '../../../lib/server-trip-store';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    const trips = await listTripsForAgency(user.agencyId);
    return NextResponse.json(trips);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar viagens' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    const body = await request.json();

    // Convert external URLs to Base64 to make them permanent
    if (body.coverImage && body.coverImage.startsWith('http')) {
      body.coverImage = await convertUrlToBase64(body.coverImage);
    }

    if (Array.isArray(body.itinerary)) {
      body.itinerary = await Promise.all(
        body.itinerary.map(async (item: any) => {
          if (item.image && item.image.startsWith('http')) {
            item.image = await convertUrlToBase64(item.image);
            if (item.meta) {
              item.meta.image = item.image;
            }
          }
          return item;
        })
      );
    }

    const newTrip = await createTripForAgency(body, user.agencyId, user.id);
    return NextResponse.json(newTrip);
  } catch (error) {
    console.error('Erro ao criar viagem:', error);
    const message = error instanceof Error ? error.message : 'Erro ao criar viagem';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
